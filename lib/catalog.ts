import type { Catalog, Offer } from './offer.ts';
import { SOURCES } from './sources.ts';
import { publicOffer } from './validation.ts';

export function emptyCatalog(): Catalog {
  return {
    schemaVersion: 1, generation: 'uninitialized', revision: 'uninitialized', publishedAt: null, offers: [],
    sources: SOURCES.map(source => ({ sourceId: source.id, status: 'unconnected', lastAttemptAt: null, lastSuccessAt: null, nextCheckAt: null })),
  };
}

export interface SourceSnapshot {
  sourceId: string;
  complete: boolean;
  acquiredAt: string;
  offers: Offer[];
}
export interface SnapshotDelta { added: string[]; changed: string[]; removed: string[] }

/** A partial or failed fetch cannot remove offers absent from that response. */
export function reconcileSnapshot(previous: readonly Offer[], incoming: SourceSnapshot): { offers: Offer[]; delta: SnapshotDelta } {
  if (!Number.isFinite(Date.parse(incoming.acquiredAt))) throw new TypeError('Invalid source observation');
  const prior = new Map(previous.map(offer => [offer.id, offer]));
  const next = new Map<string, Offer>();
  for (const offer of incoming.offers) {
    if (offer.sourceId !== incoming.sourceId || next.has(offer.id)) throw new TypeError('Source identity or duplicate offer mismatch');
    if (prior.has(offer.id) && prior.get(offer.id)!.sourceId !== incoming.sourceId) throw new TypeError('Cross-source offer identity collision');
    next.set(offer.id, offer);
  }
  const delta: SnapshotDelta = { added: [], changed: [], removed: [] };
  const published = new Map(prior);
  for (const [id, offer] of next) {
    const older = prior.get(id);
    if (!older) delta.added.push(id);
    else if (JSON.stringify(materialFields(older)) !== JSON.stringify(materialFields(offer))) delta.changed.push(id);
    published.set(id, offer);
  }
  if (incoming.complete) {
    for (const [id, offer] of prior) {
      if (offer.sourceId === incoming.sourceId && !next.has(id)) {
        delta.removed.push(id);
        published.delete(id);
      }
    }
  }
  return { offers: [...published.values()].sort((a, b) => a.id.localeCompare(b.id, 'en')), delta };
}

export function materialFields(offer: Offer): Omit<Offer, 'observedAt' | 'freshUntil'> {
  const record = publicOffer(offer);
  const stable = Object.fromEntries(Object.entries(record).filter(([key]) => key !== 'observedAt' && key !== 'freshUntil'));
  return { ...stable, reference: record.reference ? { ...record.reference, observedAt: '' } : null } as Omit<Offer, 'observedAt' | 'freshUntil'>;
}
