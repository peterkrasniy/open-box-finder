import assert from 'node:assert/strict';import {test} from 'node:test';
import {reconcileSnapshot} from '../lib/catalog.ts';import type {Offer} from '../lib/offer.ts';
import {canonicalInventoryId} from '../lib/server/inventory-id.ts';
const stamp='2026-10-11T12:00:00Z';
const offer:Offer={id:'QA-only-original',sourceId:'buydig',retailerId:'buydig',sourceOfferId:'QA-only-exact-unit',variantKey:'QA-only-variant',condition:'open-box',recordType:'inventory',title:'QA ONLY physical unit',category:'audio',cosmeticGrade:null,availability:'available',priceCents:20000,currency:'USD',reference:null,url:'https://www.buydig.com/shop/product/QA-ONLY',imageUrl:null,imageAlt:null,pickup:null,shipping:null,localDelivery:null,observedAt:stamp,freshUntil:'2026-10-11T13:00:00Z'};
test('a physical-unit alias cannot appear twice or masquerade as an add/removal across source snapshots',()=>{
 const alias={...offer,id:'QA-only-alias'},snapshot={sourceId:'buydig',complete:true,acquiredAt:stamp,offers:[offer,alias]};
 assert.throws(()=>reconcileSnapshot([],snapshot),/aliased source-unit/);
 assert.throws(()=>reconcileSnapshot([offer],{...snapshot,offers:[alias]}),/aliased source-unit/);
 assert.equal(reconcileSnapshot([offer],{...snapshot,offers:[{...offer,priceCents:19999}]}).delta.changed.length,1);
 assert.equal(reconcileSnapshot([offer],{...snapshot,offers:[{...offer,sourceOfferId:'QA-only-another-unit',variantKey:'QA-only-another-variant'}]}).offers.length,1);
});
test('canonical normalized inventory IDs are stable across mutable facts and change with exact unit/variant/condition/branch',async()=>{
 const id=await canonicalInventoryId(offer);assert.match(id,/^buydig:[a-f0-9]{64}$/);
 assert.equal(await canonicalInventoryId({...offer,priceCents:19999} as Offer),id);
 for(const changed of [{...offer,sourceOfferId:'QA-only-other'},{...offer,variantKey:'QA-only-other'},{...offer,condition:'used' as const},{...offer,pickup:{id:'QA-only-branch',name:'QA ONLY branch',address:'QA ONLY address',point:null,pickupVerified:true}}])assert.notEqual(await canonicalInventoryId(changed),id);
});
