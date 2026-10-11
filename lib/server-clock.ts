export interface ClockAnchor { epochMs: number; monotonicMs: number }
/** HTTPS server time plus the full round trip is a conservative upper bound; never trust the phone epoch. */
export function serverAnchor(value: string | null, requestStartedMs: number, receivedMs: number): ClockAnchor | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    || !Number.isFinite(requestStartedMs) || !Number.isFinite(receivedMs) || receivedMs < requestStartedMs || receivedMs - requestStartedMs > 60000) return null;
  const epochMs = Date.parse(value);
  return Number.isFinite(epochMs) ? { epochMs: epochMs + receivedMs - requestStartedMs, monotonicMs: receivedMs } : null;
}
export function serverNow(anchor: ClockAnchor | null, monotonicMs: number): number {
  if (!anchor || !Number.isFinite(monotonicMs) || monotonicMs < anchor.monotonicMs) return Infinity;
  return anchor.epochMs + monotonicMs - anchor.monotonicMs;
}
