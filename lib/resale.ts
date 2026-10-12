import records from '../data/resale-records.json' with { type: 'json' };
import type { Category } from './offer.ts';
import type { SavedListing } from './storage.ts';
import { safeExternalUrl } from './storage.ts';

export interface ResaleText { en: string; ru: string }
export type ResalePlatform = 'craigslist' | 'facebook' | 'offerup';
export interface ResaleListing {
  id: string;
  sourceId: 'craigslist-resale' | 'facebook-resale' | 'offerup-resale';
  platform: ResalePlatform;
  title: ResaleText;
  category: Category;
  currency: 'USD';
  url: string;
  photos: { url: string; alt: ResaleText }[];
  askingCents: number;
  resaleLowCents: number;
  resaleHighCents: number;
  reserveCents: number;
  location: string;
  checkedAt: string;
  status: 'inspect-first' | 'conditional' | 'hold';
  archived?: boolean;
  exactMatchCount: 0;
  comparisonStatus: 'pending';
  notes: ResaleText;
  tests: ResaleText[];
  dimensions: ResaleText;
  dimensionsSource?: string;
  soldComparisons: {
    url: string; amountCents: number; shippingCents: number | null; soldAt: string; source?: 'ebay' | 'reverb';
    basis: 'sold' | 'accepted-offer-upper-bound' | 'displayed-sold-price';
    confidence: 'related' | 'stronger-condition' | 'lower-bundle';
    notes: ResaleText;
  }[];
  facebookComparisons: {
    url: string; askingCents: number; location: string; checkedAt: string;
    match: 'related-family' | 'regional' | 'different-bundle';
    notes: ResaleText;
  }[];
  newPriceReference?: {
    url: string; cents: number; basis: 'current-new' | 'historical-catalog'; notes: ResaleText;
  };
}

export const RESALE_REVIEW_WINDOW_MS = 86_400_000;
const sourceIds: Record<ResalePlatform, ResaleListing['sourceId']> = {
  craigslist: 'craigslist-resale', facebook: 'facebook-resale', offerup: 'offerup-resale',
};
const fields = ['id', 'sourceId', 'platform', 'title', 'category', 'currency', 'url', 'photos', 'askingCents',
  'resaleLowCents', 'resaleHighCents', 'reserveCents', 'location', 'checkedAt', 'status', 'archived',
  'exactMatchCount', 'comparisonStatus', 'notes', 'tests', 'dimensions', 'soldComparisons',
  'facebookComparisons', 'newPriceReference', 'dimensionsSource'];
const categories = ['appliances', 'tv', 'computers', 'phones', 'cameras', 'audio', 'smart-home', 'gaming', 'tools', 'home', 'other'];
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, limit = 1500): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= limit && !/[\u0000-\u001f]/.test(value);
const shape = (value: unknown, keys: string[]): value is Record<string, unknown> => object(value) && Object.keys(value).every(key => keys.includes(key));
const bilingual = (value: unknown): value is ResaleText => shape(value, ['en', 'ru']) && text(value.en) && text(value.ru);
const money = (value: unknown, allowZero = false): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= (allowZero ? 0 : 1) && value <= 100_000_000;
function timestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 19) === value.slice(0, 19);
}
function parsedPublicUrl(value: unknown): URL | null {
  if (!safeExternalUrl(value)) return null;
  const url = new URL(value as string);
  return url.hash ? null : url;
}
function facebookUrl(value: unknown): boolean {
  const url = parsedPublicUrl(value);
  return !!url && url.origin === 'https://www.facebook.com' && /^\/marketplace\/item\/\d+\/?$/.test(url.pathname) && !url.search;
}
function listingUrl(platform: ResalePlatform, value: unknown): boolean {
  const url = parsedPublicUrl(value);
  if (!url || url.search) return false;
  if (platform === 'facebook') return facebookUrl(value);
  if (platform === 'offerup') return ['https://offerup.com', 'https://www.offerup.com'].includes(url.origin)
    && /^\/item\/detail\/[A-Za-z0-9-]+\/?$/.test(url.pathname);
  return /^(?:www|[a-z0-9-]+)\.craigslist\.org$/.test(url.hostname)
    && (/^\/view\/d\/[a-z0-9-]+\/[A-Za-z0-9]+\/?$/.test(url.pathname)
      || /^\/[a-z]{3}\/d\/[a-z0-9-]+\/\d{10}\.html$/.test(url.pathname));
}
function photoUrl(platform: ResalePlatform, value: unknown): boolean {
  const url = parsedPublicUrl(value);
  if (!url) return false;
  if (platform === 'craigslist') return url.hostname === 'images.craigslist.org'
    && /^\/[A-Za-z0-9_]+\.(?:jpg|jpeg|png|webp)$/.test(url.pathname) && !url.search;
  if (platform === 'offerup') return url.hostname === 'images.offerup.com';
  return url.hostname === 'fbcdn.net' || url.hostname.endsWith('.fbcdn.net');
}
function soldUrl(value: unknown, source: unknown): boolean {
  const url = parsedPublicUrl(value);
  if (!url) return false;
  if (source === 'reverb') return url.origin === 'https://reverb.com' && /^\/p\/[a-z0-9-]+$/.test(url.pathname) && /^\?ended_listing=\d+$/.test(url.search);
  return (source === undefined || source === 'ebay') && url.origin === 'https://www.ebay.com' && /^\/itm\/\d+\/?$/.test(url.pathname) && !url.search;
}

