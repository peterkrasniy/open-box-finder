#!/usr/bin/env node
import { readFile, writeFile, rename, rm, open, lstat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { validResaleRecord } from '../lib/resale.ts';

// Consume authorized checked evidence only. No network access, marketplace login or seller action.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const inputIndex = args.indexOf('--input');
if (inputIndex < 0 || !args[inputIndex + 1] || args.some((value, index) => !['--input', '--apply'].includes(value) && index !== inputIndex + 1)) throw new Error('Usage: node scripts/refresh-resale-catalog.mjs --input checked-batch.json [--apply]');
const catalogPath = join(root, 'data/resale-records.json'), historyPath = join(root, 'data/resale-history.jsonl');
for (const target of [catalogPath, historyPath]) { try { if ((await lstat(target)).isSymbolicLink()) throw new Error('Symlink targets are unsupported'); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
const before = await readFile(catalogPath, 'utf8');
const previous = JSON.parse(before);
const raw = await readFile(resolve(args[inputIndex + 1]), 'utf8');
if (Buffer.byteLength(raw) > 1024 * 1024) throw new Error('Batch exceeds limit');
const batch = JSON.parse(raw);
const platforms = new Set(['craigslist-resale', 'facebook-resale', 'offerup-resale']);
if (!Array.isArray(previous) || !previous.every(validResaleRecord)
 || !batch || typeof batch !== 'object' || Object.keys(batch).some(key => !['records', 'archivedIds', 'failedSources'].includes(key))
 || !Array.isArray(batch.records) || batch.records.length > 1000 || !batch.records.every(validResaleRecord)
 || !Array.isArray(batch.archivedIds) || !batch.archivedIds.every(id => typeof id === 'string' && id.length < 200)
 || !Array.isArray(batch.failedSources) || !batch.failedSources.every(id => platforms.has(id))) throw new Error('Invalid checked batch');
const clock = Date.now(), keys = new Set();
for (const record of batch.records) {
  if (keys.has(record.id) || Date.parse(record.checkedAt) > clock + 60_000 || record.facebookComparisons.some(sample => Date.parse(sample.checkedAt) > clock + 60_000)) throw new Error('Duplicate or future observation');
  keys.add(record.id);
  if (batch.failedSources.includes(record.sourceId)) throw new Error('Failed source cannot supply replacement records');
}
const failed = new Set(batch.failedSources), archived = new Set(batch.archivedIds);
if (batch.archivedIds.length !== archived.size || [...archived].some(id => !previous.some(record => record.id === id && !failed.has(record.sourceId)) || keys.has(id))) throw new Error('Invalid archive scope');
const merged = new Map(previous.map(record => [record.id, record]));
for (const record of batch.records) {
  const existing = merged.get(record.id);
  if (existing && (existing.sourceId !== record.sourceId || existing.url !== record.url || existing.category !== record.category || Date.parse(existing.checkedAt) > Date.parse(record.checkedAt))) throw new Error('Identity change or older evidence');
  merged.set(record.id, record);
}
for (const id of archived) merged.set(id, { ...merged.get(id), archived: true });
const next = [...merged.values()];
if (next.length > 1000 || !next.every(validResaleRecord)) throw new Error('Invalid merged catalog');
const after = JSON.stringify(next, null, 2) + '\n';
const checksum = value => createHash('sha256').update(value).digest('hex');
const receipt = { checkedAt: new Date(clock).toISOString(), upsertedIds: [...keys], archivedIds: [...archived], failedSources: [...failed], beforeSha256: checksum(before), afterSha256: checksum(after) };
if (!args.includes('--apply')) { process.stdout.write(JSON.stringify({ dryRun: true, ...receipt, retained: next.length }) + '\n'); }
else {
  const lockPath = catalogPath + '.lock';
  const lock = await open(lockPath, 'wx');
  const suffix = `.tmp-${process.pid}`, tempCatalog = catalogPath + suffix, tempHistory = historyPath + suffix;
  let historyBefore = '', historyChanged = false;
  try {
    try { historyBefore = await readFile(historyPath, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (await readFile(catalogPath, 'utf8') !== before) throw new Error('Catalog changed; review batch again');
    await writeFile(tempCatalog, after, { flag: 'wx' });
    await writeFile(tempHistory, historyBefore + JSON.stringify(receipt) + '\n', { flag: 'wx' });
    await rename(tempHistory, historyPath); historyChanged = true;
    await rename(tempCatalog, catalogPath);
    process.stdout.write(JSON.stringify({ applied: true, ...receipt, retained: next.length }) + '\n');
  } catch (error) { if (historyChanged) await writeFile(historyPath, historyBefore); throw error; }
  finally { await Promise.all([rm(tempCatalog, { force: true }), rm(tempHistory, { force: true })]); await lock.close(); await rm(lockPath, { force: true }); }
}
