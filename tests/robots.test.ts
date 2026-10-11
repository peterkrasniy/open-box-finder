import assert from 'node:assert/strict';import {test} from 'node:test';import {robotsAllows} from '../lib/server/robots.ts';
test('fixed source robots permission honors matching groups, longest path and allow ties',()=>{
 const rules='User-agent: *\nDisallow: /\nUser-agent: OpenBoxFinder\nDisallow: /private\nAllow: /products\nDisallow: /products/private\nAllow: /products/private';
 assert.equal(robotsAllows(rules,'/products'),true);assert.equal(robotsAllows(rules,'/private'),false);assert.equal(robotsAllows(rules,'/other','UnrelatedBot'),false);
 assert.equal(robotsAllows('User-agent: *\nDisallow: /*?\nAllow: /products$','/products'),true);
 assert.equal(robotsAllows('User-agent: *\nDisallow: /*?','/products?page=2'),false);
});
test('ambiguous, malformed, unsupported and excessive robots policies fail closed',()=>{
 for(const rules of ['<html>Challenge</html>','Disallow: /','User-agent: *\nDisallow: /%2fprivate','User-agent: *\nUnrecognized: allow-all','User-agent: *\nCrawl-delay: 10000','User-agent: *\nCrawl-delay: 1','User-agent: *\nDisallow: /'+('*a'.repeat(50)),'x'.repeat(131073)]) assert.equal(robotsAllows(rules,'/products'),false);
 assert.equal(robotsAllows('User-agent: *\nDisallow:','/products'),true);
 assert.equal(robotsAllows('User-agent: *\nAllow: /','/%2fprivate'),false);
});
