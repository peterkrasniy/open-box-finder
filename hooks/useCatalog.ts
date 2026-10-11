'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyCatalog } from '../lib/catalog.ts';
import { serverAnchor, serverNow } from '../lib/server-clock.ts';
import type { ClockAnchor } from '../lib/server-clock.ts';
import { acceptPublication, decodeCatalog } from '../lib/validation.ts';

export function useCatalog(enabled: boolean) {
  const [catalog, setCatalog] = useState(emptyCatalog);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error' | 'offline'>('idle');
  const [now, setNow] = useState(Infinity);
  const clockAnchor = useRef<ClockAnchor | null>(null);
  const catalogRef = useRef(catalog);
  const active = useRef(false), controller = useRef<AbortController | null>(null);
  const serial = useRef(0), etag = useRef<string | null>(null);
  const refresh = useCallback(async () => {
    if (!active.current || controller.current || document.hidden) return;
    if (!navigator.onLine) { setStatus('offline'); return; }
    const request = new AbortController(), number = ++serial.current, started = performance.now();
    controller.current = request;
    const timer = setTimeout(() => request.abort(), 15000);
    setStatus('loading');
    try {
      const response = await fetch('/api/catalog', { cache: 'no-store', credentials: 'omit', signal: request.signal,
        headers: etag.current ? { 'If-None-Match': etag.current } : {} });
      if (!active.current || request.signal.aborted || serial.current !== number) return;
      const anchor = serverAnchor(response.headers.get('X-Catalog-Time'), started, performance.now());
      if (!anchor) throw new Error('Catalog server time unavailable');
      if (response.status === 304) { if (!etag.current) throw new Error('Unexpected not-modified response'); clockAnchor.current = anchor; setNow(serverNow(anchor, performance.now())); setStatus('ready'); return; }
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json') || !response.body) throw new Error('Catalog unavailable');
      const reader = response.body.getReader(), chunks: Uint8Array[] = [];
      let bytes = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 2 * 1024 * 1024) { await reader.cancel(); throw new Error('Catalog exceeds limit'); }
        chunks.push(chunk.value);
      }
      const data = new Uint8Array(bytes);
      let offset = 0;
      for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
      const next = acceptPublication(catalogRef.current, decodeCatalog(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data))));
      if (!active.current || request.signal.aborted || serial.current !== number) return;
      const value = response.headers.get('etag');
      etag.current = value && value.length <= 256 ? value : null;
      clockAnchor.current = anchor; catalogRef.current = next; setCatalog(next); setNow(serverNow(anchor, performance.now())); setStatus('ready');
    } catch { if (active.current && serial.current === number) setStatus(navigator.onLine ? 'error' : 'offline'); }
    finally { clearTimeout(timer); if (controller.current === request) controller.current = null; }
  }, []);
  const deactivate = useCallback(() => { active.current = false; ++serial.current; controller.current?.abort(); controller.current = null; }, []);
  useEffect(() => {
    if (!enabled) return;
    active.current = true;
    // Starting the external polling subscription also establishes its loading/offline state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const resumed = () => { if (!document.hidden) { clockAnchor.current = null; setNow(Infinity); void refresh(); } };
    const offline = () => { controller.current?.abort(); setStatus('offline'); };
    const poll = setInterval(() => { void refresh(); }, 120000);
    const clock = setInterval(() => { if (!document.hidden) setNow(serverNow(clockAnchor.current, performance.now())); }, 30000);
    document.addEventListener('visibilitychange', resumed);
    window.addEventListener('online', resumed); window.addEventListener('offline', offline);
    return () => { deactivate();
      clearInterval(poll); clearInterval(clock); document.removeEventListener('visibilitychange', resumed);
      window.removeEventListener('online', resumed); window.removeEventListener('offline', offline); };
  }, [enabled, refresh, deactivate]);
  return { catalog, status, now, refresh };
}
