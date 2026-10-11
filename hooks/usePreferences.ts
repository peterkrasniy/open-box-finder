'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Offer } from '../lib/offer.ts';
import type { Preferences, SavedListing, StorageLike } from '../lib/storage.ts';
import { decodeSaved, defaultPreferences, PREFERENCES_KEY, readStorage, SAVED_KEY, savedIdentity, savedPointer, writePreferences, writeSaved } from '../lib/storage.ts';

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
      if (event.key === null) { const next = readStorage(store.current); savedRef.current = next.saved; setSaved(next.saved); setPreferences(next.preferences); }
      else if (event.key === SAVED_KEY) { const next = decodeSaved(event.newValue); savedRef.current = next; setSaved(next); }
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
  const mutateSaved = useCallback(async (mutation: (value: SavedListing[]) => SavedListing[]) => {
    const update = () => {
      let value = savedRef.current;
      if (store.current && storageAvailable) {
        try { value = decodeSaved(store.current.getItem(SAVED_KEY)); } catch { setStorageAvailable(false); }
      }
      const next = mutation(value);
      savedRef.current = next; setSaved(next);
      if (!writeSaved(store.current, next)) setStorageAvailable(false);
    };
    let completed = false;
    const once = () => { if (!completed) { completed = true; update(); } };
    if (navigator.locks?.request) {
      try { await navigator.locks.request('open-box-finder:saved', once); }
      catch { once(); }
    } else once();
  }, [storageAvailable]);
  const toggleSaved = useCallback((offer: Offer) => {
    setSaveError(null);
    const pointer = savedPointer(offer, Date.now());
    if (!pointer) { setSaveError('saveUnavailable'); return; }
    void mutateSaved(value => {
      const identity = savedIdentity(pointer);
      if (value.some(item => savedIdentity(item) === identity)) return value.filter(item => savedIdentity(item) !== identity);
      if (value.length >= 100) { setSaveError('saveLimit'); return value; }
      return [pointer, ...value];
    });
  }, [mutateSaved]);
  const removeSaved = useCallback((identity: string) => { void mutateSaved(value => value.filter(item => savedIdentity(item) !== identity)); }, [mutateSaved]);
  return { preferences, setPreferences, saved, ready, storageAvailable, saveError, toggleSaved, removeSaved };
}
