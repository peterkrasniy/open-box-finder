import { parse } from 'parse5';
import type { DefaultTreeAdapterTypes } from 'parse5';
import { SourceParseError } from '../parse-evidence.ts';
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
export const schemaType = (value: unknown, type: string) => [value].flat().some(value => value === type || value === `https://schema.org/${type}` || value === `http://schema.org/${type}`);

/** Bounded local JSON-LD interpretation. No context/ID/reference or other URL is requested. */
export function structuredProducts(html: string) {
  if (new TextEncoder().encode(html).byteLength > 1048576) throw new SourceParseError('html-size');
  if ((html.match(/</g)?.length ?? 0) > 30000) throw new SourceParseError('html-tokens');
  if (/<title[^>]*>\s*(?:just a moment|attention required)/i.test(html) && /\/cdn-cgi\/challenge-platform\//i.test(html)) throw new SourceParseError('response-challenge');
  const products: Record<string, unknown>[] = [], refs = new Map<string, Record<string, unknown>[]>();
  let htmlNodes = 0, jsonNodes = 0;
  const walkJson = (value: unknown, depth: number): void => {
    if (++jsonNodes > 2000 || depth > 16) throw new SourceParseError('product-depth');
    if (Array.isArray(value)) { if (value.length > 100) throw new SourceParseError('product-count'); for (const child of value) walkJson(child, depth + 1); }
    else if (object(value)) {
      if (schemaType(value['@type'], 'Product')) products.push(value);
      if (products.length > 100) throw new SourceParseError('product-count');
      if (typeof value['@id'] === 'string' && value['@id'].length <= 2048 && Object.keys(value).length > 1) {
        const prior = refs.get(value['@id']) ?? []; prior.push(value); refs.set(value['@id'], prior);
      }
      for (const key of ['@graph', 'hasVariant', 'isVariantOf', 'offers', 'itemOffered']) if (value[key] !== undefined) walkJson(value[key], depth + 1);
    }
  };
  const walkHtml = (node: DefaultTreeAdapterTypes.Node, depth: number): void => {
    if (++htmlNodes > 30000 || depth > 64) throw new SourceParseError('html-structure');
    if ('tagName' in node && node.tagName === 'script' && node.attrs.some(attribute => attribute.name === 'type' && attribute.value.toLowerCase() === 'application/ld+json')) {
      const text = node.childNodes.map(child => 'value' in child ? child.value : '').join('');
      if (text.length > 65536) throw new SourceParseError('product-size');
      let value: unknown; try { value = JSON.parse(text); } catch { throw new SourceParseError('product-json'); }
      walkJson(value, 0);
    }
    if ('childNodes' in node) for (const child of node.childNodes) walkHtml(child, depth + 1);
  };
  walkHtml(parse(html), 0);
  const offerFor = (product: Record<string, unknown>): Record<string, unknown> => {
    const raw = Array.isArray(product.offers) && product.offers.length === 1 ? product.offers[0] : product.offers;
    if (!object(raw)) throw new SourceParseError('product-price-identity');
    let offer = raw;
    if (!offer['@type'] && typeof offer['@id'] === 'string') {
      const definitions = refs.get(offer['@id']);
      if (!definitions?.length || definitions.some(value => JSON.stringify(value) !== JSON.stringify(definitions[0]))) throw new SourceParseError('product-reference');
      offer = definitions[0];
    }
    if (!schemaType(offer['@type'], 'Offer')) throw new SourceParseError('product-price-identity');
    return offer;
  };
  return { products, offerFor };
}
