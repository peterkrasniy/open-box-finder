/** Server-only acquisition. Destination is compile-time policy, never supplied by a visitor. */
export interface SourceTransport {
  id: string; url: string; allowedContentTypes: readonly string[]; maxBytes: number; timeoutMs: number;
}
export type FetchOutcome = { ok: true; text: string; acquiredAt: string; etag: string | null; modified: string | null; minimumNextCheckSeconds: number }
  | { ok: false; reason: 'http' | 'redirect' | 'content-type' | 'size' | 'encoding' | 'timeout' | 'transport'; minimumNextCheckSeconds: number };
export const DEALNEWS_TRANSPORT: Readonly<SourceTransport> = Object.freeze({
  id: 'dealnews', url: 'https://www.dealnews.com/?rss=1&sort=time',
  allowedContentTypes: ['application/rss+xml', 'application/xml', 'text/xml'], maxBytes: 1024 * 1024, timeoutMs: 8000,
});
const clampBackoff = (seconds: number) => Math.min(86400, Math.max(900, Math.ceil(seconds)));
export function retryAfterSeconds(value: string | null, now: number): number {
  if (!value) return 900;
  if (/^\d{1,8}$/.test(value)) return clampBackoff(Number(value));
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? clampBackoff((timestamp - now) / 1000) : 900;
}

export async function acquireSource(source: Readonly<SourceTransport>, fetcher: typeof fetch = fetch, now = Date.now): Promise<FetchOutcome> {
  // Reject unsafe developer configuration too; this is never a generic fetch/proxy endpoint.
  if (source !== DEALNEWS_TRANSPORT) throw new TypeError('Unregistered source transport');
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), source.timeoutMs);
  let phase: 'transport' | 'encoding' = 'transport';
  try {
    const response = await fetcher(source.url, { redirect: 'manual', signal: controller.signal, credentials: 'omit',
      headers: { Accept: 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8', 'User-Agent': 'OpenBoxFinder/0.1 (+https://github.com/peterkrasniy/open-box-finder)' } });
    const backoff = retryAfterSeconds(response.headers.get('retry-after'), now());
    const rejected = async (reason: 'redirect' | 'http' | 'content-type') => {
      await response.body?.cancel();
      return { ok: false as const, reason, minimumNextCheckSeconds: backoff };
    };
    if (response.status >= 300 && response.status < 400) return await rejected('redirect');
    if (!response.ok || !response.body) return await rejected('http');
    const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (!contentType || !source.allowedContentTypes.includes(contentType)) return await rejected('content-type');
    const length = response.headers.get('content-length');
    if (length && /^\d+$/.test(length) && Number(length) > source.maxBytes) { await response.body.cancel(); return { ok: false, reason: 'size', minimumNextCheckSeconds: backoff }; }
    const reader = response.body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true });
    let bytes = 0, text = '';
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > source.maxBytes) { await reader.cancel(); return { ok: false, reason: 'size', minimumNextCheckSeconds: backoff }; }
      phase = 'encoding';
      text += decoder.decode(chunk.value, { stream: true });
      phase = 'transport';
    }
    phase = 'encoding';
    text += decoder.decode();
    const cacheAge = response.headers.get('cache-control')?.match(/(?:^|,)\s*max-age=(\d{1,8})(?:\s*,|$)/i);
    return { ok: true, text, acquiredAt: new Date(now()).toISOString(), etag: boundedHeader(response.headers.get('etag')),
      modified: boundedHeader(response.headers.get('last-modified')), minimumNextCheckSeconds: clampBackoff(Math.max(backoff, cacheAge ? Number(cacheAge[1]) : 900)) };
  } catch { return { ok: false, reason: controller.signal.aborted ? 'timeout' : phase, minimumNextCheckSeconds: 900 }; }
  finally { clearTimeout(timeout); }
}
function boundedHeader(value: string | null): string | null { return value && value.length <= 256 && !/[\u0000-\u001f]/.test(value) ? value : null; }
