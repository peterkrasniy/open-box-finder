import assert from 'node:assert/strict';
import { test } from 'node:test';
import { serverAnchor,serverNow } from '../lib/server-clock.ts';
import { isFresh } from '../lib/offer.ts';

test('a phone clock one day behind cannot revive availability; expiration uses server epoch and monotonic elapsed time',()=>{
 const server=Date.parse('2026-10-11T10:00:00Z'),phoneWallClock=server-86400000;
 const record={observedAt:'2026-10-11T09:59:00Z',freshUntil:'2026-10-11T10:01:00Z'};
 const anchor=serverAnchor('2026-10-11T10:00:00.000Z',100,200)!;
 assert.equal(serverNow(anchor,200),server+100);assert.equal(isFresh(record,serverNow(anchor,200)),true);
 assert.equal(isFresh(record,serverNow(anchor,60201)),false);
 assert.ok(phoneWallClock<serverNow(anchor,200));
 assert.equal(isFresh(record,serverNow(null,200)),false);
});

test('missing, malformed or invalid monotonic timing has no trusted freshness anchor',()=>{
 for(const time of [null,'invalid','2026-10-11','Sun, 11 Oct 2026 10:00:00 GMT'])assert.equal(serverAnchor(time,100,200),null);
 assert.equal(serverAnchor('2026-10-11T10:00:00.000Z',300,200),null);
 assert.equal(serverAnchor('2026-10-11T10:00:00.000Z',0,60001),null);
 assert.equal(serverNow({epochMs:1000,monotonicMs:20},19),Infinity);
});
