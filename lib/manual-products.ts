import type { Filters, Sort } from './offer.ts';
import { selected } from './filter.ts';
import type { SavedListing } from './storage.ts';

/** A human's bounded factual page notes, never a live inventory snapshot. */
export interface ManualProduct {
  id: string; recordType: 'manual-observation'; sourceId: 'sennheiser-manual';
  brand: 'Sennheiser'; model: string; category: 'audio'; condition: 'refurbished';
  observedPriceCents: number; currency: 'USD'; availability: 'unknown';
  url: string; reviewedAt: string; reviewUntil: string;
  newModelReference: { cents: number; basis: 'observed-new-model'; url: string };
  video: { id: string; creator: string; kind: 'manufacturer' | 'independent-review' };
}
const reviewedAt = '2026-10-11T19:28:00.000Z';
const reviewUntil = '2026-10-12T19:28:00.000Z';
/** Original factual notes and new-model page comparisons, never former refurbished prices.
 * Primary product pages and sales terms manually reviewed. No recurring requests.
 */
export const MANUAL_PRODUCTS: readonly ManualProduct[] = [
  ['accentum-plus-refurbished', 'ACCENTUM Plus', 9995, 12995, 'JM0QIRfkOfs', 'Sennheiser'],
  ['hd-600-refurbished', 'HD 600', 27995, 34995, '9gcuORhXRuI', 'askdrtk'],
  ['rs-120-w-refurbished', 'RS 120-W', 12995, 12995, '-0MJWoXRjkc', 'Sennheiser'],
  ['ambeo-soundbar-plus-refurbished', 'AMBEO Soundbar Plus', 99995, 119995, 'IZbFYQOjngI', 'Sennheiser'],
].map(([slug, model, price, newPrice, videoId, creator]) => ({
  id: String(slug), model: String(model), observedPriceCents: Number(price),
  recordType: 'manual-observation', sourceId: 'sennheiser-manual', brand: 'Sennheiser',
  category: 'audio', condition: 'refurbished', currency: 'USD', availability: 'unknown',
  url: `https://us.sennheiser-hearing.com/collections/refurbished-by-sennheiser/products/${slug}`,
  newModelReference: { cents: Number(newPrice), basis: 'observed-new-model', url: `https://us.sennheiser-hearing.com/products/${String(slug).replace(/-refurbished$/, '')}` },
  video: { id: String(videoId), creator: String(creator), kind: creator === 'Sennheiser' ? 'manufacturer' : 'independent-review' },
  reviewedAt, reviewUntil,
}));

export function manualNewModelComparison(product: ManualProduct, now: number): { cents: number; lowerRefurbished: boolean; url: string } | null {
  const reference = product.newModelReference;
  if (!manualProductActive(product, now) || reference.basis !== 'observed-new-model'
    || !Number.isSafeInteger(reference.cents) || reference.cents <= 0
    || reference.url !== `https://us.sennheiser-hearing.com/products/${product.id.replace(/-refurbished$/, '')}`) return null;
  return { cents: reference.cents, lowerRefurbished: reference.cents > product.observedPriceCents, url: reference.url };
}

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
