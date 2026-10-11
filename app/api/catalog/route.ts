import { env } from 'cloudflare:workers';
import { emptyCatalog } from '../../../lib/catalog.ts';
import { CatalogStore } from '../../../lib/server/catalog-store.ts';
import { catalogResponse } from '../../../lib/server/catalog-route.ts';
import { maintainPreflight } from '../../../lib/server/preflight.ts';
import { maintainCatalog } from '../../../lib/server/pipeline.ts';

export const dynamic = 'force-dynamic';
/** All adapters remain disabled until parent source and security admission. */
function service() {
  if (!env.DB) return { read: async () => emptyCatalog(), maintain: async () => emptyCatalog() };
  const store = new CatalogStore(env.DB);
  return { read: () => store.read(), maintain: async () => {
    // A short-lived, one-shot admission review gets a turn before periodic source acquisition.
    // Private evidence housekeeping failures must not hide an already readable public catalog.
    try { await maintainPreflight(env.DB!); } catch { console.warn('Private source review maintenance failed'); }
    return maintainCatalog(store);
  } };
}
export function GET(request: Request) { return catalogResponse(request, service()); }
export function HEAD(request: Request) { return catalogResponse(request, service()); }
