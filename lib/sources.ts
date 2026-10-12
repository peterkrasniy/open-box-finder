export type Admission = 'transport-unverified' | 'permission-required' | 'credentials-required' | 'manual-only' | 'admitted';
export interface SourceDefinition {
  id: string;
  name: string;
  website: string;
  additionalOrigins?: readonly string[];
  catalogUrl: string | null;
  admission: Admission;
  enabled: boolean;
  presentation: 'normalized-inventory' | 'unmodified-syndication' | 'manual-curation';
}

/** Source-admission registry. No runtime fetch is enabled by a research observation. */
export const SOURCES: readonly SourceDefinition[] = [
  { id: 'nintendo-manual', name: 'Nintendo Store', website: 'https://www.nintendo.com/', catalogUrl: null, admission: 'manual-only', enabled: false, presentation: 'manual-curation' },
  { id: 'kitchenaid-manual', name: 'KitchenAid', website: 'https://www.kitchenaid.com/', catalogUrl: null, admission: 'manual-only', enabled: false, presentation: 'manual-curation' },
  { id: 'canon-manual', name: 'Canon USA', website: 'https://www.usa.canon.com/', catalogUrl: null, admission: 'manual-only', enabled: false, presentation: 'manual-curation' },
  { id: 'logitech-manual', name: 'Logitech', website: 'https://www.logitech.com/', additionalOrigins: ['https://www.logitechg.com'], catalogUrl: null, admission: 'manual-only', enabled: false, presentation: 'manual-curation' },
  { id: 'roborock-manual', name: 'Roborock US', website: 'https://us.roborock.com/', catalogUrl: null, admission: 'manual-only', enabled: false, presentation: 'manual-curation' },
  { id: 'cuckoo-manual', name: 'CUCKOO America', website: 'https://cuckooamerica.com/', catalogUrl: null, admission: 'manual-only', enabled: false, presentation: 'manual-curation' },
  { id: 'epson-manual', name: 'Epson', website: 'https://epson.com/', catalogUrl: null, admission: 'manual-only', enabled: false, presentation: 'manual-curation' },
  { id: 'vitamix-manual', name: 'Vitamix', website: 'https://www.vitamix.com/', catalogUrl: null, admission: 'manual-only', enabled: false, presentation: 'manual-curation' },
  { id: 'target-manual', name: 'Target', website: 'https://www.target.com/', catalogUrl: null, admission: 'manual-only', enabled: false, presentation: 'manual-curation' },
  { id: 'newegg-manual', name: 'Newegg', website: 'https://www.newegg.com/', catalogUrl: null, admission: 'manual-only', enabled: false, presentation: 'manual-curation' },
  { id: 'dyson-manual', name: 'Dyson', website: 'https://www.dyson.com/', catalogUrl: null, admission: 'manual-only', enabled: false, presentation: 'manual-curation' },
  { id: 'direct-tools-manual', name: 'Direct Tools Factory Outlet', website: 'https://www.directtoolsoutlet.com/', catalogUrl: null, admission: 'manual-only', enabled: false, presentation: 'manual-curation' },
  { id: 'sennheiser-manual', name: 'Sennheiser', website: 'https://us.sennheiser-hearing.com/', catalogUrl: null, admission: 'manual-only', enabled: false, presentation: 'manual-curation' },
  { id: 'a4l-sac', name: 'Appliances 4 Less Sacramento', website: 'https://www.appliances4less-sac.com/', catalogUrl: 'https://www.appliances4less-sac.com/products', admission: 'transport-unverified', enabled: false, presentation: 'normalized-inventory' },
  { id: 'blues-appliance', name: "Blue's Appliance", website: 'https://shopbluesappliance.com/', catalogUrl: null, admission: 'transport-unverified', enabled: false, presentation: 'normalized-inventory' },
  { id: 'buydig', name: 'BuyDig', website: 'https://www.buydig.com/', catalogUrl: 'https://www.buydig.com/shop/list/search?pc=Open+Box&srt=popularity', admission: 'transport-unverified', enabled: false, presentation: 'normalized-inventory' },
  { id: 'dealnews', name: 'DealNews', website: 'https://www.dealnews.com/', catalogUrl: 'https://www.dealnews.com/?rss=1&sort=time', admission: 'transport-unverified', enabled: false, presentation: 'unmodified-syndication' },
  { id: 'discount-electronics', name: 'Discount Electronics', website: 'https://discountelectronics.com/', catalogUrl: null, admission: 'transport-unverified', enabled: false, presentation: 'normalized-inventory' },
  { id: 'outdoor-speaker-depot', name: 'Outdoor Speaker Depot', website: 'https://www.outdoorspeakerdepot.com/', catalogUrl: 'https://www.outdoorspeakerdepot.com/outlet.html', admission: 'transport-unverified', enabled: false, presentation: 'normalized-inventory' },
  { id: 'best-buy', name: 'Best Buy', website: 'https://www.bestbuy.com/', catalogUrl: null, admission: 'credentials-required', enabled: false, presentation: 'normalized-inventory' },
  { id: 'shopify-catalog', name: 'Shopify Catalog', website: 'https://shopify.dev/docs/agents/catalog/global-catalog', catalogUrl: 'https://shopify.dev/docs/agents/catalog/global-catalog', admission: 'credentials-required', enabled: false, presentation: 'normalized-inventory' },
];

export const SOURCE_BY_ID = new Map(SOURCES.map(source => [source.id, source]));