/** A strict public snapshot boundary; source observations never establish seller-confirmed stock. */
export function validResaleRecord(value: unknown): value is ResaleListing {
  if (!shape(value, fields)) return false;
  const p = value;
  if (!['craigslist', 'facebook', 'offerup'].includes(String(p.platform))) return false;
  const platform = p.platform as ResalePlatform;
  if (p.sourceId !== sourceIds[platform] || !text(p.id, 160) || !bilingual(p.title)
    || !categories.includes(String(p.category)) || p.currency !== 'USD' || !listingUrl(platform, p.url)
    || !money(p.askingCents) || !money(p.resaleLowCents) || !money(p.resaleHighCents)
    || !money(p.reserveCents, true) || p.resaleLowCents > p.resaleHighCents || !text(p.location, 160)
    || !timestamp(p.checkedAt) || !['inspect-first', 'conditional', 'hold'].includes(String(p.status))
    || p.archived !== undefined && typeof p.archived !== 'boolean'
    || p.exactMatchCount !== 0 || p.comparisonStatus !== 'pending'
    || !bilingual(p.notes) || !bilingual(p.dimensions)) return false;
  if (!Array.isArray(p.photos) || p.photos.length < 1 || p.photos.length > 12
    || !p.photos.every(photo => shape(photo, ['url', 'alt']) && photoUrl(platform, photo.url) && bilingual(photo.alt))
    || new Set(p.photos.map(photo => photo.url)).size !== p.photos.length) return false;
  if (!Array.isArray(p.tests) || p.tests.length < 1 || p.tests.length > 20 || !p.tests.every(bilingual)) return false;
  if (!Array.isArray(p.soldComparisons) || p.soldComparisons.length > 20
    || !p.soldComparisons.every(comp => shape(comp, ['url', 'amountCents', 'shippingCents', 'soldAt', 'source', 'basis', 'confidence', 'notes'])
      && soldUrl(comp.url, comp.source) && money(comp.amountCents) && (comp.shippingCents === null || money(comp.shippingCents, true))
      && text(comp.soldAt, 80) && ['sold', 'accepted-offer-upper-bound', 'displayed-sold-price'].includes(String(comp.basis))
      && ['related', 'stronger-condition', 'lower-bundle'].includes(String(comp.confidence)) && bilingual(comp.notes))) return false;
  if (!Array.isArray(p.facebookComparisons) || p.facebookComparisons.length > 20
    || !p.facebookComparisons.every(comp => shape(comp, ['url', 'askingCents', 'location', 'checkedAt', 'match', 'notes'])
      && facebookUrl(comp.url) && money(comp.askingCents) && text(comp.location, 160) && timestamp(comp.checkedAt)
      && ['related-family', 'regional', 'different-bundle'].includes(String(comp.match)) && bilingual(comp.notes))) return false;
  if (p.dimensionsSource !== undefined && (!parsedPublicUrl(p.dimensionsSource) || new URL(p.dimensionsSource as string).origin !== 'https://www.mieleusa.com' || !/^\/product\/\d+\//.test(new URL(p.dimensionsSource as string).pathname))) return false;
  if (p.newPriceReference !== undefined && (!shape(p.newPriceReference, ['url', 'cents', 'basis', 'notes'])
    || !parsedPublicUrl(p.newPriceReference.url) || !money(p.newPriceReference.cents)
    || !['current-new', 'historical-catalog'].includes(String(p.newPriceReference.basis)) || !bilingual(p.newPriceReference.notes))) return false;
  return true;
}

export const RESALE_RECORDS: readonly ResaleListing[] = (records as unknown[]).filter(validResaleRecord);

/** Exactly 24 hours from observation; future, archived, expired, and malformed records stay hidden. */
export function resaleActive(record: ResaleListing, now: number): boolean {
  if (!Number.isFinite(now) || !validResaleRecord(record) || record.archived) return false;
  const checked = Date.parse(record.checkedAt);
  return now >= checked && now < checked + RESALE_REVIEW_WINDOW_MS;
}

/** Conservative local-cash estimate after asking price and reserve, before tax and labor. */
export function netCashRange(record: Pick<ResaleListing, 'askingCents' | 'resaleLowCents' | 'resaleHighCents' | 'reserveCents'>) {
  if (!money(record.askingCents) || !money(record.resaleLowCents) || !money(record.resaleHighCents)
    || !money(record.reserveCents, true) || record.resaleLowCents > record.resaleHighCents) {
    throw new RangeError('Invalid resale estimate in USD cents');
  }
  const cost = record.askingCents + record.reserveCents;
  return { lowCents: record.resaleLowCents - cost, highCents: record.resaleHighCents - cost };
}

/** Saved pointers omit prices, photos, estimates, and seller/profile metadata. */
export function resaleSavedPointer(record: ResaleListing, now: number, records: readonly ResaleListing[] = RESALE_RECORDS): SavedListing | null {
  const current = records.find(item => item.id === record.id && item.sourceId === record.sourceId && item.url === record.url);
  if (!current || !resaleActive(current, now)) return null;
  return { offerId: `resale:${current.id}`, sourceId: current.sourceId, sourceOfferId: current.id,
    variantKey: current.id, storeId: null, condition: 'used', url: current.url,
    title: current.title.en, category: current.category, savedAt: new Date(now).toISOString() };
}
