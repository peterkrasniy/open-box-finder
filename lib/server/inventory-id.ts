import type {Offer} from '../offer.ts';
import {inventoryUnitIdentity} from '../offer.ts';
/** Use for normalized adapters: identity excludes mutable price, stock and observation times. */
export async function canonicalInventoryId(offer:Pick<Offer,'sourceId'|'sourceOfferId'|'variantKey'|'condition'|'pickup'>):Promise<string>{
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(inventoryUnitIdentity(offer)));
 return `${offer.sourceId}:${[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('')}`;
}
