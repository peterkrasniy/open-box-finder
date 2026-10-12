#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { manualProductActive } from '../lib/manual-products.ts';
import { validManualSnapshot } from '../lib/manual-snapshot-schema.ts';

const defaultRecordsPath = resolve(dirname(fileURLToPath(import.meta.url)), '../data/manual-records.json');
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
function requireValid(condition, message) { if (!condition) throw new Error(message); }

/** Structural integrity is independent of the current stock/expiry target. */
export function verifyManualCatalog(records, now = Date.now(), minimum = 100) {
  requireValid(Number.isFinite(now), 'A valid current clock is required.');
  requireValid(Number.isSafeInteger(minimum) && minimum >= 0, 'Minimum must be a nonnegative integer.');
  requireValid(Array.isArray(records), 'Catalog must be a JSON array.');
  const identities = new Set(), retainedFamilies = new Set(), retainedUrls = new Set();
  for (const record of records) {
    requireValid(validManualSnapshot(record) && nonempty(record.productKey) && nonempty(record.scopeKey), `Invalid checked record: ${record?.id ?? '(unknown)'}`);
    const identity = JSON.stringify([record.sourceId, record.id]);
    requireValid(!identities.has(identity), `Duplicate source identity: ${record.sourceId}/${record.id}`);
    identities.add(identity);
    if (!record.archived) {
      requireValid(!retainedFamilies.has(record.productKey), `Duplicate retained product key: ${record.productKey}`);
      requireValid(!retainedUrls.has(record.url), `Duplicate retained product URL: ${record.url}`);
      retainedFamilies.add(record.productKey);
      retainedUrls.add(record.url);
    }
  }
  const active = records.filter(record => manualProductActive(record, now) && record.observedStock === 'available');
  const eligible = [...new Map(active.map(record => [record.productKey, record])).values()];
  const countBy = field => {
    const counts = new Map();
    for (const record of eligible) counts.set(record[field], (counts.get(record[field]) ?? 0) + 1);
    return Object.fromEntries([...counts].sort(([first], [second]) => first.localeCompare(second)));
  };
  return {
    checkedAt: new Date(now).toISOString(), minimum, retainedCount: records.length,
    eligibleCount: eligible.length, targetMet: eligible.length >= minimum, shortfall: Math.max(0, minimum - eligible.length),
    archivedCount: records.filter(record => record.archived).length,
    expiredCount: records.filter(record => !record.archived && Date.parse(record.reviewUntil) <= now).length,
    unavailableCount: records.filter(record => record.observedStock === 'unavailable').length,
    stockUnknownCount: records.filter(record => record.observedStock === undefined).length,
    futureObservationCount: records.filter(record => !record.archived && Date.parse(record.reviewedAt) > now).length,
    eligibleBySource: countBy('sourceId'), eligibleByCategory: countBy('category'),
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: node scripts/verify-manual-catalog.mjs [--minimum 100] [--require-minimum] [--records FILE]\nRead-only structural validation and current-clock count. Below target reports normally; --require-minimum exits 1.');
    return;
  }
  let minimum = 100, requireMinimum = false, recordsPath = defaultRecordsPath;
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    requireValid(['--minimum', '--require-minimum', '--records'].includes(flag) && !seen.has(flag), `Unknown or duplicate argument: ${flag}`);
    seen.add(flag);
    if (flag === '--require-minimum') { requireMinimum = true; continue; }
    const value = args[++index];
    requireValid(nonempty(value) && !value.startsWith('--'), `${flag} requires a value.`);
    if (flag === '--minimum') {
      requireValid(/^\d+$/.test(value) && Number.isSafeInteger(Number(value)), 'Minimum must be a nonnegative integer.');
      minimum = Number(value);
    } else recordsPath = resolve(value);
  }
  const records = JSON.parse(await readFile(recordsPath, 'utf8'));
  const report = verifyManualCatalog(records, Date.now(), minimum);
  console.log(JSON.stringify(report, null, 2));
  if (requireMinimum && !report.targetMet) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(`Catalog verification rejected: ${error.message}`); process.exitCode = 1; });
}
