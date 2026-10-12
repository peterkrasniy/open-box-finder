import test from 'node:test';
import assert from 'node:assert/strict';
import { decodePreferences, defaultPreferences, savedIdentity, decodeSaved } from '../lib/storage.ts';
import { readRoute, routeUrl } from '../lib/routes.ts';

test('hidden categories migrate without losing prior filters, language, or sorting', () => {
  const prior = { ...defaultPreferences(), language: 'ru', sort: 'dollars' }; delete prior.hiddenCategories;
  const decoded = decodePreferences(JSON.stringify(prior));
  assert.deepEqual(decoded.hiddenCategories, []);
  assert.equal(decoded.language, 'ru'); assert.equal(decoded.sort, 'dollars');
  assert.deepEqual(decoded.filters, prior.filters);
  const restored = decodePreferences(JSON.stringify({ ...prior, hiddenCategories: ['audio', 'appliances', 'audio', 'unknown'], resalePlatform: 'facebook' }));
  assert.deepEqual(restored.hiddenCategories, ['audio', 'appliances']); assert.equal(restored.resalePlatform, 'facebook');
});
test('optional saved category is metadata and does not change existing identities', () => {
  const record = { offerId: 'manual:bose', sourceId: 'best-buy', sourceOfferId: '123', variantKey: 'bose', storeId: null, condition: 'used' as const, url: 'https://www.bestbuy.com/site/bose/123.p', savedAt: '2026-10-12T04:00:00Z' };
  const withCategory = { ...record, category: 'audio' as const };
  assert.equal(savedIdentity(record), savedIdentity(withCategory));
  assert.equal(decodeSaved(JSON.stringify({ version: 1, listings: [{ ...record, category: 'audio' }] }))[0]?.category, 'audio');
});
test('resale navigation is shareable and preserves filter routes', () => {
  const route = { view: 'resale' as const, offerId: null, panel: 'filters' as const };
  assert.deepEqual(readRoute('https://example.test' + routeUrl(route)), { ...route, offerIdentity: null });
});
