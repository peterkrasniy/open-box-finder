import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapMerchantVariantResearch } from '../lib/server/research/merchant-variant.ts';
import { observeA4lUnitResearch } from '../lib/server/research/a4l-product.ts';
import { mapA4lObservation, mapA4lProbe } from '../lib/server/research/a4l-mapping.ts';
import { observeA4lUnit } from '../lib/server/a4l-preflight.ts';
import { structuredProducts } from '../lib/server/research/structured-products.ts';
import { observeDiscountProduct, DISCOUNT_TARGET } from '../lib/server/research/discount-product.ts';
import { mapDiscountProbe } from '../lib/server/research/discount-mapping.ts';
import { parseReason } from '../lib/server/parse-evidence.ts';
import { APPROVED_PREFLIGHTS } from '../lib/server/preflight.ts';
import type { PreflightObservation } from '../lib/server/preflight.ts';
import { APPROVED_POLICIES } from '../lib/server/publication.ts';
import { SOURCE_BY_ID } from '../lib/sources.ts';

// Entirely synthetic structures. No retained retailer HTML/catalog snapshot is represented here.
const checkedAt = '2026-10-11T15:00:00.000Z';
const script = (value: unknown) => `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
const offer = { '@type': 'Offer', price: '123.45', priceCurrency: 'USD', availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/RefurbishedCondition' };
const target = { url: 'https://discountelectronics.com/QA-ONLY/', sku: 'QA-ONLY-SKU', ownLabel: 'QA ONLY — bad USB port, as-is', disclosures: ['B-grade', 'Bad USB port', 'As-is'] };
const product = { '@type': 'Product', sku: target.sku, url: target.url, offers: offer };
const unitUrl = 'https://www.appliances4less-sac.com/p/QA-ONLY-MODEL/u/QA-ONLY-UNIT-A';
const unitProduct = { ...product, url: unitUrl, name: 'QA ONLY appliance', sku: 'QA-ONLY-UNIT-SKU', model: 'QA-ONLY-MODEL' };
const observation = (sourceId: PreflightObservation['sourceId']): PreflightObservation => ({
  sourceId, checkedAt, notBefore: '2026-10-11T19:00:00.000Z', outcome: 'unsupported', httpStatus: 200,
  catalogComplete: false, discoveredUnits: 0, units: [], feed: null, product: null, diagnostics: [],
});
const reason = (code: string) => (error: unknown) => parseReason(error, 'parser-unclassified') === code;

test('offline merchant variant projection uses the selected variant and keeps unproven commerce facts unknown', () => {
  const value = { id: 9001, price: 1, price_min: 1, price_max: 999999, tags: ['Open Box'], variants: [
    { id: 9002, price: 12345, compare_at_price: 20000, available: true, requires_shipping: true },
    { id: 9003, price: 500, compare_at_price: null, available: false },
  ] };
  const context = { merchantOrigin: 'https://qa-only.test', observedAt: checkedAt, presentmentCurrency: null };
  const mapped = mapMerchantVariantResearch(value, '9002', context);
  assert.equal(mapped.priceMinorUnits, 12345); assert.equal(mapped.compareAtMinorUnits, 20000);
  assert.equal(mapped.currency, null); assert.equal(mapped.referenceBasis, null); assert.equal(mapped.orderable, true);
  assert.equal(mapped.productConditionTag, 'open-box'); assert.equal(mapped.variantCondition, null);
  assert.equal(mapped.requiresShipping, true); assert.equal(mapped.appApiUseApproved, false);
  for (const key of ['quantity', 'physicalUnitIdentity', 'shippingEligibility', 'pickup', 'imageUrl'] as const) assert.equal(mapped[key], null);
  const changed = mapMerchantVariantResearch({ ...value, variants: [{ ...value.variants[0], price: 9000 }] }, '9002', { ...context, presentmentCurrency: 'USD' });
  assert.equal(changed.identity, mapped.identity); assert.equal(changed.currency, 'USD');
  assert.notEqual(mapMerchantVariantResearch(value, '9003', context).identity, mapped.identity);
  assert.notEqual(mapMerchantVariantResearch(value, '9002', { ...context, merchantOrigin: 'https://other-qa.test' }).identity, mapped.identity);
});

test('variant mapping rejects duplicate/missing identity and unsafe or fractional amount/context', () => {
  const variant = { id: 9002, price: 12345 };
  const context = { merchantOrigin: 'https://qa-only.test', observedAt: checkedAt, presentmentCurrency: 'USD' };
  for (const variants of [[], [variant, variant], [{ ...variant, price: 1.5 }], [{ ...variant, price: Number.MAX_SAFE_INTEGER + 1 }]]) {
    assert.throws(() => mapMerchantVariantResearch({ id: 9001, variants }, '9002', context));
  }
  assert.throws(() => mapMerchantVariantResearch({ id: 9001, variants: [variant] }, '9002', { ...context, merchantOrigin: 'https://qa-only.test/private' }));
  assert.throws(() => mapMerchantVariantResearch({ id: Number.MAX_SAFE_INTEGER + 1, variants: [variant] }, '9002', context));
});

test('A4L research interpretation selects exact units from model graphs and matching duplicate blocks', () => {
  const model = { '@type': 'Product', url: 'https://www.appliances4less-sac.com/p/QA-ONLY-MODEL', sku: 'QA-ONLY-MODEL', offers: { '@type': 'AggregateOffer', lowPrice: '1', highPrice: '9999' } };
  const mixed = script({ '@graph': [model, unitProduct] });
  // Reproduces old parser false negatives; it does not identify the discarded hosted response format.
  assert.throws(() => observeA4lUnit(mixed, unitUrl), reason('product-not-unique'));
  assert.throws(() => observeA4lUnit(script([unitProduct, unitProduct]), unitUrl), reason('product-not-unique'));
  assert.equal(observeA4lUnitResearch(mixed, unitUrl).currentCents, 12345);
  assert.equal(observeA4lUnitResearch(script([unitProduct, unitProduct]), unitUrl).unitId, 'QA-ONLY-UNIT-A');
  assert.throws(() => observeA4lUnitResearch(script(model), unitUrl), reason('product-canonical-missing'));
  assert.throws(() => observeA4lUnitResearch(script([unitProduct, { ...unitProduct, offers: { ...offer, price: '124' } }]), unitUrl), reason('product-conflict'));
});

test('bounded JSON-LD resolves only local Offer references, rejecting conflicts and aggregate prices', () => {
  const linked = { ...unitProduct, offers: { '@id': '#qa-offer' } };
  const definition = { ...offer, '@id': '#qa-offer' };
  assert.equal(observeA4lUnitResearch(script({ '@graph': [linked, definition] }), unitUrl).currentCents, 12345);
  assert.throws(() => observeA4lUnitResearch(script({ '@graph': [linked, definition, { ...definition, price: '1' }] }), unitUrl), reason('product-reference'));
  assert.throws(() => observeA4lUnitResearch(script(linked), unitUrl), reason('product-reference'));
  assert.throws(() => observeA4lUnitResearch(script({ ...unitProduct, offers: { '@type': 'AggregateOffer', lowPrice: '1' } }), unitUrl), reason('product-price-identity'));
  assert.throws(() => structuredProducts(script({ '@graph': Array.from({ length: 101 }, () => unitProduct) })), reason('product-count'));
  assert.throws(() => structuredProducts('x'.repeat(1048577)), reason('html-size'));
});

test('exact-unit mappings keep same-model physical units separate and retain only supported condition', async () => {
  const unit = observeA4lUnitResearch(script({ ...unitProduct, offers: { ...offer, itemCondition: 'https://schema.org/UsedCondition' } }), unitUrl);
  const first = await mapA4lObservation(unit, checkedAt);
  const second = await mapA4lObservation({ ...unit, url: unitUrl.replace('UNIT-A', 'UNIT-B'), unitId: 'QA-ONLY-UNIT-B' }, checkedAt);
  assert.notEqual(first.id, second.id);
  assert.equal((await mapA4lObservation({ ...unit, currentCents: 10000 }, checkedAt)).id, first.id);
  assert.equal(first.condition, 'used'); assert.equal(first.reference, null); assert.equal(first.pickup, null); assert.equal(first.imageUrl, null);
  assert.equal((await mapA4lObservation({ ...unit, itemCondition: null }, checkedAt)).condition, 'unspecified');
  const held = await mapA4lProbe(observation('a4l-sac'));
  assert.deepEqual(held, { ok: false, stopAutomatic: true, minimumNextCheckSeconds: 14400 });
  const result = await mapA4lProbe({ ...observation('a4l-sac'), outcome: 'observed', units: [unit] });
  assert.equal(result.ok, true); if (result.ok) { assert.equal(result.complete, false); assert.equal(result.offers.length, 1); }
  await assert.rejects(() => mapA4lProbe({ ...observation('a4l-sac'), outcome: 'observed', units: [unit, unit] }));
});

test('Discount product duplicates collapse to facts with explicit defects, no inferred quantity/media/savings/pickup', () => {
  const html = '<p>This item is no longer available</p>' + script({ ...product, name: 'PRIVATE QA PROSE', description: 'PRIVATE QA BODY', image: 'https://media-qa.test/photo.jpg' }) + script(product);
  const actual = observeDiscountProduct(html, target);
  assert.equal(actual.currentCents, 12345); assert.equal(actual.availability, 'orderable'); assert.equal(actual.matchingBlocks, 2);
  assert.deepEqual(actual.disclosures, ['B-grade', 'Bad USB port', 'As-is']);
  for (const key of ['physicalUnitIdentity', 'quantity', 'reference', 'pickup', 'shippingEligibility', 'imageUrl'] as const) assert.equal(actual[key], null);
  assert.equal(JSON.stringify(actual).includes('PRIVATE'), false); assert.equal(JSON.stringify(actual).includes('media-qa'), false);
  assert.equal(observeDiscountProduct(script({ ...product, offers: { ...offer, availability: 'https://schema.org/OutOfStock' } }), target).availability, 'unavailable');
  assert.equal(observeDiscountProduct(script({ ...product, offers: { ...offer, availability: 'https://schema.org/PreOrder' } }), target).availability, 'unknown');
});

test('Discount facts reject contradictory blocks, identity, currency, condition and challenge responses', () => {
  for (const changed of [{ ...product, offers: { ...offer, price: '124' } }, { ...product, offers: { ...offer, availability: 'https://schema.org/OutOfStock' } }]) {
    assert.throws(() => observeDiscountProduct(script([product, changed]), target), reason('product-conflict'));
  }
  assert.throws(() => observeDiscountProduct(script({ ...product, sku: 'OTHER-QA' }), target), reason('product-not-unique'));
  assert.throws(() => observeDiscountProduct(script({ ...product, url: 'https://discountelectronics.com/OTHER-QA/' }), target), reason('product-canonical-mismatch'));
  assert.throws(() => observeDiscountProduct(script({ ...product, offers: { ...offer, priceCurrency: 'CAD' } }), target), reason('product-price-identity'));
  assert.throws(() => observeDiscountProduct(script({ ...product, offers: { ...offer, price: ['123.45'] } }), target), reason('product-price-identity'));
  assert.throws(() => observeDiscountProduct(script({ ...product, offers: { ...offer, price: '123.456' } }), target), reason('product-price'));
  assert.throws(() => observeDiscountProduct(script({ ...product, offers: { ...offer, itemCondition: undefined } }), target), reason('product-condition'));
  assert.throws(() => observeDiscountProduct('<title>Just a moment...</title><script src="/cdn-cgi/challenge-platform/QA"></script>' + script(product), target), reason('response-challenge'));
});

test('prepared Discount mapping is partial SKU stock with caveats and exactly one private review, no public grant', async () => {
  const facts = observeDiscountProduct(script({ ...product, sku: DISCOUNT_TARGET.sku, url: DISCOUNT_TARGET.url }));
  const result = await mapDiscountProbe({ ...observation('discount-electronics'), outcome: 'observed', product: facts });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.complete, false); assert.equal(result.offers.length, 1); assert.equal(result.offers[0].sourceOfferId, DISCOUNT_TARGET.sku);
    assert.equal(result.offers[0].cosmeticGrade, 'B-grade; Bad USB port; As-is'); assert.equal(result.offers[0].condition, 'refurbished');
    for (const key of ['reference', 'imageUrl', 'pickup', 'shipping', 'localDelivery'] as const) assert.equal(result.offers[0][key], null);
  }
  assert.deepEqual(await mapDiscountProbe(observation('discount-electronics')), { ok: false, stopAutomatic: true, minimumNextCheckSeconds: 14400 });
  assert.deepEqual(APPROVED_PREFLIGHTS.filter(grant => grant.sourceId === 'discount-electronics'), [{ sourceId: 'discount-electronics', reviewedAt: '2026-10-11T15:12:57.000Z' }]);
  assert.equal(APPROVED_POLICIES.size, 0); assert.equal(SOURCE_BY_ID.get('discount-electronics')?.enabled, false);
});
