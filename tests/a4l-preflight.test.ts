import assert from 'node:assert/strict';import {test} from 'node:test';
import {discoverA4lUnits,observeA4lUnit} from '../lib/server/a4l-preflight.ts';
import {acquireSource,A4L_ROBOTS_TRANSPORT,a4lUnitTransport} from '../lib/server/fetch-source.ts';
const url='https://www.appliances4less-sac.com/p/QA-ONLY-MODEL/u/QA-ONLY-UNIT';
const product={ '@type':'Product',name:'QA ONLY item',sku:'QA-only-sku',model:'QA-only-model',url,offers:{'@type':'Offer',price:'200.50',priceCurrency:'USD',availability:'https://schema.org/InStock',url,itemCondition:'https://schema.org/UsedCondition'}};
const html=(value:unknown)=>`<html><head><script type="application/ld+json">${JSON.stringify(value)}</script></head><body>QA ONLY</body></html>`;
test('fixed catalog discovery deduplicates exact units and excludes external, credential, encoded or query links',()=>{
 assert.deepEqual(discoverA4lUnits(`<a href="${url}">QA</a><a href="/p/QA-ONLY-MODEL/u/QA-ONLY-UNIT">Duplicate</a><a href="https://unrelated.test/p/X/u/Y">Foreign</a><a href="/p/X/u/Y?secret=1">Query</a><a href="/p/%2f/u/Y">Encoded</a>`),[url]);
 for(const target of ['http://127.0.0.1/','https://www.appliances4less-sac.com.evil.test/p/X/u/Y',url+'?x=1',url+'#x','https://user@www.appliances4less-sac.com/p/X/u/Y'])assert.throws(()=>a4lUnitTransport(target));
});
test('actual-unit structured observation preserves cents and explicit stock without inferring from a cart control',()=>{
 const observed=observeA4lUnit(html(product),url);assert.equal(observed.currentCents,20050);assert.equal(observed.availability,'available');assert.equal(observed.unitId,'QA-ONLY-UNIT');
 assert.equal(observeA4lUnit(html({...product,offers:{...product.offers,availability:'https://schema.org/PreOrder'}}),url).availability,'unknown');
 for(const value of [{...product,offers:{...product.offers,price:'200.501'}},{...product,offers:{...product.offers,priceCurrency:'CAD'}},{...product,offers:{'@type':'AggregateOffer',lowPrice:'1',priceCurrency:'USD'}},{...product,url:'https://www.appliances4less-sac.com/p/OTHER/u/OTHER'},[product,product],{...product,offers:[product.offers,product.offers]}])assert.throws(()=>observeA4lUnit(html(value),url));
 assert.throws(()=>observeA4lUnit('<button>Add to Cart</button><p>$200.50 In Stock</p>',url));
 assert.throws(()=>observeA4lUnit(html({...product,url:undefined,offers:{...product.offers,url:undefined}}),url));
});
test('robots transport distinguishes a denied HTTP status without accepting arbitrary developer-configured URLs',async()=>{
 const result=await acquireSource(A4L_ROBOTS_TRANSPORT,(async()=>new Response('Forbidden',{status:403})) as typeof fetch);assert.equal(result.ok,false);if(!result.ok)assert.equal(result.httpStatus,403);
 await assert.rejects(acquireSource({...A4L_ROBOTS_TRANSPORT,url:'https://unrelated.test/robots.txt'}),/Unregistered/);
});
