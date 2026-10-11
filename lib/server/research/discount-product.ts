import { structuredProducts } from './structured-products.ts';
import { parsePrice } from '../../money.ts';
import { SourceParseError } from '../parse-evidence.ts';

// Fixed acquisition configuration, not a catalog snapshot. No price or stock is hardcoded.
export const DISCOUNT_TARGET = Object.freeze({
  url: 'https://discountelectronics.com/dell-precision-7750-i7-17-3-workstation-laptop-nvidia-rtx-5000-graphics-4k-display-bad-usb-port/',
  sku: 'LTPC-PREC-7750-i7-32-512-RTX5000-W11P-HTR-BadUSB',
  ownLabel: 'Dell Precision 7750 — bad USB port, as-is',
  disclosures: ['B-grade', 'Bad USB port', 'As-is'] as readonly string[],
});
export interface RetailProductObservation {
  url: string; sku: string; currentCents: number; currency: 'USD';
  availability: 'orderable' | 'unavailable' | 'unknown'; condition: 'refurbished';
  matchingBlocks: number; ownLabel: string; disclosures: readonly string[];
  physicalUnitIdentity: null; quantity: null; reference: null; pickup: null; shippingEligibility: null; imageUrl: null;
}
interface ProductTarget { url: string; sku: string; ownLabel: string; disclosures: readonly string[] }
/** Factual projection from an allowlisted ordinary PDP; matching duplicates cannot inflate stock. */
export function observeDiscountProduct(html: string, target: ProductTarget = DISCOUNT_TARGET): RetailProductObservation {
  const { products, offerFor } = structuredProducts(html);
  const matching = products.filter(product => product.sku === target.sku);
  if (!matching.length) throw new SourceParseError('product-not-unique');
  const facts = matching.map(product => {
    const offer = offerFor(product);
    for (const value of [product.url, offer.url]) if (value !== undefined) {
      let url: string; try { url = new URL(String(value), target.url).href; } catch { throw new SourceParseError('product-canonical-mismatch'); }
      if (url !== target.url) throw new SourceParseError('product-canonical-mismatch');
    }
    if (offer.priceCurrency !== 'USD' || !['string', 'number'].includes(typeof offer.price)) throw new SourceParseError('product-price-identity');
    const price = parsePrice(String(offer.price)); if (!price.ok || price.cents === null) throw new SourceParseError('product-price');
    const itemCondition = offer.itemCondition ?? product.itemCondition;
    if (!/^https?:\/\/schema\.org\/RefurbishedCondition$/.test(String(itemCondition)) || offer.itemCondition && product.itemCondition && offer.itemCondition !== product.itemCondition) throw new SourceParseError('product-condition');
    const availability = /^https?:\/\/schema\.org\/InStock$/.test(String(offer.availability)) ? 'orderable' as const
      : /^https?:\/\/schema\.org\/(?:OutOfStock|SoldOut)$/.test(String(offer.availability)) ? 'unavailable' as const : 'unknown' as const;
    return { price: price.cents, availability, itemCondition: String(itemCondition) };
  });
  if (facts.some(value => JSON.stringify(value) !== JSON.stringify(facts[0]))) throw new SourceParseError('product-conflict');
  return { url: target.url, sku: target.sku, currentCents: facts[0].price, currency: 'USD', availability: facts[0].availability,
    condition: 'refurbished', matchingBlocks: matching.length, ownLabel: target.ownLabel, disclosures: [...target.disclosures],
    physicalUnitIdentity: null, quantity: null, reference: null, pickup: null, shippingEligibility: null, imageUrl: null };
}
