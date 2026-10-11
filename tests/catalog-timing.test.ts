import assert from 'node:assert/strict';
import {test} from 'node:test';
import {clockDelay,pollDelay,CLOCK_INTERVAL_MS,POLL_INTERVAL_MS} from '../lib/catalog-timing.ts';
import {emptyCatalog} from '../lib/catalog.ts';
import type {Offer} from '../lib/offer.ts';

test('catalog failures reduce request load with bounded backoff and a successful read restores the cadence',()=>{
  assert.deepEqual([0,1,2,3,4,50].map(pollDelay),[120000,240000,480000,960000,960000,960000]);
  assert.equal(pollDelay(-1),POLL_INTERVAL_MS);
  assert.equal(pollDelay(NaN),960000);
});

test('evidence expiry is scheduled before the coarse clock tick; old evidence never causes a hot loop',()=>{
  const now=Date.parse('2026-10-11T11:00:00Z'),catalog=emptyCatalog();
  // Minimal timing-only fixture: never imported by application or migrations.
  catalog.offers=[{freshUntil:new Date(now+1200).toISOString(),reference:{observedAt:new Date(now-5500).toISOString(),maxAgeSeconds:6}} as Offer];
  assert.equal(clockDelay(catalog,now),501);
  assert.equal(clockDelay(catalog,now+501),700);
  assert.equal(clockDelay(catalog,now+1201),CLOCK_INTERVAL_MS);
  assert.equal(clockDelay(catalog,Infinity),CLOCK_INTERVAL_MS);
  catalog.offers=[];
  catalog.sources[0].nextCheckAt=new Date(now+75).toISOString();
  assert.equal(clockDelay(catalog,now),76);
});
