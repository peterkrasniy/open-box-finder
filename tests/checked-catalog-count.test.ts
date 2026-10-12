import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import records from '../data/manual-records.json' with { type: 'json' };
import type { ManualProduct } from '../lib/manual-products.ts';
import { manualProductActive, manualSupportedReference, manualProductsForFilters } from '../lib/manual-products.ts';
import { validManualSnapshot, validManualReference } from '../lib/manual-snapshot-schema.ts';
import { DEFAULT_FILTERS } from '../lib/offer.ts';
import { directionsUrl } from '../lib/filter.ts';
import { SOURCE_BY_ID } from '../lib/sources.ts';
import { verifyManualCatalog } from '../scripts/verify-manual-catalog.mjs';

const products = records as unknown as readonly ManualProduct[];

test('retained catalog validates raw records and unique identities independently of freshness or count', () => {
  assert.equal(verifyManualCatalog(records).retainedCount, records.length);
  for (const product of products) {
    assert.equal(validManualSnapshot(product), true, product.id);
    assert.ok(product.productKey && product.scopeKey, product.id);
    assert.ok(product.image.url && product.image.alt.en && product.image.alt.ru);
    assert.ok(product.observedPriceCents > 0);
    assert.equal(SOURCE_BY_ID.get(product.sourceId)?.enabled, false);
  }
  assert.equal(verifyManualCatalog([]).eligibleCount, 0, 'An honest empty catalog is structurally valid.');
});

test('expired, unavailable, unknown-stock and archived observations never satisfy the current target', () => {
  const now = Date.now();
  const expired = products.map(product => ({ ...product, reviewedAt: new Date(now - 86400000).toISOString(), reviewUntil: new Date(now - 1).toISOString() }));
  const unavailable = products.map(product => ({ ...product, observedStock: 'unavailable' as const }));
  const unknown = products.map(product => ({ ...product, observedStock: undefined }));
  const archived = products.map(product => ({ ...product, archived: { at: new Date(now).toISOString(), reason: 'confirmed-unavailable' as const } }));
  for (const observations of [expired, unavailable, unknown, archived]) {
    const report = verifyManualCatalog(observations, now, 100);
    assert.equal(report.eligibleCount, 0);
    assert.equal(report.targetMet, false);
    assert.equal(report.shortfall, 100);
    assert.deepEqual(manualProductsForFilters(DEFAULT_FILTERS, 'percent', now, observations.filter(product => product.observedStock !== undefined)), []);
  }
});

test('structural checks reject malformed records, duplicate families and unsafe fields after expiry', () => {
  const original = products[0];
  if (!original) return;
  const expired = { ...original, reviewedAt: '2026-01-01T00:00:00Z', reviewUntil: '2026-01-02T00:00:00Z' };
  const duplicate = { ...expired, id: `${expired.id}-duplicate` };
  assert.throws(() => verifyManualCatalog([expired, duplicate]), /Duplicate retained product key/);
  assert.throws(() => verifyManualCatalog([expired, expired]), /Duplicate source identity/);
  for (const invalid of [{ ...expired, observedPriceCents: 0 }, { ...expired, productKey: '' },
    { ...expired, image: { ...expired.image, url: 'https://attacker.example/photo.jpg' } },
    { ...expired, shipping: { country: 'US', costCents: -1, restrictions: null } },
    { ...expired, pickup: { id: 'store', name: 'Store', address: 'Street', pickupVerified: true, point: { latitude: 100, longitude: 0 } } },
    { ...expired, referencePrice: { cents: expired.observedPriceCents + 100, basis: 'current-new', url: 'https://attacker.example/product' } }]) {
    assert.throws(() => verifyManualCatalog([invalid]), /Invalid checked record/);
  }
});

test('Best Buy retained evidence stays safe without requiring active comparisons on expired rows', () => {
  const bestBuy = products.filter(product => product.sourceId === 'best-buy');
  const now = Date.now();
  for (const product of bestBuy) {
    assert.equal(product.condition, 'open-box');
    assert.ok(new URL(product.url).searchParams.has('condition'));
    if (product.referencePrice) {
      assert.equal(product.referencePrice.basis, 'current-new');
      assert.equal(validManualReference(product), true);
      if (manualProductActive(product, now) && product.referencePrice.cents > product.observedPriceCents) assert.equal(manualSupportedReference(product, now)?.basis, 'current-new');
      else assert.equal(manualSupportedReference(product, now), null);
    }
    assert.equal(manualSupportedReference(product, Date.parse(product.reviewUntil)), null);
    if (product.shipping) {
      assert.ok(product.shipping.restrictions?.includes('95628'));
      assert.equal(product.shipping.eligibility, undefined, 'ZIP-specific evidence cannot establish other destinations.');
    }
    if (product.pickup) {
      const url = directionsUrl({ pickup: product.pickup })!;
      assert.equal(new URL(url).searchParams.get('destination'), product.pickup.address);
      assert.equal(product.pickup.point, null, 'No invented coordinates or transferred browser distances.');
    }
  }
  assert.equal(manualProductsForFilters({ ...DEFAULT_FILTERS, retailers: { mode: 'selected', ids: ['best-buy'] }, fulfillment: 'shipped' }, 'percent', now, products).length, 0,
    'ZIP 95628 evidence cannot prove delivery to a different selected origin.');
});

test('read-only CLI reports a shortfall and fails qualification only when explicitly requested', async t => {
  const directory = await mkdtemp(resolve(tmpdir(), 'manual-count-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const input = resolve(directory, 'records.json');
  await writeFile(input, '[]\n');
  const before = await readFile(input, 'utf8');
  const script = resolve('scripts/verify-manual-catalog.mjs');
  const normal = spawnSync(process.execPath, [script, '--records', input, '--minimum', '100'], { encoding: 'utf8' });
  assert.equal(normal.status, 0, normal.stderr);
  assert.equal(JSON.parse(normal.stdout).eligibleCount, 0);
  assert.equal(JSON.parse(normal.stdout).shortfall, 100);
  const required = spawnSync(process.execPath, [script, '--records', input, '--minimum', '100', '--require-minimum'], { encoding: 'utf8' });
  assert.equal(required.status, 1);
  assert.equal(JSON.parse(required.stdout).targetMet, false);
  const zero = spawnSync(process.execPath, [script, '--records', input, '--minimum', '0', '--require-minimum'], { encoding: 'utf8' });
  assert.equal(zero.status, 0, zero.stderr);
  const invalid = spawnSync(process.execPath, [script, '--records', input, '--minimum', '-1'], { encoding: 'utf8' });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /nonnegative integer/);
  assert.equal(await readFile(input, 'utf8'), before);
});
