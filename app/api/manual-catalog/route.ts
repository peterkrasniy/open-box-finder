import records from '../../../data/manual-records.json' with { type: 'json' };
import status from '../../../data/manual-refresh-status.json' with { type: 'json' };
import type { SnapshotSourceState } from '../../../lib/manual-refresh.ts';
import { validManualSnapshot } from '../../../lib/manual-snapshot-schema.ts';

// Owner-protected published data only. No credentials, profiles or administrative mutation endpoint.
const headers = { 'Cache-Control': 'private, no-cache', 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', Vary: 'Cookie, X-Manual-Schema' };
const legacySources = new Set(['vitamix-manual', 'target-manual', 'newegg-manual', 'dyson-manual', 'direct-tools-manual', 'sennheiser-manual', 'cuckoo-manual', 'epson-manual', 'best-buy']);
export async function GET(request: Request) {
  if (new URL(request.url).search) return new Response(null, { status: 400, headers });
  // Pages already open on v20 retain their supported source schema and continue updating safely.
  const current = request.headers.get('X-Manual-Schema') === '2';
  const body = JSON.stringify({ records: records.filter(validManualSnapshot).filter(record => current || legacySources.has(record.sourceId) && record.category !== 'cameras'), failedSources: (status.sources as SnapshotSourceState[]).filter(source => source.status === 'failed' && (current || legacySources.has(source.sourceId))).map(source => source.sourceId) });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
  const etag = '"' + [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('') + '"';
  if (request.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers: { ...headers, ETag: etag } });
  return new Response(body, { headers: { ...headers, ETag: etag } });
}
export async function HEAD(request: Request) { const response = await GET(request); return new Response(null, { status: response.status, headers: response.headers }); }
