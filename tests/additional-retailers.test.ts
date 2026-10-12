import {test} from 'node:test';import assert from 'node:assert/strict';
import {manualSupportedReference,manualNewModelComparison,manualRetailerComparison,manualProductsForFilters as filterPublished} from '../lib/manual-products.ts';
import {validManualSnapshot} from '../lib/manual-snapshot-schema.ts';import {DEFAULT_FILTERS} from '../lib/offer.ts';
import fixture from './fixtures/additional-retailers-v21.json' with {type:'json'};
import type {ManualProduct} from '../lib/manual-products.ts';
const MANUAL_PRODUCTS=fixture as unknown as readonly ManualProduct[];
const manualProductsForFilters=(...args:Parameters<typeof filterPublished>)=>filterPublished(args[0],args[1],args[2],MANUAL_PRODUCTS);
const now=Math.max(...MANUAL_PRODUCTS.map(product=>Date.parse(product.reviewedAt)))+1;
const find=(source:string,id:string)=>MANUAL_PRODUCTS.find(p=>p.sourceId===source&&p.id===id)!;
test('additional sources are distinct exact products; KitchenAid colors do not pad the count',()=>{
 for(const source of ['kitchenaid-manual','roborock-manual','canon-manual','logitech-manual','nintendo-manual']){const rows=MANUAL_PRODUCTS.filter(p=>p.sourceId===source);assert.ok(rows.length);assert.ok(rows.every(validManualSnapshot));}
 assert.equal(MANUAL_PRODUCTS.filter(p=>p.brand==='KitchenAid'&&p.model.includes('RKSM55')).length,0,'Second RKSM55 color was held outside this batch');
 assert.ok(manualProductsForFilters({...DEFAULT_FILTERS,categories:{mode:'selected',ids:['cameras']}},'percent',now).every(p=>p.sourceId==='canon-manual'));
});
test('only equivalent buyable current-new offers rank; differing bundles and sold-out list references do not',()=>{
 const canon=find('canon-manual','6390c020');assert.equal(canon.reviewedAt,'2026-10-12T04:10:25Z');assert.equal(manualSupportedReference(canon,now)?.savingCents,19901);
 assert.equal(manualSupportedReference({...canon,referencePrice:{...canon.referencePrice!,evidenceUrl:'https://www.usa.canon.com/shop/p/unrelated'}},now),null);
 assert.equal(validManualSnapshot({...canon,referencePrice:{...canon.referencePrice!,url:'https://unrelated.example/new'}}),false);
 const mixer=find('kitchenaid-manual','rrk150wh'),processor=find('kitchenaid-manual','rkfp0718bm');for(const p of [mixer,processor]){assert.equal(manualSupportedReference(p,now),null);assert.ok(manualNewModelComparison(p,now));assert.ok(p.details?.en.includes('accessory bundles may differ'));}
 const console=find('nintendo-manual','113303');assert.equal(manualSupportedReference(console,now),null);assert.equal(manualNewModelComparison(console,now),null);assert.equal(manualRetailerComparison(console,now)?.cents,22999);assert.ok(manualRetailerComparison(console,now)?.label?.en.includes('sold out'));
 for(const id of ['rr-qrevopro0r-m2','rr-qrevoslim5r-m1'])assert.equal(manualSupportedReference(find('roborock-manual',id),now),null);
 assert.equal(manualSupportedReference(find('roborock-manual','rr-qrevos5v5r-m1'),now)?.savingCents,37000);
});
test('shipping and warranty notes preserve exact evidence and limited-stock accessories',()=>{
 const cameras=manualProductsForFilters({...DEFAULT_FILTERS,retailers:{mode:'selected',ids:['canon-manual']},fulfillment:'shipped'},'percent',now);assert.equal(cameras.length,2);assert.ok(cameras.every(p=>p.shipping?.eligibility?.scope==='all-us'&&p.details?.en.includes('defective or unopened')));
 const wheel=find('logitech-manual','996-000430');assert.ok(wheel.conditionDetail?.en.includes('limited stock'));assert.ok(wheel.details?.en.includes('Pedals sold separately'));assert.ok(wheel.details?.en.includes('1-year'));
 assert.ok(find('roborock-manual','rr-qrevos5v5r-m1').details?.en.includes('80%'));
 for(const source of ['kitchenaid-manual','roborock-manual','logitech-manual','nintendo-manual'])assert.equal(manualProductsForFilters({...DEFAULT_FILTERS,retailers:{mode:'selected',ids:[source]},fulfillment:'shipped'},'percent',now).length,0);
});
