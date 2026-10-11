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
  retailerComparison: { cents: number; basis: 'retailer-comparison'; url: string };
  image: { url: string; listingUrl: string; width: number; height: number; alt: { en: string; ru: string } };
}
const reviewedAt = '2026-10-11T19:28:00.000Z';
const reviewUntil = '2026-10-12T19:28:00.000Z';
/** Exact hero currentSrc URLs and natural dimensions visually verified by parent Chrome at 20:27 UTC. */
const LISTING_PHOTOS: Record<string, ManualProduct['image']> = {
  "accentum-plus-refurbished": {
    "url": "https://us.sennheiser-hearing.com/cdn/shop/files/ACCENTUM_PLUS__Better__Product_Images_af997a39-cd00-439f-84d8-e89b694d24f7.jpg?v=1715091057",
    "listingUrl": "https://us.sennheiser-hearing.com/collections/refurbished-by-sennheiser/products/accentum-plus-refurbished?variant=47755244142875",
    "width": 1280,
    "height": 1280,
    "alt": {
      "en": "Black Sennheiser ACCENTUM Plus headphones, photo from the refurbished listing",
      "ru": "Чёрные наушники Sennheiser ACCENTUM Plus, фото из объявления о восстановленном товаре"
    }
  },
  "hd-600-refurbished": {
    "url": "https://us.sennheiser-hearing.com/cdn/shop/files/product_detail_x2_desktop_HD_600_Sennheiser_01_48b5a84e-7b00-4a3b-bbee-8ee1bccd52c3.jpg?v=1715092308",
    "listingUrl": "https://us.sennheiser-hearing.com/collections/refurbished-by-sennheiser/products/hd-600-refurbished?variant=45465012338971",
    "width": 1312,
    "height": 1312,
    "alt": {
      "en": "Sennheiser HD 600 wired headphones, photo from the refurbished listing",
      "ru": "Проводные наушники Sennheiser HD 600, фото из объявления о восстановленном товаре"
    }
  },
  "rs-120-w-refurbished": {
    "url": "https://us.sennheiser-hearing.com/cdn/shop/files/rs_120_w_iso_1_e0b5357f-9fe9-46a6-9171-dd4668697733.jpg?v=1715091606",
    "listingUrl": "https://us.sennheiser-hearing.com/collections/refurbished-by-sennheiser/products/rs-120-w-refurbished?variant=45464908267803",
    "width": 3000,
    "height": 3000,
    "alt": {
      "en": "Sennheiser RS 120-W headphones and charging base, photo from the refurbished listing",
      "ru": "Наушники Sennheiser RS 120-W с зарядной базой, фото из объявления о восстановленном товаре"
    }
  },
  "ambeo-soundbar-plus-refurbished": {
    "url": "https://us.sennheiser-hearing.com/cdn/shop/files/Sennheiser_AMBEO_Soundbar_Plus.jpg?v=1762307608",
    "listingUrl": "https://us.sennheiser-hearing.com/collections/refurbished-by-sennheiser/products/ambeo-soundbar-plus-refurbished?variant=45464951226651",
    "width": 2400,
    "height": 2400,
    "alt": {
      "en": "Sennheiser AMBEO Soundbar Plus without a separate subwoofer, photo from the refurbished listing",
      "ru": "Саундбар Sennheiser AMBEO Soundbar Plus без отдельного сабвуфера, фото из объявления о восстановленном товаре"
    }
  }
};
/** Original factual notes and new-model page comparisons, never former refurbished prices.
 * Primary product pages and sales terms manually reviewed. No recurring requests.
 */
export const MANUAL_PRODUCTS: readonly ManualProduct[] = [
  ['accentum-plus-refurbished', 'ACCENTUM Plus', 9995, 12995, 24995],
  ['hd-600-refurbished', 'HD 600', 27995, 34995, 49995],
  ['rs-120-w-refurbished', 'RS 120-W', 12995, 12995, 15995],
  ['ambeo-soundbar-plus-refurbished', 'AMBEO Soundbar Plus', 99995, 119995, 179995],
].map(([slug, model, price, newPrice, retailerPrice]) => ({
  id: String(slug), model: String(model), observedPriceCents: Number(price),
  recordType: 'manual-observation', sourceId: 'sennheiser-manual', brand: 'Sennheiser',
  category: 'audio', condition: 'refurbished', currency: 'USD', availability: 'unknown',
  url: `https://us.sennheiser-hearing.com/collections/refurbished-by-sennheiser/products/${slug}`,
  newModelReference: { cents: Number(newPrice), basis: 'observed-new-model', url: `https://us.sennheiser-hearing.com/products/${String(slug).replace(/-refurbished$/, '')}` },
  retailerComparison: { cents: Number(retailerPrice), basis: 'retailer-comparison', url: `https://us.sennheiser-hearing.com/collections/refurbished-by-sennheiser/products/${slug}` },
  image: LISTING_PHOTOS[String(slug)],
  reviewedAt, reviewUntil,
}));

export function manualRetailerComparison(product: ManualProduct, now: number): { cents: number; url: string } | null {
  const reference = product.retailerComparison;
  if (!manualProductActive(product, now) || reference.basis !== 'retailer-comparison'
    || !Number.isSafeInteger(reference.cents) || reference.cents <= product.observedPriceCents
    || reference.url !== `https://us.sennheiser-hearing.com/collections/refurbished-by-sennheiser/products/${product.id}`) return null;
  return { cents: reference.cents, url: reference.url };
}

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
  // Ambiguous retailer references and model-page prices do not establish exact-variant savings.
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
