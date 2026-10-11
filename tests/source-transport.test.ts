import assert from 'node:assert/strict';
import { test } from 'node:test';
import { acquireSource, DEALNEWS_TRANSPORT, retryAfterSeconds } from '../lib/server/fetch-source.ts';

const now=()=>Date.parse('2026-10-11T09:30:00Z');
const fakeFetch=(response:()=>Response)=>(async(input:unknown,init?:RequestInit)=>{assert.equal(input,DEALNEWS_TRANSPORT.url);assert.equal(init?.redirect,'manual');assert.equal(init?.credentials,'omit');return response();}) as typeof fetch;

test('source acquisition accepts only registered fixed transport and never follows redirects',async()=>{
  await assert.rejects(acquireSource({...DEALNEWS_TRANSPORT,url:'http://127.0.0.1/'},fakeFetch(()=>new Response()),now),/Unregistered/);
  const redirect=await acquireSource(DEALNEWS_TRANSPORT,fakeFetch(()=>new Response(null,{status:302,headers:{Location:'http://169.254.169.254/'}})),now);
  assert.deepEqual(redirect,{ok:false,reason:'redirect',stopAutomatic:true,minimumNextCheckSeconds:900});
});
test('a consumed acquisition budget cannot issue another upstream request',async()=>{
 const budget=new AbortController();budget.abort();let calls=0;
 const result=await acquireSource(DEALNEWS_TRANSPORT,(async()=>{calls++;return new Response()}) as typeof fetch,now,budget.signal);
 assert.equal(calls,0);assert.equal(result.ok,false);if(!result.ok)assert.equal(result.reason,'timeout');
});

test('bounded transport rejects unsupported HTML, oversized payloads and invalid UTF-8',async()=>{
  for(const [response,reason] of [[()=>new Response('<html>blocked</html>',{headers:{'Content-Type':'text/html'}}),'content-type'],[()=>new Response('x',{headers:{'Content-Type':'text/xml','Content-Length':'1048577'}}),'size'],[()=>new Response(new Uint8Array([0xff]),{headers:{'Content-Type':'text/xml'}}),'encoding']] as const) {
    const result=await acquireSource(DEALNEWS_TRANSPORT,fakeFetch(response),now);assert.equal(result.ok,false);if(!result.ok)assert.equal(result.reason,reason);
  }
  const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(1048577));controller.close();}});
  const result=await acquireSource(DEALNEWS_TRANSPORT,fakeFetch(()=>new Response(stream,{headers:{'Content-Type':'application/rss+xml'}})),now);
  assert.equal(result.ok,false);if(!result.ok)assert.equal(result.reason,'size');
});

test('source backoff honors long Retry-After/cache max-age without shortening a permitted pause',async()=>{
  assert.equal(retryAfterSeconds('3600',now()),3600);assert.equal(retryAfterSeconds('99999999',now()),99999999);assert.equal(retryAfterSeconds('9'.repeat(100),now()),Infinity);
  assert.equal(retryAfterSeconds('Sun, 11 Oct 2026 10:30:00 GMT',now()),3600);assert.equal(retryAfterSeconds('-5',now()),900);
  const result=await acquireSource(DEALNEWS_TRANSPORT,fakeFetch(()=>new Response('<rss/>',{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'public, max-age=3600','ETag':'"test-only"'}})),now);
  assert.equal(result.ok,true);if(result.ok){assert.equal(result.text,'<rss/>');assert.equal(result.minimumNextCheckSeconds,3600);assert.equal(result.acquiredAt,'2026-10-11T09:30:00.000Z');}
});
test('denied/retired/redirected/challenged endpoints stop automatic acquisition; rate limits preserve their full wait',async()=>{
 for(const status of [401,403,404,410,451]){const result=await acquireSource(DEALNEWS_TRANSPORT,fakeFetch(()=>new Response('Denied',{status})),now);assert.equal(result.ok,false);if(!result.ok)assert.equal(result.stopAutomatic,true);}
 const limited=await acquireSource(DEALNEWS_TRANSPORT,fakeFetch(()=>new Response('Wait',{status:429,headers:{'Retry-After':'172800'}})),now);assert.equal(limited.ok,false);if(!limited.ok){assert.equal(limited.minimumNextCheckSeconds,172800);assert.equal(limited.stopAutomatic,undefined);}
 const challenged=await acquireSource(DEALNEWS_TRANSPORT,fakeFetch(()=>new Response('<html>Challenge</html>',{headers:{'Content-Type':'text/html'}})),now);assert.equal(challenged.ok,false);if(!challenged.ok)assert.equal(challenged.stopAutomatic,true);
});
