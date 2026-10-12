import assert from 'node:assert/strict';
import { test } from 'node:test';
import rawRecords from '../data/resale-records.json' with { type: 'json' };
import { RESALE_RECORDS, RESALE_REVIEW_WINDOW_MS, netCashRange, resaleActive, resaleSavedPointer, validResaleRecord } from '../lib/resale.ts';
import { decodeSaved } from '../lib/storage.ts';
import type { ResaleListing } from '../lib/resale.ts';

const [bose, breville, dyson] = RESALE_RECORDS;
const observed = Date.parse(bose.checkedAt);
const clone = () => structuredClone(bose);
const invalid = (patch: Record<string, unknown>) => assert.equal(validResaleRecord({ ...clone(), ...patch }), false);

test('every supplied lead survives validation with distinct IDs and bilingual inspection requirements', () => {
  assert.ok(rawRecords.length > 0);
  assert.equal(RESALE_RECORDS.length, rawRecords.length);
  assert.ok(rawRecords.every(validResaleRecord));
  assert.equal(new Set(RESALE_RECORDS.map(record => record.id)).size, rawRecords.length);
  for (const record of RESALE_RECORDS) {
    assert.equal(record.sourceId, `${record.platform}-resale`);
    assert.equal(record.exactMatchCount, 0);
    assert.equal(record.comparisonStatus, 'pending');
    assert.ok(record.tests.length >= 3);
    for (const value of [record.title, record.notes, record.dimensions, ...record.tests]) {
      assert.ok(value.en.trim());
      assert.ok(value.ru.trim());
    }
  }
  assert.equal(breville.status, 'hold');
  assert.equal(breville.checkedAt, '2026-10-12T04:55:00Z');
  assert.match(breville.notes.en, /advance deposit/);
  assert.match(breville.notes.ru, /задаток/);
});

test('cash estimates deduct the full asking price and reserve without comparison-price inflation', () => {
  assert.deepEqual(netCashRange(bose), { lowCents: 5000, highCents: 10000 });
  assert.deepEqual(netCashRange(breville), { lowCents: 10000, highCents: 17500 });
  assert.deepEqual(netCashRange(dyson), { lowCents: 5000, highCents: 10000 });
  assert.deepEqual(netCashRange({ askingCents: 10000, reserveCents: 5000, resaleLowCents: 10000, resaleHighCents: 12000 }),
    { lowCents: -5000, highCents: -3000 });
  for (const patch of [{ askingCents: 0 }, { reserveCents: -1 }, { resaleLowCents: 1.5 }, { resaleHighCents: Infinity },
    { resaleLowCents: 100_000_001 }, { resaleLowCents: 30000, resaleHighCents: 20000 }]) {
    invalid(patch);
    assert.throws(() => netCashRange({ ...bose, ...patch }), RangeError);
  }
  invalid({ askingCents: '15000' });
  invalid({ currency: 'EUR' });
});

test('observations expire at exactly 24 hours; future, archived and invalid dates stay inactive', () => {
  assert.equal(resaleActive(bose, observed - 1), false);
  assert.equal(resaleActive(bose, observed), true);
  assert.equal(resaleActive(bose, observed + RESALE_REVIEW_WINDOW_MS - 1), true);
  assert.equal(resaleActive(bose, observed + RESALE_REVIEW_WINDOW_MS), false);
  assert.equal(resaleActive({ ...bose, archived: true }, observed), false);
  assert.equal(resaleActive(bose, NaN), false);
  for (const checkedAt of ['2026-02-30T04:55:00Z', '2026-10-12', '2026-10-12T04:55:00+00:00', 'not a date']) {
    invalid({ checkedAt });
    assert.equal(resaleActive({ ...bose, checkedAt }, observed), false);
  }
  invalid({ archived: 'false' });
});

test('source-specific listing paths and photos reject redirects, credentials, internal hosts and unrelated pages', () => {
  for (const url of ['http://www.craigslist.org/view/d/example/abc', 'javascript:alert(1)',
    'https://www.craigslist.org.evil.test/view/d/example/abc', 'https://www.craigslist.org/about/',
    'https://user:pass@www.craigslist.org/view/d/example/abc', 'https://127.0.0.1/view/d/example/abc',
    bose.url + '?redirect=https://evil.test', bose.url + '#seller']) invalid({ url });
  for (const url of ['https://images.craigslist.org.evil.test/photo.jpg', 'https://www.craigslist.org/photo.jpg',
    'https://images.craigslist.org/photo.svg', 'data:image/png;base64,AA', bose.photos[0].url + '?token=private']) {
    invalid({ photos: [{ ...bose.photos[0], url }] });
  }
  invalid({ sourceId: 'facebook-resale' });
  invalid({ photos: [] });
  invalid({ photos: [bose.photos[0], bose.photos[0]] });
});

