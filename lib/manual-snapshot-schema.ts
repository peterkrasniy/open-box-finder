import type { ManualProduct } from './manual-products.ts';
import { savedSourceUrl, safeExternalUrl } from './storage.ts';
import { US_STATES } from './shipping.ts';

const photoHosts: Record<string, readonly string[]> = {
  'cuckoo-manual': ['cuckooamerica.com'], 'epson-manual': ['mediaserver.goepson.com'],
  'direct-tools-manual': ['cdn.shopify.com'], 'sennheiser-manual': ['us.sennheiser-hearing.com'],
  'target-manual': ['target.scene7.com'], 'newegg-manual': ['c1.neweggimages.com'],
  'dyson-manual': ['dyson-h.assetsadobe2.com'], 'vitamix-manual': ['www.vitamix.com'],
  'best-buy': ['pisces.bbystatic.com'],
};
const string = (value: unknown, limit = 2048): value is string => typeof value === 'string' && value.length > 0 && value.length <= limit;
const cents = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0 && Number(value) <= 100_000_000;
const bilingual = (value: unknown): boolean => !!value && typeof value === 'object' && string((value as { en?: unknown }).en, 1500) && string((value as { ru?: unknown }).ru, 1500);
const object = (value: unknown): boolean => value !== null && typeof value === 'object' && !Array.isArray(value);
const timestamp = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const publicFields = new Set(['productKey', 'scopeKey', 'previousUrls', 'archived', 'stockEvidence', 'id', 'recordType', 'sourceId', 'brand', 'model', 'category', 'condition', 'conditionDetail', 'observedStock', 'shipping', 'pickup', 'fulfillmentNote', 'details', 'referencePrice', 'observedPriceCents', 'currency', 'availability', 'url', 'reviewedAt', 'reviewUntil', 'newModelReference', 'retailerComparison', 'image']);

