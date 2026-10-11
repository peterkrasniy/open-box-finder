import type { Filters, Offer, Point, Selection, Sort } from './offer.ts';
import { savings } from './offer.ts';
import { validateRange } from './money.ts';

export function selected(selection: Selection, id: string): boolean {
  return selection.mode === 'all' || selection.ids.includes(id);
}

export function validPoint(point: Point): boolean {
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
}

export function milesBetween(a: Point, b: Point): number | null {
  if (!validPoint(a) || !validPoint(b)) return null;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude), dLon = radians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 3958.7613 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function pickupDistance(offer: Offer, filters: Filters): number | null {
  return offer.pickup?.pickupVerified && offer.pickup.point
    ? milesBetween(filters.origin, offer.pickup.point) : null;
}

export function matches(offer: Offer, filters: Filters): boolean {
  if (offer.availability === 'unavailable' || !selected(filters.retailers, offer.retailerId)
    || !selected(filters.categories, offer.category)) return false;
  if (validateRange(filters.minCents, filters.maxCents) || !validPoint(filters.origin)
    || !Number.isFinite(filters.radiusMiles) || filters.radiusMiles < 0 || filters.radiusMiles > 500) return false;
  if ((filters.minCents !== null || filters.maxCents !== null) && offer.priceCents === null) return false;
  if (offer.priceCents !== null && ((filters.minCents !== null && offer.priceCents < filters.minCents)
    || (filters.maxCents !== null && offer.priceCents > filters.maxCents))) return false;
  const query = filters.query.trim().normalize('NFKC').toLocaleLowerCase();
  if (query && !`${offer.title} ${offer.sourceOfferId} ${offer.retailerId}`.normalize('NFKC').toLocaleLowerCase().includes(query)) return false;
  const distance = pickupDistance(offer, filters);
  const pickup = distance !== null && distance <= filters.radiusMiles;
  const shipped = offer.shipping?.country === 'US';
  if (filters.fulfillment === 'pickup') return pickup;
  if (filters.fulfillment === 'shipped') return shipped;
  // Unknown fulfillment remains visible in Both, explicitly labelled by the UI.
  return pickup || shipped || (!offer.pickup && !offer.shipping);
}

export function filterAndSort(offers: readonly Offer[], filters: Filters, sort: Sort, now: number): Offer[] {
  const ranked = offers.filter(offer => matches(offer, filters)).map(offer => ({ offer, saving: savings(offer, now) }));
  ranked.sort((a, b) => {
    let delta = 0;
    if (sort === 'percent' || sort === 'dollars') {
      if (Boolean(a.saving) !== Boolean(b.saving)) return a.saving ? -1 : 1;
      if (a.saving && b.saving) {
        if (sort === 'percent') {
          const exact = BigInt(b.saving.cents) * BigInt(a.offer.reference!.cents)
            - BigInt(a.saving.cents) * BigInt(b.offer.reference!.cents);
          delta = exact > 0n ? 1 : exact < 0n ? -1 : 0;
        } else delta = b.saving.cents - a.saving.cents;
      }
    } else if (sort === 'price-low') {
      if ((a.offer.priceCents === null) !== (b.offer.priceCents === null)) return a.offer.priceCents === null ? 1 : -1;
      delta = (a.offer.priceCents ?? 0) - (b.offer.priceCents ?? 0);
    } else {
      const first = Date.parse(a.offer.observedAt), second = Date.parse(b.offer.observedAt);
      delta = (Number.isFinite(second) ? second : 0) - (Number.isFinite(first) ? first : 0);
    }
    return delta || a.offer.id.localeCompare(b.offer.id, 'en');
  });
  return ranked.map(row => row.offer);
}

export function directionsUrl(offer: Offer): string | null {
  const store = offer.pickup;
  if (!store?.pickupVerified || !store.address.trim()) return null;
  const target = store.point && validPoint(store.point)
    ? `${store.point.latitude},${store.point.longitude}` : store.address;
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('destination', target);
  return url.href;
}
