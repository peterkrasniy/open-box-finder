import type { Catalog } from '../offer.ts';
import { retainMaintenance } from './worker-lifecycle.ts';

export interface CatalogReadService { read(): Promise<Catalog>; maintain(): Promise<Catalog> }
/** Public input never reaches acquisition configuration or payloads. HEAD performs no maintenance. */
export async function catalogResponse(request: Request, service: CatalogReadService, now = Date.now): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Catalog-Time': new Date(now()).toISOString() };
  if (!['GET','HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET, HEAD' } });
  if (new URL(request.url).search) return new Response(null, { status: 400, headers });
  try {
    const catalog = request.method === 'HEAD' ? await service.read() : await retainMaintenance(() => service.maintain());
    const etag = `"${catalog.sequence}:${catalog.revision}"`;
    const responseHeaders = { ...headers, ETag: etag, 'Content-Type': 'application/json; charset=utf-8' };
    // Re-anchor after acquisition. The clock is not a stock-observation timestamp.
    responseHeaders['X-Catalog-Time'] = new Date(now()).toISOString();
    if (request.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers: responseHeaders });
    return new Response(request.method === 'HEAD' ? null : JSON.stringify(catalog), { headers: responseHeaders });
  } catch { return new Response(null, { status: 503, headers }); }
}
