import { acquireSource, A4L_ROBOTS_TRANSPORT, A4L_CATALOG_TRANSPORT, DEALNEWS_TRANSPORT, DISCOUNT_ROBOTS_TRANSPORT, DISCOUNT_PRODUCT_TRANSPORT, a4lUnitTransport } from './fetch-source.ts';
import { discoverA4lUnits, observeA4lUnit } from './a4l-preflight.ts';
import type { UnitObservation } from './a4l-preflight.ts';
import { robotsAllows } from './robots.ts';
import { parseRss } from './rss.ts';
import { CatalogStore,GLOBAL_MIN_INTERVAL_MS } from './catalog-store.ts';
import { inspectFeed } from './feed-evidence.ts';
import type { FeedEvidence } from './feed-evidence.ts';
import { parseReason } from './parse-evidence.ts';
import type { ParseReason } from './parse-evidence.ts';
import type { FetchOutcome } from './fetch-source.ts';
import { observeDiscountProduct, DISCOUNT_TARGET } from './research/discount-product.ts';
import type { RetailProductObservation } from './research/discount-product.ts';

export type PreflightSource = 'a4l-sac' | 'dealnews' | 'discount-electronics';
export interface PreflightGrant {sourceId:PreflightSource;reviewedAt:string}
/** Accepted private research boundary only; this does not authorize publication or recurring reads. */
export const APPROVED_PREFLIGHTS: readonly PreflightGrant[] = [
  { sourceId: 'a4l-sac', reviewedAt: '2026-10-11T14:20:00.000Z' },
  { sourceId: 'dealnews', reviewedAt: '2026-10-11T14:40:00.000Z' },
];
export interface PreflightDiagnostic {
  stage: 'robots' | 'catalog' | 'unit' | 'feed' | 'product'; httpStatus: number | null; contentType: string | null; bytesRead: number;
  transportReason: Extract<FetchOutcome, { ok: false }>['reason'] | null;
  robotsAllowed: boolean | null; parserReason: ParseReason | null;
}
export interface PreflightObservation {
  sourceId: PreflightSource; checkedAt: string; outcome: 'observed' | 'blocked' | 'unsupported' | 'failure';
  httpStatus: number | null; catalogComplete: false; discoveredUnits: number; units: UnitObservation[];
  feed: FeedEvidence | null; product: RetailProductObservation | null; diagnostics: PreflightDiagnostic[];
  notBefore:string;
}
const fail = (sourceId: PreflightSource, checkedAt: string, outcome: PreflightObservation['outcome'], httpStatus: number | null = null, delay=900): PreflightObservation => ({ sourceId, checkedAt, outcome, httpStatus, catalogComplete: false, discoveredUnits: 0, units: [], feed: null, product: null, diagnostics: [],notBefore:new Date(Date.parse(checkedAt)+delay*1000).toISOString() });

