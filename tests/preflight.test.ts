import assert from 'node:assert/strict';import {test} from 'node:test';import {preflightSource,APPROVED_PREFLIGHTS} from '../lib/server/preflight.ts';
const time=()=>Date.parse('2026-10-11T11:00:00Z');
test('source preflight is disabled by default and a robots denial stops before catalog/item acquisition',async()=>{
 assert.deepEqual(APPROVED_PREFLIGHTS,[]);let requests=0;
 const fetcher=(async(input:unknown,init?:RequestInit)=>{requests++;assert.equal(input,'https://www.appliances4less-sac.com/robots.txt');assert.equal(init?.credentials,'omit');return new Response('User-agent: *\nDisallow: /',{headers:{'Content-Type':'text/plain'}})}) as typeof fetch;
 const result=await preflightSource('a4l-sac',fetcher,time);assert.equal(requests,1);assert.equal(result.outcome,'blocked');assert.equal(result.units.length,0);
});
test('bounded actual-unit preflight reads at most two details and never calls a partial first-page catalog complete',async()=>{
 const urls=['A','B','C'].map(id=>`https://www.appliances4less-sac.com/p/QA-ONLY/u/QA-ONLY-${id}`);const requested:string[]=[];
 const fetcher=(async(input:unknown)=>{const url=String(input);requested.push(url);if(url.endsWith('/robots.txt'))return new Response('User-agent: *\nDisallow:',{headers:{'Content-Type':'text/plain'}});
 if(url.endsWith('/products'))return new Response(urls.map(url=>`<a href="${url}">QA ONLY</a>`).join(''),{headers:{'Content-Type':'text/html'}});
 const product={'@type':'Product',name:'QA ONLY',sku:new URL(url).pathname.split('/').at(-1),url,offers:{'@type':'Offer',price:'200.50',priceCurrency:'USD',availability:'https://schema.org/InStock',url}};
 return new Response(`<script type="application/ld+json">${JSON.stringify(product)}</script>`,{headers:{'Content-Type':'text/html'}})}) as typeof fetch;
 const result=await preflightSource('a4l-sac',fetcher,time);assert.equal(result.outcome,'observed');assert.equal(result.catalogComplete,false);assert.equal(result.discoveredUnits,3);assert.equal(result.units.length,2);assert.equal(result.units[0].availability,'available');assert.equal(result.units[0].currentCents,20050);assert.equal(requested.length,4);assert.equal(requested.includes(urls[2]),false);
});
test('blocked/challenged feed transport is not empty inventory, and licensed feed preflight stores only operational metadata',async()=>{
 const denied=await preflightSource('dealnews',(async()=>new Response('Denied',{status:403})) as typeof fetch,time);assert.equal(denied.outcome,'blocked');assert.equal(denied.httpStatus,403);assert.equal(denied.feed,null);
 const xml='<rss version="2.0"><channel><item><guid>QA-only</guid><title>QA ONLY private-body-test</title><link>https://www.dealnews.com/QA-ONLY?ref=x</link><description>QA ONLY original full body</description></item></channel></rss>';
 const observed=await preflightSource('dealnews',(async()=>new Response(xml,{headers:{'Content-Type':'text/xml'}})) as typeof fetch,time);assert.equal(observed.feed?.entries,1);assert.equal(JSON.stringify(observed).includes('original full body'),false);assert.equal(JSON.stringify(observed).includes('private-body-test'),false);assert.equal(observed.units.length,0);assert.equal(observed.catalogComplete,false);
});
