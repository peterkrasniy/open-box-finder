export type Language = 'en' | 'ru';
export type Category = 'appliances' | 'tv' | 'computers' | 'phones' | 'cameras' | 'audio' | 'smart-home' | 'gaming' | 'tools' | 'home' | 'other';
export type Condition = 'open-box' | 'refurbished' | 'used' | 'scratch-and-dent' | 'new-clearance' | 'unspecified';
export type Availability = 'available' | 'unavailable' | 'unknown';
export type ReferenceBasis = 'current-new' | 'msrp' | 'retailer-list' | 'retailer-regular' | 'retailer-was';

export interface Point { latitude: number; longitude: number }
export interface Origin extends Point { label: string; shippingState: string | null }
export interface Shipping {
  country: 'US'; costCents: number | null; restrictions: string | null;
  eligibility?: { scope: 'all-us' | 'states'; states: string[]; excludedStates: string[] };
}
export interface Store {
  id: string;
  name: string;
  address: string;
  point: Point | null;
  pickupVerified: boolean;
}
export interface ReferencePrice {
  cents: number;
  currency: 'USD';
  basis: ReferenceBasis;
  variantKey: string;
  observedAt: string;
  maxAgeSeconds: number;
  sourceUrl: string;
}
export interface Offer {
  id: string;
  sourceId: string;
  retailerId: string;
  sourceOfferId: string;
  variantKey: string;
  recordType: 'inventory';
  title: string;
  category: Category;
  condition: Condition;
  cosmeticGrade: string | null;
  availability: Availability;
  priceCents: number | null;
  currency: 'USD';
  reference: ReferencePrice | null;
  url: string;
  imageUrl: string | null;
  imageAlt: string | null;
  pickup: Store | null;
  shipping: Shipping | null;
  localDelivery: { description: string; costCents: number | null } | null;
  observedAt: string;
  freshUntil: string;
}
/** The source unit is independent of an adapter's display/publication ID or changing price. */
export function inventoryUnitIdentity(offer:Pick<Offer,'sourceId'|'sourceOfferId'|'variantKey'|'condition'|'pickup'>):string{
 return JSON.stringify([offer.sourceId,offer.sourceOfferId,offer.variantKey,offer.condition,offer.pickup?.id??null]);
}

/** Editorial feed membership, never stock, current price, pickup or shipping evidence. */
export interface SyndicationImageScope {origin:string;pathPrefix:string}
export interface SyndicatedDeal {
  id: string; sourceId: string; sourceGuid: string; title: string; url: string;
  description: string; content: string | null; publishedAt: string | null;
  observedAt: string; freshUntil: string;
  /** Public rendering boundary copied from the accepted server policy; missing means no images. */
  imageScopes?: SyndicationImageScope[];
}

export interface Selection { mode: 'all' | 'selected'; ids: string[] }
export interface Filters {
  retailers: Selection;
  categories: Selection;
  query: string;
  fulfillment: 'both' | 'pickup' | 'shipped';
  origin: Origin;
  radiusMiles: number;
  minCents: number | null;
  maxCents: number | null;
}
export type Sort = 'percent' | 'dollars' | 'price-low' | 'newest';
export interface SourceHealth {
  sourceId: string;
  status: 'unconnected' | 'ready' | 'stale' | 'error';
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  nextCheckAt: string | null;
  lastCompleteAt: string | null;
  lastCompleteSequence: number;
  lastSnapshotComplete?: boolean;
  blockedAt?: string | null;
}
export interface Catalog {
  schemaVersion: 2;
  sequence: number;
  generation: string;
  revision: string;
  publishedAt: string | null;
  offers: Offer[];
  syndication: SyndicatedDeal[];
  sources: SourceHealth[];
}

export const DEFAULT_FILTERS: Filters = {
  retailers: { mode: 'all', ids: [] },
  categories: { mode: 'all', ids: [] },
  query: '', fulfillment: 'both',
  origin: { label: 'Rocklin, CA', latitude: 38.7907, longitude: -121.2358, shippingState: 'CA' },
  radiusMiles: 50, minCents: null, maxCents: null,
};

export function validCents(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 999_999_999;
}

export function isFresh(offer: Pick<Offer, 'observedAt' | 'freshUntil'>, now: number): boolean {
  const observed = Date.parse(offer.observedAt);
  const until = Date.parse(offer.freshUntil);
  return Number.isFinite(now) && Number.isFinite(observed) && Number.isFinite(until)
    && observed <= now + 30_000 && until >= observed && now <= until;
}

export function savings(offer: Offer, now: number): { cents: number; fraction: number } | null {
  const r = offer.reference;
  if (!r || !validCents(offer.priceCents) || !validCents(r.cents) || r.cents <= offer.priceCents
    || r.currency !== offer.currency || r.variantKey !== offer.variantKey || !isFresh(offer, now)
    || !Number.isSafeInteger(r.maxAgeSeconds) || r.maxAgeSeconds < 1 || r.maxAgeSeconds > 604_800) return null;
  const observed = Date.parse(r.observedAt);
  if (!Number.isFinite(observed) || observed > now + 30_000 || now - observed > r.maxAgeSeconds * 1000) return null;
  const cents = r.cents - offer.priceCents;
  return { cents, fraction: cents / r.cents };
}

export function displayDiscount(offer: Offer, now: number): number | null {
  const value = savings(offer, now);
  if (!value) return null;
  const basis = BigInt(offer.reference!.cents);
  const rounded = Number((BigInt(value.cents) * 200n + basis) / (basis * 2n));
  return offer.priceCents === 0 ? rounded : Math.min(99, rounded);
}
