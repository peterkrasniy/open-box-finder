export type Admission = 'transport-unverified' | 'permission-required' | 'credentials-required';
export interface SourceDefinition {
  id: string;
  name: string;
  website: string;
  catalogUrl: string | null;
  admission: Admission;
  enabled: false;
  presentation: 'normalized-inventory' | 'unmodified-syndication';
}

/** Source-admission registry. No runtime fetch is enabled by a research observation. */
export const SOURCES: readonly SourceDefinition[] = [
  { id: 'a4l-sac', name: 'Appliances 4 Less Sacramento', website: 'https://www.appliances4less-sac.com/', catalogUrl: 'https://www.appliances4less-sac.com/products', admission: 'transport-unverified', enabled: false, presentation: 'normalized-inventory' },
  { id: 'blues-appliance', name: "Blue's Appliance", website: 'https://shopbluesappliance.com/', catalogUrl: null, admission: 'transport-unverified', enabled: false, presentation: 'normalized-inventory' },
  { id: 'buydig', name: 'BuyDig', website: 'https://www.buydig.com/', catalogUrl: 'https://www.buydig.com/shop/list/search?pc=Open+Box&srt=popularity', admission: 'transport-unverified', enabled: false, presentation: 'normalized-inventory' },
  { id: 'dealnews', name: 'DealNews', website: 'https://www.dealnews.com/', catalogUrl: 'https://www.dealnews.com/?rss=1&sort=time', admission: 'transport-unverified', enabled: false, presentation: 'unmodified-syndication' },
  { id: 'outdoor-speaker-depot', name: 'Outdoor Speaker Depot', website: 'https://www.outdoorspeakerdepot.com/', catalogUrl: 'https://www.outdoorspeakerdepot.com/outlet.html', admission: 'transport-unverified', enabled: false, presentation: 'normalized-inventory' },
  { id: 'best-buy', name: 'Best Buy', website: 'https://www.bestbuy.com/', catalogUrl: null, admission: 'credentials-required', enabled: false, presentation: 'normalized-inventory' },
  { id: 'shopify-catalog', name: 'Shopify Catalog', website: 'https://shopify.dev/docs/agents/catalog/global-catalog', catalogUrl: 'https://shopify.dev/docs/agents/catalog/global-catalog', admission: 'credentials-required', enabled: false, presentation: 'normalized-inventory' },
];

export const SOURCE_BY_ID = new Map(SOURCES.map(source => [source.id, source]));
