import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { refreshManualSnapshots, type SnapshotCheck, type SnapshotHistory } from '../lib/manual-refresh.ts';
import type { ManualProduct } from '../lib/manual-products.ts';
import { runManualRefresh, validateRefreshBatch } from '../scripts/refresh-manual-catalog.mjs';

const now = Date.now();
const iso = (offset = 0) => new Date(now + offset).toISOString();
function product(id = 'hp-laptop', overrides: Partial<ManualProduct> = {}): ManualProduct {
  const url = `https://www.newegg.com/p/${id}`;
  return { id, productKey: `hp:${id}`, scopeKey: 'refurbished-computers', sourceId: 'newegg-manual', recordType: 'manual-observation',
    brand: 'HP', model: id, category: 'computers', condition: 'refurbished', observedPriceCents: 27999, currency: 'USD', availability: 'unknown', observedStock: 'available',
    url, reviewedAt: iso(-1000), reviewUntil: iso(3600000), image: { url: 'https://c1.neweggimages.com/productimage/nb640/V3JSD2504160DKI9UE4.jpg', listingUrl: url, width: 640, height: 640, alt: { en: 'Laptop listing photo', ru: 'Фото ноутбука' } }, ...overrides };
}
function check(products: ManualProduct[] = [], overrides: Partial<SnapshotCheck> = {}): SnapshotCheck {
  return { sourceId: 'newegg-manual', scopeKey: 'refurbished-computers', status: 'success', complete: false, checkedAt: iso(), products, ...overrides };
}
const merge = (records: ManualProduct[], checks: SnapshotCheck[]) => refreshManualSnapshots(records, [], checks, now);

test('failed and partial checks preserve records; complete absence archives only its exact scope', () => {
  const records = [product(), product('other-scope', { scopeKey: 'clearance' })];
  const prior = [{ sourceId: 'newegg-manual', scopeKey: 'refurbished-computers', attemptedAt: iso(-2000), status: 'success' as const, lastSuccessAt: iso(-2000) }];
  const failed = refreshManualSnapshots(records, prior, [check([], { status: 'failed', reason: 'permission-held' })], now);
  assert.deepEqual(failed.records, records);
  assert.deepEqual(failed.history, []);
  assert.equal(failed.sources[0].lastSuccessAt, prior[0].lastSuccessAt);
  assert.equal(failed.sources[0].reason, 'permission-held');
  assert.deepEqual(merge(records, [check()]).records, records);
  assert.throws(() => merge(records, [check([], { status: 'failed', complete: true })]), /Failed checks/);
  assert.throws(() => merge(records, [check([product()], { status: 'failed' })]), /Failed checks/);
  const complete = merge(records, [check([], { complete: true })]);
  assert.equal(complete.records[0].archived?.reason, 'absent-from-complete-scope');
  assert.deepEqual(complete.records[1], records[1]);
  assert.deepEqual(complete.history[0].before, records[0]);
  assert.deepEqual(records[0].archived, undefined, 'Caller records stay immutable.');
});

test('updates retain previous links and exact before/after history, and confirmed unavailable records remain archived', () => {
  const original = product();
  const url = `${original.url}?Item=HPUPDATED`;
  const updated = product(original.id, { url, image: { ...original.image, listingUrl: url }, observedPriceCents: 24999, reviewedAt: iso() });
  const result = merge([original], [check([updated])]);
  assert.deepEqual(result.records[0].previousUrls, [original.url]);
  assert.equal(result.history[0].action, 'updated');
  assert.deepEqual(result.history[0].before, original);
  assert.equal(result.history[0].after.observedPriceCents, 24999);
  const archived = merge(result.records, [check([], { unavailable: [{ id: original.id, evidenceUrl: url }] })]);
  assert.equal(archived.records[0].observedStock, 'unavailable');
  assert.equal(archived.records[0].archived?.reason, 'confirmed-unavailable');
  assert.deepEqual(archived.history[0].before, result.records[0]);
  assert.deepEqual(merge(archived.records, [check()]).records, archived.records);
  assert.throws(() => merge(result.records, [check([], { unavailable: [{ id: original.id, evidenceUrl: original.url }] })]), /exact scoped product/);
  assert.throws(() => merge([original], [check([original], { unavailable: [{ id: original.id, evidenceUrl: original.url }] })]), /both available and unavailable/);
});

