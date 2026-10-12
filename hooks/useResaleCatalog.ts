'use client';
import { useEffect, useState } from 'react';
import { RESALE_RECORDS, validResaleRecord } from '../lib/resale.ts';
import type { ResaleListing } from '../lib/resale.ts';

/** Poll published checked data; never contact marketplaces or sellers. */
export function useResaleCatalog(ready: boolean) {
  const [records, setRecords] = useState<readonly ResaleListing[]>(RESALE_RECORDS);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!ready) return;
    let stopped = false, running = false, etag: string | null = null;
    let controller: AbortController | null = null;
    const check = async () => {
      if (running || document.visibilityState === 'hidden') return;
      running = true; controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 15_000);
      try {
        const response = await fetch('/api/resale-catalog', { cache: 'no-cache', headers: etag ? { 'If-None-Match': etag } : {}, signal: controller.signal });
        if (response.status === 304) { if (!stopped) setFailed(false); return; }
        if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) throw new Error('Invalid catalog response');
        const raw = await response.text();
        if (new TextEncoder().encode(raw).length > 1024 * 1024) throw new Error('Catalog too large');
        const value = JSON.parse(raw) as { records?: unknown };
        if (!value || !Array.isArray(value.records) || value.records.length > 1000 || !value.records.every(validResaleRecord)) throw new Error('Invalid catalog');
        if (!stopped) { setRecords(value.records); setFailed(false); etag = response.headers.get('ETag'); }
      } catch { if (!stopped) setFailed(true); }
      finally { clearTimeout(timeout); running = false; controller = null; }
    };
    const visible = () => { void check(); };
    void check(); const timer = window.setInterval(visible, 60_000);
    document.addEventListener('visibilitychange', visible); window.addEventListener('focus', visible);
    return () => { stopped = true; controller?.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus', visible); };
  }, [ready]);
  return { records, failed };
}
