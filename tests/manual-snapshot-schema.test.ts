import assert from 'node:assert/strict';
import { test } from 'node:test';
import records from '../data/manual-records.json' with { type: 'json' };
import { validManualSnapshot } from '../lib/manual-snapshot-schema.ts';
import { manualFulfillmentMatches, manualProductActive } from '../lib/manual-products.ts';
import type { ManualProduct } from '../lib/manual-products.ts';
import { DEFAULT_FILTERS } from '../lib/offer.ts';

const legacy = records.find(record => record.sourceId === 'newegg-manual' && record.scopeKey === 'legacy-selected');
assert.ok(legacy, 'Use a real legacy Newegg record as the validation fixture.');
const reviewedAt = '2026-10-12T00:00:00.000Z';
const reviewUntil = '2026-10-13T00:00:00.000Z';
const reviewed = Date.parse(reviewedAt);

function fixture(): ManualProduct {
  return { ...structuredClone(legacy) as ManualProduct, reviewedAt, reviewUntil };
}
function candidate(overrides: Record<string, unknown> = {}) {
  return { ...fixture(), ...overrides };
}
function shipping(overrides: Record<string, unknown> = {}) {
  return { country: 'US', costCents: 0, restrictions: null,
    eligibility: { scope: 'all-us', states: [], excludedStates: [] }, ...overrides };
}
function pickup(overrides: Record<string, unknown> = {}) {
  return { id: 'verified-store', name: 'Verified retailer location', address: '100 Main Street, Rocklin, CA',
    point: { latitude: 38.7907, longitude: -121.2358 }, pickupVerified: true, ...overrides };
}
function rejected(value: unknown, label: string) {
  assert.doesNotThrow(() => validManualSnapshot(value), `${label}: validation must fail closed without throwing`);
  assert.equal(validManualSnapshot(value), false, label);
}

test('every raw imported snapshot passes validation before catalog filtering can hide invalid records', () => {
  assert.ok(records.length > 0);
  for (const record of records) assert.equal(validManualSnapshot(record), true, `${record.sourceId}:${record.id}`);
  assert.equal(validManualSnapshot(fixture()), true, 'Legacy snapshots remain accepted.');
  for (const sourceId of ['cuckoo-manual', 'epson-manual']) {
    assert.ok(records.some(record => record.sourceId === sourceId), `${sourceId} import is present.`);
  }
});

test('untrusted top-level values and inventory claims cannot become manual snapshots', () => {
  for (const value of [null, false, 0, '', [], {}, 'snapshot']) rejected(value, `top-level ${JSON.stringify(value)}`);
  for (const overrides of [
    { recordType: 'inventory' }, { availability: 'available' }, { currency: 'EUR' },
    { observedStock: 'unknown' }, { category: 'unknown' }, { condition: 'factory-new' },
    { sourceId: 'unknown-retailer' }, { id: '' }, { brand: '' }, { model: '' },
    { productKey: '' }, { scopeKey: '' }, { id: 'x'.repeat(161) }, { model: 'x'.repeat(501) },
  ]) rejected(candidate(overrides), JSON.stringify(overrides));
});

test('prices require positive bounded integer cents and references stay attached to the exact listing', () => {
  for (const observedPriceCents of [0, -1, 1.5, NaN, Infinity, '27999', null, 100_000_001, Number.MAX_SAFE_INTEGER]) {
    rejected(candidate({ observedPriceCents }), `observed cents ${String(observedPriceCents)}`);
  }
  assert.equal(validManualSnapshot(candidate({ observedPriceCents: 1 })), true);
  assert.equal(validManualSnapshot(candidate({ observedPriceCents: 100_000_000 })), true);
  const url = fixture().url;
  for (const [field, basis] of [['retailerComparison', 'retailer-comparison'], ['referencePrice', 'retailer-was']] as const) {
    assert.equal(validManualSnapshot(candidate({ [field]: { cents: 39999, basis, url } })), true);
    rejected(candidate({ [field]: { cents: 0, basis, url } }), `${field} zero cents`);
    rejected(candidate({ [field]: { cents: 39999, basis, url: `${url}&Item=UNRELATED` } }), `${field} mismatched listing`);
    rejected(candidate({ [field]: { cents: 39999, basis: 'msrp', url } }), `${field} unsupported comparison basis`);
  }
  rejected(candidate({ newModelReference: { cents: 0, basis: 'observed-new-model', url: 'https://www.hp.com/us-en/home.html' } }), 'new model zero cents');
  rejected(candidate({ newModelReference: { cents: 39999, basis: 'observed-new-model', url: 'http://www.hp.com/us-en/home.html' } }), 'new model unsafe URL');
});

