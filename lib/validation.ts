import type { Catalog, Offer } from './offer.ts';
import { validCents } from './offer.ts';
import { CATEGORIES } from './i18n.ts';
import { validPoint } from './filter.ts';
import { safeExternalUrl } from './storage.ts';
import { SOURCE_BY_ID } from './sources.ts';

const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const string = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max && !/[\u0000-\u001f]/.test(v);
const date = (v: unknown): v is string => string(v, 40) && Number.isFinite(Date.parse(v));
const optionalString = (v: unknown, max: number) => v === null || string(v, max);
const inList = (v: unknown, values: readonly string[]) => typeof v === 'string' && values.includes(v);

/** Construct a public record explicitly: a stored adapter object may contain private fields. */
export function publicOffer(offer: Offer): Offer {
  return {
    id: offer.id, sourceId: offer.sourceId, retailerId: offer.retailerId, sourceOfferId: offer.sourceOfferId,
    variantKey: offer.variantKey, recordType: offer.recordType, title: offer.title, category: offer.category,
    condition: offer.condition, cosmeticGrade: offer.cosmeticGrade, availability: offer.availability,
    priceCents: offer.priceCents, currency: offer.currency, url: offer.url, imageUrl: offer.imageUrl, imageAlt: offer.imageAlt,
    observedAt: offer.observedAt, freshUntil: offer.freshUntil,
    reference: offer.reference ? { cents: offer.reference.cents, currency: offer.reference.currency,
      variantKey: offer.reference.variantKey, basis: offer.reference.basis, observedAt: offer.reference.observedAt,
      maxAgeSeconds: offer.reference.maxAgeSeconds, sourceUrl: offer.reference.sourceUrl } : null,
    pickup: offer.pickup ? { id: offer.pickup.id, name: offer.pickup.name, address: offer.pickup.address,
      pickupVerified: offer.pickup.pickupVerified, point: offer.pickup.point ? { latitude: offer.pickup.point.latitude, longitude: offer.pickup.point.longitude } : null } : null,
    shipping: offer.shipping ? { country: offer.shipping.country, costCents: offer.shipping.costCents, restrictions: offer.shipping.restrictions } : null,
    localDelivery: offer.localDelivery ? { description: offer.localDelivery.description, costCents: offer.localDelivery.costCents } : null,
  };
}

export function validOffer(v: unknown): v is Offer {
  if (!object(v) || !string(v.id, 200) || /\s/.test(v.id) || !string(v.sourceId, 80) || !SOURCE_BY_ID.has(v.sourceId)
    || !string(v.retailerId, 80) || !string(v.sourceOfferId, 200) || !string(v.variantKey, 200)
    || !inList(v.recordType, ['inventory', 'syndicated-deal']) || !string(v.title, 240)
    || !inList(v.category, CATEGORIES) || !inList(v.condition, ['open-box', 'refurbished', 'used', 'scratch-and-dent', 'new-clearance', 'unspecified'])
    || !optionalString(v.cosmeticGrade, 100) || !inList(v.availability, ['available', 'unavailable', 'unknown'])
    || !(v.priceCents === null || validCents(v.priceCents)) || v.currency !== 'USD' || !safeExternalUrl(v.url)
    || !(v.imageUrl === null || safeExternalUrl(v.imageUrl)) || !optionalString(v.imageAlt, 240)
    || !date(v.observedAt) || !date(v.freshUntil) || Date.parse(v.freshUntil) < Date.parse(v.observedAt)) return false;
  if (v.reference !== null) {
    const r = v.reference;
    if (!object(r) || !validCents(r.cents) || r.currency !== 'USD' || !string(r.variantKey, 200)
      || !inList(r.basis, ['current-new', 'msrp', 'retailer-list', 'retailer-regular', 'retailer-was'])
      || !date(r.observedAt) || typeof r.maxAgeSeconds !== 'number' || !Number.isSafeInteger(r.maxAgeSeconds)
      || r.maxAgeSeconds < 1 || r.maxAgeSeconds > 604800 || !safeExternalUrl(r.sourceUrl)) return false;
  }
  if (v.pickup !== null) {
    const p = v.pickup;
    if (!object(p) || !string(p.id, 160) || !string(p.name, 160) || !string(p.address, 300) || typeof p.pickupVerified !== 'boolean') return false;
    if (p.point !== null && (!object(p.point) || typeof p.point.latitude !== 'number' || typeof p.point.longitude !== 'number'
      || !validPoint({ latitude: p.point.latitude, longitude: p.point.longitude }))) return false;
  }
  if (v.shipping !== null) {
    const s = v.shipping;
    if (!object(s) || s.country !== 'US' || !(s.costCents === null || validCents(s.costCents)) || !optionalString(s.restrictions, 500)) return false;
  }
  if (v.localDelivery !== null) {
    const d = v.localDelivery;
    if (!object(d) || !string(d.description, 500) || !(d.costCents === null || validCents(d.costCents))) return false;
  }
  return true;
}

export function decodeCatalog(value: unknown): Catalog {
  if (!object(value) || value.schemaVersion !== 1 || !string(value.generation, 128) || !string(value.revision, 128)
    || !(value.publishedAt === null || date(value.publishedAt)) || !Array.isArray(value.offers) || value.offers.length > 2000
    || !Array.isArray(value.sources) || value.sources.length > 100) throw new TypeError('Invalid catalog envelope');
  const ids = new Set<string>();
  for (const offer of value.offers) {
    if (!validOffer(offer) || ids.has(offer.id)) throw new TypeError('Invalid catalog offer');
    ids.add(offer.id);
  }
  const sources = new Set<string>();
  for (const source of value.sources) {
    if (!object(source) || !string(source.sourceId, 80) || !SOURCE_BY_ID.has(source.sourceId) || sources.has(source.sourceId)
      || !inList(source.status, ['unconnected', 'ready', 'stale', 'error'])
      || ![source.lastAttemptAt, source.lastSuccessAt, source.nextCheckAt].every(v => v === null || date(v))) throw new TypeError('Invalid source health');
    sources.add(source.sourceId);
  }
  // Narrow to the public contract. Extra server fields never reach component props.
  return { schemaVersion: 1, generation: value.generation, revision: value.revision,
    publishedAt: value.publishedAt as string | null, offers: value.offers.map(publicOffer),
    sources: value.sources.map(source => ({ sourceId: source.sourceId, status: source.status,
      lastAttemptAt: source.lastAttemptAt, lastSuccessAt: source.lastSuccessAt, nextCheckAt: source.nextCheckAt })) } as Catalog;
}
