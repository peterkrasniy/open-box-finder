import assert from 'node:assert/strict';
import { test } from 'node:test';
import { preflightSource } from '../lib/server/preflight.ts';
import { acquireSource, DEALNEWS_TRANSPORT } from '../lib/server/fetch-source.ts';
const now=()=>Date.parse('2026-10-11T14:30:00Z');
const rss=(items:string)=>`<rss version="2.0"><channel>${items}</channel></rss>`;
const item=(id:string,title:string,description:string,link=`https://www.dealnews.com/${id}?ref=original`)=>`<item><guid>${id}</guid><title>${title}</title><link>${link.replaceAll('&','&amp;')}</link><description><![CDATA[${description}]]></description></item>`;

test('transport retains only bounded MIME/status/byte evidence even for redirects and encoding failures',async()=>{
 const redirected=await acquireSource(DEALNEWS_TRANSPORT,(async()=>new Response('QA ONLY private body',{status:302,headers:{'Content-Type':'text/html; private=QA-ONLY','Location':'https://private.test/','Set-Cookie':'QA ONLY private-cookie'}})) as typeof fetch,now);
 assert.equal(redirected.httpStatus,302);assert.equal(redirected.contentType,'text/html');assert.equal(redirected.bytesRead,0);assert.equal(redirected.ok,false);
 assert.equal(JSON.stringify(redirected).includes('private'),false);
 const bad=await acquireSource(DEALNEWS_TRANSPORT,(async()=>new Response(new Uint8Array([255]),{headers:{'Content-Type':'text/xml'}})) as typeof fetch,now);
 assert.equal(bad.httpStatus,200);assert.equal(bad.bytesRead,1);assert.equal(bad.ok,false);if(!bad.ok)assert.equal(bad.reason,'encoding');
});
test('diagnostics distinguish source HTTP denial, unsupported feed MIME, and malformed accepted XML',async()=>{
 for(const [status,type,body,outcome,reason,parser] of [[403,'text/html','QA ONLY private denial','blocked','http',null],[200,'text/html','QA ONLY challenge','blocked','content-type',null],[200,'text/xml','<rss>QA ONLY private malformed','unsupported',null,'rss-envelope']] as const){
  const result=await preflightSource('dealnews',(async()=>new Response(body,{status,headers:{'Content-Type':type}})) as typeof fetch,now);
  assert.equal(result.outcome,outcome);assert.equal(result.httpStatus,status);assert.equal(result.diagnostics.length,1);
  assert.deepEqual(result.diagnostics.map(step=>[step.stage,step.httpStatus,step.contentType,step.transportReason,step.parserReason]),[['feed',status,type,reason,parser]]);
  assert.equal(JSON.stringify(result).includes('private'),false);assert.equal(result.feed,null);
 }
});
test('robots refusal stops before catalog and empty canonical discovery preserves the accepted response and four-hour backoff',async()=>{
 let calls=0;const deny=await preflightSource('a4l-sac',(async()=>{calls++;return new Response('User-agent: *\nDisallow: /',{headers:{'Content-Type':'text/plain'}});}) as typeof fetch,now);
 assert.equal(calls,1);assert.equal(deny.diagnostics[0].robotsAllowed,false);assert.equal(deny.outcome,'blocked');
 const empty=await preflightSource('a4l-sac',(async input=>String(input).endsWith('/robots.txt')?new Response('User-agent: *\nDisallow:',{headers:{'Content-Type':'text/plain','Cache-Control':'max-age=14400'}}):new Response('<p>QA ONLY no canonical units</p>',{headers:{'Content-Type':'text/html'}})) as typeof fetch,now);
 assert.equal(empty.outcome,'unsupported');assert.equal(empty.httpStatus,200);assert.equal(empty.diagnostics[0].robotsAllowed,true);assert.equal(empty.diagnostics[1].parserReason,'catalog-no-canonical-units');assert.equal(empty.diagnostics[1].contentType,'text/html');assert.equal(empty.notBefore,'2026-10-11T18:30:00.000Z');
});
test('unit JSON failure preserves the discovered count and exact safe parser stage without retaining source body',async()=>{
 const urls=['A','B','C'].map(id=>`https://www.appliances4less-sac.com/p/QA-ONLY/u/QA-ONLY-${id}`);let calls=0;
 const result=await preflightSource('a4l-sac',(async input=>{calls++;return String(input).endsWith('/robots.txt')?new Response('User-agent: *\nDisallow:',{headers:{'Content-Type':'text/plain'}}):String(input).endsWith('/products')?new Response(urls.map(url=>`<a href="${url}">QA</a>`).join(''),{headers:{'Content-Type':'text/html'}}):new Response('<script type="application/ld+json">QA ONLY private invalid JSON</script>',{headers:{'Content-Type':'text/html'}});}) as typeof fetch,now);
 assert.equal(calls,3);assert.equal(result.outcome,'unsupported');assert.equal(result.discoveredUnits,3);assert.equal(result.units.length,0);assert.equal(result.diagnostics[2].parserReason,'product-json');assert.equal(result.diagnostics[2].robotsAllowed,true);assert.equal(JSON.stringify(result).includes('private'),false);
});
test('RSS coverage separates explicit title mentions, body-only mentions, and general deals without claiming inventory',async()=>{
 const xml=rss(item('open','QA ONLY Open-Box camera','<p>QA ONLY original complete body</p><a href="https://retailer.test/p?ref=keep">go</a><img src="https://media.test/x.jpg">')+item('refurb','QA ONLY Refurbished laptop','QA ONLY')+item('return','QA ONLY Customer Returns appliance','QA ONLY')+item('body','QA ONLY camera','<p>QA ONLY refurbished unit</p>')+item('general','QA ONLY New Retail sale','<script>open box</script><img src="javascript:QA_ONLY"><p>QA ONLY general deal</p>'));
 let calls=0;const result=await preflightSource('dealnews',(async input=>{calls++;assert.equal(input,DEALNEWS_TRANSPORT.url);return new Response(xml,{headers:{'Content-Type':'application/rss+xml'}});}) as typeof fetch,now);
 const feed=result.feed!;assert.equal(calls,1);assert.equal(feed.entries,5);assert.equal(feed.titleConditionEntries,3);assert.equal(feed.bodyOnlyConditionEntries,1);assert.equal(feed.noConditionMentionEntries,1);assert.deepEqual(feed.titleConditions,{'open-box':1,returned:1,refurbished:1});assert.equal(feed.samples.length,3);assert.equal(feed.samples[0].url,'https://www.dealnews.com/open?ref=original');assert.deepEqual(feed.mediaOrigins,['https://media.test']);assert.deepEqual(feed.contentLinkOrigins,['https://retailer.test']);assert.equal(feed.unsafeResourceReferences,1);assert.equal(feed.verifiedInventory,false);assert.equal(result.units.length,0);assert.equal(JSON.stringify(result).includes('original complete body'),false);
});
test('metadata for a full mixed RSS remains below 16 KiB with bounded samples/origins and no full HTML',async()=>{
 const xml=rss(Array.from({length:100},(_,i)=>item(String(i),'QA ONLY Refurbished '+ '界'.repeat(70),Array.from({length:12},(_,j)=>`<a href="https://r${i}-${j}.test/p">QA ONLY</a><img src="https://m${i}-${j}.test/p">`).join(''),`https://d${i}.test/${'x'.repeat(970)}`)).join(''));
 const result=await preflightSource('dealnews',(async()=>new Response(xml,{headers:{'Content-Type':'text/xml'}})) as typeof fetch,now);
 assert.equal(result.feed?.entries,100);assert.equal(result.feed?.titleConditionEntries,100);assert.equal(result.feed?.samples.length,4);assert.equal(result.feed?.originsTruncated,true);assert.equal(result.feed?.linkOrigins.length,8);assert.equal(result.feed?.mediaOrigins.length,8);assert.ok(new TextEncoder().encode(JSON.stringify(result)).byteLength<16384);assert.equal(JSON.stringify(result).includes('<img'),false);
});