/** Fixed candidates: one feed, robots + one PDP, or robots + catalog + two exact units. */
export async function preflightSource(sourceId: PreflightSource, fetcher: typeof fetch = fetch, now = Date.now): Promise<PreflightObservation> {
  // One entire admission probe shares the transport's eight-second budget; four reads do not multiply it.
  const budget=new AbortController(),timeout=setTimeout(()=>budget.abort(),8000);
  const diagnostics: PreflightDiagnostic[] = []; let discoveredUnits = 0;
  const acquire=async(transport:Parameters<typeof acquireSource>[0],stage:PreflightDiagnostic['stage'])=>{
    const response=await acquireSource(transport,fetcher,now,budget.signal);
    diagnostics.push({ stage, httpStatus: response.httpStatus, contentType: response.contentType, bytesRead: response.bytesRead,
      transportReason: response.ok ? null : response.reason, robotsAllowed: null, parserReason: null });
    return response;
  };
  const finish=(observation:PreflightObservation):PreflightObservation=>({...observation,diagnostics,discoveredUnits});
  const time = () => new Date(now()).toISOString();
  try {
  if (sourceId === 'dealnews') {
    const response = await acquire(DEALNEWS_TRANSPORT,'feed');
    if (!response.ok) return finish(fail(sourceId, time(), response.stopAutomatic ? 'blocked' : 'failure', response.httpStatus,response.minimumNextCheckSeconds));
    try {
      const feed = parseRss(response.text);
      return finish({ ...fail(sourceId, time(), 'observed',response.httpStatus,response.minimumNextCheckSeconds), feed: inspectFeed(feed) });
    } catch (error) { diagnostics.at(-1)!.parserReason=parseReason(error,'rss-xml-syntax');return finish(fail(sourceId, time(), 'unsupported',response.httpStatus,response.minimumNextCheckSeconds)); }
  }
  if (sourceId === 'discount-electronics') {
    const robots=await acquire(DISCOUNT_ROBOTS_TRANSPORT,'robots');
    if(!robots.ok)return finish(fail(sourceId,time(),robots.stopAutomatic?'blocked':'failure',robots.httpStatus,robots.minimumNextCheckSeconds));
    const allowed=robotsAllows(robots.text,new URL(DISCOUNT_TARGET.url).pathname);diagnostics.at(-1)!.robotsAllowed=allowed;
    if(!allowed)return finish(fail(sourceId,time(),'blocked',robots.httpStatus,robots.minimumNextCheckSeconds));
    const page=await acquire(DISCOUNT_PRODUCT_TRANSPORT,'product'),delay=Math.max(robots.minimumNextCheckSeconds,page.minimumNextCheckSeconds);
    if(!page.ok)return finish(fail(sourceId,time(),page.stopAutomatic?'blocked':'failure',page.httpStatus,delay));
    try{return finish({...fail(sourceId,time(),'observed',page.httpStatus,delay),product:observeDiscountProduct(page.text)});}
    catch(error){const reason=parseReason(error,'parser-unclassified');diagnostics.at(-1)!.parserReason=reason;return finish(fail(sourceId,time(),reason==='response-challenge'?'blocked':'unsupported',page.httpStatus,delay));}
  }
  if (sourceId !== 'a4l-sac') throw new TypeError('Unregistered preflight source');
  const robots = await acquire(A4L_ROBOTS_TRANSPORT,'robots');
  if (!robots.ok) return finish(fail(sourceId, time(), robots.stopAutomatic ? 'blocked' : 'failure', robots.httpStatus,robots.minimumNextCheckSeconds));
  const catalogAllowed=robotsAllows(robots.text, '/products');diagnostics.at(-1)!.robotsAllowed=catalogAllowed;
  if (!catalogAllowed) return finish(fail(sourceId, time(), 'blocked',robots.httpStatus,robots.minimumNextCheckSeconds));
  const catalog = await acquire(A4L_CATALOG_TRANSPORT,'catalog');
  if (!catalog.ok) return finish(fail(sourceId, time(), catalog.stopAutomatic ? 'blocked' : 'failure', catalog.httpStatus,Math.max(robots.minimumNextCheckSeconds,catalog.minimumNextCheckSeconds)));
  let urls: string[];
  try { urls = discoverA4lUnits(catalog.text); } catch (error) { diagnostics.at(-1)!.parserReason=parseReason(error,'parser-unclassified');return finish(fail(sourceId, time(), 'unsupported',catalog.httpStatus,Math.max(robots.minimumNextCheckSeconds,catalog.minimumNextCheckSeconds))); }
  discoveredUnits=urls.length;
  if (!urls.length) {diagnostics.at(-1)!.parserReason='catalog-no-canonical-units';return finish(fail(sourceId, time(), 'unsupported',catalog.httpStatus,Math.max(robots.minimumNextCheckSeconds,catalog.minimumNextCheckSeconds)));}
  const units: UnitObservation[] = [];
  let delay=Math.max(robots.minimumNextCheckSeconds,catalog.minimumNextCheckSeconds);
  for (const url of urls.slice(0, 2)) {
    if (!robotsAllows(robots.text, new URL(url).pathname)) { diagnostics.push({stage:'unit',httpStatus:null,contentType:null,bytesRead:0,transportReason:null,robotsAllowed:false,parserReason:null});return finish(fail(sourceId, time(), 'blocked',robots.httpStatus,delay)); }
    const page = await acquire(a4lUnitTransport(url),'unit');diagnostics.at(-1)!.robotsAllowed=true;
    if (!page.ok) return finish(fail(sourceId, time(), page.stopAutomatic ? 'blocked' : 'failure', page.httpStatus,Math.max(delay,page.minimumNextCheckSeconds)));
    delay=Math.max(delay,page.minimumNextCheckSeconds);
    try { units.push(observeA4lUnit(page.text, url)); } catch (error) {diagnostics.at(-1)!.parserReason=parseReason(error,'parser-unclassified');return finish(fail(sourceId, time(), 'unsupported',page.httpStatus,delay));}
  }
  return finish({ ...fail(sourceId, time(), 'observed',diagnostics.at(-1)!.httpStatus,delay), units });
  } finally {clearTimeout(timeout);}
}

/** Private operational evidence only. This never publishes stock or accepts visitor configuration. */
export async function maintainPreflight(database: D1Database, now = Date.now, approved: readonly PreflightGrant[] = APPROVED_PREFLIGHTS,fetcher:typeof fetch=fetch): Promise<void> {
  const started = now(), store = new CatalogStore(database);
  if(!Number.isSafeInteger(started)||started<0)throw new TypeError('Invalid preflight clock');
  // Erase expired evidence even after grants are removed. Keep only bounded source/time markers to prevent replay.
  await database.prepare("UPDATE source_preflight SET payload='null' WHERE expires_at<=? AND payload<>'null'").bind(started).run();
  const candidates=approved.filter(grant=>['a4l-sac','dealnews','discount-electronics'].includes(grant.sourceId)&&Number.isFinite(Date.parse(grant.reviewedAt))&&Date.parse(grant.reviewedAt)<=started&&started-Date.parse(grant.reviewedAt)<86400000);
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
