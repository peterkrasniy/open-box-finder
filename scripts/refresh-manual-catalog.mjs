#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { appendFile, lstat, mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { refreshManualSnapshots } from '../lib/manual-refresh.ts';
import { validManualSnapshot } from '../lib/manual-snapshot-schema.ts';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const timestamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const keys = (value, allowed) => Object.keys(value).every(key => allowed.includes(key));
const identity = value => JSON.stringify([value.sourceId, value.id]);
const scope = value => JSON.stringify([value.sourceId, value.scopeKey]);
const reasons = ['access-denied', 'network-error', 'parse-error', 'permission-held'];
function requireValid(condition, message) { if (!condition) throw new Error(message); }
const productFields = ['productKey', 'scopeKey', 'previousUrls', 'archived', 'stockEvidence', 'id', 'recordType', 'sourceId', 'brand', 'model', 'category', 'condition', 'conditionDetail', 'observedStock', 'shipping', 'pickup', 'fulfillmentNote', 'details', 'referencePrice', 'observedPriceCents', 'currency', 'availability', 'url', 'reviewedAt', 'reviewUntil', 'newModelReference', 'retailerComparison', 'image'];
function publicProduct(product) {
  if (!validManualSnapshot(product) || !keys(product, productFields)) return false;
  const nested = (value, allowed) => value === undefined || object(value) && keys(value, allowed);
  if (!nested(product.image, ['url', 'listingUrl', 'width', 'height', 'alt']) || !nested(product.image.alt, ['en', 'ru'])) return false;
  if (['conditionDetail', 'fulfillmentNote', 'details'].some(field => !nested(product[field], ['en', 'ru']))) return false;
  if (['referencePrice', 'newModelReference', 'retailerComparison'].some(field => !nested(product[field], ['cents', 'basis', 'url']))) return false;
  if (!nested(product.archived, ['at', 'reason']) || !nested(product.stockEvidence, ['url', 'detail', 'context'])) return false;
  if (!nested(product.shipping, ['country', 'costCents', 'restrictions', 'eligibility']) || !nested(product.shipping?.eligibility, ['scope', 'states', 'excludedStates'])) return false;
  if (!nested(product.pickup, ['id', 'name', 'address', 'point', 'pickupVerified']) || product.pickup?.point !== null && !nested(product.pickup?.point, ['latitude', 'longitude'])) return false;
  return true;
}

/** Treat the incoming JSON as untrusted before invoking the pure merge. */
export function validateRefreshBatch(batch) {
  requireValid(object(batch) && keys(batch, ['checks']) && Array.isArray(batch.checks), 'Batch must contain only a checks array.');
  const scopes = new Set();
  for (const check of batch.checks) {
    requireValid(object(check) && keys(check, ['sourceId', 'scopeKey', 'checkedAt', 'status', 'complete', 'products', 'unavailable', 'reason'])
      && text(check.sourceId) && text(check.scopeKey) && timestamp(check.checkedAt)
      && ['success', 'failed'].includes(check.status) && typeof check.complete === 'boolean' && Array.isArray(check.products), 'Invalid source check structure.');
    requireValid(!scopes.has(scope(check)), 'Duplicate source scope in batch.');
    scopes.add(scope(check));
    requireValid(check.reason === undefined || reasons.includes(check.reason), 'Invalid failure reason.');
    requireValid(check.unavailable === undefined || Array.isArray(check.unavailable), 'Unavailable evidence must be an array.');
    if (check.status === 'failed') requireValid(!check.complete && !check.products.length && !check.unavailable?.length, 'Failed checks cannot imply products or removals.');
    else requireValid(check.reason === undefined, 'Successful checks cannot carry a failure reason.');
    const products = new Set();
    for (const product of check.products) {
      requireValid(publicProduct(product) && text(product.productKey) && text(product.scopeKey), 'Invalid product snapshot structure or missing product/scope key.');
      requireValid(!products.has(identity(product)), 'Duplicate source product in batch.');
      products.add(identity(product));
    }
    const unavailable = new Set();
    for (const item of check.unavailable ?? []) {
      requireValid(object(item) && keys(item, ['id', 'evidenceUrl']) && text(item.id) && text(item.evidenceUrl), 'Invalid unavailable evidence structure.');
      let url;
      try { url = new URL(item.evidenceUrl); } catch { throw new Error('Invalid unavailable evidence URL.'); }
      requireValid(url.protocol === 'https:' && !url.username && !url.password, 'Unavailable evidence must use a public HTTPS URL.');
      requireValid(!unavailable.has(item.id), 'Duplicate unavailable product.');
      unavailable.add(item.id);
    }
  }
  return batch.checks;
}

