import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_FILTERS, displayDiscount, savings } from '../lib/offer.ts';
import type { Filters, Offer } from '../lib/offer.ts';
import { editPrice, parsePrice, validateRange } from '../lib/money.ts';
import { directionsUrl, filterAndSort, matches, milesBetween } from '../lib/filter.ts';
import { reconcileSnapshot } from '../lib/catalog.ts';

// Isolated artificial records: never imported by application code or migrations.
const now = Date.parse('2026-10-11T09:00:00Z');
const makeOffer = (id: string, current: number, comparison: number): Offer => ({
  id, sourceId: 'test-only', retailerId: 'test-retailer', sourceOfferId: id, variantKey: id,
  recordType: 'inventory', title: 'Test-only appliance', category: 'appliances', condition: 'open-box',
  cosmeticGrade: null, availability: 'available', priceCents: current, currency: 'USD',
  reference: { cents: comparison, currency: 'USD', basis: 'retailer-list', variantKey: id,
    observedAt: '2026-10-11T08:59:00Z', maxAgeSeconds: 300, sourceUrl: 'https://example.test/product' },
  url: 'https://example.test/product', imageUrl: null, imageAlt: null,
  pickup: null, shipping: { country: 'US', costCents: null, restrictions: null, eligibility: { scope: 'all-us', states: [], excludedStates: [] } }, localDelivery: null,
  observedAt: '2026-10-11T08:59:00Z', freshUntil: '2026-10-11T09:04:00Z',
});

test('USD decimal parsing preserves cents in both locales and refuses ambiguous formats', () => {
  for (const value of ['200.50', '200,50', ' 200,5 ']) assert.deepEqual(parsePrice(value), { ok: true, cents: 20050 });
  assert.deepEqual(parsePrice('0'), { ok: true, cents: 0 });
  assert.deepEqual(parsePrice(''), { ok: true, cents: null });
  for (const value of ['1,000', '1.000', '1,000.50', '1 000,50', '-1', '1e3', 'Infinity', '$2', '10000000']) assert.equal(parsePrice(value).ok, false);
  assert.equal(editPrice(20050, 'ru'), '200,50');
  assert.equal(validateRange(20050, 20049), 'invalid-range');
  assert.equal(validateRange(20050, 20050), null);
});

test('savings exclude stale, unmatched, zero and nonpositive references, and do not round nonfree offers to 100%', () => {
  const original = makeOffer('a', 10000, 20000);
  assert.deepEqual(savings(original, now), { cents: 10000, fraction: 0.5 });
  assert.equal(savings({ ...original, freshUntil: '2026-10-11T08:59:59Z' }, now), null);
  for (const reference of [null, { ...original.reference!, cents: 0 }, { ...original.reference!, cents: 10000 },
    { ...original.reference!, variantKey: 'other' }, { ...original.reference!, observedAt: '2026-10-11T08:00:00Z' },
    { ...original.reference!, observedAt: '2026-10-11T09:01:00Z' }]) assert.equal(savings({ ...original, reference }, now), null);
  assert.equal(displayDiscount(makeOffer('almost-free', 1, 100000), now), 99);
  assert.equal(displayDiscount(makeOffer('free', 0, 100000), now), 100);
});

test('percent and dollars sort differently using exact values, unknowns last, stable identity ties', () => {
  const highPercent = makeOffer('a', 10000, 20000), highDollars = makeOffer('b', 80000, 100000);
  const unknown = { ...makeOffer('c', 1, 2), reference: null };
  assert.deepEqual(filterAndSort([unknown, highDollars, highPercent], DEFAULT_FILTERS, 'percent', now).map(x => x.id), ['a', 'b', 'c']);
  assert.deepEqual(filterAndSort([unknown, highPercent, highDollars], DEFAULT_FILTERS, 'dollars', now).map(x => x.id), ['b', 'a', 'c']);
  assert.deepEqual(filterAndSort([makeOffer('z', 10, 20), makeOffer('a', 10, 20)], DEFAULT_FILTERS, 'percent', now).map(x => x.id), ['a', 'z']);
});

