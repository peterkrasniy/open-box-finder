import { acquireSource, A4L_ROBOTS_TRANSPORT, A4L_CATALOG_TRANSPORT, DEALNEWS_TRANSPORT, a4lUnitTransport } from './fetch-source.ts';
import { discoverA4lUnits, observeA4lUnit } from './a4l-preflight.ts';
import type { UnitObservation } from './a4l-preflight.ts';
import { robotsAllows } from './robots.ts';
import { parseRss } from './rss.ts';
import { CatalogStore } from './catalog-store.ts';

export type PreflightSource = 'a4l-sac' | 'dealnews';
/** Parent-owned admission review must accept the concrete boundary before any entry is added. */
export const APPROVED_PREFLIGHTS: readonly PreflightSource[] = [];
export interface PreflightObservation {
  sourceId: PreflightSource; checkedAt: string; outcome: 'observed' | 'blocked' | 'unsupported' | 'failure';
  httpStatus: number | null; catalogComplete: false; discoveredUnits: number; units: UnitObservation[];
  feed: { entries: number; rejected: number; complete: boolean; linkOrigins: string[] } | null;
}
const fail = (sourceId: PreflightSource, checkedAt: string, outcome: PreflightObservation['outcome'], httpStatus: number | null = null): PreflightObservation => ({ sourceId, checkedAt, outcome, httpStatus, catalogComplete: false, discoveredUnits: 0, units: [], feed: null });

/** Fixed candidates, 1 feed request or at most robots + catalog + 2 exact public unit reads. */
export async function preflightSource(sourceId: PreflightSource, fetcher: typeof fetch = fetch, now = Date.now): Promise<PreflightObservation> {
  const time = () => new Date(now()).toISOString();
  if (sourceId === 'dealnews') {
    const response = await acquireSource(DEALNEWS_TRANSPORT, fetcher, now);
    if (!response.ok) return fail(sourceId, time(), response.reason === 'http' ? 'blocked' : 'failure', response.httpStatus ?? null);
    try {
      const feed = parseRss(response.text);
      return { ...fail(sourceId, time(), 'observed'), feed: { entries: feed.entries.length, rejected: feed.rejected, complete: feed.complete,
        linkOrigins: [...new Set(feed.entries.map(entry => new URL(entry.link).origin))].sort() } };
    } catch { return fail(sourceId, time(), 'unsupported'); }
  }
  if (sourceId !== 'a4l-sac') throw new TypeError('Unregistered preflight source');
  const robots = await acquireSource(A4L_ROBOTS_TRANSPORT, fetcher, now);
  if (!robots.ok) return fail(sourceId, time(), robots.reason === 'http' ? 'blocked' : 'failure', robots.httpStatus ?? null);
  if (!robotsAllows(robots.text, '/products')) return fail(sourceId, time(), 'blocked');
  const catalog = await acquireSource(A4L_CATALOG_TRANSPORT, fetcher, now);
  if (!catalog.ok) return fail(sourceId, time(), catalog.reason === 'http' ? 'blocked' : 'failure', catalog.httpStatus ?? null);
  let urls: string[];
  try { urls = discoverA4lUnits(catalog.text); } catch { return fail(sourceId, time(), 'unsupported'); }
  if (!urls.length) return fail(sourceId, time(), 'unsupported');
  const units: UnitObservation[] = [];
  for (const url of urls.slice(0, 2)) {
    if (!robotsAllows(robots.text, new URL(url).pathname)) return fail(sourceId, time(), 'blocked');
    const page = await acquireSource(a4lUnitTransport(url), fetcher, now);
    if (!page.ok) return fail(sourceId, time(), page.reason === 'http' ? 'blocked' : 'failure', page.httpStatus ?? null);
    try { units.push(observeA4lUnit(page.text, url)); } catch { return fail(sourceId, time(), 'unsupported'); }
  }
  return { ...fail(sourceId, time(), 'observed'), discoveredUnits: urls.length, units };
}

/** Private operational evidence only. This never publishes stock or accepts visitor configuration. */
export async function maintainPreflight(database: D1Database, now = Date.now, approved: readonly PreflightSource[] = APPROVED_PREFLIGHTS): Promise<void> {
  if (!approved.length) return;
  const started = now(), store = new CatalogStore(database);
  const rows = await database.prepare('SELECT source_id,checked_at FROM source_preflight WHERE expires_at>?').bind(started).all<{ source_id: string; checked_at: number }>();
  const last = new Map(rows.results.map(row => [row.source_id, row.checked_at]));
  const source = [...approved].filter(id => started - (last.get(id) ?? 0) >= 3600000).sort((a,b) => (last.get(a) ?? 0) - (last.get(b) ?? 0) || a.localeCompare(b))[0];
  if (!source) return;
  const token = await store.claim(started); if (!token) return;
  try {
    const observation = await preflightSource(source, fetch, now), completed = now(), payload = JSON.stringify(observation);
    if (new TextEncoder().encode(payload).byteLength > 16384) throw new TypeError('Preflight evidence exceeds limit');
    await database.prepare(`INSERT INTO source_preflight (source_id,checked_at,payload,expires_at)
      SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM acquisition_control WHERE id=1 AND lease_token=? AND lease_until>?)
      ON CONFLICT(source_id) DO UPDATE SET checked_at=excluded.checked_at,payload=excluded.payload,expires_at=excluded.expires_at WHERE source_preflight.checked_at<=excluded.checked_at`)
      .bind(source, completed, payload, completed + 86400000, token, completed).run();
    await database.prepare('DELETE FROM source_preflight WHERE expires_at<=?').bind(completed).run();
  } finally { await store.release(token, now() + 3600000); }
}
