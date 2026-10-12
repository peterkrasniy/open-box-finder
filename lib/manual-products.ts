import type { Category, Condition, Filters, ReferenceBasis, Shipping, Sort, Store } from './offer.ts';
import { milesBetween, selected, validPoint } from './filter.ts';
import { shippingEligibility } from './shipping.ts';
import { savedSourceUrl } from './storage.ts';
import { validManualReference, validNewModelUrl, validUnrankedComparison } from './manual-snapshot-schema.ts';
import { ALL_MANUAL_PRODUCTS } from './manual-catalog.ts';
import type { SavedListing } from './storage.ts';

/** A human's bounded factual page notes, never a live inventory snapshot. */
export interface ManualProduct {
  productKey?: string; scopeKey?: string; previousUrls?: string[];
  archived?: { at: string; reason: 'confirmed-unavailable' | 'absent-from-complete-scope' };
  stockEvidence?: { url: string; detail: string; context?: string };
  id: string; recordType: 'manual-observation'; sourceId: string;
  brand: string; model: string; category: Category; condition: Condition;
  conditionDetail?: { en: string; ru: string };
  observedStock?: 'available' | 'unavailable';
  shipping?: Shipping; pickup?: Store;
  fulfillmentNote?: { en: string; ru: string };
  details?: { en: string; ru: string };
  referencePrice?: { cents: number; basis: ReferenceBasis; url: string; evidenceUrl?: string };
  observedPriceCents: number; currency: 'USD'; availability: 'unknown';
  url: string; reviewedAt: string; reviewUntil: string;
  newModelReference?: { cents: number; basis: 'observed-new-model'; url: string };
  retailerComparison?: { cents: number; basis: 'retailer-comparison'; url: string; evidenceUrl?: string; label?: { en: string; ru: string } };
  image: { url: string; listingUrl: string; width?: number; height?: number; alt: { en: string; ru: string } };
}
export const MANUAL_PRODUCTS: readonly ManualProduct[] = ALL_MANUAL_PRODUCTS;

/** Rank only an explicit, same-listing retailer reference; ambiguous strike prices stay unranked. */
export function manualSupportedReference(product: ManualProduct, now: number) {
  const reference = product.referencePrice;
  if (!manualProductActive(product, now) || !reference || !Number.isSafeInteger(reference.cents)
    || !['retailer-was', 'retailer-regular', 'current-new'].includes(reference.basis) || reference.cents <= product.observedPriceCents || !validManualReference(product)) return null;
  const cents = reference.cents - product.observedPriceCents;
  return { ...reference, savingCents: cents, fraction: cents / reference.cents };
}

export function manualFulfillmentMatches(product: ManualProduct, filters: Filters): boolean {
  if (filters.fulfillment === 'both') return true;
  if (filters.fulfillment === 'shipped') return shippingEligibility(product.shipping ?? null, filters.origin) === 'eligible';
  const pickup = product.pickup;
  const distance = pickup?.pickupVerified && pickup.point && validPoint(filters.origin) ? milesBetween(pickup.point, filters.origin) : null;
  return distance !== null && distance <= filters.radiusMiles;
}

export function manualRetailerComparison(product: ManualProduct, now: number): { cents: number; url: string; label?: { en: string; ru: string } } | null {
  const reference = product.retailerComparison;
  if (!manualProductActive(product, now) || !reference || reference.basis !== 'retailer-comparison'
    || !Number.isSafeInteger(reference.cents) || reference.cents <= product.observedPriceCents
    || !validUnrankedComparison(product)) return null;
  return { cents: reference.cents, url: reference.url, ...(reference.label ? { label: reference.label } : {}) };
}

export function manualNewModelComparison(product: ManualProduct, now: number): { cents: number; lowerRefurbished: boolean; url: string } | null {
  const reference = product.newModelReference;
  if (!manualProductActive(product, now) || !reference || reference.basis !== 'observed-new-model'
    || !Number.isSafeInteger(reference.cents) || reference.cents <= 0
    || (product.sourceId === 'sennheiser-manual' ? reference.url !== `https://us.sennheiser-hearing.com/products/${product.id.replace(/-refurbished$/, '')}` : !validNewModelUrl(product.sourceId, reference.url))) return null;
  return { cents: reference.cents, lowerRefurbished: reference.cents > product.observedPriceCents, url: reference.url };
}

export function manualProductActive(product: ManualProduct, now: number): boolean {
  const reviewed = Date.parse(product.reviewedAt), until = Date.parse(product.reviewUntil);
  return !product.archived && Number.isFinite(now) && Number.isFinite(reviewed) && Number.isFinite(until) && until > reviewed
    && until - reviewed <= 86_400_000 && now >= reviewed && now < until
    && Number.isSafeInteger(product.observedPriceCents) && product.observedPriceCents >= 0
    && Boolean(savedSourceUrl(product.sourceId, product.url));
}
export function manualProductsForFilters(filters: Filters, sort: Sort, now: number, records: readonly ManualProduct[] = MANUAL_PRODUCTS): ManualProduct[] {
  const query = filters.query.trim().normalize('NFKC').toLocaleLowerCase();
  const products = records.filter(product => manualProductActive(product, now)
    && selected(filters.retailers, product.sourceId) && selected(filters.categories, product.category)
    && product.observedStock !== 'unavailable' && manualFulfillmentMatches(product, filters)
    && (filters.minCents === null || product.observedPriceCents >= filters.minCents)
    && (filters.maxCents === null || product.observedPriceCents <= filters.maxCents)
    && (!query || `${product.brand} ${product.model} ${product.sourceId}`.normalize('NFKC').toLocaleLowerCase().includes(query)));
  // Unspecified strike-through/model references remain unranked.
  if (sort === 'price-low') products.sort((a, b) => a.observedPriceCents - b.observedPriceCents);
  else if (sort === 'newest') products.sort((a, b) => Date.parse(b.reviewedAt) - Date.parse(a.reviewedAt));
  else products.sort((a, b) => {
    const first = manualSupportedReference(a, now), second = manualSupportedReference(b, now);
    if (Boolean(first) !== Boolean(second)) return first ? -1 : 1;
    if (!first || !second) return 0;
    if (sort === 'dollars') return second.savingCents - first.savingCents;
    const exact = BigInt(second.savingCents) * BigInt(first.cents) - BigInt(first.savingCents) * BigInt(second.cents);
    return exact > 0n ? 1 : exact < 0n ? -1 : 0;
  });
  return products;
}
export function manualSavedPointer(product: ManualProduct, now: number, records: readonly ManualProduct[] = MANUAL_PRODUCTS): SavedListing | null {
  const reviewed = records.find(item => item.id === product.id && item.sourceId === product.sourceId);
  if (!reviewed || reviewed.url !== product.url || !manualProductActive(reviewed, now)) return null;
  return { offerId: `manual:${reviewed.id}`, sourceId: reviewed.sourceId, sourceOfferId: reviewed.id,
    variantKey: reviewed.id, condition: reviewed.condition, category: reviewed.category, storeId: reviewed.pickup?.id ?? null, url: reviewed.url,
    title: `${reviewed.brand} ${reviewed.model}`, savedAt: new Date(now).toISOString() };
}