test('public future Facebook and OfferUp records require their own platform attribution', () => {
  const facebook = { ...clone(), platform: 'facebook', sourceId: 'facebook-resale',
    url: 'https://www.facebook.com/marketplace/item/854019113637909/',
    photos: [{ ...bose.photos[0], url: 'https://scontent.fbcdn.net/public-photo.jpg' }] };
  const offerup = { ...clone(), platform: 'offerup', sourceId: 'offerup-resale',
    url: 'https://offerup.com/item/detail/qa-only-public-id',
    photos: [{ ...bose.photos[0], url: 'https://images.offerup.com/public-photo.jpg' }] };
  assert.equal(validResaleRecord(facebook), true);
  assert.equal(validResaleRecord(offerup), true);
  assert.equal(validResaleRecord({ ...facebook, url: 'https://www.facebook.com/profile.php?id=123' }), false);
  assert.equal(validResaleRecord({ ...offerup, url: 'https://offerup.com/profile/qa-only' }), false);
  assert.equal(validResaleRecord({ ...offerup, photos: bose.photos }), false);
  assert.equal(RESALE_RECORDS.filter(record => record.platform === 'facebook').length, 0);
});

test('unknown or private metadata and malformed nested evidence fail closed', () => {
  invalid({ sellerPhone: 'QA ONLY' });
  invalid({ coordinates: { latitude: 38, longitude: -121 } });
  invalid({ title: { ...bose.title, sellerId: 'QA ONLY' } });
  invalid({ title: { en: 'Only English' } });
  invalid({ tests: [] });
  invalid({ exactMatchCount: 1 });
  invalid({ comparisonStatus: 'confirmed' });
  invalid({ status: 'buy-now' });
  invalid({ soldComparisons: [{ ...bose.soldComparisons[0], url: 'https://www.ebay.com/sch/i.html' }] });
  invalid({ soldComparisons: [{ ...bose.soldComparisons[0], amountCents: 0 }] });
  invalid({ facebookComparisons: [{ ...bose.facebookComparisons[0], match: 'exact' }] });
  invalid({ facebookComparisons: [{ ...bose.facebookComparisons[0], actualSoldCents: 24000 }] });
  invalid({ newPriceReference: { ...bose.newPriceReference, url: 'https://localhost/file.pdf' } });
});

test('sold evidence preserves hidden Best Offer upper bounds and different condition/bundle limitations', () => {
  const upperBound = breville.soldComparisons.find(comp => comp.basis === 'accepted-offer-upper-bound');
  assert.ok(upperBound);
  assert.equal(upperBound.amountCents, 39999);
  assert.match(upperBound.notes.en, /hidden|upper bound/i);
  assert.equal(breville.soldComparisons[1].confidence, 'stronger-condition');
  assert.equal(dyson.soldComparisons[0].confidence, 'lower-bundle');
  assert.equal(dyson.soldComparisons[0].shippingCents, 2499);
  assert.equal(bose.newPriceReference?.basis, 'historical-catalog');
  assert.equal(bose.newPriceReference?.cents, 49900);
  assert.equal(breville.newPriceReference?.basis, 'current-new');
});

test('Facebook family asking prices remain separate from sold evidence and conservative resale ranges', () => {
  const family = breville.facebookComparisons.filter(comp => comp.match === 'related-family');
  assert.equal(family.length, 3);
  assert.equal(Math.round(family.reduce((sum, comp) => sum + comp.askingCents, 0) / family.length), 61667);
  assert.deepEqual([Math.min(...family.map(comp => comp.askingCents)), Math.max(...family.map(comp => comp.askingCents))], [60000, 65000]);
  assert.equal(bose.facebookComparisons[0].match, 'regional');
  assert.equal(dyson.facebookComparisons[0].match, 'different-bundle');
  assert.equal(breville.resaleHighCents, 42500);
  const withoutAsks = { ...breville, facebookComparisons: [] };
  assert.deepEqual(netCashRange(withoutAsks), netCashRange(breville));
});

test('canonical saved pointers roundtrip with category and omit photos, prices and seller metadata', () => {
  const pointer = resaleSavedPointer(bose, observed);
  assert.ok(pointer);
  assert.equal(pointer.category, 'audio');
  assert.equal(pointer.condition, 'used');
  assert.equal(pointer.offerId, 'resale:' + bose.id);
  assert.deepEqual(decodeSaved(JSON.stringify({ version: 1, listings: [pointer] })), [pointer]);
  for (const field of ['photos', 'askingCents', 'reserveCents', 'resaleLowCents', 'resaleHighCents', 'notes', 'soldComparisons', 'facebookComparisons']) {
    assert.equal(field in pointer, false);
  }
  const altered = { ...bose, title: { en: 'Altered supplied title', ru: 'Изменено' }, askingCents: 1 };
  assert.deepEqual(resaleSavedPointer(altered, observed), pointer);
  assert.equal(resaleSavedPointer({ ...bose, url: dyson.url }, observed), null);
  assert.equal(resaleSavedPointer({ ...bose, id: 'unknown' }, observed), null);
  assert.equal(resaleSavedPointer(bose, observed + RESALE_REVIEW_WINDOW_MS), null);
  assert.equal(resaleSavedPointer(bose, observed, [{ ...bose, archived: true }]), null);
  assert.equal(resaleSavedPointer(bose, observed, []), null);
  const malformed = { ...bose, askingCents: -1 } as ResaleListing;
  assert.equal(resaleSavedPointer(bose, observed, [malformed]), null);
});