test('refresh rejects duplicate product families, missing new identity keys, and source/product/history rollback', () => {
  const original = product();
  assert.throws(() => merge([], [check([original, product('color-variant', { productKey: original.productKey })])]), /Duplicate model/);
  assert.throws(() => merge([], [check([original, original])]), /Duplicate source product/);
  assert.throws(() => merge([], [check([product('missing-key', { productKey: undefined })])]), /Invalid checked product/);
  assert.throws(() => merge([], [check([product('missing-scope', { scopeKey: undefined })])]), /Invalid checked product/);
  assert.throws(() => merge([original], [check([product(original.id, { reviewedAt: iso(-2000) })])]), /roll backward/);
  const archived = product('archived', { archived: { at: iso(), reason: 'confirmed-unavailable' }, observedStock: 'unavailable' });
  assert.throws(() => merge([archived], [check([product('archived')])]), /roll backward/);
  assert.throws(() => merge([original], [check([], { checkedAt: iso(-2000), complete: true })]), /history backward/);
  assert.throws(() => merge([original], [check([], { checkedAt: iso(-2000), unavailable: [{ id: original.id, evidenceUrl: original.url }] })]), /history backward/);
  assert.throws(() => refreshManualSnapshots([], [{ sourceId: original.sourceId, scopeKey: original.scopeKey!, attemptedAt: iso(), status: 'success', lastSuccessAt: iso() }], [check([], { checkedAt: iso(-1000) })], now), /source state backward/);
  assert.throws(() => merge([], [check([], { checkedAt: iso(-86400001) })]), /stale/);
  assert.throws(() => merge([], [check([], { checkedAt: iso(30001) })]), /stale/);
});

test('batch boundary rejects malformed types and private metadata at every publication layer', () => {
  for (const batch of [null, [], {}, { checks: null }, { checks: [], privateProfile: {} }, { checks: [{ ...check(), complete: 'false' }] }, { checks: [{ ...check(), checkedAt: 0 }] },
    { checks: [{ ...check(), unavailable: {} }] }, { checks: [check(), check()] }, { checks: [{ ...check(), reason: 'anything' }] },
    { checks: [check([product('secret', { ...{ privateProfile: { email: 'private@example.test' } } } as Partial<ManualProduct>)])] },
    { checks: [check([{ ...product(), image: { ...product().image, privateEmail: 'private@example.test' } } as ManualProduct])] },
    { checks: [check([{ ...product(), details: { en: 'Laptop', ru: 'Ноутбук', email: 'private@example.test' } } as ManualProduct])] },
    { checks: [check([product('no-product-key', { productKey: undefined })])] },
    { checks: [check([], { status: 'failed', complete: true })] }, { checks: [check([], { unavailable: [{ id: 'a', evidenceUrl: 'http://www.newegg.com/p/a' }] })] }]) {
    assert.throws(() => validateRefreshBatch(batch), /Batch|Invalid|Duplicate|Failed|Successful|Unavailable/, JSON.stringify(batch));
  }
  assert.deepEqual(validateRefreshBatch({ checks: [check([product()])] }), [check([product()])]);
});

async function fixture(t: { after: (callback: () => Promise<void>) => void }, records: ManualProduct[] = [product()], history: SnapshotHistory[] = []) {
  const directory = await mkdtemp(resolve(tmpdir(), 'manual-refresh-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await Promise.all([
    writeFile(resolve(directory, 'manual-records.json'), JSON.stringify(records, null, 2) + '\n'),
    writeFile(resolve(directory, 'manual-refresh-status.json'), JSON.stringify({ schemaVersion: 1, revision: 'initial-v19', sources: [] }) + '\n'),
    writeFile(resolve(directory, 'manual-history.jsonl'), history.map(event => JSON.stringify(event) + '\n').join('')),
    writeFile(resolve(directory, 'private-saves.json'), '{"privateProfile":"preserved","savedIds":["manual:hp-laptop"]}\n'),
  ]);
  const bytes = async () => Promise.all(['manual-records.json', 'manual-refresh-status.json', 'manual-history.jsonl', 'private-saves.json'].map(file => readFile(resolve(directory, file), 'utf8')));
  const batchPath = resolve(directory, 'batch.json');
  const batch = async (checks: unknown) => { await writeFile(batchPath, JSON.stringify(checks)); return { batchPath, dataDir: directory }; };
  return { directory, batchPath, bytes, batch };
}

