import { acquireSource, A4L_ROBOTS_TRANSPORT, A4L_CATALOG_TRANSPORT, DEALNEWS_TRANSPORT, a4lUnitTransport } from './fetch-source.ts';
import { discoverA4lUnits, observeA4lUnit } from './a4l-preflight.ts';
import type { UnitObservation } from './a4l-preflight.ts';
import { robotsAllows } from './robots.ts';
import { parseRss } from './rss.ts';
import { CatalogStore,GLOBAL_MIN_INTERVAL_MS } from './catalog-store.ts';

export type PreflightSource = 'a4l-sac' | 'dealnews';
export interface PreflightGrant {sourceId:PreflightSource;reviewedAt:string}
/** Accepted private research boundary only; this does not authorize publication or recurring reads. */
export const APPROVED_PREFLIGHTS: readonly PreflightGrant[] = [
  { sourceId: 'a4l-sac', reviewedAt: '2026-10-11T13:50:00.000Z' },
];
export interface PreflightObservation {
  sourceId: PreflightSource; checkedAt: string; outcome: 'observed' | 'blocked' | 'unsupported' | 'failure';
  httpStatus: number | null; catalogComplete: false; discoveredUnits: number; units: UnitObservation[];
  feed: { entries: number; rejected: number; complete: boolean; linkOrigins: string[] } | null;
  notBefore:string;
}
const fail = (sourceId: PreflightSource, checkedAt: string, outcome: PreflightObservation['outcome'], httpStatus: number | null = null, delay=900): PreflightObservation => ({ sourceId, checkedAt, outcome, httpStatus, catalogComplete: false, discoveredUnits: 0, units: [], feed: null,notBefore:new Date(Date.parse(checkedAt)+delay*1000).toISOString() });

/** Fixed candidates, 1 feed request or at most robots + catalog + 2 exact public unit reads. */
export async function preflightSource(sourceId: PreflightSource, fetcher: typeof fetch = fetch, now = Date.now): Promise<PreflightObservation> {
  // One entire admission probe shares the transport's eight-second budget; four reads do not multiply it.
  const budget=new AbortController(),timeout=setTimeout(()=>budget.abort(),8000);
  const acquire=(transport:Parameters<typeof acquireSource>[0])=>acquireSource(transport,fetcher,now,budget.signal);
  const time = () => new Date(now()).toISOString();
  try {
  if (sourceId === 'dealnews') {
    const response = await acquire(DEALNEWS_TRANSPORT);
    if (!response.ok) return fail(sourceId, time(), response.stopAutomatic ? 'blocked' : 'failure', response.httpStatus ?? null,response.minimumNextCheckSeconds);
    try {
      const feed = parseRss(response.text);
      return { ...fail(sourceId, time(), 'observed',null,response.minimumNextCheckSeconds), feed: { entries: feed.entries.length, rejected: feed.rejected, complete: feed.complete,
        linkOrigins: [...new Set(feed.entries.map(entry => new URL(entry.link).origin))].sort() } };
    } catch { return fail(sourceId, time(), 'unsupported',null,response.minimumNextCheckSeconds); }
  }
  if (sourceId !== 'a4l-sac') throw new TypeError('Unregistered preflight source');
  const robots = await acquire(A4L_ROBOTS_TRANSPORT);
  if (!robots.ok) return fail(sourceId, time(), robots.stopAutomatic ? 'blocked' : 'failure', robots.httpStatus ?? null,robots.minimumNextCheckSeconds);
  if (!robotsAllows(robots.text, '/products')) return fail(sourceId, time(), 'blocked',null,robots.minimumNextCheckSeconds);
  const catalog = await acquire(A4L_CATALOG_TRANSPORT);
  if (!catalog.ok) return fail(sourceId, time(), catalog.stopAutomatic ? 'blocked' : 'failure', catalog.httpStatus ?? null,Math.max(robots.minimumNextCheckSeconds,catalog.minimumNextCheckSeconds));
  let urls: string[];
  try { urls = discoverA4lUnits(catalog.text); } catch { return fail(sourceId, time(), 'unsupported',null,Math.max(robots.minimumNextCheckSeconds,catalog.minimumNextCheckSeconds)); }
  if (!urls.length) return fail(sourceId, time(), 'unsupported',null,Math.max(robots.minimumNextCheckSeconds,catalog.minimumNextCheckSeconds));
  const units: UnitObservation[] = [];
  let delay=Math.max(robots.minimumNextCheckSeconds,catalog.minimumNextCheckSeconds);
  for (const url of urls.slice(0, 2)) {
    if (!robotsAllows(robots.text, new URL(url).pathname)) return fail(sourceId, time(), 'blocked',null,delay);
    const page = await acquire(a4lUnitTransport(url));
    if (!page.ok) return fail(sourceId, time(), page.stopAutomatic ? 'blocked' : 'failure', page.httpStatus ?? null,Math.max(delay,page.minimumNextCheckSeconds));
    delay=Math.max(delay,page.minimumNextCheckSeconds);
    try { units.push(observeA4lUnit(page.text, url)); } catch { return fail(sourceId, time(), 'unsupported',null,delay); }
  }
  return { ...fail(sourceId, time(), 'observed',null,delay), discoveredUnits: urls.length, units };
  } finally {clearTimeout(timeout);}
}

