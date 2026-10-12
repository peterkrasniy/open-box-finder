'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { StorageLike } from '../lib/storage.ts';
import { DISMISSED_PREFIX, readDismissedListings, validDismissIdentity, writeListingDismissal } from '../lib/dismissals.ts';
export function useDismissedListings() {
  const [dismissedIds, setDismissedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [dismissalStorageAvailable, setAvailable] = useState(true);
  const store = useRef<StorageLike | null>(null);
  useEffect(() => {
    try { store.current = window.localStorage; setDismissedIds(readDismissedListings(store.current)); }
    catch { store.current = null; setAvailable(false); }
    const changed = (event: StorageEvent) => {
      if (event.storageArea !== store.current || event.key !== null && !event.key.startsWith(DISMISSED_PREFIX)) return;
      try { setDismissedIds(readDismissedListings(store.current)); } catch { store.current = null; setAvailable(false); }
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);
  const changeListing = useCallback((identity: string, hidden: boolean) => {
    if (!validDismissIdentity(identity)) return;
    const persisted = writeListingDismissal(store.current, identity, hidden);
    if (persisted) { try { setDismissedIds(readDismissedListings(store.current)); return; } catch { /* Keep this visit's action if storage reading fails. */ } }
    store.current = null; setAvailable(false);
    setDismissedIds(previous => { const next = new Set(previous); if (hidden) next.add(identity); else next.delete(identity); return next; });
  }, []);
  const restoreAllListings = useCallback(() => {
    let current = dismissedIds;
    try { current = readDismissedListings(store.current); } catch { store.current = null; setAvailable(false); }
    const restored = new Set<string>();
    for (const identity of current) { if (writeListingDismissal(store.current, identity, false)) restored.add(identity); else { store.current = null; setAvailable(false); } }
    // Restore for this visit even if the browser refuses persistence.
    setDismissedIds(previous => new Set([...previous].filter(identity => !current.has(identity) && !restored.has(identity))));
  }, [dismissedIds]);
  const dismissListing = useCallback((identity: string) => changeListing(identity, true), [changeListing]);
  const restoreListing = useCallback((identity: string) => changeListing(identity, false), [changeListing]);
  return { dismissedIds, dismissalStorageAvailable, dismissListing, restoreListing, restoreAllListings };
}