function validatePrior(records, status, historyText) {
  requireValid(Array.isArray(records) && records.every(publicProduct), 'Invalid stored manual catalog.');
  requireValid(new Set(records.map(identity)).size === records.length, 'Duplicate stored source product.');
  requireValid(object(status) && keys(status, ['schemaVersion', 'revision', 'sources']) && status.schemaVersion === 1
    && text(status.revision) && Array.isArray(status.sources), 'Invalid stored refresh status.');
  const scopes = new Set();
  for (const state of status.sources) {
    requireValid(object(state) && keys(state, ['sourceId', 'scopeKey', 'attemptedAt', 'status', 'lastSuccessAt', 'reason'])
      && text(state.sourceId) && text(state.scopeKey) && timestamp(state.attemptedAt)
      && ['success', 'failed'].includes(state.status) && (state.lastSuccessAt === null || timestamp(state.lastSuccessAt))
      && (state.reason === undefined || reasons.includes(state.reason)), 'Invalid stored source status.');
    requireValid(!scopes.has(scope(state)), 'Duplicate stored source scope.');
    requireValid(state.lastSuccessAt === null || Date.parse(state.lastSuccessAt) <= Date.parse(state.attemptedAt), 'Stored source status rolls time backward.');
    requireValid(state.status !== 'success' || state.lastSuccessAt === state.attemptedAt, 'Successful source status must identify its last success.');
    scopes.add(scope(state));
  }
  requireValid(status.revision === 'initial-v19' || status.revision === createHash('sha256').update(JSON.stringify({ records, sources: status.sources })).digest('hex'), 'Stored records/status revision mismatch; recover the interrupted update before refreshing.');
  requireValid(!historyText.length || historyText.endsWith('\n'), 'History must end with a newline; repair the incomplete append before refreshing.');
  const eventIds = new Set();
  for (const line of historyText.split('\n').filter(Boolean)) {
    let event;
    try { event = JSON.parse(line); } catch { throw new Error('Invalid stored history JSON.'); }
    requireValid(object(event) && keys(event, ['eventId', 'sourceId', 'id', 'at', 'action', 'before', 'after']) && text(event.eventId) && text(event.sourceId) && text(event.id) && timestamp(event.at)
      && ['added', 'updated', 'archived'].includes(event.action)
      && (event.before === null || publicProduct(event.before)) && publicProduct(event.after), 'Invalid stored history event.');
    requireValid(event.after.sourceId === event.sourceId && event.after.id === event.id, 'History identity mismatch.');
    requireValid(event.before === null || event.before.sourceId === event.sourceId && event.before.id === event.id, 'History before identity mismatch.');
    const body = { sourceId: event.sourceId, id: event.id, at: event.at, action: event.action, before: event.before, after: event.after };
    requireValid(event.eventId === createHash('sha256').update(JSON.stringify(body)).digest('hex'), 'History event checksum mismatch.');
    eventIds.add(event.eventId);
  }
  return eventIds;
}

async function regularFile(path, optional = false) {
  try { requireValid((await lstat(path)).isFile(), `Expected a regular file: ${path}`); }
  catch (error) { if (!optional || error.code !== 'ENOENT') throw error; }
}

