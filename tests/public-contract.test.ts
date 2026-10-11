import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyCatalog } from '../lib/catalog.ts';
import { decodeCatalog } from '../lib/validation.ts';
import { readRoute, routeUrl, historyDepth } from '../lib/routes.ts';
import type { Offer } from '../lib/offer.ts';

const offer: Offer = {
  id:'test-only:unit',sourceId:'buydig',retailerId:'buydig',sourceOfferId:'test-only',variantKey:'test-only-unit',recordType:'inventory',
  title:'Isolated contract fixture',category:'audio',condition:'open-box',cosmeticGrade:null,availability:'unknown',priceCents:20050,currency:'USD',reference:null,
  url:'https://example.test/product?ref=a%2Fb',imageUrl:null,imageAlt:null,pickup:{id:'test-branch',name:'Test branch',address:'Test-only address',pickupVerified:true,point:{latitude:38,longitude:-121}},
  shipping:null,localDelivery:null,observedAt:'2026-10-11T09:00:00Z',freshUntil:'2026-10-11T09:05:00Z',
};

test('public catalog projection strips nested adapter fields and rejects malformed identities',()=>{
  const catalog=decodeCatalog({...emptyCatalog(),offers:[{...offer,privateToken:'test-only-secret',pickup:{...offer.pickup,privateContact:'test-only-private',point:{...offer.pickup!.point,privatePrecision:'test-only-private'}}}],sources:[{sourceId:'buydig',status:'unconnected',lastAttemptAt:null,lastSuccessAt:null,nextCheckAt:null,lastCompleteAt:null,lastCompleteSequence:0,privateError:'test-only-private'}],privateOwner:'test-only-private'});
  const json=JSON.stringify(catalog);assert.equal(json.includes('test-only-private'),false);assert.equal(json.includes('test-only-secret'),false);
  assert.equal(catalog.offers[0].url,offer.url);
  for(const invalid of [{...offer,url:'javascript:alert(1)'},{...offer,sourceId:'unregistered'},{...offer,priceCents:20.5},{...offer,pickup:{...offer.pickup,point:{latitude:Infinity,longitude:-121}}}])assert.throws(()=>decodeCatalog({...emptyCatalog(),offers:[invalid]}),/Invalid catalog offer/);
  assert.throws(()=>decodeCatalog({...emptyCatalog(),offers:[offer,offer]}),/Invalid catalog offer/);
  assert.throws(()=>decodeCatalog({...emptyCatalog(),offers:[offer,{...offer,id:'QA-only-alias'}]}),/Invalid catalog offer/);
});

test('only one overlay route is selected and serialization preserves exact identity',()=>{
  const route={view:'saved' as const,offerId:'buydig:unit/a+b',offerIdentity:'["test-only-unit"]',panel:null};
  assert.deepEqual(readRoute(new URL(routeUrl(route),'https://example.test').href),route);
  assert.equal(readRoute('https://example.test/?offer=unit&panel=filters').panel,null);
  assert.equal(readRoute('https://example.test/?offer=bad%20id').offerId,null);
  assert.equal(readRoute('https://example.test/?view=administrator&panel=anything').view,'deals');
  for(const depth of [-1,'1',1.5,Infinity,10001])assert.equal(historyDepth({openBoxFinder:{depth}}),0);
  assert.equal(historyDepth({openBoxFinder:{depth:4}}),4);
});