test('review timestamps are typed and the exclusive active window never exceeds 24 hours', () => {
  for (const overrides of [
    { reviewedAt: 'not-a-date' }, { reviewUntil: 'not-a-date' },
    { reviewedAt: 2026, reviewUntil: '2026-01-02T00:00:00Z' },
    { reviewedAt: '2025-12-31T00:00:00Z', reviewUntil: 2026 },
    { reviewedAt: '2026-10-12' }, { reviewUntil: reviewedAt },
    { reviewUntil: '2026-10-11T23:59:59.999Z' }, { reviewUntil: '2026-10-13T00:00:00.001Z' },
  ]) rejected(candidate(overrides), JSON.stringify(overrides));
  const product = fixture();
  assert.equal(validManualSnapshot(product), true);
  assert.equal(manualProductActive(product, reviewed - 1), false);
  assert.equal(manualProductActive(product, reviewed), true);
  assert.equal(manualProductActive(product, Date.parse(reviewUntil) - 1), true);
  assert.equal(manualProductActive(product, Date.parse(reviewUntil)), false);
});

test('photos require the retailer-specific host and exact PDP attribution including item query', () => {
  const product = fixture();
  for (const url of [
    'http://c1.neweggimages.com/photo.jpg', 'https://c1.neweggimages.com.attacker.example/photo.jpg',
    'https://target.scene7.com/photo.jpg', 'https://user:password@c1.neweggimages.com/photo.jpg',
    'https://c1.neweggimages.com:8443/photo.jpg', 'https://localhost/photo.jpg',
    'data:image/png;base64,AAAA', '/local-photo.png',
  ]) rejected(candidate({ image: { ...product.image, url } }), `photo ${url}`);
  const differentItem = new URL(product.url);
  differentItem.searchParams.set('Item', 'UNRELATED');
  for (const listingUrl of [
    'https://www.newegg.com/p/UNRELATED', 'https://www.target.com/p/other/-/A-1234', differentItem.href,
  ]) rejected(candidate({ image: { ...product.image, listingUrl } }), `photo attribution ${listingUrl}`);
  for (const alt of [null, {}, { en: 'Laptop' }, { en: '', ru: 'Ноутбук' }, { en: 'Laptop', ru: 123 }]) {
    rejected(candidate({ image: { ...product.image, alt } }), `photo alt ${JSON.stringify(alt)}`);
  }
  for (const dimension of [0, -1, 1.5, 20001, '640']) {
    for (const field of ['width', 'height']) rejected(candidate({ image: { ...product.image, [field]: dimension } }), `${field} ${dimension}`);
  }
  assert.equal(validManualSnapshot(candidate({ image: { ...product.image, width: 20000, height: 1 } })), true);
  const sennheiser = records.find(record => record.sourceId === 'sennheiser-manual');
  assert.ok(sennheiser);
  assert.equal(validManualSnapshot(sennheiser), true, 'Legacy Sennheiser variant photo query remains attributed to its exact PDP path.');
});

