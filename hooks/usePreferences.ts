'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Offer } from '../lib/offer.ts';
import type { Preferences, SavedListing, StorageLike } from '../lib/storage.ts';
import { defaultPreferences, PREFERENCES_KEY, readStorage, SAVED_KEY, savedIdentity, savedPointer, writePreferences, writeSavedEntry, readSavedEntries, SAVED_ENTRY_PREFIX } from '../lib/storage.ts';

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [saved, setSaved] = useState<SavedListing[]>([]);
  const [ready, setReady] = useState(false), [storageAvailable, setStorageAvailable] = useState(true);
  const [saveError, setSaveError] = useState<'saveUnavailable' | 'saveLimit' | null>(null);
  const store = useRef<StorageLike | null>(null), savedRef = useRef(saved);
  useEffect(() => {
    try { store.current = window.localStorage; } catch { store.current = null; }
    const value = readStorage(store.current);
    setPreferences(value.preferences); savedRef.current = value.saved; setSaved(value.saved); setStorageAvailable(value.available); setReady(true);
    const changed = (event: StorageEvent) => {
      if (event.storageArea !== store.current) return;
      if (event.key === null) { const next = readStorage(store.current); savedRef.current = next.saved; setSaved(next.saved); setPreferences(next.preferences); }
      else if (event.key === SAVED_KEY || event.key.startsWith(SAVED_ENTRY_PREFIX)) { const next = readStorage(store.current); savedRef.current = next.saved; setSaved(next.saved); }
      else if (event.key === PREFERENCES_KEY) setPreferences(readStorage(store.current).preferences);
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = preferences.language;
    if (!writePreferences(store.current, preferences)) setStorageAvailable(false);
  }, [ready, preferences]);
  const mutateEntry = useCallback((identity: string, pointer: SavedListing | null, toggle = false) => {
    let current = savedRef.current;
    if (store.current && storageAvailable) {
      try { current = readSavedEntries(store.current); } catch { setStorageAvailable(false); }
    }
    const exists = current.some(item => savedIdentity(item) === identity);
    const nextPointer = toggle && exists ? null : pointer;
    if (nextPointer && !exists && current.length >= 100) { setSaveError('saveLimit'); return; }
    const next = current.filter(item => savedIdentity(item) !== identity);
    if (nextPointer) next.unshift(nextPointer);
    savedRef.current = next; setSaved(next);
    if (!writeSavedEntry(store.current, identity, nextPointer)) setStorageAvailable(false);
  }, [storageAvailable]);
  const toggleSaved = useCallback((offer: Offer, sequence = 0) => {
    setSaveError(null);
    const pointer = savedPointer(offer, Date.now(), sequence);
    if (!pointer) { setSaveError('saveUnavailable'); return; }
    mutateEntry(savedIdentity(pointer), pointer, true);
  }, [mutateEntry]);
  const removeSaved = useCallback((identity: string) => mutateEntry(identity, null), [mutateEntry]);
  return { preferences, setPreferences, saved, ready, storageAvailable, saveError, toggleSaved, removeSaved };
}
