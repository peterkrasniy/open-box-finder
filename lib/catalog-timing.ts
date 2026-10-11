import type {Catalog} from './offer.ts';

export const POLL_INTERVAL_MS = 120000;
export const CLOCK_INTERVAL_MS = 30000;
/** Failed catalog reads back off to at most sixteen minutes; explicit resume/retry can revalidate. */
export function pollDelay(failures: number): number {
  return POLL_INTERVAL_MS * 2 ** Math.min(3, Math.max(0, Number.isSafeInteger(failures) ? failures : 3));
}

/** Repaint at the first known evidence expiry rather than leaving claims until the next clock tick. */
export function clockDelay(catalog: Catalog, now: number): number {
  if (!Number.isFinite(now)) return CLOCK_INTERVAL_MS;
  let deadline = now + CLOCK_INTERVAL_MS;
  const include = (time: number) => { if (Number.isFinite(time) && time >= now) deadline = Math.min(deadline, time + 1); };
  for (const offer of catalog.offers) {
    include(Date.parse(offer.freshUntil));
    if (offer.reference) include(Date.parse(offer.reference.observedAt) + offer.reference.maxAgeSeconds * 1000);
  }
  for (const deal of catalog.syndication) include(Date.parse(deal.freshUntil));
  for (const source of catalog.sources) if (source.nextCheckAt) include(Date.parse(source.nextCheckAt));
  return Math.max(1, Math.ceil(deadline - now));
}
