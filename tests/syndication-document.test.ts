import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parse} from 'parse5';
import {syndicationDocument,validImageScopes} from '../lib/syndication-document.ts';

test('original feed HTML is intact and relative referral links resolve against the exact entry URL',()=>{
 const url='https://www.dealnews.com/QA-ONLY/item?ref=A%2Fb&x="quoted"',body='<p>QA ONLY original <a href="../offer?ref=untouched">text</a></p>';
 const document=syndicationDocument(url,body);assert.ok(document.endsWith(`<body>${body}</body></html>`));
 const root=parse(document),html=root.childNodes.find(node=>'tagName' in node&&node.tagName==='html')!;
 if(!('childNodes' in html))throw Error('Missing HTML');const head=html.childNodes.find(node=>'tagName' in node&&node.tagName==='head')!;
 if(!('childNodes' in head))throw Error('Missing head');const base=head.childNodes.filter(node=>'tagName' in node&&node.tagName==='base');assert.equal(base.length,1);
 const element=base[0];if(!('attrs' in element))throw Error('Missing attributes');const href=element.attrs.find(attr=>attr.name==='href')!.value;assert.equal(href,url);assert.equal(new URL('../offer?ref=untouched',href).href,'https://www.dealnews.com/offer?ref=untouched');
 const meta=head.childNodes.find(node=>'tagName' in node&&node.tagName==='meta'&&node.attrs.some(attr=>attr.name==='http-equiv'))!;
 if(!('attrs' in meta))throw Error('Missing CSP');const policy=meta.attrs.find(attr=>attr.name==='content')!.value;
 assert.ok(policy.includes("script-src 'none'"));assert.ok(policy.includes("connect-src 'none'"));assert.ok(policy.includes("img-src 'none'"));
});
test('original images use only the reviewed CSP directories and unsafe or ambiguous policy sources fail closed',()=>{
 const scopes=[{origin:'https://images.example.test',pathPrefix:'/approved/'}],body='<p>QA ONLY original image <img src="https://images.example.test/approved/QA-ONLY.png" alt="QA ONLY"></p>';
 assert.equal(validImageScopes(scopes),true);const document=syndicationDocument('https://www.dealnews.com/item/QA-ONLY',body,scopes);
 assert.ok(document.includes('img-src https://images.example.test/approved/;'));assert.ok(document.endsWith(`<body>${body}</body></html>`));
 for(const change of [{origin:'http://images.example.test',pathPrefix:'/'},{origin:'https://localhost',pathPrefix:'/'},{origin:'https://images.example.test/path',pathPrefix:'/'},{origin:'https://images.example.test',pathPrefix:'/approved'},{origin:'https://images.example.test',pathPrefix:'/../'},{origin:'https://images.example.test',pathPrefix:'/approved/; script-src */'},{origin:'https://images.example.test',pathPrefix:'/approved/%2e/'}])assert.equal(validImageScopes([change]),false);
 assert.equal(validImageScopes([...scopes,...scopes]),false);assert.throws(()=>syndicationDocument('https://www.dealnews.com/item/QA-ONLY',body,[{origin:'https://images.example.test',pathPrefix:'/approved; script-src */'}]),/Invalid syndication image scopes/);
});