/** Offline local files only. No retailer requests, user saves, database, or admin endpoint. */
export async function runManualRefresh({ batchPath, dataDir = resolve(projectRoot, 'data'), apply = false }) {
  const now = Date.now();
  const inputPath = resolve(batchPath), directory = resolve(dataDir);
  await regularFile(inputPath);
  const input = await readFile(inputPath, 'utf8');
  requireValid(Buffer.byteLength(input) <= 10 * 1024 * 1024, 'Batch exceeds 10 MiB.');
  const checks = validateRefreshBatch(JSON.parse(input));
  const paths = { records: resolve(directory, 'manual-records.json'), status: resolve(directory, 'manual-refresh-status.json'), history: resolve(directory, 'manual-history.jsonl') };
  await Promise.all(Object.values(paths).map(path => regularFile(path)));
  let lock;
  const lockPath = resolve(directory, '.manual-refresh.lock');
  if (apply) {
    lock = await open(lockPath, 'wx', 0o600);
  }
  try {
    if (lock) await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date(now).toISOString() }) + '\n');
    const [recordsText, statusText, historyText] = await Promise.all([readFile(paths.records, 'utf8'), readFile(paths.status, 'utf8'), readFile(paths.history, 'utf8')]);
    const records = JSON.parse(recordsText), status = JSON.parse(statusText);
    const eventIds = validatePrior(records, status, historyText);
    const merged = refreshManualSnapshots(records, status.sources, checks, now);
    const nextRecords = JSON.stringify(merged.records, null, 2) + '\n';
    const revision = createHash('sha256').update(JSON.stringify({ records: merged.records, sources: merged.sources })).digest('hex');
    const nextStatus = JSON.stringify({ schemaVersion: 1, revision, sources: merged.sources }, null, 2) + '\n';
    const events = merged.history.filter(event => !eventIds.has(event.eventId));
    const summary = { mode: apply ? 'apply' : 'dry-run', checkedAt: new Date(now).toISOString(), revision, changes: merged.changes, eligibleCount: merged.eligibleCount, historyEvents: events.length };
    if (!apply) return summary;
    const staging = resolve(directory, `.manual-refresh-${randomUUID()}`);
    await mkdir(staging, { mode: 0o700 });
    try {
      await Promise.all([writeFile(resolve(staging, 'records'), nextRecords, { mode: 0o600 }), writeFile(resolve(staging, 'status'), nextStatus, { mode: 0o600 }), writeFile(resolve(staging, 'prior-records'), recordsText, { mode: 0o600 }), writeFile(resolve(staging, 'prior-status'), statusText, { mode: 0o600 })]);
      try {
        await rename(resolve(staging, 'records'), paths.records);
        await rename(resolve(staging, 'status'), paths.status);
        if (events.length) await appendFile(paths.history, events.map(event => JSON.stringify(event)).join('\n') + '\n');
      } catch (error) {
        await rename(resolve(staging, 'prior-records'), paths.records);
        await rename(resolve(staging, 'prior-status'), paths.status);
        throw error;
      }
    } finally { await rm(staging, { recursive: true, force: true }); }
    return summary;
  } finally {
    if (lock) { await lock.close(); await rm(lockPath, { force: true }); }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: node scripts/refresh-manual-catalog.mjs BATCH.json [--apply] [--data-dir DIR]\nDefault: validate and report a dry-run without writing files.');
    return;
  }
  let batchPath, dataDir, apply = false;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--apply') { requireValid(!apply, 'Duplicate --apply.'); apply = true; }
    else if (args[index] === '--data-dir') { requireValid(!dataDir && text(args[index + 1]) && !args[index + 1].startsWith('--'), '--data-dir requires one directory.'); dataDir = args[++index]; }
    else { requireValid(!args[index].startsWith('--') && !batchPath, 'Expected one batch file and known options.'); batchPath = args[index]; }
  }
  requireValid(text(batchPath), 'A batch JSON file is required. Use --help for usage.');
  console.log(JSON.stringify(await runManualRefresh({ batchPath, dataDir, apply }), null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(`Manual refresh rejected: ${error.message}`); process.exitCode = 1; });
}
