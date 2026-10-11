import assert from 'node:assert/strict';import {test} from 'node:test';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';
import {CatalogStore} from '../lib/server/catalog-store.ts';import {maintainCatalog,dealnewsAdapter} from '../lib/server/pipeline.ts';
import type {Adapter,AcquisitionResult} from '../lib/server/pipeline.ts';import type {Offer} from '../lib/offer.ts';import type {PublicationPolicy} from '../lib/server/publication.ts';import {SOURCE_BY_ID} from '../lib/sources.ts';
const baseTime=Date.parse('2026-10-11T10:00:00Z');
const policy:PublicationPolicy={sourceId:'buydig',retailerId:'buydig',products:[{origin:'https://www.buydig.com',pathPrefix:'/shop/product/'}],references:[],images:[],contentLinks:[],referenceBases:[],maxFreshSeconds:3600};
const registry=new Map(SOURCE_BY_ID);registry.set('buydig',{...registry.get('buydig')!,enabled:true,admission:'admitted'});const policies=new Map([['buydig',policy]]);
function fixture(id:string,time:number,price=20050):Offer{return{id:`QA-only:${id}`,sourceId:'buydig',retailerId:'buydig',sourceOfferId:`QA-only-${id}`,variantKey:`QA-only-${id}`,recordType:'inventory',title:`QA ONLY ${id}`,category:'audio',condition:'open-box',cosmeticGrade:null,availability:'available',priceCents:price,currency:'USD',reference:null,url:`https://www.buydig.com/shop/product/QA-ONLY-${id}`,imageUrl:null,imageAlt:null,pickup:null,shipping:null,localDelivery:null,observedAt:new Date(time).toISOString(),freshUntil:new Date(time+3600000).toISOString()}}
function database(){
 const db=new DatabaseSync(':memory:');for(const file of ['0000_zippy_excalibur.sql','0001_stormy_longshot.sql'])db.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 const prepare=(sql:string)=>{let values:unknown[]=[];const statement={bind(...args:unknown[]){values=args;return statement},async first(){return db.prepare(sql).get(...values as never[])??null},async run(){const result=db.prepare(sql).run(...values as never[]);return{meta:{changes:Number(result.changes)}}}};return statement};
 const d1={prepare,async batch(statements:{run:()=>Promise<unknown>}[]){db.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());db.exec('COMMIT');return result}catch(error){db.exec('ROLLBACK');throw error}}};
 return{db,store:new CatalogStore(d1 as unknown as D1Database,policies,registry)};
}
test('real SQLite pipeline admits one writer, persists/readbacks publications, preserves partials and records complete-only removals',async()=>{
 const{db,store}=database();let time=baseTime,calls=0;let outcome:AcquisitionResult={ok:true,acquiredAt:new Date(time).toISOString(),complete:true,offers:[fixture('A',time)],syndication:[],minimumNextCheckSeconds:900};
 const adapter:Adapter={sourceId:'buydig',acquire:async()=>{calls++;return outcome}},adapters=new Map([['buydig',adapter]]);
 const first=await maintainCatalog(store,()=>time,adapters,policies,registry);assert.equal(first.sequence,1);assert.equal((await store.read()).offers[0].priceCents,20050);
 assert.equal((await maintainCatalog(store,()=>time,adapters,policies,registry)).sequence,1);assert.equal(calls,1);
 time+=900000;outcome={...outcome,acquiredAt:new Date(time).toISOString(),complete:false,offers:[fixture('B',time)]};const partial=await maintainCatalog(store,()=>time,adapters,policies,registry);assert.equal(partial.offers.length,2);assert.equal(partial.sources.find(s=>s.sourceId==='buydig')!.lastCompleteSequence,1);
 time+=900000;outcome={...outcome,acquiredAt:new Date(time).toISOString(),complete:true,offers:[fixture('B',time,19999)]};const complete=await maintainCatalog(store,()=>time,adapters,policies,registry);assert.deepEqual(complete.offers.map(o=>o.id),['QA-only:B']);assert.equal(complete.sources.find(s=>s.sourceId==='buydig')!.lastCompleteSequence,3);
 const events=db.prepare('SELECT added,changed,removed FROM acquisition_events ORDER BY acquired_at').all();assert.deepEqual(events.map(row=>[row.added,row.changed,row.removed]),[[1,0,0],[1,0,0],[0,1,1]]);
 time+=900000;outcome={ok:false,minimumNextCheckSeconds:3600};const failed=await maintainCatalog(store,()=>time,adapters,policies,registry);assert.equal(failed.sources.find(s=>s.sourceId==='buydig')!.status,'error');assert.equal(failed.offers[0].observedAt,complete.offers[0].observedAt);assert.equal(failed.generation,complete.generation);db.close();
});
test('invalid origin and unconfirmed empty acquisition preserve real stored records and publish failure health',async()=>{
 const{db,store}=database();let time=baseTime;let outcome:AcquisitionResult={ok:true,acquiredAt:new Date(time).toISOString(),complete:true,offers:[fixture('A',time)],syndication:[],minimumNextCheckSeconds:900};const adapters=new Map([['buydig',{sourceId:'buydig',acquire:async()=>outcome}]]);
 await maintainCatalog(store,()=>time,adapters,policies,registry);
 for(const offers of [[],[{...fixture('A',time),url:'https://unreviewed.test/product'}]]){time+=3600000;outcome={...outcome,acquiredAt:new Date(time).toISOString(),offers};const next=await maintainCatalog(store,()=>time,adapters,policies,registry);assert.equal(next.offers.length,1);assert.equal(next.offers[0].url,fixture('A',baseTime).url);assert.equal(next.sources.find(s=>s.sourceId==='buydig')!.status,'error');}
 db.close();
});
test('concurrent pipeline calls use one source attempt; expired writers cannot publish',async()=>{
 const{db,store}=database();let time=baseTime,calls=0;let release:((value:AcquisitionResult)=>void)|undefined;const held=new Promise<AcquisitionResult>(resolve=>{release=resolve});
 const adapters=new Map([['buydig',{sourceId:'buydig',acquire:async()=>{calls++;return held}}]]);
 const first=maintainCatalog(store,()=>time,adapters,policies,registry);await new Promise<void>(resolve=>setImmediate(resolve));const second=await maintainCatalog(store,()=>time,adapters,policies,registry);assert.equal(second.sequence,0);assert.equal(calls,1);
 time+=60001;release!({ok:true,acquiredAt:new Date(time).toISOString(),complete:true,offers:[fixture('A',time)],syndication:[],minimumNextCheckSeconds:900});assert.equal((await first).sequence,0);assert.equal((await store.read()).offers.length,0);db.close();
});
test('disabled sources never acquire or claim a lease; original DealNews adapter never creates inventory or repairs source prices',async()=>{
 const{db,store}=database();let calls=0;const adapter={sourceId:'buydig',acquire:async()=>{calls++;return{ok:false as const,minimumNextCheckSeconds:900}}};await maintainCatalog(store,()=>baseTime,new Map([['buydig',adapter]]),policies,SOURCE_BY_ID);assert.equal(calls,0);assert.equal(db.prepare('SELECT COUNT(*) n FROM acquisition_control').get()!.n,0);db.close();
 const rss='<rss version="2.0"><channel><item><guid>QA-only-guid</guid><title>QA ONLY title $1</title><link>https://www.dealnews.com/QA-ONLY?ref=a%2Fb</link><description><![CDATA[<p>QA ONLY original conflicting $2</p>]]></description></item></channel></rss>';
 const feedPolicy={...policy,sourceId:'dealnews',retailerId:'dealnews',products:[{origin:'https://www.dealnews.com',pathPrefix:'/'}]};const result=await dealnewsAdapter((async()=>new Response(rss,{headers:{'Content-Type':'text/xml'}})) as typeof fetch).acquire(feedPolicy);assert.equal(result.ok,true);if(result.ok){assert.deepEqual(result.offers,[]);assert.equal(result.syndication[0].description,'<p>QA ONLY original conflicting $2</p>');assert.equal(result.syndication[0].url,'https://www.dealnews.com/QA-ONLY?ref=a%2Fb');assert.equal(result.syndication[0].title,'QA ONLY title $1');}
});
