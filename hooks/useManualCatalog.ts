'use client';
import { useEffect, useState } from 'react';
import { MANUAL_PRODUCTS } from '../lib/manual-products.ts';
import type { ManualProduct } from '../lib/manual-products.ts';
import { validManualSnapshot } from '../lib/manual-snapshot-schema.ts';

/** Checks published snapshots, never retailer pages. A failed request preserves the last catalog. */
export function useManualCatalog(ready: boolean) {
  const [records, setRecords] = useState<readonly ManualProduct[]>(MANUAL_PRODUCTS);
  const [failedSources, setFailedSources] = useState<readonly string[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!ready) return;
    let stopped = false, running = false, etag: string | null = null;
    let controller: AbortController | null = null;
    const check = async () => {
      if (running || document.visibilityState === 'hidden') return;
      running = true; controller = new AbortController();
      const timer = window.setTimeout(() => controller?.abort(), 15_000);
      try {
        const response = await fetch('/api/manual-catalog', { cache: 'no-cache', headers: etag ? { 'If-None-Match': etag } : {}, signal: controller.signal });
        if (response.status === 304) { if (!stopped) setFailed(false); return; }
        if (!response.ok) throw new Error('Snapshot check failed');
        if (!response.headers.get('Content-Type')?.includes('application/json')) throw new Error('Invalid snapshot type');
        const raw = await response.text();
        if (new TextEncoder().encode(raw).length > 2 * 1024 * 1024) throw new Error('Snapshot exceeds limit');
        const body = JSON.parse(raw) as { records?: unknown; failedSources?: unknown }; 
        if (!body || !Array.isArray(body.records) || body.records.length > 3000 || !body.records.every(validManualSnapshot)
          || !Array.isArray(body.failedSources) || !body.failedSources.every((id: unknown) => typeof id === 'string' && id.length < 100)) throw new Error('Invalid snapshot');
        if (!stopped) { setRecords(body.records); setFailedSources(body.failedSources); setFailed(false); etag = response.headers.get('ETag'); }
      } catch { if (!stopped) setFailed(true); }
      finally { clearTimeout(timer); controller = null; running = false; }
    };
    const visible = () => { void check(); };
    void check(); const timer = window.setInterval(visible, 60_000);
    document.addEventListener('visibilitychange', visible); window.addEventListener('focus', visible);
    return () => { stopped = true; controller?.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus', visible); };
  }, [ready]);
  return { records, failedSources, failed };
}
