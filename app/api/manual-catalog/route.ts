import records from '../../../data/manual-records.json' with { type: 'json' };
import status from '../../../data/manual-refresh-status.json' with { type: 'json' };
import type { SnapshotSourceState } from '../../../lib/manual-refresh.ts';
import { validManualSnapshot } from '../../../lib/manual-snapshot-schema.ts';

// Owner-protected published data only. No credentials, profiles or administrative mutation endpoint.
const headers = { 'Cache-Control': 'private, no-cache', 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', Vary: 'Cookie' };
export async function GET(request: Request) {
  if (new URL(request.url).search) return new Response(null, { status: 400, headers });
  const body = JSON.stringify({ records: records.filter(validManualSnapshot), failedSources: (status.sources as SnapshotSourceState[]).filter(source => source.status === 'failed').map(source => source.sourceId) });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
  const etag = '"' + [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('') + '"';
  if (request.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers: { ...headers, ETag: etag } });
  return new Response(body, { headers: { ...headers, ETag: etag } });
}
export async function HEAD(request: Request) { const response = await GET(request); return new Response(null, { status: response.status, headers: response.headers }); }
