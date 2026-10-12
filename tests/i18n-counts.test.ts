import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listingCount } from '../lib/i18n.ts';

test('Russian product and listing counts handle singular, few, many and teen exceptions', () => {
  const examples: [number, string, string][] = [
    [1, 'товар', 'предложение'], [2, 'товара', 'предложения'], [5, 'товаров', 'предложений'],
    [11, 'товаров', 'предложений'], [16, 'товаров', 'предложений'],
    [21, 'товар', 'предложение'], [22, 'товара', 'предложения'],
    [0, 'товаров', 'предложений'], [111, 'товаров', 'предложений'], [112, 'товаров', 'предложений'],
  ];
  for (const [count, products, listings] of examples) {
    assert.equal(listingCount('ru', count, true), `${count} ${products} с ручной проверкой`);
    assert.equal(listingCount('ru', count), `${count} ${listings}`);
  }
  assert.equal(listingCount('en', 1, true), '1 manually reviewed product');
  assert.equal(listingCount('en', 16, true), '16 manually reviewed products');
  assert.equal(listingCount('en', 1), '1 listing');
  assert.equal(listingCount('en', 2), '2 listings');
});