/** All browser-visible snapshots must have bounded prices, exact source URLs and actual source-hosted photos. */
export function validManualSnapshot(value: unknown): value is ManualProduct {
  if (!value || typeof value !== 'object') return false;
  const p = value as ManualProduct;
  if (!object(p) || Object.keys(p).some(key => !publicFields.has(key)) || ['stockEvidence', 'archived', 'shipping', 'pickup', 'referencePrice', 'retailerComparison', 'newModelReference'].some(key => {
    const item = (p as unknown as Record<string, unknown>)[key]; return item !== undefined && !object(item);
  }) || !object(p.image) || !timestamp(p.reviewedAt) || !timestamp(p.reviewUntil)) return false;
  if (!string(p.id, 160) || !string(p.sourceId, 80) || !string(p.brand, 100) || !string(p.model, 500)
    || p.recordType !== 'manual-observation' || p.currency !== 'USD' || p.availability !== 'unknown'
    || !['appliances', 'tv', 'computers', 'phones', 'audio', 'smart-home', 'gaming', 'tools', 'home', 'other'].includes(p.category)
    || !['open-box', 'refurbished', 'used', 'scratch-and-dent', 'new-clearance', 'unspecified'].includes(p.condition)
    || !cents(p.observedPriceCents) || !savedSourceUrl(p.sourceId, p.url)) return false;
  const checked = Date.parse(p.reviewedAt), until = Date.parse(p.reviewUntil);
  if (!Number.isFinite(checked) || !Number.isFinite(until) || until <= checked || until - checked > 86_400_000) return false;
  const photo = p.image;
  if (!photo || !safeExternalUrl(photo.url) || (!savedSourceUrl(p.sourceId, photo.listingUrl) || (p.sourceId === 'sennheiser-manual' ? new URL(photo.listingUrl).pathname !== new URL(p.url).pathname : photo.listingUrl !== p.url)) || !bilingual(photo.alt)
    || !photoHosts[p.sourceId]?.includes(new URL(photo.url).hostname)) return false;
  if ([photo.width, photo.height].some(n => n !== undefined && (!Number.isSafeInteger(n) || n <= 0 || n > 20000))) return false;
  if (p.observedStock !== undefined && !['available', 'unavailable'].includes(p.observedStock)) return false;
  if ([p.conditionDetail, p.fulfillmentNote, p.details].some(v => v !== undefined && !bilingual(v))) return false;
  if (p.productKey !== undefined && !string(p.productKey, 500) || p.scopeKey !== undefined && !string(p.scopeKey, 160)) return false;
  if (p.stockEvidence && (p.stockEvidence.url !== p.url || !string(p.stockEvidence.detail, 1500) || p.stockEvidence.context !== undefined && !string(p.stockEvidence.context, 500))) return false;
  if (p.archived && (!timestamp(p.archived.at) || !['confirmed-unavailable', 'absent-from-complete-scope'].includes(p.archived.reason))) return false;
  if (p.previousUrls !== undefined && (!Array.isArray(p.previousUrls) || p.previousUrls.length > 50 || !p.previousUrls.every(url => savedSourceUrl(p.sourceId, url)))) return false;
  if (p.retailerComparison && (!cents(p.retailerComparison.cents) || p.retailerComparison.basis !== 'retailer-comparison' || p.retailerComparison.url !== p.url)) return false;
  if (p.referencePrice && (!cents(p.referencePrice.cents) || !['retailer-was', 'retailer-regular', 'current-new'].includes(p.referencePrice.basis) || p.referencePrice.url !== p.url)) return false;
  if (p.newModelReference && (!cents(p.newModelReference.cents) || p.newModelReference.basis !== 'observed-new-model' || !safeExternalUrl(p.newModelReference.url))) return false;
  if (p.shipping?.eligibility !== undefined && !object(p.shipping.eligibility) || p.pickup?.point !== undefined && p.pickup.point !== null && !object(p.pickup.point)) return false;
  if (p.shipping && (p.shipping.country !== 'US' || p.shipping.costCents !== null && (!Number.isSafeInteger(p.shipping.costCents) || p.shipping.costCents < 0)
    || p.shipping.restrictions !== null && !string(p.shipping.restrictions, 1500)
    || p.shipping.eligibility && (!['all-us', 'states'].includes(p.shipping.eligibility.scope) || !Array.isArray(p.shipping.eligibility.states) || !Array.isArray(p.shipping.eligibility.excludedStates)
      || ![...p.shipping.eligibility.states, ...p.shipping.eligibility.excludedStates].every(state => US_STATES.has(state))))) return false;
  if (p.pickup && (!string(p.pickup.id, 160) || !string(p.pickup.name, 500) || !string(p.pickup.address, 1000) || typeof p.pickup.pickupVerified !== 'boolean' || p.pickup.point === undefined
    || p.pickup.point && (!Number.isFinite(p.pickup.point.latitude) || !Number.isFinite(p.pickup.point.longitude)
      || Math.abs(p.pickup.point.latitude) > 90 || Math.abs(p.pickup.point.longitude) > 180))) return false;
  if (p.sourceId === 'best-buy') {
    const url = new URL(p.url);
    if (p.condition !== 'open-box' || !/^\/product\/[^/]+\/(?:[A-Za-z0-9]+\/sku\/)?\d+\/openbox\/?$/.test(url.pathname) || !['excellent', 'good', 'fair'].includes(url.searchParams.get('condition') ?? '')) return false;
  }
  const path = new URL(p.url).pathname;
  if (p.sourceId === 'epson-manual' && !/^\/Certified-ReNew\/.+\/p\/[A-Za-z0-9-]+\/?$/.test(path)
    || p.sourceId === 'cuckoo-manual' && !/^\/collections\/certified-renewed\/products\/[A-Za-z0-9-]+\/?$/.test(path)
    || p.sourceId === 'direct-tools-manual' && !/^\/products\/[A-Za-z0-9-]+\/?$/.test(path)) return false;
  return true;
}
