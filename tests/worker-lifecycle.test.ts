import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalogResponse } from '../lib/server/catalog-route.ts';
import { emptyCatalog } from '../lib/catalog.ts';
import { runWithWorkerLifetime } from '../lib/server/worker-lifecycle.ts';

test('a disconnected catalog caller leaves the exact maintenance job retained by its Worker', async () => {
  const retained: Promise<unknown>[] = [];
  const client = new AbortController();
  let finish!: () => void, calls = 0, persisted = false;
  const upstream = new Promise<void>(resolve => { finish = resolve; });
  const service = { read: async () => emptyCatalog(), maintain: async () => {
    calls++; await upstream; persisted = true; return emptyCatalog();
  } };
  const response = runWithWorkerLifetime({ waitUntil: task => { retained.push(task); } }, () =>
    catalogResponse(new Request('https://app.test/api/catalog', { signal: client.signal }), service));
  // The client abandons its response; the runtime must already own the maintenance promise.
  client.abort();
  assert.equal(retained.length, 1);
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(calls, 1); assert.equal(persisted, false);
  finish(); await Promise.all(retained);
  assert.equal(persisted, true); assert.equal((await response).status, 200); assert.equal(calls, 1);
});

test('HEAD and rejected public inputs never register background work', async () => {
  const retained: Promise<unknown>[] = []; let writes = 0;
  const service = { read: async () => emptyCatalog(), maintain: async () => { writes++; return emptyCatalog(); } };
  for (const [method, query] of [['HEAD', ''], ['POST', ''], ['GET', '?force=1']]) {
    await runWithWorkerLifetime({ waitUntil: task => { retained.push(task); } }, () =>
      catalogResponse(new Request('https://app.test/api/catalog' + query, { method }), service));
  }
  assert.equal(retained.length, 0); assert.equal(writes, 0);
});

test('concurrent catalog requests retain work only in their own execution contexts', async () => {
  const left: Promise<unknown>[] = [], right: Promise<unknown>[] = [];
  const service = { read: async () => emptyCatalog(), maintain: async () => emptyCatalog() };
  await Promise.all([left, right].map(retained => runWithWorkerLifetime({ waitUntil: task => { retained.push(task); } },
    () => catalogResponse(new Request('https://app.test/api/catalog'), service))));
  assert.equal(left.length, 1); assert.equal(right.length, 1); assert.notEqual(left[0], right[0]);
  await Promise.all([...left, ...right]);
});
