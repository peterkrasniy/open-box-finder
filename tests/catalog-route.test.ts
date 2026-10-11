import assert from 'node:assert/strict';import {test} from 'node:test';
import {catalogResponse} from '../lib/server/catalog-route.ts';import {emptyCatalog} from '../lib/catalog.ts';
test('public writes and all force/URL/query inputs fail before read or maintenance; HEAD reads only',async()=>{
 let reads=0,writes=0;const service={read:async()=>{reads++;return emptyCatalog()},maintain:async()=>{writes++;return emptyCatalog()}};
 for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal((await catalogResponse(new Request('https://app.test/api/catalog',{method,body:'QA-only-payload'}),service)).status,405);
 for(const query of ['?force=1','?url=https://private.test/','?source=buydig','?refresh=true','?x=1'])assert.equal((await catalogResponse(new Request('https://app.test/api/catalog'+query),service)).status,400);
 assert.equal(reads+writes,0);
 const head=await catalogResponse(new Request('https://app.test/api/catalog',{method:'HEAD'}),service);assert.equal(head.status,200);assert.equal(await head.text(),'');assert.equal(reads,1);assert.equal(writes,0);
});
test('public ETags preserve immutable publication and server time; failed reads never replace catalog with empty success',async()=>{
 let time=Date.parse('2026-10-11T10:00:00Z');const service={read:async()=>emptyCatalog(),maintain:async()=>emptyCatalog()};
 const first=await catalogResponse(new Request('https://app.test/api/catalog'),service,()=>time);const etag=first.headers.get('etag')!;
 time+=600000;const cached=await catalogResponse(new Request('https://app.test/api/catalog',{headers:{'If-None-Match':etag,Cookie:'QA-only-private',Authorization:'Bearer QA-only'}}),service,()=>time);
 assert.equal(cached.status,304);assert.equal(cached.headers.get('X-Catalog-Time'),'2026-10-11T10:10:00.000Z');assert.equal(await cached.text(),'');assert.equal(cached.headers.get('Cache-Control'),'no-store');
 const failed=await catalogResponse(new Request('https://app.test/api/catalog'),{read:async()=>{throw Error('QA-only-private-error')},maintain:async()=>{throw Error('QA-only-private-error')}});assert.equal(failed.status,503);assert.equal(await failed.text(),'');
});
