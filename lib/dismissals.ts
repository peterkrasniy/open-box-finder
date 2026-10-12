import type { Offer } from './offer.ts';
import type { ManualProduct } from './manual-products.ts';
import type { ResaleListing } from './resale.ts';
import type { SavedListing, StorageLike } from './storage.ts';
import { inventoryUnitIdentity } from './offer.ts';
import { SOURCE_BY_ID } from './sources.ts';

export const DISMISSED_PREFIX = 'open-box-finder:dismissed:v1:';
export const manualDismissIdentity = (listing: Pick<ManualProduct, 'sourceId' | 'id'>) => JSON.stringify(['manual', listing.sourceId, listing.id]);
export const resaleDismissIdentity = (listing: Pick<ResaleListing, 'sourceId' | 'id'>) => JSON.stringify(['resale', listing.sourceId, listing.id]);
export const offerDismissIdentity = (listing: Offer) => JSON.stringify(['offer', inventoryUnitIdentity(listing)]);
export function savedDismissIdentity(listing: SavedListing): string {
  if (listing.offerId.startsWith('manual:')) return manualDismissIdentity({ sourceId: listing.sourceId, id: listing.sourceOfferId ?? listing.offerId.slice(7) });
  if (listing.offerId.startsWith('resale:')) return resaleDismissIdentity({ sourceId: listing.sourceId as ResaleListing['sourceId'], id: listing.sourceOfferId ?? listing.offerId.slice(7) });
  return JSON.stringify(['offer', JSON.stringify([listing.sourceId, listing.sourceOfferId ?? listing.offerId, listing.variantKey, listing.condition ?? null, listing.storeId])]);
}
const small = (value: unknown, max = 200): value is string => typeof value === 'string' && value.length > 0 && value.length <= max && !/[\u0000-\u001f]/.test(value);
export function validDismissIdentity(value: unknown): value is string {
  if (!small(value, 4096)) return false;
  try {
    const parts = JSON.parse(value);
    if (!Array.isArray(parts) || JSON.stringify(parts) !== value) return false;
    if (parts.length === 3 && ['manual', 'resale'].includes(parts[0])) return SOURCE_BY_ID.has(parts[1]) && small(parts[2]);
    if (parts.length !== 2 || parts[0] !== 'offer' || !small(parts[1], 3000)) return false;
    const unit = JSON.parse(parts[1]);
    return Array.isArray(unit) && unit.length === 5 && JSON.stringify(unit) === parts[1]
      && SOURCE_BY_ID.has(unit[0]) && small(unit[1]) && small(unit[2])
      && (unit[3] === null || ['open-box', 'refurbished', 'used', 'scratch-and-dent', 'new-clearance', 'unspecified'].includes(unit[3])) && (unit[4] === null || small(unit[4], 160));
  } catch { return false; }
}
/** Separate atomic local entries preserve unrelated saves, preferences and other-tab dismissals. */
export function readDismissedListings(store: StorageLike | null): Set<string> {
  const result = new Set<string>();
  if (!store?.key || typeof store.length !== 'number') throw new Error('Listing dismissal storage unavailable');
  if (store.length > 50000) throw new Error('Browser storage exceeds supported size');
  for (let index = 0; index < store.length; index++) {
    const key = store.key(index);
    if (!key?.startsWith(DISMISSED_PREFIX)) continue;
    const identity = key.slice(DISMISSED_PREFIX.length);
    if (validDismissIdentity(identity) && store.getItem(key) === '1') result.add(identity);
  }
  return result;
}
export function writeListingDismissal(store: StorageLike | null, identity: string, hidden: boolean): boolean {
  if (!validDismissIdentity(identity) || !store) return false;
  try {
    if (hidden) store.setItem(DISMISSED_PREFIX + identity, '1');
    else if (store.removeItem) store.removeItem(DISMISSED_PREFIX + identity);
    else store.setItem(DISMISSED_PREFIX + identity, '0');
    return true;
  } catch { return false; }
}
