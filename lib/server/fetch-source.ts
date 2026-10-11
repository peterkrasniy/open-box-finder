/** Server-only acquisition. Destination is compile-time policy, never supplied by a visitor. */
export interface SourceTransport {
  id: string; url: string; allowedContentTypes: readonly string[]; maxBytes: number; timeoutMs: number;
}
export type FetchOutcome = { ok: true; text: string; acquiredAt: string; etag: string | null; modified: string | null; minimumNextCheckSeconds: number }
  | { ok: false; httpStatus?: number; stopAutomatic?: true; reason: 'http' | 'redirect' | 'content-type' | 'size' | 'encoding' | 'timeout' | 'transport'; minimumNextCheckSeconds: number };
export const DEALNEWS_TRANSPORT: Readonly<SourceTransport> = Object.freeze({
  id: 'dealnews', url: 'https://www.dealnews.com/?rss=1&sort=time',
  allowedContentTypes: ['application/rss+xml', 'application/xml', 'text/xml'], maxBytes: 1024 * 1024, timeoutMs: 8000,
});
const registered = new WeakSet<object>([DEALNEWS_TRANSPORT]);
function register(source: SourceTransport): Readonly<SourceTransport> { const fixed = Object.freeze(source); registered.add(fixed); return fixed; }
export const A4L_ROBOTS_TRANSPORT = register({ id: 'a4l-sac-robots', url: 'https://www.appliances4less-sac.com/robots.txt', allowedContentTypes: ['text/plain'], maxBytes: 131072, timeoutMs: 8000 });
export const A4L_CATALOG_TRANSPORT = register({ id: 'a4l-sac-catalog', url: 'https://www.appliances4less-sac.com/products', allowedContentTypes: ['text/html'], maxBytes: 1048576, timeoutMs: 8000 });
/** Only reviewed canonical public unit paths discovered by the server's bounded catalog parser. */
export function a4lUnitTransport(value: string): Readonly<SourceTransport> {
  const url = new URL(value);
  if (url.origin !== 'https://www.appliances4less-sac.com' || url.username || url.password || url.search || url.hash
    || !/^\/p\/[a-zA-Z0-9_-]{1,160}\/u\/[a-zA-Z0-9_-]{1,160}$/.test(url.pathname)) throw new TypeError('Unregistered unit path');
  return register({ id: 'a4l-sac-unit', url: url.href, allowedContentTypes: ['text/html'], maxBytes: 524288, timeoutMs: 8000 });
}
const clampBackoff = (seconds: number) => Math.max(900, Math.ceil(seconds));
export function retryAfterSeconds(value: string | null, now: number): number {
  if (!value) return 900;
  if (/^\d+$/.test(value)) { const seconds=Number(value);return Number.isSafeInteger(seconds)&&now+seconds*1000<=8640000000000000?clampBackoff(seconds):Infinity; }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? clampBackoff((timestamp - now) / 1000) : 900;
}

export async function acquireSource(source: Readonly<SourceTransport>, fetcher: typeof fetch = fetch, now = Date.now, budget?:AbortSignal): Promise<FetchOutcome> {
  // Reject unsafe developer configuration too; this is never a generic fetch/proxy endpoint.
  if (!registered.has(source)) throw new TypeError('Unregistered source transport');
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), source.timeoutMs);
  const abortBudget=()=>controller.abort();
  budget?.addEventListener('abort',abortBudget,{once:true});
  if(budget?.aborted)controller.abort();
  let phase: 'transport' | 'encoding' = 'transport';
  try {
    controller.signal.throwIfAborted();
    const response = await fetcher(source.url, { redirect: 'manual', signal: controller.signal, credentials: 'omit',
      headers: { Accept: source.allowedContentTypes.join(', '), 'User-Agent': 'OpenBoxFinder/0.1 (+https://github.com/peterkrasniy/open-box-finder)' } });
    const backoff = retryAfterSeconds(response.headers.get('retry-after'), now());
    const rejected = async (reason: 'redirect' | 'http' | 'content-type') => {
      await response.body?.cancel();
      const stop=reason==='redirect'||reason==='content-type'||!Number.isFinite(backoff)||(reason==='http'&&[401,403,404,410,451].includes(response.status));
      return { ok: false as const, reason, ...(reason === 'http' ? { httpStatus: response.status } : {}), ...(stop?{stopAutomatic:true as const}:{}), minimumNextCheckSeconds: Number.isFinite(backoff)?backoff:900 };
    };
    if(!Number.isFinite(backoff))return await rejected('http');
    if (response.status >= 300 && response.status < 400) return await rejected('redirect');
    if (!response.ok || !response.body) return await rejected('http');
    const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (!contentType || !source.allowedContentTypes.includes(contentType)) return await rejected('content-type');
    const length = response.headers.get('content-length');
    if (length && /^\d+$/.test(length) && Number(length) > source.maxBytes) { await response.body.cancel(); return { ok: false, reason: 'size', minimumNextCheckSeconds: backoff }; }
    const reader = response.body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true });
    let bytes = 0, text = '';
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > source.maxBytes) { await reader.cancel(); return { ok: false, reason: 'size', minimumNextCheckSeconds: backoff }; }
        phase = 'encoding'; text += decoder.decode(chunk.value, { stream: true }); phase = 'transport';
      }
      phase = 'encoding'; text += decoder.decode();
    } finally { try { await reader.cancel(); } finally { reader.releaseLock(); } }
    const cacheAge = response.headers.get('cache-control')?.match(/(?:^|,)\s*max-age=(\d{1,8})(?:\s*,|$)/i);
    return { ok: true, text, acquiredAt: new Date(now()).toISOString(), etag: boundedHeader(response.headers.get('etag')),
      modified: boundedHeader(response.headers.get('last-modified')), minimumNextCheckSeconds: clampBackoff(Math.max(backoff, cacheAge ? Number(cacheAge[1]) : 900)) };
  } catch { return { ok: false, reason: controller.signal.aborted ? 'timeout' : phase, minimumNextCheckSeconds: 900 }; }
  finally { clearTimeout(timeout);budget?.removeEventListener('abort',abortBudget); }
}
function boundedHeader(value: string | null): string | null { return value && value.length <= 256 && !/[\u0000-\u001f]/.test(value) ? value : null; }
