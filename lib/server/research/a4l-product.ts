import { structuredProducts } from './structured-products.ts';
import { a4lUnitTransport } from '../fetch-source.ts';
import { parsePrice } from '../../money.ts';
import { SourceParseError } from '../parse-evidence.ts';
import type { UnitObservation } from '../a4l-preflight.ts';

const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max && !/[\u0000-\u001f]/.test(value);
const matchesUrl = (value: unknown, url: string) => {
  try { return typeof value === 'string' && new URL(value, url).href === url; } catch { return false; }
};
/** Offline candidate only. Exact-unit URL proof selects a unit from model/variant graphs. */
export function observeA4lUnitResearch(html: string, canonicalUrl: string): UnitObservation {
  const url = a4lUnitTransport(canonicalUrl).url;
  const { products, offerFor } = structuredProducts(html);
  const selected = products.filter(product => matchesUrl(product.url, url) || (() => {
    try { return matchesUrl(offerFor(product).url, url); } catch { return false; }
  })());
  if (!selected.length) throw new SourceParseError('product-canonical-missing');
  const facts = selected.map(product => {
    const offer = offerFor(product);
    for (const value of [product.url, offer.url]) if (value !== undefined && !matchesUrl(value, url)) throw new SourceParseError('product-canonical-mismatch');
    if (!text(product.name, 240) || !text(product.sku, 200) || offer.priceCurrency !== 'USD' || !['number', 'string'].includes(typeof offer.price)) throw new SourceParseError('product-price-identity');
    const price = parsePrice(String(offer.price)); if (!price.ok || price.cents === null) throw new SourceParseError('product-price');
    const itemCondition = offer.itemCondition ?? product.itemCondition;
    if (offer.itemCondition && product.itemCondition && offer.itemCondition !== product.itemCondition) throw new SourceParseError('product-condition');
    const availability = /^https?:\/\/schema\.org\/InStock$/.test(String(offer.availability)) ? 'available' as const
      : /^https?:\/\/schema\.org\/(?:OutOfStock|SoldOut)$/.test(String(offer.availability)) ? 'unavailable' as const : 'unknown' as const;
    return { url, unitId: new URL(url).pathname.split('/').at(-1)!, sku: product.sku, name: product.name,
      currentCents: price.cents, availability, itemCondition: text(itemCondition, 100) ? itemCondition : null,
      model: text(product.model, 160) ? product.model : null };
  });
  if (facts.some(value => JSON.stringify(value) !== JSON.stringify(facts[0]))) throw new SourceParseError('product-conflict');
  return facts[0];
}
