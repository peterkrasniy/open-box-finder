import type { Filters, Sort } from './offer.ts';
import { selected } from './filter.ts';
import type { SavedListing } from './storage.ts';

/** A human's bounded factual page notes, never a live inventory snapshot. */
export interface ManualProduct {
  id: string; recordType: 'manual-observation'; sourceId: 'sennheiser-manual';
  brand: 'Sennheiser'; model: string; category: 'audio'; condition: 'refurbished';
  observedPriceCents: number; currency: 'USD'; availability: 'unknown';
  url: string; reviewedAt: string; reviewUntil: string;
}
const reviewedAt = '2026-10-11T17:42:00.000Z';
const reviewUntil = '2026-10-12T17:42:00.000Z';
/** Original concise model labels and factual notes; no descriptions, media or comparison prices.
 * Primary product pages and sales terms manually reviewed. No recurring requests.
 */
export const MANUAL_PRODUCTS: readonly ManualProduct[] = [
  ['accentum-plus-refurbished', 'ACCENTUM Plus', 9995],
  ['hd-600-refurbished', 'HD 600', 27995],
  ['rs-120-w-refurbished', 'RS 120-W', 12995],
  ['ambeo-soundbar-plus-refurbished', 'AMBEO Soundbar Plus', 99995],
].map(([slug, model, price]) => ({
  id: String(slug), model: String(model), observedPriceCents: Number(price),
  recordType: 'manual-observation', sourceId: 'sennheiser-manual', brand: 'Sennheiser',
  category: 'audio', condition: 'refurbished', currency: 'USD', availability: 'unknown',
  url: `https://us.sennheiser-hearing.com/collections/refurbished-by-sennheiser/products/${slug}`,
  reviewedAt, reviewUntil,
}));

export function manualProductActive(product: ManualProduct, now: number): boolean {
  return Number.isFinite(now) && now >= Date.parse(product.reviewedAt) && now < Date.parse(product.reviewUntil);
}
export function manualProductsForFilters(filters: Filters, sort: Sort, now: number): ManualProduct[] {
  const query = filters.query.trim().normalize('NFKC').toLocaleLowerCase();
  const products = MANUAL_PRODUCTS.filter(product => manualProductActive(product, now)
    && selected(filters.retailers, product.sourceId) && selected(filters.categories, product.category)
    && filters.fulfillment === 'both'
    && (filters.minCents === null || product.observedPriceCents >= filters.minCents)
    && (filters.maxCents === null || product.observedPriceCents <= filters.maxCents)
    && (!query || `${product.brand} ${product.model}`.normalize('NFKC').toLocaleLowerCase().includes(query)));
  // No supported reference price: never invent percentage/dollar savings rankings.
  if (sort === 'price-low') products.sort((a, b) => a.observedPriceCents - b.observedPriceCents);
  return products;
}
export function manualSavedPointer(product: ManualProduct, now: number): SavedListing | null {
  const reviewed = MANUAL_PRODUCTS.find(item => item.id === product.id);
  if (!reviewed || reviewed.url !== product.url || !manualProductActive(reviewed, now)) return null;
  return { offerId: `manual:${reviewed.id}`, sourceId: reviewed.sourceId, sourceOfferId: reviewed.id,
    variantKey: reviewed.id, condition: 'refurbished', storeId: null, url: reviewed.url,
    title: `${reviewed.brand} ${reviewed.model}`, savedAt: new Date(now).toISOString() };
}
