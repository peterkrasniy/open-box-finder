import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyCatalog,reconcileSnapshot } from '../lib/catalog.ts';
import { acceptPublication } from '../lib/validation.ts';
import { shippingEligibility } from '../lib/shipping.ts';
import { DEFAULT_FILTERS } from '../lib/offer.ts';
import type { Offer } from '../lib/offer.ts';
import { matches } from '../lib/filter.ts';
const offer:Offer={id:'qa-only:unit',sourceId:'buydig',retailerId:'buydig',sourceOfferId:'QA-ONLY',variantKey:'QA-ONLY-unit',recordType:'inventory',title:'QA ONLY',category:'audio',condition:'open-box',cosmeticGrade:null,availability:'unknown',priceCents:20050,currency:'USD',reference:null,url:'https://example.test/qa',imageUrl:null,imageAlt:null,pickup:null,shipping:null,localDelivery:null,observedAt:'2026-10-11T10:00:00Z',freshUntil:'2026-10-11T10:05:00Z'};

test('older partial and complete snapshots cannot replace or delete newer source observations',()=>{
 const old={sourceId:'buydig',complete:false,acquiredAt:'2026-10-11T09:00:00Z',offers:[{...offer,priceCents:29999,observedAt:'2026-10-11T09:00:00Z'}]};
 assert.throws(()=>reconcileSnapshot([offer],old),/Stale source snapshot/);
 assert.throws(()=>reconcileSnapshot([offer],{...old,complete:true,offers:[]}),/Stale source snapshot/);
 assert.throws(()=>reconcileSnapshot([],{...old,complete:true,offers:[]},'2026-10-11T10:00:00Z'),/Stale source snapshot/);
 assert.throws(()=>reconcileSnapshot([offer],{...old,acquiredAt:'2026-10-11T10:01:00Z'}),/Stale source offer/);
});

test('authoritative publication sequence rejects sequential rollback and same-sequence mutation',()=>{
 const initial=emptyCatalog(),newer={...initial,sequence:2,generation:'qa-only-g2',revision:'qa-only-r2',offers:[{...offer,priceCents:10000}]},older={...newer,sequence:1,revision:'qa-only-r1',offers:[offer]};
 assert.equal(acceptPublication(initial,newer),newer);
 assert.throws(()=>acceptPublication(newer,older),/Stale catalog publication/);
 assert.throws(()=>acceptPublication(newer,{...newer,offers:[offer]}),/Conflicting catalog publication/);
 assert.equal(acceptPublication(newer,structuredClone(newer)),newer);
});

test('NY-only shipping is ineligible for California; unknown shipping/pickup remains unknown in Both',()=>{
 const restricted={...offer,shipping:{country:'US' as const,costCents:null,restrictions:'QA ONLY · New York only',eligibility:{scope:'states' as const,states:['NY'],excludedStates:[]}}};
 assert.equal(shippingEligibility(restricted.shipping,DEFAULT_FILTERS.origin),'ineligible');
 assert.equal(matches(restricted,{...DEFAULT_FILTERS,fulfillment:'shipped'}),false);assert.equal(matches(restricted,DEFAULT_FILTERS),false);
 assert.equal(matches(restricted,{...DEFAULT_FILTERS,origin:{...DEFAULT_FILTERS.origin,shippingState:'NY'},fulfillment:'shipped'}),true);
 assert.equal(matches({...offer,pickup:{id:'qa-only-branch',name:'QA ONLY',address:'QA ONLY',point:null,pickupVerified:false}},DEFAULT_FILTERS),true);
 assert.equal(matches({...offer,shipping:{country:'US',costCents:null,restrictions:null}},DEFAULT_FILTERS),true);
 assert.equal(matches({...offer,shipping:{country:'US',costCents:null,restrictions:null}},{...DEFAULT_FILTERS,fulfillment:'shipped'}),false);
});