test('verified OfferUp Scarlett identity, Reverb final prices and conservative cash estimate stay separate from Facebook', () => {
 const record=RESALE_RECORDS.find(item=>item.id==='ou-67f25112-1c5b-3527-90e0-a27adb77a57b');assert.ok(record);
 assert.equal(record.url,'https://offerup.com/item/detail/67f25112-1c5b-3527-90e0-a27adb77a57b');assert.equal(record.checkedAt,'2026-10-12T05:45:00Z');assert.equal(record.status,'conditional');
 assert.equal(record.askingCents,6000);assert.equal(record.reserveCents,1500);assert.deepEqual(netCashRange(record),{lowCents:5000,highCents:7000});
 assert.equal(record.facebookComparisons.length,0);assert.equal(record.comparisonStatus,'pending');
 assert.deepEqual(record.soldComparisons.map(item=>item.amountCents),[14000,15000,15000,16999]);assert.ok(record.soldComparisons.every(item=>item.source==='reverb'&&item.basis==='sold'&&item.shippingCents===null));
 assert.equal(record.photos.length,3);assert.ok(record.photos.every(photo=>new URL(photo.url).hostname==='images.offerup.com'));
 const pointer=resaleSavedPointer(record,Date.parse(record.checkedAt));assert.ok(pointer);assert.deepEqual(decodeSaved(JSON.stringify({version:1,listings:[pointer]})),[pointer]);
 for(const field of ['seller','seller_profile','sellerProfile','sellerId'])assert.equal(field in record,false);
 assert.equal(validResaleRecord({...record,soldComparisons:[{...record.soldComparisons[0],source:'ebay'}]}),false);
 assert.equal(validResaleRecord({...record,soldComparisons:[{...record.soldComparisons[0],url:'https://reverb.com/p/focusrite-2i2-4th-gen-usb-audio-interface'}]}),false);
 assert.equal(validResaleRecord({...record,soldComparisons:[{...record.soldComparisons[0],url:'https://reverb.com/shop/user'}]}),false);
});

test('Reverb-aware published schema includes OfferUp while old open pages retain compatible observations and ETags', async () => {
 const {GET}=await import('../app/api/resale-catalog/route.ts');
 const endpoint='https://example.test/api/resale-catalog';
 const current=await GET(new Request(endpoint,{headers:{'X-Resale-Schema':'2'}}));
 const legacy=await GET(new Request(endpoint));
 const currentBody=await current.json() as {records:ResaleListing[]},legacyBody=await legacy.json() as {records:ResaleListing[]};
 assert.ok(currentBody.records.some((record:ResaleListing)=>record.platform==='offerup'));
 assert.ok(legacyBody.records.every((record:ResaleListing)=>record.soldComparisons.every(sample=>sample.source===undefined&&new URL(sample.url).origin==='https://www.ebay.com')));
 assert.notEqual(current.headers.get('ETag'),legacy.headers.get('ETag'));
 assert.equal((await GET(new Request(endpoint,{headers:{'X-Resale-Schema':'2','If-None-Match':current.headers.get('ETag')!}}))).status,304);
 assert.equal((await GET(new Request(endpoint+'?force=1'))).status,400);
});

test('Miele modeled margin keeps displayed sold-price and exact model/voltage uncertainties', () => {
 const record=RESALE_RECORDS.find(item=>item.id==='cl-7981259568');assert.ok(record);
 assert.equal(record.url,'https://www.craigslist.org/view/d/roseville-vacuum-miele/j5SMj1Mu5H2Z5EVfpNe5yB');assert.equal(record.checkedAt,'2026-10-12T05:50:00Z');assert.equal(record.status,'conditional');
 assert.equal(record.askingCents,20000);assert.equal(record.reserveCents,5000);assert.deepEqual(netCashRange(record),{lowCents:10000,highCents:10000});
 assert.equal(record.facebookComparisons.length,0);assert.ok(record.soldComparisons.every(sample=>sample.basis==='displayed-sold-price'));
 assert.deepEqual(record.soldComparisons.map(sample=>sample.amountCents),[44900,58900]);assert.match(record.notes.en,/120V.*unverified/);assert.match(record.soldComparisons[0].notes.en,/not independently authenticated/);assert.equal(record.photos.length,5);
 assert.equal(new URL(record.dimensionsSource!).origin,'https://www.mieleusa.com');assert.equal(validResaleRecord({...record,dimensionsSource:'https://evil.test/profile'}),false);
});
