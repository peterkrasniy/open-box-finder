'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Offer } from '../lib/offer.ts';
import type { Preferences, SavedListing, StorageLike } from '../lib/storage.ts';
import { decodeSaved, defaultPreferences, PREFERENCES_KEY, readStorage, SAVED_KEY, savedPointer, writePreferences, writeSaved } from '../lib/storage.ts';

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [saved, setSaved] = useState<SavedListing[]>([]);
  const [ready, setReady] = useState(false), [storageAvailable, setStorageAvailable] = useState(true);
  const [saveError, setSaveError] = useState<'saveUnavailable' | 'saveLimit' | null>(null);
  const store = useRef<StorageLike | null>(null), savedRef = useRef(saved);
  savedRef.current = saved;
  useEffect(() => {
    try { store.current = window.localStorage; } catch { store.current = null; }
    const value = readStorage(store.current);
    setPreferences(value.preferences); setSaved(value.saved); setStorageAvailable(value.available); setReady(true);
    const changed = (event: StorageEvent) => {
      if (event.key === SAVED_KEY) setSaved(decodeSaved(event.newValue));
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
    if (navigator.locks?.request) await navigator.locks.request('open-box-finder:saved', update);
    else update();
  }, [storageAvailable]);
  const toggleSaved = useCallback((offer: Offer) => {
    setSaveError(null);
    const pointer = savedPointer(offer, Date.now());
    if (!pointer) { setSaveError('saveUnavailable'); return; }
    void mutateSaved(value => {
      if (value.some(item => item.offerId === offer.id)) return value.filter(item => item.offerId !== offer.id);
      if (value.length >= 100) { setSaveError('saveLimit'); return value; }
      return [pointer, ...value];
    });
  }, [mutateSaved]);
  const removeSaved = useCallback((id: string) => { void mutateSaved(value => value.filter(item => item.offerId !== id)); }, [mutateSaved]);
  return { preferences, setPreferences, saved, ready, storageAvailable, saveError, toggleSaved, removeSaved };
}
