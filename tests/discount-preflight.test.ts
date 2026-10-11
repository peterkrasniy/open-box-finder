import assert from 'node:assert/strict';
import { test } from 'node:test';
import { preflightSource } from '../lib/server/preflight.ts';
import { DISCOUNT_TARGET } from '../lib/server/research/discount-product.ts';
const now = () => Date.parse('2026-10-11T15:00:00Z');
const html = `<p>QA ONLY generic no longer available banner</p><script type="application/ld+json">${JSON.stringify({ '@type': 'Product', sku: DISCOUNT_TARGET.sku, url: DISCOUNT_TARGET.url, offers: { '@type': 'Offer', price: '123.45', priceCurrency: 'USD', availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/RefurbishedCondition' } })}</script>`;
const robots = 'https://discountelectronics.com/robots.txt';
const response = (body: string, type: string, seconds = 900) => new Response(body, { headers: { 'Content-Type': type, 'Cache-Control': `max-age=${seconds}` } });

test('fixed Discount research preflight respects robots before the single allowlisted PDP and stores only projected facts', async () => {
  const requests: string[] = [];
  const fetcher = (async (input: unknown, init?: RequestInit) => {
    requests.push(String(input)); assert.equal(init?.credentials, 'omit'); assert.equal(init?.redirect, 'manual');
    return input === robots ? response('User-agent: *\nDisallow:', 'text/plain', 14400) : response(html, 'text/html');
  }) as typeof fetch;
  const result = await preflightSource('discount-electronics', fetcher, now);
  assert.deepEqual(requests, [robots, DISCOUNT_TARGET.url]); assert.equal(result.outcome, 'observed');
  assert.equal(result.product?.currentCents, 12345); assert.equal(result.product?.availability, 'orderable');
  assert.equal(result.notBefore, '2026-10-11T19:00:00.000Z'); assert.equal(result.catalogComplete, false); assert.deepEqual(result.units, []);
  assert.deepEqual(result.diagnostics.map(step => [step.stage, step.httpStatus, step.contentType]), [['robots', 200, 'text/plain'], ['product', 200, 'text/html']]);
  assert.equal(JSON.stringify(result).includes('<script'), false);
});

test('Discount denial, transport restriction, and challenge stop without following links or treating stock as empty', async () => {
  let reads = 0;
  const denied = await preflightSource('discount-electronics', (async () => { reads++; return response('User-agent: *\nDisallow: /', 'text/plain'); }) as typeof fetch, now);
  assert.equal(reads, 1); assert.equal(denied.outcome, 'blocked'); assert.equal(denied.diagnostics[0].robotsAllowed, false); assert.equal(denied.product, null);
  for (const page of [new Response('QA ONLY denial', { status: 403, headers: { 'Retry-After': '172800' } }), response('<title>Attention required</title><script src="/cdn-cgi/challenge-platform/QA"></script>', 'text/html')]) {
    const requests: string[] = [];
    const result = await preflightSource('discount-electronics', (async input => { requests.push(String(input)); return input === robots ? response('User-agent: *\nDisallow:', 'text/plain') : page; }) as typeof fetch, now);
    assert.deepEqual(requests, [robots, DISCOUNT_TARGET.url]); assert.equal(result.outcome, 'blocked'); assert.equal(result.product, null);
    if (page.status === 403) assert.equal(result.notBefore, '2026-10-13T15:00:00.000Z');
    else assert.equal(result.diagnostics[1].parserReason, 'response-challenge');
  }
});

test('Discount two-stage preflight shares one eight-second budget', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); t.after(() => t.mock.timers.reset()); let reads = 0;
  const fetcher = (async (input: unknown, init?: RequestInit) => {
    reads++; return new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => resolve(input === robots ? response('User-agent: *\nDisallow:', 'text/plain') : response(html, 'text/html')), 5000);
      init?.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
    });
  }) as typeof fetch;
  const pending = preflightSource('discount-electronics', fetcher, now);
  t.mock.timers.tick(5000); await new Promise<void>(resolve => setImmediate(resolve)); assert.equal(reads, 2);
  t.mock.timers.tick(3000); const result = await pending;
  assert.equal(result.outcome, 'failure'); assert.equal(result.product, null); assert.equal(result.diagnostics[1].transportReason, 'timeout');
});
