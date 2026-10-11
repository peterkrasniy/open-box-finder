import { US_STATES } from './shipping.ts';
import { CATEGORIES } from './i18n.ts';
import { DEFAULT_FILTERS } from './offer.ts';
import type { Filters, Language, Offer, Selection, Sort } from './offer.ts';
import { validCents } from './offer.ts';
import { validPoint } from './filter.ts';
import { validateRange } from './money.ts';
import { SOURCE_BY_ID } from './sources.ts';

export const PREFERENCES_KEY = 'open-box-finder:preferences:v1';
export const SAVED_KEY = 'open-box-finder:saved:v1';
export const SAVED_ENTRY_PREFIX = 'open-box-finder:saved:v2:';
export interface Preferences { version: 1; language: Language; filters: Filters; sort: Sort }
/** Store only identity/link pointers; price, image and offer payload are not cached. */
export interface SavedListing {
  offerId: string; sourceId: string; variantKey: string; storeId: string | null; url: string; savedAt: string;
  sourceOfferId?: string; condition?: Offer['condition']; title?: string; savedAgainstSequence?: number;
}
export function savedIdentity(record: Pick<SavedListing, 'offerId' | 'sourceId' | 'variantKey' | 'storeId' | 'sourceOfferId' | 'condition'>): string {
  return JSON.stringify([record.offerId, record.sourceId, record.sourceOfferId ?? null, record.variantKey, record.storeId, record.condition ?? null]);
}
export function offerIdentity(offer: Offer): string {
  return savedIdentity({ offerId: offer.id, sourceId: offer.sourceId, variantKey: offer.variantKey, storeId: offer.pickup?.id ?? null, sourceOfferId: offer.sourceOfferId, condition: offer.condition });
}
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem?(key:string):void; readonly length?: number; key?(index: number): string | null }
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
        origin: { label: f.origin.label, latitude: f.origin.latitude, longitude: f.origin.longitude, shippingState: typeof f.origin.shippingState === 'string' && US_STATES.has(f.origin.shippingState) ? f.origin.shippingState : null },
        radiusMiles: f.radiusMiles, minCents: f.minCents as number | null, maxCents: f.maxCents as number | null } };
  } catch { return fallback; }
}

export function safeExternalUrl(value: unknown): string | null {
  if (!smallText(value, 2048)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null;
    const host = url.hostname.toLowerCase();
    if (host.replace(/\.$/, '') === 'localhost' || host.replace(/\.$/, '').endsWith('.localhost') || !host.includes('.') || host.replace(/\.$/, '').endsWith('.local')
      || /^\d+(?:\.\d+){3}$/.test(host) || host.startsWith('[')) return null;
    // Preserve the original link and its attribution/query spelling after validation.
    return value;
  } catch { return null; }
}

export function savedSourceUrl(sourceId: string, value: unknown): string | null {
  const url = safeExternalUrl(value), source = SOURCE_BY_ID.get(sourceId);
  if (!url || !source) return null;
  try {
    const parsed = new URL(url);
    if (parsed.origin !== new URL(source.website).origin) return null;
    const prefixes: Record<string, string> = { 'a4l-sac': '/p/', 'buydig': '/shop/product/', 'blues-appliance': '/collections/', 'outdoor-speaker-depot': '/', 'best-buy': '/site/' };
    return prefixes[sourceId] && parsed.pathname.startsWith(prefixes[sourceId]) ? url : null;
  } catch { return null; }
}

export function decodeSaved(raw: string | null): SavedListing[] {
  if (!raw || raw.length > 320000) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!plain(value) || value.version !== 1 || !Array.isArray(value.listings) || value.listings.length > 100) return [];
    const result: SavedListing[] = [], ids = new Set<string>();
    for (const record of value.listings) {
      if (!plain(record) || !smallText(record.offerId, 200) || !record.offerId || /\s/.test(record.offerId) || !smallText(record.sourceId, 80) || !SOURCE_BY_ID.has(record.sourceId) || record.sourceId === 'shopify-catalog'
        || !smallText(record.variantKey, 200) || !record.variantKey || !(record.storeId === null || smallText(record.storeId, 160))
        || !smallText(record.savedAt, 40) || !Number.isFinite(Date.parse(record.savedAt))) continue;
      const url = savedSourceUrl(record.sourceId, record.url);
      const metadata = { ...(smallText(record.sourceOfferId, 200) && record.sourceOfferId ? { sourceOfferId: record.sourceOfferId } : {}),
        ...(['open-box', 'refurbished', 'used', 'scratch-and-dent', 'new-clearance', 'unspecified'].includes(String(record.condition)) ? { condition: record.condition as Offer['condition'] } : {}),
        ...(smallText(record.title, 240) && record.title ? { title: record.title } : {}),
        ...(typeof record.savedAgainstSequence === 'number' && Number.isSafeInteger(record.savedAgainstSequence) && record.savedAgainstSequence >= 0 ? { savedAgainstSequence: record.savedAgainstSequence } : {}) };
      const identity = savedIdentity({ offerId: record.offerId, sourceId: record.sourceId, variantKey: record.variantKey, storeId: record.storeId, ...metadata });
      if (!url || ids.has(identity)) continue;
      ids.add(identity);
      result.push({ offerId: record.offerId, sourceId: record.sourceId, variantKey: record.variantKey, storeId: record.storeId, url, savedAt: record.savedAt, ...metadata });
    }
    return result;
  } catch { return []; }
}

