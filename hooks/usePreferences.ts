'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Offer } from '../lib/offer.ts';
import type { Preferences, SavedListing, StorageLike } from '../lib/storage.ts';
import { defaultPreferences, PREFERENCES_KEY, readStorage, SAVED_KEY, savedIdentity, savedPointer, writePreferences, writeSavedEntry, readSavedEntries, SAVED_ENTRY_PREFIX,compactSavedTombstones } from '../lib/storage.ts';
import {openSavedGuard,withSavedGuard} from '../lib/saved-guard.ts';
import { manualSavedPointer } from '../lib/manual-products.ts';
import { resaleSavedPointer } from '../lib/resale.ts';
import type { ResaleListing } from '../lib/resale.ts';
import type { ManualProduct } from '../lib/manual-products.ts';

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [saved, setSaved] = useState<SavedListing[]>([]);
  const [ready, setReady] = useState(false), [storageAvailable, setStorageAvailable] = useState(true);
  const [saveError, setSaveError] = useState<'saveUnavailable' | 'saveLimit' | null>(null);
  const store = useRef<StorageLike | null>(null), savedRef = useRef(saved);
  const guard=useRef<Promise<IDBDatabase|null>>(Promise.resolve(null));
  useEffect(() => {
    try { store.current = window.localStorage; } catch { store.current = null; }
    const value = readStorage(store.current);
    setPreferences(value.preferences); savedRef.current = value.saved; setSaved(value.saved); setStorageAvailable(value.available); setReady(true);
    let mounted=true;
    try {guard.current=openSavedGuard(window.indexedDB).catch(()=>null);}catch{guard.current=Promise.resolve(null);}
    void guard.current.then(async database=>{if(database&&store.current&&mounted){try{
      const current=await withSavedGuard(database,capacity=>{
        compactSavedTombstones(store.current!);
        const surviving=readSavedEntries(store.current!);
        // Capacity is coordination metadata: repair it from surviving pointers on startup.
        // Read and replace inside the same guard transaction used by concurrent saves.
        capacity.clear();
        for(const pointer of surviving)capacity.add(savedIdentity(pointer));
        return surviving;
      },value.saved.map(savedIdentity));
      if(mounted){savedRef.current=current;setSaved(current);}
    }catch{if(mounted)setStorageAvailable(false);}}});
    const changed = (event: StorageEvent) => {
      if (event.storageArea !== store.current) return;
      if (event.key === null) { const next = readStorage(store.current); savedRef.current = next.saved; setSaved(next.saved); setPreferences(next.preferences);void guard.current.then(database=>database?withSavedGuard(database,capacity=>capacity.clear()):undefined).catch(()=>setStorageAvailable(false)); }
      else if (event.key === SAVED_KEY || event.key.startsWith(SAVED_ENTRY_PREFIX)) { const next = readStorage(store.current); savedRef.current = next.saved; setSaved(next.saved); }
      else if (event.key === PREFERENCES_KEY) setPreferences(readStorage(store.current).preferences);
    };
    window.addEventListener('storage', changed);
    return () => {mounted=false;window.removeEventListener('storage', changed);void guard.current.then(database=>database?.close());};
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = preferences.language;
    if (!writePreferences(store.current, preferences)) setStorageAvailable(false);
  }, [ready, preferences]);
  const mutateEntry = useCallback(async(identity: string, pointer: SavedListing | null, toggle = false) => {
    const mutate=(current:SavedListing[],persistent:StorageLike|null,capacity?:Set<string>)=>{
    const exists = capacity?.has(identity)||current.some(item => savedIdentity(item) === identity);
    const nextPointer = toggle && exists ? null : pointer;
    if (nextPointer && !exists && (capacity?.size??current.length) >= 100) return {saved:current,limited:true,persisted:true};
    const next = current.filter(item => savedIdentity(item) !== identity);
    if (nextPointer) next.unshift(nextPointer);
    const persisted=writeSavedEntry(persistent,identity,nextPointer);if(persisted&&capacity){if(nextPointer)capacity.add(identity);else capacity.delete(identity);}
    return {saved:next,limited:false,persisted};
    };
    if(store.current&&storageAvailable){
      try{const database=await guard.current;if(!database)throw new Error('Saved coordination unavailable');
        const result=await withSavedGuard(database,capacity=>{compactSavedTombstones(store.current!);return mutate(readSavedEntries(store.current!),store.current,capacity);},savedRef.current.map(savedIdentity));
        if(result.limited)setSaveError('saveLimit');
        if(!result.persisted)setStorageAvailable(false);
        const current=result.persisted?readSavedEntries(store.current):result.saved;savedRef.current=current;setSaved(current);return;
      }catch{setStorageAvailable(false);}
    }
    const result=mutate(savedRef.current,null);if(result.limited)setSaveError('saveLimit');savedRef.current=result.saved;setSaved(result.saved);
  }, [storageAvailable]);
  const toggleSaved = useCallback((offer: Offer, sequence = 0) => {
    setSaveError(null);
    const pointer = savedPointer(offer, Date.now(), sequence);
    if (!pointer) { setSaveError('saveUnavailable'); return; }
    void mutateEntry(savedIdentity(pointer), pointer, true);
  }, [mutateEntry]);
  const removeSaved = useCallback((identity: string) => {setSaveError(null);void mutateEntry(identity, null);}, [mutateEntry]);
  const toggleManualSaved = useCallback((product: ManualProduct, now: number, records?: readonly ManualProduct[]) => {
    setSaveError(null);
    const pointer = manualSavedPointer(product, now, records);
    if (!pointer) { setSaveError('saveUnavailable'); return; }
    void mutateEntry(savedIdentity(pointer), pointer, true);
  }, [mutateEntry]);
  const toggleResaleSaved = useCallback((listing: ResaleListing, now: number, records?: readonly ResaleListing[]) => {
    setSaveError(null);
    const pointer = resaleSavedPointer(listing, now, records);
    if (!pointer) { setSaveError('saveUnavailable'); return; }
    void mutateEntry(savedIdentity(pointer), pointer, true);
  }, [mutateEntry]);
  return { preferences, setPreferences, saved, ready, storageAvailable, saveError, toggleSaved, toggleManualSaved, toggleResaleSaved, removeSaved };
}