test('source, evidence, and historical URLs reject private or unrelated destinations', () => {
  for (const url of [
    'https://attacker.example/p/1TS-000D-1TE80', 'https://www.newegg.com/account/login',
    'http://www.newegg.com/p/1TS-000D-1TE80', 'https://www.newegg.com:8443/p/1TS-000D-1TE80',
  ]) {
    rejected(candidate({ url, image: { ...fixture().image, listingUrl: url } }), `listing ${url}`);
    rejected(candidate({ stockEvidence: { url, detail: 'Retailer displays stock for this listing.' } }), `evidence ${url}`);
    rejected(candidate({ previousUrls: [url] }), `history ${url}`);
  }
  assert.equal(validManualSnapshot(candidate({ stockEvidence: { url: fixture().url, detail: 'In stock', context: 'Selected configuration' }, previousUrls: [fixture().url] })), true);
  rejected(candidate({ stockEvidence: { url: 'https://www.newegg.com/p/UNRELATED', detail: 'In stock' } }), 'A different listing cannot support this product\'s observed stock.');
  rejected(candidate({ stockEvidence: { url: fixture().url, detail: '' } }), 'empty evidence');
  rejected(candidate({ previousUrls: Array.from({ length: 51 }, () => fixture().url) }), 'unbounded link history');
  for (const previousUrls of [false, 0, '', null]) rejected(candidate({ previousUrls }), `link history ${JSON.stringify(previousUrls)}`);
});

test('retailer catalog pages and empty product slugs cannot be attributed as exact product pages', () => {
  for (const [sourceId, url] of [
    ['epson-manual', 'https://epson.com/Certified-ReNew/c/cc'],
    ['cuckoo-manual', 'https://cuckooamerica.com/collections/certified-renewed/products/'],
  ]) {
    const product = records.find(record => record.sourceId === sourceId);
    assert.ok(product, `${sourceId} fixture exists.`);
    rejected({ ...product, url, stockEvidence: undefined, image: { ...product.image, listingUrl: url } }, `${sourceId} non-PDP ${url}`);
  }
});

test('archives remain addressable but never active, and require a typed timestamp and known reason', () => {
  for (const reason of ['confirmed-unavailable', 'absent-from-complete-scope'] as const) {
    const archived = { ...fixture(), archived: { at: reviewedAt, reason } };
    assert.equal(validManualSnapshot(archived), true);
    assert.equal(manualProductActive(archived, reviewed + 1), false);
  }
  for (const archived of [{ at: 'bad-date', reason: 'confirmed-unavailable' },
    { at: 2026, reason: 'confirmed-unavailable' }, { at: reviewedAt, reason: 'unverified' }, {}]) {
    rejected(candidate({ archived }), `archive ${JSON.stringify(archived)}`);
  }
});

test('optional structured metadata rejects falsy scalars and arrays instead of silently treating them as absent', () => {
  for (const field of ['stockEvidence', 'archived', 'shipping', 'pickup', 'referencePrice', 'retailerComparison', 'newModelReference']) {
    for (const value of [false, 0, '', null, []]) rejected(candidate({ [field]: value }), `${field} ${JSON.stringify(value)}`);
  }
  for (const value of [false, 0, '', null, []]) rejected(candidate({ shipping: shipping({ eligibility: value }) }), `eligibility ${JSON.stringify(value)}`);
  for (const value of [false, 0, '', []]) rejected(candidate({ pickup: pickup({ point: value }) }), `pickup point ${JSON.stringify(value)}`);
});

test('shipping evidence accepts supported policies and fails closed for malformed state eligibility', () => {
  assert.equal(validManualSnapshot(candidate({ shipping: shipping() })), true);
  assert.equal(validManualSnapshot(candidate({ shipping: shipping({ costCents: null, restrictions: 'No delivery to AK or HI.', eligibility: { scope: 'all-us', states: [], excludedStates: ['AK', 'HI'] } }) })), true);
  assert.equal(validManualSnapshot(candidate({ shipping: shipping({ eligibility: { scope: 'states', states: ['CA', 'DC'], excludedStates: [] } }) })), true);
  for (const overrides of [{ country: 'CA' }, { costCents: -1 }, { costCents: 0.5 }, { costCents: '0' },
    { restrictions: 0 }, { eligibility: {} }, { eligibility: { scope: 'international', states: [], excludedStates: [] } },
    { eligibility: { scope: 'states', states: 'CA', excludedStates: [] } },
    { eligibility: { scope: 'states', states: ['XX'], excludedStates: [] } },
    { eligibility: { scope: 'states', states: ['ca'], excludedStates: [] } },
    { eligibility: { scope: 'all-us', states: [], excludedStates: ['Puerto Rico'] } },
    { eligibility: { scope: 'states', states: [123], excludedStates: [] } },
  ]) rejected(candidate({ shipping: shipping(overrides) }), `shipping ${JSON.stringify(overrides)}`);
  const product = { ...fixture(), shipping: { country: 'US' as const, costCents: null, restrictions: null,
    eligibility: { scope: 'states' as const, states: ['CA'], excludedStates: ['AK'] } } };
  const shipped = { ...structuredClone(DEFAULT_FILTERS), fulfillment: 'shipped' as const };
  assert.equal(manualFulfillmentMatches(product, shipped), true);
  assert.equal(manualFulfillmentMatches(product, { ...shipped, origin: { ...shipped.origin, shippingState: 'AK' } }), false);
  assert.equal(manualFulfillmentMatches(product, { ...shipped, origin: { ...shipped.origin, shippingState: 'NV' } }), false);
  assert.equal(manualFulfillmentMatches(product, { ...shipped, origin: { ...shipped.origin, shippingState: null } }), false);
  assert.equal(manualFulfillmentMatches(fixture(), shipped), false, 'Shipping without destination evidence stays unknown.');
});

