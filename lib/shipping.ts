import type { Offer, Origin, Shipping } from './offer.ts';
export const US_STATES = new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' '));
export type Eligibility = 'eligible' | 'ineligible' | 'unknown';
export function shippingEligibility(shipping: Shipping | null, origin: Origin): Eligibility {
  if (!shipping) return 'ineligible';
  const policy=shipping.eligibility, state=origin.shippingState;
  if (!policy) return 'unknown';
  if (!state || !US_STATES.has(state)) return policy.scope==='all-us' && !policy.excludedStates.length ? 'eligible' : 'unknown';
  if (policy.excludedStates.includes(state)) return 'ineligible';
  return policy.scope==='all-us' || policy.states.includes(state) ? 'eligible' : 'ineligible';
}
export function hasUnknownFulfillment(offer: Offer, origin: Origin): boolean {
  return shippingEligibility(offer.shipping,origin)==='unknown' || (!offer.shipping && (!offer.pickup || !offer.pickup.pickupVerified || !offer.pickup.point));
}
