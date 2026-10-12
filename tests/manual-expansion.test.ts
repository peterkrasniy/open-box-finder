import assert from 'node:assert/strict';
import { test } from 'node:test';
import { manualProductActive, manualProductsForFilters as filterPublished, manualSavedPointer as savePublished, manualSupportedReference } from '../lib/manual-products.ts';
import { decodeSaved, defaultPreferences, savedSourceUrl } from '../lib/storage.ts';
import { SOURCE_BY_ID } from '../lib/sources.ts';

import fixture from './fixtures/manual-products-v19.json' with { type: 'json' };
import type { ManualProduct } from '../lib/manual-products.ts';
// Dated regression evidence stays fixed while the published catalog is refreshed.
const MANUAL_PRODUCTS = fixture as unknown as readonly ManualProduct[];
const manualProductsForFilters = (...args: Parameters<typeof filterPublished>) => filterPublished(args[0], args[1], args[2], MANUAL_PRODUCTS);
const manualSavedPointer = (product: ManualProduct, now: number) => savePublished(product, now, MANUAL_PRODUCTS);
const EXPANDED_MANUAL_PRODUCTS = MANUAL_PRODUCTS.filter(product => product.sourceId !== 'sennheiser-manual');

const now = Date.parse('2026-10-12T02:30:00Z');
const filters = defaultPreferences().filters;
test('expanded snapshots have exact safe source/image attribution, short review windows and no enabled inventory connection', () => {
  assert.ok(EXPANDED_MANUAL_PRODUCTS.length >= 10);
  for (const record of EXPANDED_MANUAL_PRODUCTS) {
    assert.equal(manualProductActive(record, now), true, record.id);
    assert.equal(record.recordType, 'manual-observation');
    assert.equal(record.availability, 'unknown');
    assert.equal(record.observedStock, 'available');
    assert.equal(savedSourceUrl(record.sourceId, record.url), record.url);
    assert.equal(record.image.listingUrl, record.url);
    assert.equal(new URL(record.image.url).protocol, 'https:');
    assert.ok(record.image.alt.en && record.image.alt.ru);
    const source = SOURCE_BY_ID.get(record.sourceId)!;
    assert.equal(source.presentation, 'manual-curation');
    assert.equal(source.enabled, false);
    assert.equal(source.catalogUrl, null);
    assert.equal(manualProductActive(record, Date.parse(record.reviewUntil)), false);
    assert.equal(manualProductActive({ ...record, reviewUntil: '2026-10-20T00:00:00Z' }, now), false);
    assert.equal(manualProductActive({ ...record, url: 'https://attacker.example/p/product' }, now), false);
    const pointer = manualSavedPointer(record, now)!;
    assert.deepEqual(decodeSaved(JSON.stringify({ version: 1, listings: [pointer] })), [pointer]);
    for (const field of ['image', 'observedPriceCents', 'shipping', 'referencePrice', 'retailerComparison']) assert.equal(field in pointer, false);
  }
});
test('shipping filters require destination evidence, respect excluded states, and never invent a pickup store', () => {
  const shipped = manualProductsForFilters({ ...filters, fulfillment: 'shipped' }, 'price-low', now);
  assert.ok(shipped.some(product => product.sourceId === 'direct-tools-manual'));
  assert.ok(shipped.some(product => product.sourceId === 'dyson-manual'));
  assert.ok(shipped.every(product => ['direct-tools-manual', 'dyson-manual'].includes(product.sourceId)));
  const alaska = manualProductsForFilters({ ...filters, fulfillment: 'shipped', origin: { ...filters.origin, shippingState: 'AK' } }, 'price-low', now);
  assert.ok(alaska.length && alaska.every(product => product.sourceId === 'dyson-manual'));
  assert.deepEqual(manualProductsForFilters({ ...filters, fulfillment: 'pickup' }, 'percent', now), []);
  const computer = manualProductsForFilters({ ...filters, categories: { mode: 'selected', ids: ['computers'] }, maxCents: 27500 }, 'price-low', now);
  assert.equal(computer.length, 1);
  assert.equal(computer[0].id, 'hp-prodesk-405-g8-n82e16883974001');
  const tools = manualProductsForFilters({ ...filters, retailers: { mode: 'selected', ids: ['direct-tools-manual'] } }, 'price-low', now);
  assert.ok(tools.length >= 4 && tools.every(product => product.sourceId === 'direct-tools-manual'));
});
test('only explicitly identified same-listing retailer references drive savings sorting', () => {
  const ranked = manualProductsForFilters(filters, 'percent', now);
  const supported = ranked.filter(product => manualSupportedReference(product, now));
  assert.ok(supported.length >= 4);
  const values = supported.map(product => manualSupportedReference(product, now)!.fraction);
  assert.deepEqual(values, [...values].sort((a, b) => b - a));
  const laptop = EXPANDED_MANUAL_PRODUCTS.find(product => product.sourceId === 'newegg-manual')!;
  assert.equal(manualSupportedReference(laptop, now), null);
  const checked = supported[0];
  assert.equal(manualSupportedReference({ ...checked, referencePrice: { ...checked.referencePrice!, url: 'https://unrelated.example/p/' } }, now), null);
  assert.equal(manualSupportedReference(checked, Date.parse(checked.reviewUntil)), null);
  const prior = MANUAL_PRODUCTS.find(product => product.id === 'accentum-plus-refurbished')!;
  assert.equal(manualSavedPointer(prior, now)!.offerId, 'manual:accentum-plus-refurbished');
  assert.equal(manualSavedPointer(prior, now)!.sourceId, 'sennheiser-manual');
  assert.equal(savedSourceUrl('newegg-manual', 'https://www.newegg.com/myaccount/login'), null);
  assert.equal(savedSourceUrl('target-manual', 'https://www.target.com/account'), null);
});