test('CLI defaults to dry-run; apply updates local records/status, appends history, preserves archives/private saves, and replay is idempotent', async t => {
  const seed = merge([], [check([product('old')])]);
  const old = product('old', { archived: { at: iso(-500), reason: 'confirmed-unavailable' }, observedStock: 'unavailable' });
  const archivedSeed = merge(seed.records, [check([], { unavailable: [{ id: 'old', evidenceUrl: seed.records[0].url }] })]);
  const f = await fixture(t, [...archivedSeed.records, product()], [...seed.history, ...archivedSeed.history]);
  const before = await f.bytes();
  const input = await f.batch({ checks: [check([product('hp-laptop', { observedPriceCents: 21999 }), product('new')])] });
  const command = spawnSync(process.execPath, [resolve('scripts/refresh-manual-catalog.mjs'), f.batchPath, '--data-dir', f.directory], { encoding: 'utf8' });
  assert.equal(command.status, 0, command.stderr);
  assert.equal(JSON.parse(command.stdout).mode, 'dry-run');
  assert.deepEqual(await f.bytes(), before);
  const applied = await runManualRefresh({ ...input, apply: true });
  assert.equal(applied.mode, 'apply');
  assert.equal(applied.changes.updated, 1);
  assert.equal(applied.changes.added, 1);
  const after = await f.bytes();
  const records = JSON.parse(after[0]) as ManualProduct[];
  assert.equal(records.find(record => record.id === 'old')!.archived?.reason, old.archived?.reason);
  assert.equal(records.find(record => record.id === 'hp-laptop')!.observedPriceCents, 21999);
  assert.equal(JSON.parse(after[1]).revision, applied.revision);
  assert.ok(after[2].startsWith(before[2]), 'Existing history bytes are never replaced.');
  assert.equal(after[2].trim().split('\n').length, 4);
  assert.equal(after[3], before[3], 'Private profile and saved IDs are untouched.');
  const replay = await runManualRefresh({ ...input, apply: true });
  assert.equal(replay.historyEvents, 0);
  assert.deepEqual(await f.bytes(), after);
  const failedInput = await f.batch({ checks: [check([], { status: 'failed', reason: 'permission-held', checkedAt: iso(1) })] });
  await runManualRefresh({ ...failedInput, apply: true });
  const failed = await f.bytes();
  assert.equal(failed[0], after[0]);
  assert.equal(failed[2], after[2]);
  assert.equal(failed[3], after[3]);
  assert.equal(JSON.parse(failed[1]).sources[0].lastSuccessAt, iso());
});

test('invalid batches fail before any writes, including malformed, stale, duplicate, and historical rollback input', async t => {
  const f = await fixture(t);
  const before = await f.bytes();
  for (const value of [{ checks: [check([product('bad-price', { observedPriceCents: 0 })])] },
    { checks: [check([product(), product('color', { productKey: product().productKey })])] },
    { checks: [check([product('hp-laptop', { reviewedAt: iso(-2000) })])] },
    { checks: [check([], { status: 'failed', complete: true })] },
    { checks: [check([], { checkedAt: iso(-86400001) })] }, { checks: [{ ...check(), products: null }] }]) {
    const input = await f.batch(value);
    await assert.rejects(runManualRefresh({ ...input, apply: true }));
    assert.deepEqual(await f.bytes(), before);
  }
  await writeFile(f.batchPath, '{invalid');
  await assert.rejects(runManualRefresh({ batchPath: f.batchPath, dataDir: f.directory, apply: true }));
  assert.deepEqual(await f.bytes(), before);
});