export function savedPointer(offer: Offer, now: number, sequence = 0): SavedListing | null {
  // Shopify's no-cache permission is unverified; do not persist even a pointer through this path.
  if (offer.sourceId === 'shopify-catalog' || !SOURCE_BY_ID.has(offer.sourceId) || !Number.isFinite(now)) return null;
  const url = savedSourceUrl(offer.sourceId, offer.url);
  return url ? { offerId: offer.id, sourceId: offer.sourceId, variantKey: offer.variantKey, storeId: offer.pickup?.id ?? null, url, savedAt: new Date(now).toISOString(), sourceOfferId: offer.sourceOfferId, condition: offer.condition, title: offer.title, savedAgainstSequence: sequence } : null;
}

export function readStorage(store: StorageLike | null): { preferences: Preferences; saved: SavedListing[]; available: boolean } {
  if (!store) return { preferences: defaultPreferences(), saved: [], available: false };
  let preferences=defaultPreferences();
  try {preferences=decodePreferences(store.getItem(PREFERENCES_KEY));return {preferences,saved:readSavedEntries(store),available:true};}
  catch {return {preferences,saved:[],available:false};}
}

export function writePreferences(store: StorageLike | null, preferences: Preferences): boolean {
  try { if (!store) return false; store.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); return true; } catch { return false; }
}
export function writeSaved(store: StorageLike | null, saved: SavedListing[]): boolean {
  try { if (!store) return false; store.setItem(SAVED_KEY, JSON.stringify({ version: 1, listings: saved.slice(0, 100) })); return true; } catch { return false; }
}

/** Each identity owns one atomic entry, so unrelated tabs never overwrite a shared array. */
export function readSavedEntries(store: StorageLike): SavedListing[] {
  const records = new Map(decodeSaved(store.getItem(SAVED_KEY)).map(record => [savedIdentity(record), record]));
  if (store.key && typeof store.length === 'number') {
    if (store.length > 50000) throw new Error('Storage exceeds supported entry limit');
    for (let index = 0; index < store.length; index++) {
      const key = store.key(index);
      if (!key?.startsWith(SAVED_ENTRY_PREFIX)) continue;
      const identity = key.slice(SAVED_ENTRY_PREFIX.length), raw = store.getItem(key);
      if (raw === 'null') { records.delete(identity); continue; }
      const entry = decodeSaved(raw)[0];
      if (entry && savedIdentity(entry) === identity) records.set(identity, entry);
    }
  }
  return [...records.values()].sort((a, b) => b.savedAt.localeCompare(a.savedAt) || savedIdentity(a).localeCompare(savedIdentity(b)));
}
export function writeSavedEntry(store: StorageLike | null, identity: string, value: SavedListing | null): boolean {
  try { if (!store || (value && savedIdentity(value) !== identity)) return false;
    if(!value&&store.removeItem&&!decodeSaved(store.getItem(SAVED_KEY)).some(record=>savedIdentity(record)===identity))store.removeItem(SAVED_ENTRY_PREFIX+identity);
    else store.setItem(SAVED_ENTRY_PREFIX + identity, value ? JSON.stringify({ version: 1, listings: [value] }) : 'null'); return true;
  } catch { return false; }
}

/** Call under the shared saved guard. Keep only tombstones still needed to suppress a legacy pointer. */
export function compactSavedTombstones(store:StorageLike):void{
 if(!store.removeItem||!store.key||typeof store.length!=='number'||store.length>50000)return;
 const legacy=new Set(decodeSaved(store.getItem(SAVED_KEY)).map(savedIdentity)),keys:string[]=[];
 for(let index=0;index<store.length;index++){const key=store.key(index);if(key?.startsWith(SAVED_ENTRY_PREFIX))keys.push(key);}
 for(const key of keys)if(!legacy.has(key.slice(SAVED_ENTRY_PREFIX.length))&&store.getItem(key)==='null')store.removeItem(key);
}
