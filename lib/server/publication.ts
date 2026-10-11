import type { Catalog, ReferenceBasis } from '../offer.ts';
import { decodeCatalog } from '../validation.ts';
import { SOURCE_BY_ID } from '../sources.ts';
import type { SourceDefinition } from '../sources.ts';
import { parseFragment } from 'parse5';

export interface UrlScope { origin: string; pathPrefix: string }
/** An explicit reviewed grant: never inferred from a successful HTTP response. */
export interface PublicationPolicy {
  sourceId: string; retailerId: string; products: readonly UrlScope[]; references: readonly UrlScope[];
  images: readonly UrlScope[]; contentLinks: readonly UrlScope[]; referenceBases: readonly ReferenceBasis[];
  maxFreshSeconds: number;
  /** Only a new accepted source review may permit a retry after a recorded access denial. */
  resumeBlockedBefore?: string;
}
/** No source has passed the hosted transport, facts/media and presentation gate yet. */
export const APPROVED_POLICIES: ReadonlyMap<string, PublicationPolicy> = new Map();

export function withinScope(value: string, scopes: readonly UrlScope[], base?: string): boolean {
  try {
    const url = new URL(value, base);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || /%2f|%5c|%2e|%25|%00|%0a|%0d|\\/i.test(url.pathname)) return false;
    return scopes.some(scope => url.origin === scope.origin && url.pathname.startsWith(scope.pathPrefix));
  } catch { return false; }
}

/** Inspect the complete supplied HTML; reject a whole unsafe item, never rewrite licensed content. */
export function safeSyndicatedHtml(html: string, base: string, policy: PublicationPolicy): boolean {
  if (html.length > 32768 || (html.match(/</g)?.length ?? 0) > 10000) return false;
  const root = parseFragment(html);
  const allowed = new Set(['a','abbr','b','blockquote','br','caption','center','code','dd','del','div','dl','dt','em','figcaption','figure','font','h1','h2','h3','h4','h5','h6','hr','i','img','li','ol','p','pre','s','small','span','strong','sub','sup','table','tbody','td','th','thead','tr','u','ul']);
  let count = 0;
  const visit = (node: typeof root | (typeof root.childNodes)[number], depth: number): boolean => {
    if (++count > 10000 || depth > 32) return false;
    if ('tagName' in node) {
      if (!allowed.has(node.tagName) || node.namespaceURI !== 'http://www.w3.org/1999/xhtml') return false;
      for (const attribute of node.attrs) {
        if (attribute.namespace || /^on/i.test(attribute.name) || ['srcset','ping','formaction','srcdoc','background'].includes(attribute.name)) return false;
        if (attribute.name === 'style' && /url\s*\(|expression\s*\(|@import|behavior\s*:|\\/i.test(attribute.value)) return false;
        if (attribute.name === 'href' && (node.tagName !== 'a' || !withinScope(attribute.value, policy.contentLinks, base))) return false;
        if (attribute.name === 'src' && (node.tagName !== 'img' || !withinScope(attribute.value, policy.images, base))) return false;
      }
    }
    return !('childNodes' in node) || node.childNodes.every(child => visit(child, depth + 1));
  };
  return visit(root, 0);
}

export function validatePublication(value: unknown, now: number,
  policies: ReadonlyMap<string, PublicationPolicy> = APPROVED_POLICIES,
  registry: ReadonlyMap<string, SourceDefinition> = SOURCE_BY_ID): Catalog {
  const catalog = decodeCatalog(value);
  if (!Number.isSafeInteger(now) || !catalog.publishedAt || Date.parse(catalog.publishedAt) > now + 30000 || catalog.sequence < 1) throw new TypeError('Invalid publication evidence');
  const admitted = (sourceId: string, presentation: SourceDefinition['presentation']) => {
    const source = registry.get(sourceId), policy = policies.get(sourceId);
    if (!source?.enabled || source.admission !== 'admitted' || source.presentation !== presentation || !policy || policy.sourceId !== sourceId) throw new TypeError('Source is not admitted for publication');
    return policy;
  };
  const freshness = (record: { observedAt: string; freshUntil: string }, policy: PublicationPolicy) => {
    const observed = Date.parse(record.observedAt), until = Date.parse(record.freshUntil);
    if (!Number.isSafeInteger(policy.maxFreshSeconds) || policy.maxFreshSeconds < 1 || policy.maxFreshSeconds > 86400 || observed > now + 30000 || until - observed > policy.maxFreshSeconds * 1000) throw new TypeError('Unreviewed freshness');
    const health = catalog.sources.find(source => source.sourceId === policy.sourceId);
    if (!health?.lastSuccessAt || Date.parse(health.lastSuccessAt) < observed) throw new TypeError('Missing acquisition evidence');
  };
  for (const source of catalog.sources) if (source.status !== 'unconnected' || source.lastSuccessAt) admitted(source.sourceId, registry.get(source.sourceId)!.presentation);
  for (const offer of catalog.offers) {
    const policy = admitted(offer.sourceId, 'normalized-inventory'); freshness(offer, policy);
    if (offer.retailerId !== policy.retailerId || !withinScope(offer.url, policy.products)
      || (offer.imageUrl && !withinScope(offer.imageUrl, policy.images))
      || (offer.reference && (!policy.referenceBases.includes(offer.reference.basis) || offer.reference.variantKey !== offer.variantKey || !withinScope(offer.reference.sourceUrl, policy.references)))) throw new TypeError('Unreviewed inventory origin or comparison');
  }
  for (const deal of catalog.syndication) {
    const policy = admitted(deal.sourceId, 'unmodified-syndication'); freshness(deal, policy);
    if (!withinScope(deal.url, policy.products) || !safeSyndicatedHtml(deal.description, deal.url, policy) || (deal.content !== null && !safeSyndicatedHtml(deal.content, deal.url, policy))) throw new TypeError('Unreviewed syndication content');
  }
  return catalog;
}
