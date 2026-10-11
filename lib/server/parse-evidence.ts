export type ParseReason = 'html-size' | 'html-tokens' | 'html-structure' | 'catalog-unit-limit' | 'catalog-no-canonical-units'
  | 'product-json' | 'product-size' | 'product-depth' | 'product-count' | 'product-not-unique'
  | 'product-price-identity' | 'product-price' | 'product-canonical-missing' | 'product-canonical-mismatch'
  | 'rss-size' | 'rss-doctype' | 'rss-structure' | 'rss-envelope' | 'rss-item-limit' | 'rss-duplicate-field'
  | 'rss-field-limit' | 'rss-incomplete' | 'rss-xml-syntax' | 'parser-unclassified';

/** Only compile-time reason codes escape parsing; native/raw error messages never do. */
export class SourceParseError extends TypeError {
  readonly reason: ParseReason;
  constructor(reason: ParseReason) { super(reason); this.reason = reason; }
}
export function parseReason(error: unknown, fallback: ParseReason): ParseReason {
  return error instanceof SourceParseError ? error.reason : fallback;
}