test('pickup requires typed store data and valid coordinates, and unverified stores never satisfy pickup filters', () => {
  assert.equal(validManualSnapshot(candidate({ pickup: pickup() })), true);
  assert.equal(validManualSnapshot(candidate({ pickup: pickup({ point: null, pickupVerified: false }) })), true);
  for (const overrides of [{ id: '' }, { name: '' }, { address: '' }, { pickupVerified: 'true' },
    { point: { latitude: 91, longitude: 0 } }, { point: { latitude: 0, longitude: -181 } },
    { point: { latitude: '38.7907', longitude: -121.2358 } },
    { point: { latitude: NaN, longitude: 0 } }, { point: { latitude: 0, longitude: Infinity } },
    { point: {} },
  ]) rejected(candidate({ pickup: pickup(overrides) }), `pickup ${JSON.stringify(overrides)}`);
  const missingPoint = pickup();
  const { point, ...withoutPoint } = missingPoint;
  assert.ok(point);
  rejected(candidate({ pickup: withoutPoint }), 'Store point must be an explicit coordinate object or null.');
  const product = { ...fixture(), pickup: { id: 'store', name: 'Store', address: 'Address',
    point: { latitude: 38.7907, longitude: -121.2358 }, pickupVerified: true } };
  const local = { ...structuredClone(DEFAULT_FILTERS), fulfillment: 'pickup' as const };
  assert.equal(manualFulfillmentMatches(product, local), true);
  assert.equal(manualFulfillmentMatches({ ...product, pickup: { ...product.pickup, pickupVerified: false } }, local), false);
  assert.equal(manualFulfillmentMatches({ ...product, pickup: { ...product.pickup, point: null } }, local), false);
  assert.equal(manualFulfillmentMatches(fixture(), local), false);
});

test('Best Buy snapshots accept only modern exact open-box pages with an explicit supported grade', () => {
  const url = 'https://www.bestbuy.com/product/schema-test-product/ABC123/sku/1234567/openbox?condition=excellent';
  const product = candidate({ sourceId: 'best-buy', condition: 'open-box', url,
    image: { ...fixture().image, url: 'https://pisces.bbystatic.com/image2/BestBuy_US/images/products/1234/1234567_sd.jpg', listingUrl: url },
    retailerComparison: undefined });
  assert.equal(validManualSnapshot(product), true);
  for (const url of [
    'https://www.bestbuy.com/site/searchpage.jsp',
    'https://www.bestbuy.com/site/product/1234567.p?condition=excellent',
    'https://www.bestbuy.com/product/schema-test-product/ABC123/sku/1234567',
    'https://www.bestbuy.com/product/schema-test-product/ABC123/sku/1234567/openbox',
    'https://www.bestbuy.com/product/schema-test-product/ABC123/sku/1234567/openbox?condition=new',
  ]) rejected({ ...product, url, image: { ...product.image, listingUrl: url } }, `Best Buy URL ${url}`);
  rejected({ ...product, condition: 'refurbished' }, 'Best Buy open-box page cannot support a refurbished condition claim');
  rejected({ ...product, image: { ...product.image, listingUrl: url.replace('excellent', 'fair') } }, 'Best Buy photo attributed to a different selected grade');
});
