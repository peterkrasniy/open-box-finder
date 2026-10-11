export interface ClockAnchor { epochMs: number; monotonicMs: number }
/** HTTPS server time plus the full round trip is a conservative upper bound; never trust the phone epoch. */
export function serverAnchor(value: string | null, requestStartedMs: number, receivedMs: number, previous: ClockAnchor | null = null): ClockAnchor | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    || !Number.isFinite(requestStartedMs) || !Number.isFinite(receivedMs) || receivedMs < requestStartedMs || receivedMs - requestStartedMs > 60000) return null;
  const epochMs = Date.parse(value);
  const floor = previous ? serverNow(previous, receivedMs) : 0;
  return Number.isFinite(epochMs) && Number.isFinite(floor) ? { epochMs: Math.max(epochMs + receivedMs - requestStartedMs, floor), monotonicMs: receivedMs } : null;
}
export function serverNow(anchor: ClockAnchor | null, monotonicMs: number): number {
  if (!anchor || !Number.isFinite(monotonicMs) || monotonicMs < anchor.monotonicMs) return Infinity;
  return anchor.epochMs + monotonicMs - anchor.monotonicMs;
}
