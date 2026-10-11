'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyCatalog } from '../lib/catalog.ts';
import { decodeCatalog } from '../lib/validation.ts';

export function useCatalog(enabled: boolean) {
  const [catalog, setCatalog] = useState(emptyCatalog);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error' | 'offline'>('idle');
  const [now, setNow] = useState(() => Date.now());
  const active = useRef(false), controller = useRef<AbortController | null>(null);
  const serial = useRef(0), etag = useRef<string | null>(null);
  const refresh = useCallback(async () => {
    if (!active.current || controller.current || document.hidden) return;
    if (!navigator.onLine) { setStatus('offline'); return; }
    const request = new AbortController(), number = ++serial.current;
    controller.current = request;
    const timer = setTimeout(() => request.abort(), 15000);
    setStatus('loading');
    try {
      const response = await fetch('/api/catalog', { cache: 'no-store', credentials: 'omit', signal: request.signal,
        headers: etag.current ? { 'If-None-Match': etag.current } : {} });
      if (!active.current || request.signal.aborted || serial.current !== number) return;
      if (response.status === 304) { setStatus('ready'); return; }
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
      const next = decodeCatalog(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data)));
      if (!active.current || request.signal.aborted || serial.current !== number) return;
      const value = response.headers.get('etag');
      etag.current = value && value.length <= 256 ? value : null;
      setCatalog(next); setNow(Date.now()); setStatus('ready');
    } catch { if (active.current && serial.current === number) setStatus(navigator.onLine ? 'error' : 'offline'); }
    finally { clearTimeout(timer); if (controller.current === request) controller.current = null; }
  }, []);
  useEffect(() => {
    if (!enabled) return;
    active.current = true;
    void refresh();
    const resumed = () => { if (!document.hidden) void refresh(); };
    const offline = () => { controller.current?.abort(); setStatus('offline'); };
    const poll = setInterval(() => { void refresh(); }, 120000);
    const clock = setInterval(() => { if (!document.hidden) setNow(Date.now()); }, 30000);
    document.addEventListener('visibilitychange', resumed);
    window.addEventListener('online', resumed); window.addEventListener('offline', offline);
    return () => { active.current = false; ++serial.current; controller.current?.abort(); controller.current = null;
      clearInterval(poll); clearInterval(clock); document.removeEventListener('visibilitychange', resumed);
      window.removeEventListener('online', resumed); window.removeEventListener('offline', offline); };
  }, [enabled, refresh]);
  return { catalog, status, now, refresh };
}
