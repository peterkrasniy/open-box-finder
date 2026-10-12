import {test} from 'node:test';import assert from 'node:assert/strict';
import {MANUAL_PRODUCTS,manualProductActive,manualSupportedReference,manualProductsForFilters} from '../lib/manual-products.ts';
import {DEFAULT_FILTERS} from '../lib/offer.ts';import {directionsUrl} from '../lib/filter.ts';import {SOURCE_BY_ID} from '../lib/sources.ts';
const now=Math.max(...MANUAL_PRODUCTS.map(product=>Date.parse(product.reviewedAt)))+1;
test('published checked catalog exceeds 100 real distinct stocked products across sources and categories',()=>{
 const eligible=MANUAL_PRODUCTS.filter(p=>manualProductActive(p,now)&&p.observedStock==='available');assert.ok(eligible.length>=100);assert.equal(new Set(eligible.map(p=>p.productKey)).size,eligible.length);assert.equal(new Set(eligible.map(p=>p.url)).size,eligible.length);assert.ok(new Set(eligible.map(p=>p.sourceId)).size>=4);assert.ok(new Set(eligible.map(p=>p.category)).size>=3);
 for(const p of eligible){assert.ok(p.image.url&&p.image.alt.en&&p.image.alt.ru);assert.ok(p.observedPriceCents>0);assert.equal(SOURCE_BY_ID.get(p.sourceId)?.enabled,false);}
});
test('Best Buy comparisons are current-new and fulfillment retains ZIP or actual named store scope',()=>{
 const products=MANUAL_PRODUCTS.filter(p=>p.sourceId==='best-buy');assert.ok(products.length>0);assert.equal(new Set(products.map(p=>p.productKey)).size,products.length);
 for(const p of products){assert.equal(p.condition,'open-box');assert.equal(p.referencePrice?.basis,'current-new');assert.equal(manualSupportedReference(p,now)?.basis,'current-new');assert.ok(new URL(p.url).searchParams.has('condition'));}
 const shipped=products.filter(p=>p.shipping);assert.ok(shipped.length>0);assert.ok(shipped.every(p=>p.shipping?.restrictions?.includes('95628')&&!p.shipping.eligibility));
 assert.equal(manualProductsForFilters({...DEFAULT_FILTERS,retailers:{mode:'selected',ids:['best-buy']},fulfillment:'shipped'},'percent',now).length,0,'ZIP 95628 evidence cannot prove delivery to a different selected origin');
 const pickup=products.filter(p=>p.pickup);assert.ok(pickup.length>0);for(const p of pickup){const url=directionsUrl({pickup:p.pickup!})!;assert.equal(new URL(url).searchParams.get('destination'),p.pickup!.address);assert.equal(p.pickup!.point,null,'No invented coordinates or transferred saved-browser distances');}
});
