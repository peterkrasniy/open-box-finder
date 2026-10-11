import { emptyCatalog, reconcileSnapshot } from '../catalog.ts';
import type { Catalog, Offer, SyndicatedDeal } from '../offer.ts';
import { SOURCE_BY_ID } from '../sources.ts';
import type { SourceDefinition } from '../sources.ts';
import { APPROVED_POLICIES, safeSyndicatedHtml, withinScope, validatePublication } from './publication.ts';
import type { PublicationPolicy } from './publication.ts';
import { acquireSource, DEALNEWS_TRANSPORT } from './fetch-source.ts';
import { parseRss } from './rss.ts';
import { GLOBAL_MIN_INTERVAL_MS } from './catalog-store.ts';

export type AcquisitionResult = { ok: true; acquiredAt: string; complete: boolean; emptyConfirmed?: boolean; offers: Offer[]; syndication: SyndicatedDeal[]; minimumNextCheckSeconds: number }
  | { ok: false; stopAutomatic?: true; minimumNextCheckSeconds: number };
export interface Adapter { sourceId: string; acquire(policy: PublicationPolicy): Promise<AcquisitionResult> }
export interface Store {
  read(): Promise<Catalog>; claim(now: number): Promise<string | null>; publish(token: string, catalog: Catalog, now: number): Promise<boolean>;
  release(token: string, nextDueAt: number): Promise<void>;
  recordEvent(event: { sourceId: string; acquiredAt: number; outcome: 'success' | 'failure'; generation: string; added: number; changed: number; removed: number }): Promise<void>;
}
const minimumCadence = (seconds: number) => Math.max(900, Number.isFinite(seconds) ? Math.ceil(seconds) : 86400);
const hash = async (value: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(byte => byte.toString(16).padStart(2,'0')).join('');

export function dealnewsAdapter(fetcher: typeof fetch = fetch): Adapter {
  return { sourceId: 'dealnews', async acquire(policy) {
    const response = await acquireSource(DEALNEWS_TRANSPORT, fetcher);
    if (!response.ok) return { ok: false,...(response.stopAutomatic?{stopAutomatic:true as const}:{}), minimumNextCheckSeconds: response.minimumNextCheckSeconds };
    const feed = parseRss(response.text), deals: SyndicatedDeal[] = [];
    let complete = feed.complete;
    for (const entry of feed.entries) {
      if (!withinScope(entry.link, policy.products) || !safeSyndicatedHtml(entry.description, entry.link, policy)
        || (entry.content !== null && !safeSyndicatedHtml(entry.content, entry.link, policy))) { complete = false; continue; }
      deals.push({ id: `dealnews:${await hash(entry.guid)}`, sourceId: 'dealnews', sourceGuid: entry.guid, title: entry.title, url: entry.link,
        description: entry.description, content: entry.content, publishedAt: entry.publishedAt, observedAt: response.acquiredAt,
        imageScopes:policy.images.map(scope=>({origin:scope.origin,pathPrefix:scope.pathPrefix})),
        freshUntil: new Date(Date.parse(response.acquiredAt) + policy.maxFreshSeconds * 1000).toISOString() });
    }
    // A new empty or wholly rejected response cannot erase a previously populated feed.
    if (!deals.length) return { ok: false, minimumNextCheckSeconds: response.minimumNextCheckSeconds };
    return { ok: true, acquiredAt: response.acquiredAt, complete, offers: [], syndication: deals, minimumNextCheckSeconds: response.minimumNextCheckSeconds };
  }};
}
const ADAPTERS: ReadonlyMap<string, Adapter> = new Map([['dealnews', dealnewsAdapter()]]);

/** Deployment-controlled cache maintenance. No request URL, headers or payload enter this function. */
export async function maintainCatalog(store: Store, now = Date.now,
  adapters: ReadonlyMap<string, Adapter> = ADAPTERS,
  policies: ReadonlyMap<string, PublicationPolicy> = APPROVED_POLICIES,
  registry: ReadonlyMap<string, SourceDefinition> = SOURCE_BY_ID): Promise<Catalog> {
  const previous = await store.read();
  const started = now();
  const due = [...adapters.values()].filter(adapter => {
    const source = registry.get(adapter.sourceId), policy = policies.get(adapter.sourceId);
    const health = previous.sources.find(item => item.sourceId === adapter.sourceId);
    if(health?.blockedAt&&!(policy?.resumeBlockedBefore&&Date.parse(policy.resumeBlockedBefore)<=started&&Date.parse(policy.resumeBlockedBefore)>Date.parse(health.blockedAt)))return false;
    return source?.enabled && source.admission === 'admitted' && policy && (!health?.nextCheckAt || Date.parse(health.nextCheckAt) <= started);
  }).sort((a, b) => {
    const checked = (id: string) => Date.parse(previous.sources.find(source => source.sourceId === id)?.lastAttemptAt ?? '') || 0;
    return checked(a.sourceId) - checked(b.sourceId) || a.sourceId.localeCompare(b.sourceId);
  });
  if (!due.length) return previous;
  const token = await store.claim(started); if (!token) return await store.read();
  const adapter = due[0], policy = policies.get(adapter.sourceId)!;
  let nextDueAt = started + GLOBAL_MIN_INTERVAL_MS;
  let globalNextDueAt = nextDueAt;
  try {
    let result: AcquisitionResult;
    try { result = await adapter.acquire(policy); } catch { result = { ok: false, minimumNextCheckSeconds: 3600 }; }
    const completed = now(), time = new Date(completed).toISOString(), sequence = previous.sequence + 1;
    globalNextDueAt = completed + GLOBAL_MIN_INTERVAL_MS;
    const minimumSeconds = minimumCadence(result.minimumNextCheckSeconds);
    nextDueAt = completed + minimumSeconds * 1000;
    let offers = previous.offers, syndication = previous.syndication;
    let delta = { added: [] as string[], changed: [] as string[], removed: [] as string[] };
    try { if (result.ok) {
      if (!Number.isFinite(Date.parse(result.acquiredAt)) || Date.parse(result.acquiredAt) > completed + 30000) throw new TypeError('Invalid acquisition timestamp');
      const priorHealth = previous.sources.find(source => source.sourceId === adapter.sourceId);
      if (sourcePresentation(registry, adapter.sourceId) === 'normalized-inventory') {
        if (!result.offers.length && !(result.complete && result.emptyConfirmed)) throw new TypeError('Empty inventory is not confirmed');
        if (result.syndication.length) throw new TypeError('Editorial data is not inventory');
        const merged = reconcileSnapshot(previous.offers, { sourceId: adapter.sourceId, complete: result.complete, acquiredAt: result.acquiredAt, offers: result.offers }, priorHealth?.lastSuccessAt);
        offers = merged.offers; delta = merged.delta;
      } else {
        if (result.offers.length || Date.parse(result.acquiredAt) < Date.parse(priorHealth?.lastSuccessAt ?? '1970-01-01')) throw new TypeError('Stale or normalized editorial acquisition');
        const before = new Map(previous.syndication.filter(deal => deal.sourceId === adapter.sourceId).map(deal => [deal.id, deal]));
        const after = new Map(result.syndication.map(deal => { if (deal.sourceId !== adapter.sourceId) throw new TypeError('Feed source identity mismatch'); return [deal.id, deal] as const; }));
        if (after.size !== result.syndication.length) throw new TypeError('Duplicate feed identity');
        for (const [id, deal] of after) { const older = before.get(id); if (!older) delta.added.push(id); else if (JSON.stringify(feedMaterial(older)) !== JSON.stringify(feedMaterial(deal))) delta.changed.push(id); }
        if (result.complete) delta.removed = [...before.keys()].filter(id => !after.has(id));
        else for (const [id, deal] of before) if (!after.has(id)) after.set(id, deal);
        syndication = [...previous.syndication.filter(deal => deal.sourceId !== adapter.sourceId), ...after.values()].sort((a,b) => a.id.localeCompare(b.id));
      }
    }
    } catch { result = { ok: false, minimumNextCheckSeconds: 3600 }; offers = previous.offers; syndication = previous.syndication; delta = { added: [], changed: [], removed: [] }; nextDueAt = completed + 3600000; }
    let generation = result.ok && delta.added.length + delta.changed.length + delta.removed.length > 0 ? `content-${sequence}` : previous.generation;
    const buildNext = () => ({ ...previous, sequence, revision: `publication-${sequence}`, generation, publishedAt: time, offers, syndication,
      sources: previous.sources.map(source => source.sourceId !== adapter.sourceId ? source : { ...source, status: result.ok ? 'ready' as const : 'error' as const,
        lastAttemptAt: time, lastSuccessAt: result.ok ? result.acquiredAt : source.lastSuccessAt, nextCheckAt: new Date(nextDueAt).toISOString(),blockedAt:!result.ok&&result.stopAutomatic?time:null,
        lastCompleteAt: result.ok && result.complete ? result.acquiredAt : source.lastCompleteAt,
        lastSnapshotComplete: result.ok ? result.complete : source.lastSnapshotComplete, lastCompleteSequence: result.ok && result.complete ? sequence : source.lastCompleteSequence }) });
    let next = buildNext();
    try { validatePublication(next, completed, policies, registry); }
    catch { result = { ok: false, minimumNextCheckSeconds: 3600 }; offers = previous.offers; syndication = previous.syndication; delta = { added: [], changed: [], removed: [] }; generation = previous.generation; nextDueAt = completed + 3600000; next = buildNext(); }
    if (!await store.publish(token, next, completed)) return await store.read();
    try { await store.recordEvent({ sourceId: adapter.sourceId, acquiredAt: completed, outcome: result.ok ? 'success' : 'failure', generation,
      added: delta.added.length, changed: delta.changed.length, removed: delta.removed.length }); } catch { console.warn('Catalog published; operational event persistence failed'); }
    return next;
  } finally { await store.release(token, globalNextDueAt); }
}
function sourcePresentation(registry: ReadonlyMap<string, SourceDefinition>, id: string) { return registry.get(id)!.presentation; }
function feedMaterial(deal: SyndicatedDeal) { const { observedAt: _observed, freshUntil: _fresh, ...material } = deal; void _observed; void _fresh; return material; }
export function unconnectedCatalog(): Catalog { return emptyCatalog(); }
