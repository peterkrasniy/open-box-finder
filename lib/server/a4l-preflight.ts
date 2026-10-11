import { parse } from 'parse5';
import type { DefaultTreeAdapterTypes } from 'parse5';
import { parsePrice } from '../money.ts';
import { a4lUnitTransport } from './fetch-source.ts';

type HtmlNode = DefaultTreeAdapterTypes.Node;
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max && !/[\u0000-\u001f]/.test(value);
export interface UnitObservation {
  url: string; unitId: string; sku: string; name: string; currentCents: number; availability: 'available' | 'unavailable' | 'unknown';
  itemCondition: string | null; model: string | null;
}
function visitHtml(html: string, visit: (node: HtmlNode) => void) {
  if (new TextEncoder().encode(html).byteLength > 1048576) throw new TypeError('HTML exceeds preflight limit');
  if ((html.match(/</g)?.length ?? 0) > 30000) throw new TypeError('HTML token count exceeds preflight limit');
  const root = parse(html); let nodes = 0;
  const walk = (node: HtmlNode, depth: number) => {
    if (++nodes > 30000 || depth > 64) throw new TypeError('HTML structure exceeds preflight limit');
    visit(node); if ('childNodes' in node) for (const child of node.childNodes) walk(child, depth + 1);
  }; walk(root, 0);
}
/** Discovery is partial: a first page or repeated pagination can never authorize removals. */
export function discoverA4lUnits(html: string): string[] {
  const urls = new Set<string>();
  visitHtml(html, node => {
    if (!('tagName' in node) || node.tagName !== 'a') return;
    const href = node.attrs.find(attribute => attribute.name === 'href')?.value;
    if (!href || href.length > 512) return;
    try { const url = new URL(href, 'https://www.appliances4less-sac.com/products'); const fixed = a4lUnitTransport(url.href); urls.add(fixed.url); } catch { /* Unreviewed links are not fetch destinations. */ }
    if (urls.size > 100) throw new TypeError('Catalog unit count exceeds preflight limit');
  });
  return [...urls].sort();
}

/** Exact item-level structured evidence only; no generic cart button or category price inference. */
export function observeA4lUnit(html: string, canonicalUrl: string): UnitObservation {
  const url = a4lUnitTransport(canonicalUrl).url, products: Record<string, unknown>[] = [];
  visitHtml(html, node => {
    if (!('tagName' in node) || node.tagName !== 'script' || !node.attrs.some(attribute => attribute.name === 'type' && attribute.value.toLowerCase() === 'application/ld+json')) return;
    const value = node.childNodes.filter(child => 'value' in child).map(child => 'value' in child ? child.value : '').join('');
    if (value.length > 65536) throw new TypeError('Structured product data exceeds limit');
    const parsed: unknown = JSON.parse(value);
    const walk = (value: unknown, depth: number) => {
      if (depth > 16) throw new TypeError('Structured product depth exceeds limit');
      if (Array.isArray(value)) { if (value.length > 100) throw new TypeError('Structured product count exceeds limit'); value.forEach(item => walk(item, depth + 1)); }
      else if (object(value)) {
        const type = value['@type']; if (type === 'Product' || Array.isArray(type) && type.includes('Product')) products.push(value);
        if (value['@graph']) walk(value['@graph'], depth + 1);
      }
    }; walk(parsed, 0);
  });
  if (products.length !== 1) throw new TypeError('No unique item-level product evidence');
  const product = products[0], offer = Array.isArray(product.offers) && product.offers.length === 1 ? product.offers[0] : product.offers;
  if (!text(product.name, 240) || !text(product.sku, 200) || !object(offer) || offer['@type'] !== 'Offer' || offer.priceCurrency !== 'USD'
    || !['string','number'].includes(typeof offer.price)) throw new TypeError('Unsupported unit price or identity evidence');
  const price = parsePrice(String(offer.price));
  if (!price.ok || price.cents === null) throw new TypeError('Unsupported unit price');
  if (product.url === undefined && offer.url === undefined) throw new TypeError('Missing canonical item-level evidence');
  for (const value of [product.url, offer.url]) if (value !== undefined && new URL(String(value), url).href !== url) throw new TypeError('Product evidence belongs to another unit');
  const availability = offer.availability === 'https://schema.org/InStock' || offer.availability === 'http://schema.org/InStock' ? 'available'
    : ['https://schema.org/OutOfStock','http://schema.org/OutOfStock','https://schema.org/SoldOut','http://schema.org/SoldOut'].includes(String(offer.availability)) ? 'unavailable' : 'unknown';
  return { url, unitId: new URL(url).pathname.split('/').at(-1)!, sku: product.sku, name: product.name, currentCents: price.cents, availability,
    itemCondition: text(offer.itemCondition, 100) ? offer.itemCondition : null, model: text(product.model, 160) ? product.model : null };
}
