import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRss } from '../lib/server/rss.ts';
const envelope=(items:string)=>`<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>QA ONLY</title>${items}</channel></rss>`;
const item=(title='QA ONLY · Open Box',link='https://example.test/item?ref=a%2Fb&amp;utm=x',description='<p>QA ONLY · $200.50 <a href="https://example.test/?ref=original">original link</a></p>')=>`<item><guid>qa-only-guid</guid><title>${title}</title><link>${link}</link><description><![CDATA[${description}]]></description><content:encoded><![CDATA[<p>QA ONLY · additional complete content</p>]]></content:encoded><pubDate>Sun, 11 Oct 2026 09:30:00 GMT</pubDate></item>`;

test('RSS preserves complete supplied text/HTML and referral link spelling without price repair',()=>{
 const html='<p>QA ONLY · title says $200.50; body says $249.99. <a href="https://example.test/?ref=A%2Fb">keep this</a></p>';
 const result=parseRss(envelope(item('QA ONLY · Open Box for $200.50',undefined,html)));
 assert.equal(result.complete,true);assert.equal(result.entries[0].description,html);assert.equal(result.entries[0].link,'https://example.test/item?ref=a%2Fb&utm=x');assert.equal(result.entries[0].publishedAt,'2026-10-11T09:30:00.000Z');assert.equal(result.entries[0].content,'<p>QA ONLY · additional complete content</p>');
});

test('XML rejects malformed, DTD/entity expansion, deep and oversized documents',()=>{
 for(const xml of ['<rss>','<!DOCTYPE rss [<!ENTITY external SYSTEM "http://169.254.169.254/">]>'+envelope(item()),envelope(item().replace('QA ONLY · Open Box','&unregistered;')),envelope('<x>'.repeat(33)+'</x>'.repeat(33)),envelope(item(undefined,undefined,'x'.repeat(32769))),envelope(item().repeat(101))])assert.throws(()=>parseRss(xml));
});

test('invalid or duplicate entries make a snapshot partial rather than authorizing deletion',()=>{
 const result=parseRss(envelope(item()+item()+item('QA ONLY','javascript:alert(1)')));assert.equal(result.complete,false);assert.equal(result.entries.length,1);assert.equal(result.rejected,2);
 const nested=parseRss(envelope('<item><guid>nested</guid><title>QA ONLY</title><link>https://example.test/item</link><description><p>nested unsupported XML</p></description></item>'));assert.equal(nested.complete,false);assert.equal(nested.entries.length,0);
});
