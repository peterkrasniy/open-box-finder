import { CATEGORIES } from './i18n.ts';
import { DEFAULT_FILTERS } from './offer.ts';
import type { Filters, Language, Offer, Selection, Sort } from './offer.ts';
import { validCents } from './offer.ts';
import { validPoint } from './filter.ts';
import { validateRange } from './money.ts';
import { SOURCE_BY_ID } from './sources.ts';

export const PREFERENCES_KEY = 'open-box-finder:preferences:v1';
export const SAVED_KEY = 'open-box-finder:saved:v1';
export interface Preferences { version: 1; language: Language; filters: Filters; sort: Sort }
/** Store only identity/link pointers; price, image and offer payload are not cached. */
export interface SavedListing {
  offerId: string; sourceId: string; variantKey: string; storeId: string | null; url: string; savedAt: string;
}
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
const plain = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const smallText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max && !/[\u0000-\u001f]/.test(value);

export function defaultPreferences(): Preferences {
  return { version: 1, language: 'en', filters: structuredClone(DEFAULT_FILTERS), sort: 'percent' };
}

function selection(value: unknown, allowed: Set<string>): Selection | null {
  if (!plain(value) || !['all', 'selected'].includes(String(value.mode)) || !Array.isArray(value.ids) || value.ids.length > 100) return null;
  if (!value.ids.every(id => smallText(id, 80))) return null;
  return { mode: value.mode as Selection['mode'], ids: [...new Set(value.ids.filter(id => allowed.has(id)))] };
}

export function decodePreferences(raw: string | null): Preferences {
  const fallback = defaultPreferences();
  if (!raw || raw.length > 16000) return fallback;
  try {
    const value: unknown = JSON.parse(raw);
    if (!plain(value) || value.version !== 1 || !['en', 'ru'].includes(String(value.language))
      || !['percent', 'dollars', 'price-low', 'newest'].includes(String(value.sort)) || !plain(value.filters)) return fallback;
    const f = value.filters;
    const retailers = selection(f.retailers, new Set(SOURCE_BY_ID.keys()));
    const categories = selection(f.categories, new Set(CATEGORIES));
    if (!retailers || !categories || !smallText(f.query, 160) || !plain(f.origin)
      || !smallText(f.origin.label, 80) || !f.origin.label.trim()
      || typeof f.origin.latitude !== 'number' || typeof f.origin.longitude !== 'number'
      || !validPoint({ latitude: f.origin.latitude, longitude: f.origin.longitude })
      || !['both', 'pickup', 'shipped'].includes(String(f.fulfillment))
      || typeof f.radiusMiles !== 'number' || !Number.isFinite(f.radiusMiles) || f.radiusMiles < 0 || f.radiusMiles > 500
      || !(f.minCents === null || validCents(f.minCents)) || !(f.maxCents === null || validCents(f.maxCents))
      || validateRange(f.minCents as number | null, f.maxCents as number | null)) return fallback;
    return { version: 1, language: value.language as Language, sort: value.sort as Sort,
      filters: { retailers, categories, query: f.query, fulfillment: f.fulfillment as Filters['fulfillment'],
        origin: { label: f.origin.label, latitude: f.origin.latitude, longitude: f.origin.longitude },
        radiusMiles: f.radiusMiles, minCents: f.minCents as number | null, maxCents: f.maxCents as number | null } };
  } catch { return fallback; }
}

export function safeExternalUrl(value: unknown): string | null {
  if (!smallText(value, 2048)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || !host.includes('.') || host.endsWith('.local')
      || /^\d+(?:\.\d+){3}$/.test(host) || host.startsWith('[')) return null;
    // Preserve the original link and its attribution/query spelling after validation.
    return value;
  } catch { return null; }
}

export function decodeSaved(raw: string | null): SavedListing[] {
  if (!raw || raw.length > 320000) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!plain(value) || value.version !== 1 || !Array.isArray(value.listings) || value.listings.length > 100) return [];
    const result: SavedListing[] = [], ids = new Set<string>();
    for (const record of value.listings) {
      if (!plain(record) || !smallText(record.offerId, 200) || !smallText(record.sourceId, 80) || !SOURCE_BY_ID.has(record.sourceId)
        || !smallText(record.variantKey, 200) || !(record.storeId === null || smallText(record.storeId, 160))
        || !smallText(record.savedAt, 40) || !Number.isFinite(Date.parse(record.savedAt))) continue;
      const url = safeExternalUrl(record.url);
      if (!url || ids.has(record.offerId)) continue;
      ids.add(record.offerId);
      result.push({ offerId: record.offerId, sourceId: record.sourceId, variantKey: record.variantKey, storeId: record.storeId, url, savedAt: record.savedAt });
    }
    return result;
  } catch { return []; }
}

export function savedPointer(offer: Offer, now: number): SavedListing | null {
  // Shopify's no-cache permission is unverified; do not persist even a pointer through this path.
  if (offer.sourceId === 'shopify-catalog' || !SOURCE_BY_ID.has(offer.sourceId) || !Number.isFinite(now)) return null;
  const url = safeExternalUrl(offer.url);
  return url ? { offerId: offer.id, sourceId: offer.sourceId, variantKey: offer.variantKey, storeId: offer.pickup?.id ?? null, url, savedAt: new Date(now).toISOString() } : null;
}

export function readStorage(store: StorageLike | null): { preferences: Preferences; saved: SavedListing[]; available: boolean } {
  if (!store) return { preferences: defaultPreferences(), saved: [], available: false };
  try { return { preferences: decodePreferences(store.getItem(PREFERENCES_KEY)), saved: decodeSaved(store.getItem(SAVED_KEY)), available: true }; }
  catch { return { preferences: defaultPreferences(), saved: [], available: false }; }
}

export function writePreferences(store: StorageLike | null, preferences: Preferences): boolean {
  try { if (!store) return false; store.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); return true; } catch { return false; }
}
export function writeSaved(store: StorageLike | null, saved: SavedListing[]): boolean {
  try { if (!store) return false; store.setItem(SAVED_KEY, JSON.stringify({ version: 1, listings: saved.slice(0, 100) })); return true; } catch { return false; }
}
