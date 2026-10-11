import assert from 'node:assert/strict';import {test} from 'node:test';import {preflightSource,maintainPreflight,APPROVED_PREFLIGHTS} from '../lib/server/preflight.ts';
import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';
const time=()=>Date.parse('2026-10-11T11:00:00Z');
test('source preflight is disabled by default and a robots denial stops before catalog/item acquisition',async()=>{
 assert.deepEqual(APPROVED_PREFLIGHTS,[]);let requests=0;
 const fetcher=(async(input:unknown,init?:RequestInit)=>{requests++;assert.equal(input,'https://www.appliances4less-sac.com/robots.txt');assert.equal(init?.credentials,'omit');return new Response('User-agent: *\nDisallow: /',{headers:{'Content-Type':'text/plain'}})}) as typeof fetch;
 const result=await preflightSource('a4l-sac',fetcher,time);assert.equal(requests,1);assert.equal(result.outcome,'blocked');assert.equal(result.units.length,0);
});

function database(){
 const db=new DatabaseSync(':memory:');for(const file of ['0000_zippy_excalibur.sql','0001_stormy_longshot.sql','0002_sturdy_black_cat.sql','0003_plain_natasha_romanoff.sql'])db.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 const prepare=(sql:string)=>{let values:unknown[]=[];const statement={bind(...args:unknown[]){values=args;return statement},async first(){return db.prepare(sql).get(...values as never[])??null},async all(){return{results:db.prepare(sql).all(...values as never[])}},async run(){const result=db.prepare(sql).run(...values as never[]);return{meta:{changes:Number(result.changes)}}}};return statement};
 return{db,d1:{prepare} as unknown as D1Database};
}
test('private preflight consumes one review once, preserves long backoff after evidence expiry, and never persists feed bodies',async()=>{
 const{db,d1}=database();let clock=time(),calls=0;const fetcher=(async()=>{calls++;return new Response('QA ONLY denied body',{status:429,headers:{'Retry-After':'172800'}})}) as typeof fetch;
 const grant={sourceId:'dealnews' as const,reviewedAt:new Date(clock-1).toISOString()};
 await maintainPreflight(d1,()=>clock,[grant],fetcher);assert.equal(calls,1);const row=db.prepare('SELECT * FROM source_preflight').get()!;assert.equal(JSON.parse(row.payload as string).notBefore,new Date(clock+172800000).toISOString());assert.equal(String(row.payload).includes('denied body'),false);
 clock+=3600000;await maintainPreflight(d1,()=>clock,[{...grant,reviewedAt:new Date(clock-1).toISOString()}],fetcher);assert.equal(calls,1);
 clock+=86400000;await maintainPreflight(d1,()=>clock,[{...grant,reviewedAt:new Date(clock-1).toISOString()}],fetcher);assert.equal(calls,1);assert.equal(db.prepare('SELECT payload FROM source_preflight').get()!.payload,'null');
 clock+=86400000;await maintainPreflight(d1,()=>clock,[grant],fetcher);assert.equal(calls,1);await maintainPreflight(d1,()=>clock,[{...grant,reviewedAt:new Date(clock-1).toISOString()}],fetcher);assert.equal(calls,2);
 await maintainPreflight(d1,()=>clock,[],fetcher);assert.equal(calls,2);db.close();
});
test('concurrent and expired private probes cannot replay a grant or persist an expired observation',async()=>{
 const{db,d1}=database();let clock=time(),calls=0;let release:((value:Response)=>void)|undefined;const pending=new Promise<Response>(resolve=>{release=resolve});
 const fetcher=(async()=>{calls++;return pending}) as typeof fetch,grant={sourceId:'dealnews' as const,reviewedAt:new Date(clock-1).toISOString()};
 const first=maintainPreflight(d1,()=>clock,[grant],fetcher);await new Promise<void>(resolve=>setImmediate(resolve));await maintainPreflight(d1,()=>clock,[grant],fetcher);assert.equal(calls,1);
 clock+=60001;release!(new Response('<rss version="2.0"><channel/></rss>',{headers:{'Content-Type':'text/xml'}}));await first;assert.equal(db.prepare('SELECT payload FROM source_preflight').get()!.payload,'null');await maintainPreflight(d1,()=>clock,[grant],fetcher);assert.equal(calls,1);db.close();
});
test('bounded actual-unit preflight reads at most two details and never calls a partial first-page catalog complete',async()=>{
 const urls=['A','B','C'].map(id=>`https://www.appliances4less-sac.com/p/QA-ONLY/u/QA-ONLY-${id}`);const requested:string[]=[];
 const fetcher=(async(input:unknown)=>{const url=String(input);requested.push(url);if(url.endsWith('/robots.txt'))return new Response('User-agent: *\nDisallow:',{headers:{'Content-Type':'text/plain'}});
 if(url.endsWith('/products'))return new Response(urls.map(url=>`<a href="${url}">QA ONLY</a>`).join(''),{headers:{'Content-Type':'text/html'}});
 const product={'@type':'Product',name:'QA ONLY',sku:new URL(url).pathname.split('/').at(-1),url,offers:{'@type':'Offer',price:'200.50',priceCurrency:'USD',availability:'https://schema.org/InStock',url}};
 return new Response(`<script type="application/ld+json">${JSON.stringify(product)}</script>`,{headers:{'Content-Type':'text/html'}})}) as typeof fetch;
 const result=await preflightSource('a4l-sac',fetcher,time);assert.equal(result.outcome,'observed');assert.equal(result.catalogComplete,false);assert.equal(result.discoveredUnits,3);assert.equal(result.units.length,2);assert.equal(result.units[0].availability,'available');assert.equal(result.units[0].currentCents,20050);assert.equal(requested.length,4);assert.equal(requested.includes(urls[2]),false);
});
test('the entire multi-request preflight stops within one shared eight-second network budget',async(t)=>{
 t.mock.timers.enable({apis:['setTimeout']});t.after(()=>t.mock.timers.reset());const requested:string[]=[];
 const url='https://www.appliances4less-sac.com/p/QA-ONLY/u/QA-ONLY-A';
 const fetcher=(async(input:unknown,init?:RequestInit)=>{requested.push(String(input));return new Promise<Response>((resolve,reject)=>{
   const timer=setTimeout(()=>resolve(String(input).endsWith('/robots.txt')?new Response('User-agent: *\nDisallow:',{headers:{'Content-Type':'text/plain'}}):String(input).endsWith('/products')?new Response(`<a href="${url}">QA ONLY</a>`,{headers:{'Content-Type':'text/html'}}):new Response('QA ONLY slow unit',{headers:{'Content-Type':'text/html'}})),3000);
   init?.signal?.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'))},{once:true});
 });}) as typeof fetch;
 const pending=preflightSource('a4l-sac',fetcher,time);t.mock.timers.tick(3000);await new Promise<void>(resolve=>setImmediate(resolve));
 t.mock.timers.tick(3000);await new Promise<void>(resolve=>setImmediate(resolve));assert.equal(requested.length,3);
 t.mock.timers.tick(2000);const result=await pending;assert.equal(result.outcome,'failure');assert.equal(result.units.length,0);assert.equal(requested.length,3);
});
test('blocked/challenged feed transport is not empty inventory, and licensed feed preflight stores only operational metadata',async()=>{
 const denied=await preflightSource('dealnews',(async()=>new Response('Denied',{status:403})) as typeof fetch,time);assert.equal(denied.outcome,'blocked');assert.equal(denied.httpStatus,403);assert.equal(denied.feed,null);
 const xml='<rss version="2.0"><channel><item><guid>QA-only</guid><title>QA ONLY private-body-test</title><link>https://www.dealnews.com/QA-ONLY?ref=x</link><description>QA ONLY original full body</description></item></channel></rss>';
 const observed=await preflightSource('dealnews',(async()=>new Response(xml,{headers:{'Content-Type':'text/xml'}})) as typeof fetch,time);assert.equal(observed.feed?.entries,1);assert.equal(JSON.stringify(observed).includes('original full body'),false);assert.equal(JSON.stringify(observed).includes('private-body-test'),false);assert.equal(observed.units.length,0);assert.equal(observed.catalogComplete,false);
});
