import { RESALE_RECORDS, validResaleRecord } from '../../../lib/resale.ts';

// Read-only checked observations, protected by the site's existing owner audience.
const headers = { 'Cache-Control': 'private, no-cache', 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', Vary: 'Cookie' };
export async function GET(request: Request) {
  if (new URL(request.url).search) return new Response(null, { status: 400, headers });
  const body = JSON.stringify({ records: RESALE_RECORDS.filter(validResaleRecord) });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
  const etag = '"' + [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('') + '"';
  if (request.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers: { ...headers, ETag: etag } });
  return new Response(body, { headers: { ...headers, ETag: etag } });
}
export async function HEAD(request: Request) { const response = await GET(request); return new Response(null, { status: response.status, headers: response.headers }); }
