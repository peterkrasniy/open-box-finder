import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodePreferences, decodeSaved, defaultPreferences, readStorage, safeExternalUrl, writePreferences, writeSaved } from '../lib/storage.ts';

test('Russian preferences preserve cents and explicit retailer-none across serialization', () => {
  const value = defaultPreferences();
  value.language = 'ru'; value.filters.minCents = 20050; value.filters.maxCents = 40001;
  value.filters.retailers = { mode: 'selected', ids: [] };
  assert.deepEqual(decodePreferences(JSON.stringify(value)), value);
  const futureSource = structuredClone(value);
  futureSource.filters.retailers.ids = ['a4l-sac', 'unknown-future-source'];
  assert.deepEqual(decodePreferences(JSON.stringify(futureSource)).filters.retailers, { mode: 'selected', ids: ['a4l-sac'] });
});

test('corrupted or oversized preferences recover safely without trusting coordinates, prototype keys or numeric coercion', () => {
  for (const raw of ['not json', '[]', 'x'.repeat(16001), JSON.stringify({ ...defaultPreferences(), filters: { ...defaultPreferences().filters, radiusMiles: '50' } }),
    JSON.stringify({ ...defaultPreferences(), filters: { ...defaultPreferences().filters, origin: { label: 'Bad', latitude: 200, longitude: 0 } } }),
    JSON.stringify({ ...defaultPreferences(), filters: { ...defaultPreferences().filters, minCents: 300, maxCents: 200 } })]) assert.deepEqual(decodePreferences(raw), defaultPreferences());
  const restored = decodePreferences('{"version":1,"language":"ru","sort":"percent","__proto__":{"polluted":true},"filters":'+JSON.stringify(defaultPreferences().filters)+'}');
  assert.equal(restored.language, 'ru');
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test('saved pointers are bounded, deduplicated and cannot contain executable or internal links', () => {
  const valid = { offerId: 'unit-a', sourceId: 'a4l-sac', variantKey: 'exact-variant', storeId: 'elkhorn', url: 'https://www.appliances4less-sac.com/p/example/u/exact-unit', savedAt: '2026-10-11T09:00:00Z' };
  const raw = JSON.stringify({ version: 1, listings: [valid, valid, { ...valid, offerId: 'bad', url: 'javascript:alert(1)' }, { ...valid, offerId: 'foreign', sourceId: 'unknown' }] });
  assert.deepEqual(decodeSaved(raw), [valid]);
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'http://example.com', 'https://user:pass@example.com', 'https://127.0.0.1/x', 'https://localhost/x', 'https://[::1]/x', 'https://host.local/x', 'https://example.com:444/x','https://localhost./x','https://admin.localhost./x']) assert.equal(safeExternalUrl(url), null);
});

test('denied storage never crashes or pretends preferences were persisted', () => {
  const denied = { getItem: () => { throw new Error('Denied'); }, setItem: () => { throw new Error('Quota'); } };
  assert.equal(readStorage(denied).available, false);
  assert.equal(writePreferences(denied, defaultPreferences()), false);
  assert.equal(writeSaved(denied, []), false);
});

test('saved identity keeps distinct variants and branches when a source reuses a listing ID', async () => {
  const { savedIdentity } = await import('../lib/storage.ts');
  const base = { offerId: 'qa-only-reused-id', sourceId: 'buydig', variantKey: 'qa-only-unit-a', storeId: 'qa-only-branch-a', url: 'https://www.buydig.com/shop/product/QA-ONLY', savedAt: '2026-10-11T09:00:00Z' };
  const anotherVariant = { ...base, variantKey: 'qa-only-unit-b' }, anotherBranch = { ...base, storeId: 'qa-only-branch-b' };
  const result = decodeSaved(JSON.stringify({ version: 1, listings: [base, anotherVariant, anotherBranch, base] }));
  assert.equal(result.length, 3);
  assert.equal(new Set(result.map(savedIdentity)).size, 3);
  assert.deepEqual(result.map(record => record.variantKey), ['qa-only-unit-a', 'qa-only-unit-b', 'qa-only-unit-a']);
});

test('independent saved entries preserve two interleaved tabs without Web Locks and tombstone removal does not resurrect legacy saves', async () => {
 const { readSavedEntries, writeSavedEntry, savedIdentity, SAVED_KEY } = await import('../lib/storage.ts');
 const data=new Map<string,string>();const store={get length(){return data.size},key:(index:number)=>[...data.keys()][index]??null,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value)}};
 const a={offerId:'QA-only-a',sourceId:'buydig',sourceOfferId:'QA-only-a',condition:'open-box' as const,variantKey:'QA-only-a',storeId:null,title:'QA ONLY A',url:'https://www.buydig.com/shop/product/QA-only-a',savedAt:'2026-10-11T10:00:00Z'};
 const b={...a,offerId:'QA-only-b',sourceOfferId:'QA-only-b',variantKey:'QA-only-b',title:'QA ONLY B'};
 assert.deepEqual(readSavedEntries(store),[]);assert.deepEqual(readSavedEntries(store),[]);
 assert.equal(writeSavedEntry(store,savedIdentity(a),a),true);assert.equal(writeSavedEntry(store,savedIdentity(b),b),true);
 assert.equal(readSavedEntries(store).length,2);
 store.setItem(SAVED_KEY,JSON.stringify({version:1,listings:[a]}));writeSavedEntry(store,savedIdentity(a),null);
 assert.deepEqual(readSavedEntries(store),[b]);
 const replacement={...b,condition:'used' as const};assert.notEqual(savedIdentity(b),savedIdentity(replacement));
});

test('saved pointers cannot label an unrelated hostname as an official retailer link', async () => {
 const {savedSourceUrl}=await import('../lib/storage.ts');
 for(const url of ['https://unrelated.test/shop/product/QA','https://www.buydig.com.evil.test/shop/product/QA','https://www.buydig.com/not-a-product'])assert.equal(savedSourceUrl('buydig',url),null);
 assert.equal(savedSourceUrl('buydig','https://www.buydig.com/shop/product/QA-ONLY'),'https://www.buydig.com/shop/product/QA-ONLY');
});