test('retailer OR and dimension AND, explicit none, inclusive cents and exact pickup radius', () => {
  const offer = makeOffer('a', 20050, 40000);
  const bounds = { ...DEFAULT_FILTERS, minCents: 20050, maxCents: 20050 };
  assert.equal(matches(offer, bounds), true);
  assert.equal(matches(offer, { ...bounds, retailers: { mode: 'selected', ids: [] } }), false);
  assert.equal(matches(offer, { ...bounds, retailers: { mode: 'selected', ids: ['other', 'test-retailer'] } }), true);
  assert.equal(matches(offer, { ...bounds, categories: { mode: 'selected', ids: ['audio'] } }), false);
  assert.equal(matches(offer, { ...bounds, maxCents: 20049 }), false);
  const local: Offer = { ...offer, shipping: null, pickup: { id: 'branch-a', name: 'Branch A', address: 'Verified branch address', point: { latitude: 38.6954643, longitude: -121.3617761 }, pickupVerified: true } };
  const distance = milesBetween(DEFAULT_FILTERS.origin, local.pickup!.point!)!;
  const pickup: Filters = { ...DEFAULT_FILTERS, fulfillment: 'pickup', radiusMiles: distance };
  assert.equal(matches(local, pickup), true);
  assert.equal(matches(local, { ...pickup, radiusMiles: distance - 0.001 }), false);
  assert.equal(matches({ ...local, pickup: { ...local.pickup!, pickupVerified: false } }, pickup), false);
  assert.equal(matches({ ...local, pickup: null, localDelivery: { description: 'Local delivery only', costCents: null } }, { ...DEFAULT_FILTERS, fulfillment: 'shipped' }), false);
  assert.equal(matches({ ...offer, availability: 'unavailable' }, DEFAULT_FILTERS), false);
});

test('Navigate targets the exact verified pickup branch and cannot become a retailer search', () => {
  const offer = { ...makeOffer('a', 10, 20), pickup: { id: 'branch', name: 'Elkhorn', address: '4353 Elkhorn Boulevard, Sacramento CA 95842', point: { latitude: 38.6954643, longitude: -121.3617761 }, pickupVerified: true } };
  const url = new URL(directionsUrl(offer)!);
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.pathname, '/maps/dir/');
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(url.searchParams.get('destination'), '38.6954643,-121.3617761');
  assert.equal(directionsUrl({ ...offer, pickup: null }), null);
});

test('percent ordering remains exact when distinct rational discounts round to the same float', () => {
  const higher = makeOffer('z', 500000000, 999999999);
  const lower = makeOffer('a', 499999999, 999999997);
  assert.equal(savings(higher, now)!.fraction, savings(lower, now)!.fraction);
  assert.deepEqual(filterAndSort([lower, higher], DEFAULT_FILTERS, 'percent', now).map(x => x.id), ['z', 'a']);
});

test('only complete snapshots can remove offers; other sources and changed exact units survive', () => {
  const first = makeOffer('a', 100, 200), second = makeOffer('b', 200, 400);
  const otherSource = { ...makeOffer('c', 300, 600), sourceId: 'other-source' };
  const changed = { ...first, priceCents: 99 };
  const partial = reconcileSnapshot([first, second, otherSource], { sourceId: 'test-only', complete: false, acquiredAt: '2026-10-11T09:00:00Z', offers: [changed] });
  assert.deepEqual(partial.offers.map(x => x.id), ['a', 'b', 'c']);
  assert.deepEqual(partial.delta, { added: [], changed: ['a'], removed: [] });
  const complete = reconcileSnapshot(partial.offers, { sourceId: 'test-only', complete: true, acquiredAt: '2026-10-11T09:01:00Z', offers: [changed] });
  assert.deepEqual(complete.offers.map(x => x.id), ['a', 'c']);
  assert.deepEqual(complete.delta.removed, ['b']);
  assert.throws(() => reconcileSnapshot([otherSource], { sourceId: 'test-only', complete: true, acquiredAt: '2026-10-11T09:01:00Z', offers: [{ ...otherSource, sourceId: 'test-only' }] }), /Cross-source/);
  assert.throws(() => reconcileSnapshot([], { sourceId: 'test-only', complete: true, acquiredAt: '2026-10-11T09:01:00Z', offers: [first, first] }), /duplicate/);
});
