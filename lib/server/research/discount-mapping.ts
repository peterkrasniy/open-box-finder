import type { Offer } from '../../offer.ts';
import type { PreflightObservation } from '../preflight.ts';
import type { AcquisitionResult } from '../pipeline.ts';
import { canonicalInventoryId } from '../inventory-id.ts';
import { validOffer } from '../../validation.ts';
import { DISCOUNT_TARGET } from './discount-product.ts';

/** Pure prepared adapter mapping, not registered for automatic acquisition. */
export async function mapDiscountProbe(observation: PreflightObservation): Promise<AcquisitionResult> {
  if(observation.sourceId!=='discount-electronics')throw new TypeError('Wrong source mapping');
  const delay=Math.max(900,Math.ceil((Date.parse(observation.notBefore)-Date.parse(observation.checkedAt))/1000));
  if(!Number.isFinite(delay))throw new TypeError('Invalid source backoff');
  if(observation.outcome!=='observed'||!observation.product)return {ok:false,stopAutomatic:true,minimumNextCheckSeconds:delay};
  const product=observation.product,time=Date.parse(observation.checkedAt);
  if(!Number.isFinite(time)||product.url!==DISCOUNT_TARGET.url||product.sku!==DISCOUNT_TARGET.sku)throw new TypeError('Unreviewed product mapping');
  const offer:Offer={id:'',sourceId:'discount-electronics',retailerId:'discount-electronics',sourceOfferId:product.sku,variantKey:product.sku,
    recordType:'inventory',title:DISCOUNT_TARGET.ownLabel,category:'computers',condition:'refurbished',cosmeticGrade:DISCOUNT_TARGET.disclosures.join('; '),
    availability:product.availability==='orderable'?'available':product.availability==='unavailable'?'unavailable':'unknown',priceCents:product.currentCents,currency:'USD',
    url:product.url,reference:null,imageUrl:null,imageAlt:null,pickup:null,shipping:null,localDelivery:null,
    observedAt:new Date(time).toISOString(),freshUntil:new Date(time+300000).toISOString()};
  offer.id=await canonicalInventoryId(offer);if(!validOffer(offer))throw new TypeError('Invalid mapped product facts');
  return {ok:true,acquiredAt:observation.checkedAt,complete:false,offers:[offer],syndication:[],minimumNextCheckSeconds:delay};
}
