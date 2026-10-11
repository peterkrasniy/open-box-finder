import { emptyCatalog } from '../../../lib/catalog.ts';

export const dynamic = 'force-dynamic';

/** Read-only until an admitted adapter and durable acquisition are verified. */
export function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store', ETag: '"uninitialized-v1"', 'X-Content-Type-Options': 'nosniff' };
  if (request.headers.get('If-None-Match') === headers.ETag) return new Response(null, { status: 304, headers });
  return Response.json(emptyCatalog(), { headers });
}
