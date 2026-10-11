import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { CLAIM_SQL, CONTROL_INIT_SQL, PUBLISH_SQL, RELEASE_SQL, LEASE_MS, MAX_DAILY_ATTEMPTS } from '../lib/server/catalog-store.ts';

function database(){
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE acquisition_control(id INTEGER PRIMARY KEY,lease_token TEXT,lease_until INTEGER NOT NULL,next_due_at INTEGER NOT NULL,quota_day TEXT NOT NULL,daily_attempts INTEGER NOT NULL); CREATE TABLE catalog_state(id INTEGER PRIMARY KEY,payload TEXT NOT NULL,revision TEXT NOT NULL,updated_at INTEGER NOT NULL);');
  db.exec(CONTROL_INIT_SQL);return db;
}
const claim=(db:DatabaseSync,token:string,now:number,day='2026-10-11')=>db.prepare(CLAIM_SQL).get(token,now+LEASE_MS,day,day,now,now,day,MAX_DAILY_ATTEMPTS);

test('real SQLite lease permits one concurrent writer and rejects an expired writer publication',()=>{
  const db=database(),now=Date.parse('2026-10-11T09:30:00Z');
  assert.ok(claim(db,'first',now));assert.equal(claim(db,'second',now+1),undefined);
  assert.equal(db.prepare(PUBLISH_SQL).run('first-payload','r1',now,'first',now).changes,1);
  assert.ok(claim(db,'second',now+LEASE_MS));
  assert.equal(db.prepare(PUBLISH_SQL).run('lost-payload','r-lost',now+LEASE_MS,'first',now+LEASE_MS).changes,0);
  assert.equal(db.prepare(PUBLISH_SQL).run('second-payload','r2',now+LEASE_MS,'second',now+LEASE_MS).changes,1);
  assert.equal(db.prepare('SELECT payload FROM catalog_state WHERE id=1').get()!.payload,'second-payload');db.close();
});

test('release respects ownership, cadence and persisted daily quota across lease resets',()=>{
  const db=database(),now=Date.parse('2026-10-11T09:30:00Z');
  assert.ok(claim(db,'first',now));db.prepare(RELEASE_SQL).run(now+900000,'other');assert.equal(claim(db,'second',now+1),undefined);
  db.prepare(RELEASE_SQL).run(now+900000,'first');assert.equal(claim(db,'second',now+899999),undefined);assert.ok(claim(db,'second',now+900000));
  db.prepare('UPDATE acquisition_control SET lease_until=0,next_due_at=0,daily_attempts=? WHERE id=1').run(MAX_DAILY_ATTEMPTS);
  assert.equal(claim(db,'third',now+1800000),undefined);
  assert.ok(claim(db,'next-day',now+86400000,'2026-10-12'));
  assert.equal(db.prepare('SELECT daily_attempts FROM acquisition_control').get()!.daily_attempts,1);db.close();
});
