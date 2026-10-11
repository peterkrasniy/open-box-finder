import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parse} from 'parse5';
import {syndicationDocument} from '../lib/syndication-document.ts';

test('original feed HTML is intact and relative referral links resolve against the exact entry URL',()=>{
 const url='https://www.dealnews.com/QA-ONLY/item?ref=A%2Fb&x="quoted"',body='<p>QA ONLY original <a href="../offer?ref=untouched">text</a></p>';
 const document=syndicationDocument(url,body);assert.ok(document.endsWith(`<body>${body}</body></html>`));
 const root=parse(document),html=root.childNodes.find(node=>'tagName' in node&&node.tagName==='html')!;
 if(!('childNodes' in html))throw Error('Missing HTML');const head=html.childNodes.find(node=>'tagName' in node&&node.tagName==='head')!;
 if(!('childNodes' in head))throw Error('Missing head');const base=head.childNodes.filter(node=>'tagName' in node&&node.tagName==='base');assert.equal(base.length,1);
 const element=base[0];if(!('attrs' in element))throw Error('Missing attributes');const href=element.attrs.find(attr=>attr.name==='href')!.value;assert.equal(href,url);assert.equal(new URL('../offer?ref=untouched',href).href,'https://www.dealnews.com/offer?ref=untouched');
 assert.ok(document.includes("script-src 'none'"));assert.ok(document.includes("connect-src 'none'"));
});
