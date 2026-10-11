import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyCatalog } from '../lib/catalog.ts';
import { SOURCE_BY_ID } from '../lib/sources.ts';
import { validatePublication, safeSyndicatedHtml, withinScope } from '../lib/server/publication.ts';
import type { PublicationPolicy } from '../lib/server/publication.ts';
import type { Offer } from '../lib/offer.ts';
const stamp='2026-10-11T10:00:00Z', now=Date.parse(stamp);
const policy:PublicationPolicy={sourceId:'buydig',retailerId:'buydig',products:[{origin:'https://www.buydig.com',pathPrefix:'/shop/product/'}],references:[{origin:'https://www.buydig.com',pathPrefix:'/shop/product/'}],images:[],contentLinks:[{origin:'https://www.buydig.com',pathPrefix:'/shop/'}],referenceBases:['retailer-list'],maxFreshSeconds:300};
const offer:Offer={id:'QA-only:unit',sourceId:'buydig',retailerId:'buydig',sourceOfferId:'QA-only-unit',variantKey:'QA-only-unit',recordType:'inventory',title:'QA only contract',category:'audio',condition:'open-box',cosmeticGrade:null,availability:'available',priceCents:20050,currency:'USD',reference:null,url:'https://www.buydig.com/shop/product/QA-ONLY',imageUrl:null,imageAlt:null,pickup:null,shipping:null,localDelivery:null,observedAt:stamp,freshUntil:'2026-10-11T10:05:00Z'};
const catalog={...emptyCatalog(),sequence:1,generation:'QA-only',revision:'QA-only',publishedAt:stamp,offers:[offer],sources:[{sourceId:'buydig',status:'ready' as const,lastAttemptAt:stamp,lastSuccessAt:stamp,lastCompleteAt:stamp,lastCompleteSequence:1,nextCheckAt:null}]};
const policies=new Map([['buydig',policy]]);
const admitted=new Map(SOURCE_BY_ID);admitted.set('buydig',{...SOURCE_BY_ID.get('buydig')!,enabled:true,admission:'admitted'});
test('publication cannot admit a disabled source, unrelated URL/media, unsupported comparison or fictional success',()=>{
 assert.throws(()=>validatePublication(catalog,now));assert.throws(()=>validatePublication(catalog,now,policies));
 assert.equal(validatePublication(catalog,now,policies,admitted).offers.length,1);
 for(const change of [{url:'https://unrelated.test/item'},{url:'https://www.buydig.com/not-a-product'},{imageUrl:'https://unlicensed.test/image.jpg'},{retailerId:'other'},{freshUntil:'2026-10-12T10:00:00Z'}]) assert.throws(()=>validatePublication({...catalog,offers:[{...offer,...change}]},now,policies,admitted));
 assert.throws(()=>validatePublication({...catalog,sources:[{...catalog.sources[0],lastSuccessAt:null}]},now,policies,admitted));
});
test('complete feed HTML is inspected without rewriting; active content and unreviewed resources reject the whole item',()=>{
 const supplied='<p>QA ONLY <a href="https://www.buydig.com/shop/item?ref=a%2Fb">Original link</a></p>';
 assert.equal(safeSyndicatedHtml(supplied,offer.url,policy),true);
 for(const html of ['<script>alert(1)</script>','<img src="https://unlicensed.test/image.jpg">','<p onclick="x()">Text</p>','<iframe src="https://www.buydig.com/shop/item"></iframe>','<a href="javascript:alert(1)">Text</a>','<div style="background:url(https://unreviewed.test/x)">Text</div>','<svg><a href="https://www.buydig.com/shop/item">X</a></svg>']) assert.equal(safeSyndicatedHtml(html,offer.url,policy),false);
 for(const url of ['https://localhost./shop/x','https://admin.localhost./shop/x','https://www.buydig.com.evil.test/shop/x','https://www.buydig.com/shop/product/%2fadmin','https://www.buydig.com/shop/product/%2e%2e/admin','https://www.buydig.com/shop/product/%252e%252e/admin','https://www.buydig.com/shop/product/unit%00','https://www.buydig.com/shop/product/unit%0a','https://www.buydig.com/shop/product/unit%0d']) assert.equal(withinScope(url,policy.products),false);
});
test('editorial rendering receives exactly the reviewed original-image scopes, never an adapter-expanded media grant',()=>{
 const media=[{origin:'https://images.example.test',pathPrefix:'/approved/'}];
 const feedPolicy:PublicationPolicy={...policy,sourceId:'dealnews',retailerId:'dealnews',products:[{origin:'https://www.dealnews.com',pathPrefix:'/'}],images:media};
 const grants=new Map([['dealnews',feedPolicy]]),sources=new Map(SOURCE_BY_ID);sources.set('dealnews',{...sources.get('dealnews')!,enabled:true,admission:'admitted'});
 const deal={id:'QA-only-feed',sourceId:'dealnews',sourceGuid:'QA-only-feed',title:'QA ONLY original',url:'https://www.dealnews.com/item/QA-ONLY',description:'<img src="https://images.example.test/approved/QA-ONLY.png" alt="QA ONLY">',content:null,publishedAt:null,observedAt:stamp,freshUntil:'2026-10-11T10:05:00Z',imageScopes:media};
 const feed={...catalog,offers:[],syndication:[deal],sources:[{...catalog.sources[0],sourceId:'dealnews'}]};
 assert.equal(validatePublication(feed,now,grants,sources).syndication.length,1);
 for(const imageScopes of [[],[{origin:'https://images.example.test',pathPrefix:'/'}],[{origin:'https://unreviewed.test',pathPrefix:'/'}]])assert.throws(()=>validatePublication({...feed,syndication:[{...deal,imageScopes}]},now,grants,sources),/Unreviewed syndication image policy/);
 const projection=validatePublication({...feed,syndication:[{...deal,imageScopes:media.map(scope=>({...scope,privateToken:'QA-only-private'}))}]},now,grants,sources);
 assert.equal(JSON.stringify(projection).includes('privateToken'),false);
});
