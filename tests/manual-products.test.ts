import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MANUAL_PRODUCTS, manualRetailerComparison, manualNewModelComparison, manualProductActive, manualProductsForFilters, manualSavedPointer } from '../lib/manual-products.ts';
import { defaultPreferences, decodeSaved, savedSourceUrl } from '../lib/storage.ts';
import { SOURCE_BY_ID } from '../lib/sources.ts';
import { validOffer } from '../lib/validation.ts';

const product = MANUAL_PRODUCTS[0];
const reviewed = Date.parse(product.reviewedAt);
test('retailer comparison notes retain ambiguous basis, expire and never change savings order or saved pointers', () => {
  assert.deepEqual(manualRetailerComparison(product, reviewed), { cents: product.retailerComparison.cents, url: product.url });
  assert.equal(manualRetailerComparison(product, Date.parse(product.reviewUntil)), null);
  assert.equal(manualRetailerComparison({ ...product, retailerComparison: { ...product.retailerComparison, cents: product.observedPriceCents } }, reviewed), null);
  assert.equal(manualRetailerComparison({ ...product, retailerComparison: { ...product.retailerComparison, url: 'https://unrelated.test/' } }, reviewed), null);
  assert.equal(manualRetailerComparison({ ...product, retailerComparison: { ...product.retailerComparison, cents: Infinity } }, reviewed), null);
  const filters = defaultPreferences().filters;
  assert.deepEqual(manualProductsForFilters(filters, 'percent', reviewed).map(note => note.id), MANUAL_PRODUCTS.map(note => note.id));
  assert.deepEqual(manualProductsForFilters(filters, 'dollars', reviewed).map(note => note.id), MANUAL_PRODUCTS.map(note => note.id));
  assert.equal('retailerComparison' in manualSavedPointer(product, reviewed)!, false);
});
test('new-model references have a bounded explicit basis and equal prices do not claim a discount', () => {
  assert.equal(manualNewModelComparison(product, reviewed)?.lowerRefurbished, true);
  const equal = MANUAL_PRODUCTS.find(note => note.observedPriceCents === note.newModelReference.cents)!;
  assert.equal(manualNewModelComparison(equal, reviewed)?.lowerRefurbished, false);
  assert.equal(manualNewModelComparison(product, Date.parse(product.reviewUntil)), null);
  assert.equal(manualNewModelComparison({ ...product, newModelReference: { ...product.newModelReference, url: 'https://unrelated.test/' } }, reviewed), null);
  assert.equal(manualNewModelComparison({ ...product, newModelReference: { ...product.newModelReference, cents: NaN } }, reviewed), null);
  const pointer = manualSavedPointer(product, reviewed)!;
  assert.equal('newModelReference' in pointer, false);
  assert.equal('video' in pointer, false);
});
test('manual observations fail closed outside the bounded review window and never become inventory', () => {
  for (const clock of [Infinity, NaN, reviewed - 1, Date.parse(product.reviewUntil)]) assert.equal(manualProductActive(product, clock), false);
  assert.equal(manualProductActive(product, reviewed), true);
  assert.equal(manualProductActive(product, Date.parse(product.reviewUntil) - 1), true);
  for (const note of MANUAL_PRODUCTS) {
    assert.equal(note.availability, 'unknown');
    assert.equal(validOffer(note), false);
  }
  const source = SOURCE_BY_ID.get(product.sourceId)!;
  assert.equal(source.enabled, false);
  assert.equal(source.admission, 'manual-only');
  assert.equal(source.catalogUrl, null);
});
test('manual filtering respects explicit selections and does not imply pickup or shipping', () => {
  const filters = defaultPreferences().filters;
  assert.equal(manualProductsForFilters(filters, 'percent', reviewed).length, MANUAL_PRODUCTS.length);
  for (const fulfillment of ['pickup', 'shipped'] as const) assert.deepEqual(manualProductsForFilters({ ...filters, fulfillment }, 'percent', reviewed), []);
  assert.deepEqual(manualProductsForFilters({ ...filters, retailers: { mode: 'selected', ids: [] } }, 'percent', reviewed), []);
  assert.deepEqual(manualProductsForFilters({ ...filters, categories: { mode: 'selected', ids: ['computers'] } }, 'percent', reviewed), []);
  const match = manualProductsForFilters({ ...filters, query: 'ＳＥＮＮＨＥＩＳＥＲ accentum', minCents: product.observedPriceCents, maxCents: product.observedPriceCents }, 'percent', reviewed);
  assert.deepEqual(match, [product]);
  assert.deepEqual(manualProductsForFilters({ ...filters, query: 'not-a-real-model' }, 'percent', reviewed), []);
  assert.deepEqual(manualProductsForFilters(filters, 'dollars', reviewed), manualProductsForFilters(filters, 'percent', reviewed));
  const prices = manualProductsForFilters(filters, 'price-low', reviewed).map(note => note.observedPriceCents);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
});
test('saved manual notes retain only a scoped identity/link and expire without altering saves', () => {
  const pointer = manualSavedPointer(product, reviewed)!;
  assert.ok(pointer);
  assert.deepEqual(decodeSaved(JSON.stringify({ version: 1, listings: [pointer] })), [pointer]);
  assert.equal('observedPriceCents' in pointer, false);
  assert.equal('priceCents' in pointer, false);
  assert.equal(manualSavedPointer({ ...product, url: 'https://unrelated.test/' }, reviewed), null);
  assert.equal(manualSavedPointer({ ...product, id: 'unknown-product' }, reviewed), null);
  assert.equal(manualSavedPointer(product, Date.parse(product.reviewUntil)), null);
  for (const url of ['https://us.sennheiser-hearing.com.evil.test/collections/refurbished-by-sennheiser/products/test', 'https://us.sennheiser-hearing.com/policies/terms-of-service']) assert.equal(savedSourceUrl(product.sourceId, url), null);
  assert.deepEqual(decodeSaved(JSON.stringify({ version: 1, listings: [pointer] })), [pointer]);
});
