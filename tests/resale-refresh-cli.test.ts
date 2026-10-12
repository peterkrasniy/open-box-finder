import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, symlink, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { RESALE_RECORDS } from '../lib/resale.ts';

test('offline resale dry run, archives and failed-source preservation never mutate the app or invent freshness', async () => {
 const root=await mkdtemp(join(tmpdir(),'resale-check-'));
 try {
  await mkdir(join(root,'scripts'));await mkdir(join(root,'data'));
  await symlink(resolve('lib'),join(root,'lib'),'dir');
  await copyFile('scripts/refresh-resale-catalog.mjs',join(root,'scripts/refresh-resale-catalog.mjs'));
  const original=JSON.stringify(RESALE_RECORDS,null,2)+'\n';await writeFile(join(root,'data/resale-records.json'),original);
  const input=join(root,'batch.json'),script=join(root,'scripts/refresh-resale-catalog.mjs');
  const run=(apply=false)=>spawnSync(process.execPath,[script,'--input',input,...(apply?['--apply']:[])],{encoding:'utf8'});
  await writeFile(input,JSON.stringify({records:[],archivedIds:[],failedSources:['craigslist-resale']}));
  assert.equal(run().status,0);assert.equal(await readFile(join(root,'data/resale-records.json'),'utf8'),original);
  assert.equal(run(true).status,0);assert.equal(await readFile(join(root,'data/resale-records.json'),'utf8'),original);
  await writeFile(input,JSON.stringify({records:[],archivedIds:[RESALE_RECORDS[0].id],failedSources:['craigslist-resale']}));
  assert.notEqual(run(true).status,0);assert.equal(await readFile(join(root,'data/resale-records.json'),'utf8'),original);
  await writeFile(input,JSON.stringify({records:[],archivedIds:[RESALE_RECORDS[0].id],failedSources:[]}));
  assert.equal(run(true).status,0);
  const archived=JSON.parse(await readFile(join(root,'data/resale-records.json'),'utf8'));
  assert.equal(archived[0].archived,true);assert.equal(archived[0].checkedAt,RESALE_RECORDS[0].checkedAt);assert.deepEqual(archived.slice(1),RESALE_RECORDS.slice(1));
  const stable=await readFile(join(root,'data/resale-records.json'),'utf8');
  await writeFile(input,JSON.stringify({records:[{...RESALE_RECORDS[0],sellerEmail:'private@example.test'}],archivedIds:[],failedSources:[]}));
  assert.notEqual(run(true).status,0);assert.equal(await readFile(join(root,'data/resale-records.json'),'utf8'),stable);
  const future={...RESALE_RECORDS[0],checkedAt:new Date(Date.now()+86400000).toISOString()};await writeFile(input,JSON.stringify({records:[future],archivedIds:[],failedSources:[]}));
  assert.notEqual(run(true).status,0);assert.equal(await readFile(join(root,'data/resale-records.json'),'utf8'),stable);
 } finally {await rm(root,{recursive:true,force:true});}
});