/** Private operational evidence only. This never publishes stock or accepts visitor configuration. */
export async function maintainPreflight(database: D1Database, now = Date.now, approved: readonly PreflightGrant[] = APPROVED_PREFLIGHTS,fetcher:typeof fetch=fetch): Promise<void> {
  const started = now(), store = new CatalogStore(database);
  if(!Number.isSafeInteger(started)||started<0)throw new TypeError('Invalid preflight clock');
  // Erase expired evidence even after grants are removed. Keep only bounded source/time markers to prevent replay.
  await database.prepare("UPDATE source_preflight SET payload='null' WHERE expires_at<=? AND payload<>'null'").bind(started).run();
  const candidates=approved.filter(grant=>['a4l-sac','dealnews'].includes(grant.sourceId)&&Number.isFinite(Date.parse(grant.reviewedAt))&&Date.parse(grant.reviewedAt)<=started&&started-Date.parse(grant.reviewedAt)<86400000);
  if (!candidates.length) return;
  const rows = await database.prepare('SELECT source_id,checked_at,next_due_at FROM source_preflight').all<{ source_id: string; checked_at: number;next_due_at:number }>();
  const last = new Map(rows.results.map(row => [row.source_id,row]));
  const grant = candidates.filter(grant=>{const row=last.get(grant.sourceId);return !row||row.checked_at<Date.parse(grant.reviewedAt)&&row.next_due_at<=started;}).sort((a,b)=>(last.get(a.sourceId)?.checked_at??0)-(last.get(b.sourceId)?.checked_at??0)||a.sourceId.localeCompare(b.sourceId))[0];
  if (!grant) return;
  const source=grant.sourceId;
  const token = await store.claim(started); if (!token) return;
  try {
    // Consume the one-shot review before I/O, including a crashed or denied attempt.
    const marked=await database.prepare(`INSERT INTO source_preflight (source_id,checked_at,payload,expires_at,next_due_at)
      SELECT ?,?,'null',?,? WHERE EXISTS (SELECT 1 FROM acquisition_control WHERE id=1 AND lease_token=? AND lease_until>?)
      ON CONFLICT(source_id) DO UPDATE SET checked_at=excluded.checked_at,payload='null',expires_at=excluded.expires_at,next_due_at=excluded.next_due_at WHERE source_preflight.checked_at<=excluded.checked_at`)
      .bind(source,started,started+86400000,started+GLOBAL_MIN_INTERVAL_MS,token,started).run();
    if(marked.meta.changes!==1)return;
    let observation: PreflightObservation;
    try { observation = await preflightSource(source, fetcher, now); }
    catch { observation = fail(source, new Date(now()).toISOString(), 'failure'); }
    const completed = now(), payload = JSON.stringify(observation);
    if (new TextEncoder().encode(payload).byteLength > 16384) throw new TypeError('Preflight evidence exceeds limit');
    await database.prepare(`UPDATE source_preflight SET payload=?,expires_at=?,next_due_at=? WHERE source_id=? AND checked_at=? AND EXISTS(SELECT 1 FROM acquisition_control WHERE id=1 AND lease_token=? AND lease_until>?)`)
      .bind(payload, completed + 86400000,Date.parse(observation.notBefore),source,started,token,completed).run();
  } finally { await store.release(token, now() + GLOBAL_MIN_INTERVAL_MS); }
}
