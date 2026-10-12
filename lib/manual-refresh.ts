import type { ManualProduct } from './manual-products.ts';
import { createHash } from 'node:crypto';
import { validManualSnapshot } from './manual-snapshot-schema.ts';

export interface SnapshotCheck {
  sourceId: string; scopeKey: string; checkedAt: string; status: 'success' | 'failed';
  complete: boolean; products: ManualProduct[];
  unavailable?: { id: string; evidenceUrl: string }[];
  reason?: 'access-denied' | 'network-error' | 'parse-error' | 'permission-held';
}
export interface SnapshotSourceState {
  sourceId: string; scopeKey: string; attemptedAt: string; status: 'success' | 'failed';
  lastSuccessAt: string | null; reason?: SnapshotCheck['reason'];
}
export interface SnapshotHistory {
  eventId: string; sourceId: string; id: string; at: string;
  action: 'added' | 'updated' | 'archived'; before: ManualProduct | null; after: ManualProduct;
}

const identity = (record: Pick<ManualProduct, 'sourceId' | 'id'>) => JSON.stringify([record.sourceId, record.id]);

/** Offline checked-data merge. This function never fetches retailer pages or deletes history/saves. */
export function refreshManualSnapshots(records: readonly ManualProduct[], priorChecks: readonly SnapshotSourceState[], checks: readonly SnapshotCheck[], now: number) {
  if (!Number.isFinite(now)) throw new Error('A trusted refresh time is required.');
  const next = new Map(records.map(record => [identity(record), structuredClone(record)]));
  const states = new Map(priorChecks.map(state => [JSON.stringify([state.sourceId, state.scopeKey]), structuredClone(state)]));
  const history: SnapshotHistory[] = [];
  const changes = { added: 0, updated: 0, archived: 0, failed: 0 };
  const recordEvent = (before: ManualProduct | undefined, after: ManualProduct, at: string, action: SnapshotHistory['action']) => {
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    const body = { sourceId: after.sourceId, id: after.id, at, action, before: before ?? null, after };
    history.push({ eventId: createHash('sha256').update(JSON.stringify(body)).digest('hex'), ...body });
    changes[action] += 1;
    next.set(identity(after), after);
  };
  for (const check of checks) {
    const checked = Date.parse(check.checkedAt), stateKey = JSON.stringify([check.sourceId, check.scopeKey]), prior = states.get(stateKey);
    if (!check.sourceId || !check.scopeKey || !Number.isFinite(checked) || checked > now + 30_000 || now - checked > 86_400_000) throw new Error('Invalid or stale source check.');
    if (prior && checked < Date.parse(prior.attemptedAt)) throw new Error('A check cannot roll source state backward.');
    if (check.status === 'failed') {
      if (check.products.length || check.unavailable?.length || check.complete) throw new Error('Failed checks cannot imply products or removals.');
      states.set(stateKey, { sourceId: check.sourceId, scopeKey: check.scopeKey, attemptedAt: check.checkedAt, status: 'failed', lastSuccessAt: prior?.lastSuccessAt ?? null, reason: check.reason ?? 'network-error' });
      changes.failed += 1;
      continue;
    }
    const seen = new Set<string>();
    for (const product of check.products) {
      if (!validManualSnapshot(product) || !product.productKey?.trim() || !product.scopeKey?.trim() || product.sourceId !== check.sourceId || product.scopeKey !== check.scopeKey || product.observedStock !== 'available' || product.archived
        || Date.parse(product.reviewedAt) > checked + 30_000 || checked - Date.parse(product.reviewedAt) > 86_400_000) throw new Error(`Invalid checked product: ${product.id}`);
      const key = identity(product);
      if (seen.has(key)) throw new Error(`Duplicate source product: ${product.id}`);
      seen.add(key);
      const existing = next.get(key);
      if (existing && (Date.parse(product.reviewedAt) < Date.parse(existing.reviewedAt)
        || existing.archived && Date.parse(product.reviewedAt) < Date.parse(existing.archived.at))) throw new Error('Product checks cannot roll backward.');
      const after = structuredClone(product);
      if (existing?.url !== after.url && existing?.url) after.previousUrls = [...new Set([...(existing.previousUrls ?? []), existing.url])];
      else if (existing?.previousUrls) after.previousUrls = existing.previousUrls;
      if (!validManualSnapshot(after)) throw new Error('Merged product exceeds snapshot bounds.');
      recordEvent(existing, after, check.checkedAt, existing ? 'updated' : 'added');
    }
    for (const unavailable of check.unavailable ?? []) {
      const key = identity({ sourceId: check.sourceId, id: unavailable.id }), existing = next.get(key);
      if (seen.has(key)) throw new Error('An item cannot be both available and unavailable in one check.');
      seen.add(key);
      if (!existing) continue;
      if (unavailable.evidenceUrl !== existing.url || existing.scopeKey !== check.scopeKey) throw new Error('Unavailable evidence must identify this exact scoped product.');
      if (checked < Date.parse(existing.reviewedAt) || existing.archived && checked < Date.parse(existing.archived.at)) throw new Error('Unavailable checks cannot roll product history backward.');
      recordEvent(existing, { ...existing, observedStock: 'unavailable', archived: { at: check.checkedAt, reason: 'confirmed-unavailable' } }, check.checkedAt, 'archived');
    }
    if (check.complete) {
      for (const [key, existing] of next) {
        if (existing.sourceId !== check.sourceId || existing.scopeKey !== check.scopeKey || seen.has(key) || existing.archived) continue;
        if (checked < Date.parse(existing.reviewedAt)) throw new Error('Complete checks cannot roll product history backward.');
        recordEvent(existing, { ...existing, archived: { at: check.checkedAt, reason: 'absent-from-complete-scope' } }, check.checkedAt, 'archived');
      }
    }
    states.set(stateKey, { sourceId: check.sourceId, scopeKey: check.scopeKey, attemptedAt: check.checkedAt, status: 'success', lastSuccessAt: check.checkedAt });
  }
  const available = [...next.values()].filter(record => !record.archived && record.observedStock === 'available' && Date.parse(record.reviewedAt) <= now && Date.parse(record.reviewUntil) > now);
  const productKeys = available.map(record => record.productKey ?? `legacy:${record.sourceId}:${record.id}`);
  if (new Set(productKeys).size !== productKeys.length) throw new Error('Duplicate model/product family across the current catalog. Keep one color/condition offer per product key.');
  return { records: [...next.values()], sources: [...states.values()], history, changes, eligibleCount: available.length };
}
