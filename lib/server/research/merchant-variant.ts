const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const identifier = (value: unknown): string => {
  if (typeof value !== 'string' && typeof value !== 'number' || typeof value === 'number' && !Number.isSafeInteger(value)) throw new TypeError('Invalid research identity');
  const id = String(value); if (!/^[1-9]\d{0,19}$/.test(id)) throw new TypeError('Invalid research identity'); return id;
};
const amount = (value: unknown): number | null => value === null || value === undefined ? null
  : typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : (() => { throw new TypeError('Invalid variant minor units'); })();

/** Offline facts projection only. Does not authorize Shopify Ajax use by a custom storefront. */
export function mapMerchantVariantResearch(product: unknown, variantId: string,
  context: { merchantOrigin: string; observedAt: string; presentmentCurrency: string | null }) {
  const merchant = new URL(context.merchantOrigin);
  if (merchant.protocol !== 'https:' || merchant.username || merchant.password || merchant.port || merchant.pathname !== '/' || merchant.search || merchant.hash
    || !Number.isFinite(Date.parse(context.observedAt)) || context.presentmentCurrency !== null && !/^[A-Z]{3}$/.test(context.presentmentCurrency)) throw new TypeError('Invalid research context');
  if (!object(product) || !Array.isArray(product.variants) || product.variants.length > 100) throw new TypeError('Unsupported research product');
  const productId = identifier(product.id), expected = identifier(variantId);
  const matches = product.variants.filter(value => object(value) && identifier(value.id) === expected);
  if (matches.length !== 1 || !object(matches[0])) throw new TypeError('Variant identity is not unique');
  const variant = matches[0];
  const tags = Array.isArray(product.tags) ? product.tags.filter((tag): tag is string => typeof tag === 'string') : [];
  return {
    recordKind: 'research-projection' as const, appApiUseApproved: false as const,
    identity: JSON.stringify([merchant.origin, expected]), merchantOrigin: merchant.origin, productId, variantId: expected,
    priceMinorUnits: amount(variant.price), compareAtMinorUnits: amount(variant.compare_at_price),
    currency: context.presentmentCurrency, referenceBasis: null,
    productConditionTag: tags.some(tag => tag.toLowerCase().replace(/[\s_-]+/g, '') === 'openbox') ? 'open-box' as const : null,
    variantCondition: null,
    orderable: typeof variant.available === 'boolean' ? variant.available : null,
    quantity: null, physicalUnitIdentity: null,
    requiresShipping: typeof variant.requires_shipping === 'boolean' ? variant.requires_shipping : null,
    shippingEligibility: null, pickup: null, imageUrl: null,
    observedAt: new Date(context.observedAt).toISOString(),
  };
}