test('apply rejects an existing writer lock and symlink targets without changing history or private files', async t => {
  const f = await fixture(t);
  const input = await f.batch({ checks: [check([product()])] });
  const before = await f.bytes();
  await writeFile(resolve(f.directory, '.manual-refresh.lock'), 'another writer\n');
  await assert.rejects(runManualRefresh({ ...input, apply: true }), /EEXIST/);
  assert.deepEqual(await f.bytes(), before);
  assert.equal(await readFile(resolve(f.directory, '.manual-refresh.lock'), 'utf8'), 'another writer\n');
  await rm(resolve(f.directory, '.manual-refresh.lock'));
  await renameHistory();
  async function renameHistory() {
    const target = resolve(f.directory, 'preserved-history.jsonl');
    await writeFile(target, before[2]);
    await rm(resolve(f.directory, 'manual-history.jsonl'));
    await symlink(target, resolve(f.directory, 'manual-history.jsonl'));
    await assert.rejects(runManualRefresh({ ...input, apply: true }), /regular file/);
    assert.equal(await readFile(target, 'utf8'), before[2]);
  }
});

test('corrupt history and source status fail closed instead of replacing the prior catalog', async t => {
  const f = await fixture(t);
  const input = await f.batch({ checks: [check()] });
  await writeFile(resolve(f.directory, 'manual-history.jsonl'), '{"incomplete":');
  const incomplete = await f.bytes();
  await assert.rejects(runManualRefresh({ ...input, apply: true }), /History must end/);
  assert.deepEqual(await f.bytes(), incomplete);
  const event = merge([], [check([product()])]).history[0];
  await writeFile(resolve(f.directory, 'manual-history.jsonl'), JSON.stringify({ ...event, eventId: 'tampered' }) + '\n');
  const tampered = await f.bytes();
  await assert.rejects(runManualRefresh({ ...input, apply: true }), /checksum/);
  assert.deepEqual(await f.bytes(), tampered);
  await writeFile(resolve(f.directory, 'manual-history.jsonl'), '');
  await writeFile(resolve(f.directory, 'manual-refresh-status.json'), JSON.stringify({ schemaVersion: 1, revision: 'initial-v19', sources: [{ sourceId: 'newegg-manual', scopeKey: 'refurbished-computers', status: 'success', attemptedAt: iso(), lastSuccessAt: iso(1) }] }));
  const invalidState = await f.bytes();
  await assert.rejects(runManualRefresh({ ...input, apply: true }), /backward/);
  assert.deepEqual(await f.bytes(), invalidState);
});

test('records/status checksum detects changed records, source state, and arbitrary revisions without changing history', async t => {
  const seed = merge([], [check([product()])]);
  const f = await fixture(t, seed.records, seed.history);
  const input = await f.batch({ checks: [check()] });
  await runManualRefresh({ ...input, apply: true });
  const coherent = await f.bytes();
  const status = JSON.parse(coherent[1]);
  assert.match(status.revision, /^[a-f0-9]{64}$/);
  await writeFile(resolve(f.directory, 'manual-records.json'), JSON.stringify([product('hp-laptop', { observedPriceCents: 24999 })]) + '\n');
  const changedRecords = await f.bytes();
  await assert.rejects(runManualRefresh(input), /revision mismatch/);
  await assert.rejects(runManualRefresh({ ...input, apply: true }), /revision mismatch/);
  assert.deepEqual(await f.bytes(), changedRecords);
  assert.equal(changedRecords[2], coherent[2]);
  await writeFile(resolve(f.directory, 'manual-records.json'), coherent[0]);
  for (const corrupt of [{ ...status, sources: [] }, { ...status, revision: 'fixture' }, { ...status, revision: '0'.repeat(64) }]) {
    await writeFile(resolve(f.directory, 'manual-refresh-status.json'), JSON.stringify(corrupt) + '\n');
    const before = await f.bytes();
    await assert.rejects(runManualRefresh({ ...input, apply: true }), /revision mismatch/);
    assert.deepEqual(await f.bytes(), before);
    assert.equal(before[2], coherent[2]);
  }
  await writeFile(resolve(f.directory, 'manual-refresh-status.json'), coherent[1]);
  assert.equal((await runManualRefresh(input)).historyEvents, 0);
});
