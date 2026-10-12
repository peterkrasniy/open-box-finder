import test from 'node:test';
import assert from 'node:assert/strict';
import { RESALE_RECORDS, resaleNewPriceSummary, netCashRange, validResaleRecord } from '../lib/resale.ts';
import { GET } from '../app/api/resale-catalog/route.ts';
const now=Date.parse('2026-10-12T07:00:00Z');
test('brand-new summary separates current exact/model/bundle references from historic and unavailable prices',()=>{
 const bose=RESALE_RECORDS.find(item=>item.id==='cl-7977804363')!,breville=RESALE_RECORDS.find(item=>item.id==='cl-7974744564')!,dyson=RESALE_RECORDS.find(item=>item.id==='cl-7969564188')!,focusrite=RESALE_RECORDS.find(item=>item.platform==='offerup')!,miele=RESALE_RECORDS.find(item=>item.id==='cl-7981259568')!;
 assert.equal(resaleNewPriceSummary(bose,now).cents,null);assert.equal(bose.newPriceReference?.basis,'historical-catalog');
 assert.equal(resaleNewPriceSummary(breville,now).cents,79995);assert.equal(resaleNewPriceSummary(breville,now).match,'model-unverified');assert.equal(breville.status,'hold');
 assert.equal(resaleNewPriceSummary(dyson,now).match,'different-bundle');assert.equal(resaleNewPriceSummary(focusrite,now).match,'exact-model');
 assert.equal(resaleNewPriceSummary(miele,now).status,'permanently-out-of-stock');assert.equal(resaleNewPriceSummary(miele,now).cents,null);
 assert.equal(resaleNewPriceSummary(focusrite,Date.parse(focusrite.newPriceReference!.checkedAt!)+86400000).cents,null);
 assert.equal(resaleNewPriceSummary(focusrite,Date.parse(focusrite.newPriceReference!.checkedAt!)-1).cents,null);
 const changedReference={...focusrite,newPriceReference:{...focusrite.newPriceReference!,cents:9999999}};assert.deepEqual(netCashRange(changedReference),netCashRange(focusrite));
 assert.equal(validResaleRecord({...miele,newPriceStatus:{...miele.newPriceStatus,sellerProfile:'private'}}),false);
});
test('old open pages keep all supported observations while new-price metadata uses schema3',async()=>{
 const endpoint='https://example.test/api/resale-catalog';const old=await GET(new Request(endpoint,{headers:{'X-Resale-Schema':'2'}})),current=await GET(new Request(endpoint,{headers:{'X-Resale-Schema':'3'}}));
 const a=await old.json() as {records:typeof RESALE_RECORDS},b=await current.json() as {records:typeof RESALE_RECORDS};
 assert.deepEqual(a.records.map(item=>item.id),b.records.map(item=>item.id));assert.equal(a.records.length,b.records.length);
 assert.ok(a.records.every(item=>!item.newPriceStatus&&item.newPriceReference?.match===undefined&&item.newPriceReference?.checkedAt===undefined));assert.ok(b.records.some(item=>item.newPriceStatus?.status==='permanently-out-of-stock'));
 assert.equal((await GET(new Request(endpoint,{headers:{'X-Resale-Schema':'3','If-None-Match':current.headers.get('ETag')!}}))).status,304);
});
