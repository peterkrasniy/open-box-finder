import test from 'node:test';
import assert from 'node:assert/strict';
import { MANUAL_PRODUCTS } from '../lib/manual-products.ts';
import { RESALE_RECORDS } from '../lib/resale.ts';
import { manualSavedPointer } from '../lib/manual-products.ts';
import { resaleSavedPointer } from '../lib/resale.ts';
import { manualDismissIdentity, resaleDismissIdentity, savedDismissIdentity, DISMISSED_PREFIX, readDismissedListings, validDismissIdentity, writeListingDismissal } from '../lib/dismissals.ts';
import type { StorageLike } from '../lib/storage.ts';
class Store implements StorageLike {
 data=new Map<string,string>();get length(){return this.data.size;}key(index:number){return [...this.data.keys()][index]??null;}getItem(key:string){return this.data.get(key)??null;}setItem(key:string,value:string){this.data.set(key,value);}removeItem(key:string){this.data.delete(key);}
}
test('manual and resale dismissals use source listing identity across price, review, URL, condition and availability changes', () => {
 const manual=MANUAL_PRODUCTS[0],resale=RESALE_RECORDS[0];
 const changedManual={...manual,url:'https://example.test/new-url',observedPriceCents:1,condition:'used' as const,reviewedAt:'2030-01-01T00:00:00Z'};assert.equal(manualDismissIdentity(manual),manualDismissIdentity(changedManual));
 const changedResale={...resale,url:'https://example.test/new-url',askingCents:1,archived:true};assert.equal(resaleDismissIdentity(resale),resaleDismissIdentity(changedResale));
 const savedManual=manualSavedPointer(manual,Date.parse(manual.reviewedAt));assert.ok(savedManual);assert.equal(savedDismissIdentity(savedManual),manualDismissIdentity(manual));
 const savedResale=resaleSavedPointer(resale,Date.parse(resale.checkedAt));assert.ok(savedResale);assert.equal(savedDismissIdentity(savedResale),resaleDismissIdentity(resale));
 assert.notEqual(manualDismissIdentity(manual),manualDismissIdentity({...manual,id:manual.id+'-other-unit'}));
});
test('atomic dismissal entries persist across reload and independent tabs, while restores leave saves/preferences untouched', () => {
 const store=new Store(),a=manualDismissIdentity(MANUAL_PRODUCTS[0]),b=resaleDismissIdentity(RESALE_RECORDS[0]);
 store.setItem('open-box-finder:preferences:v1','UNCHANGED');store.setItem('open-box-finder:saved:v1','UNCHANGED');
 assert.equal(writeListingDismissal(store,a,true),true);assert.equal(writeListingDismissal(store,a,true),true);assert.equal(writeListingDismissal(store,b,true),true);
 assert.deepEqual([...readDismissedListings(store)],[a,b]);assert.equal(store.length,4);
 assert.equal(writeListingDismissal(store,a,false),true);assert.deepEqual([...readDismissedListings(store)],[b]);
 for(let index=0;index<1000;index++){writeListingDismissal(store,a,true);writeListingDismissal(store,a,false);}
 assert.equal(store.length,3);assert.equal(store.getItem('open-box-finder:preferences:v1'),'UNCHANGED');assert.equal(store.getItem('open-box-finder:saved:v1'),'UNCHANGED');
});
test('dismissal parsing rejects unscoped, oversized and malformed keys without crashing or claiming denied persistence', () => {
 const store=new Store();for(const value of ['unknown',JSON.stringify(['manual','missing-source','id']),JSON.stringify(['manual','best-buy','']),JSON.stringify(['offer','not-json']),'x'.repeat(5000)]){assert.equal(validDismissIdentity(value),false);assert.equal(writeListingDismissal(store,value,true),false);store.setItem(DISMISSED_PREFIX+value,'1');}
 assert.equal(readDismissedListings(store).size,0);
 const denied:StorageLike={getItem:()=>{throw Error('denied');},setItem:()=>{throw Error('denied');},key:()=>{throw Error('denied');},length:1};
 assert.equal(writeListingDismissal(denied,manualDismissIdentity(MANUAL_PRODUCTS[0]),true),false);assert.throws(()=>readDismissedListings(denied));
});

test('normalized unit dismissal ignores display ID and price, while distinguishing variants and branches', async () => {
 const {offerDismissIdentity}=await import('../lib/dismissals.ts');
 const source={id:'qa-display-v1',sourceId:'buydig',sourceOfferId:'qa-physical-unit',variantKey:'qa-variant',condition:'open-box',pickup:null} as import('../lib/offer.ts').Offer;
 const refreshed={...source,id:'qa-display-v2',priceCents:1,url:'https://www.buydig.com/shop/product/changed',observedAt:'2030-01-01T00:00:00Z'};
 assert.equal(offerDismissIdentity(source),offerDismissIdentity(refreshed));assert.equal(validDismissIdentity(offerDismissIdentity(source)),true);
 assert.notEqual(offerDismissIdentity(source),offerDismissIdentity({...source,variantKey:'other-variant'}));
 assert.notEqual(offerDismissIdentity(source),offerDismissIdentity({...source,pickup:{id:'different-branch',name:'QA ONLY',address:'QA ONLY',point:null,pickupVerified:false}}));
 const pointer={offerId:source.id,sourceId:source.sourceId,sourceOfferId:source.sourceOfferId,variantKey:source.variantKey,condition:source.condition,storeId:null,url:'https://www.buydig.com/shop/product/qa-unit',savedAt:'2026-10-12T06:00:00Z'};
 assert.equal(savedDismissIdentity(pointer),offerDismissIdentity(source));
});
