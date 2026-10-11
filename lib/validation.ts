import type { Catalog, Offer, SourceHealth, SyndicatedDeal } from './offer.ts';
import { validCents,inventoryUnitIdentity } from './offer.ts';
import { CATEGORIES } from './i18n.ts';
import { validPoint } from './filter.ts';
import { safeExternalUrl } from './storage.ts';
import { SOURCE_BY_ID } from './sources.ts';
import { US_STATES } from './shipping.ts';
import { validImageScopes } from './syndication-document.ts';

const object=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
const string=(v:unknown,max:number):v is string=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[\u0000-\u001f]/.test(v);
const date=(v:unknown):v is string=>string(v,40)&&Number.isFinite(Date.parse(v));
const optionalString=(v:unknown,max:number)=>v===null||string(v,max);
const inList=(v:unknown,values:readonly string[])=>typeof v==='string'&&values.includes(v);
const sequence=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
const html=(v:unknown):v is string=>typeof v==='string'&&v.length<=32768&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
const stateList=(v:unknown):v is string[]=>Array.isArray(v)&&v.length<=51&&v.every(state=>typeof state==='string'&&US_STATES.has(state))&&new Set(v).size===v.length;

/** Construct public records explicitly; never spread adapter objects or private nested fields. */
export function publicOffer(offer:Offer):Offer {
 return {
  id:offer.id,sourceId:offer.sourceId,retailerId:offer.retailerId,sourceOfferId:offer.sourceOfferId,variantKey:offer.variantKey,recordType:'inventory',
  title:offer.title,category:offer.category,condition:offer.condition,cosmeticGrade:offer.cosmeticGrade,availability:offer.availability,
  priceCents:offer.priceCents,currency:offer.currency,url:offer.url,imageUrl:offer.imageUrl,imageAlt:offer.imageAlt,observedAt:offer.observedAt,freshUntil:offer.freshUntil,
  reference:offer.reference?{cents:offer.reference.cents,currency:offer.reference.currency,variantKey:offer.reference.variantKey,basis:offer.reference.basis,observedAt:offer.reference.observedAt,maxAgeSeconds:offer.reference.maxAgeSeconds,sourceUrl:offer.reference.sourceUrl}:null,
  pickup:offer.pickup?{id:offer.pickup.id,name:offer.pickup.name,address:offer.pickup.address,pickupVerified:offer.pickup.pickupVerified,point:offer.pickup.point?{latitude:offer.pickup.point.latitude,longitude:offer.pickup.point.longitude}:null}:null,
  shipping:offer.shipping?{country:offer.shipping.country,costCents:offer.shipping.costCents,restrictions:offer.shipping.restrictions,...(offer.shipping.eligibility?{eligibility:{scope:offer.shipping.eligibility.scope,states:[...offer.shipping.eligibility.states],excludedStates:[...offer.shipping.eligibility.excludedStates]}}:{})}:null,
  localDelivery:offer.localDelivery?{description:offer.localDelivery.description,costCents:offer.localDelivery.costCents}:null,
 };
}
export function publicSyndication(deal:SyndicatedDeal):SyndicatedDeal {
 return {id:deal.id,sourceId:deal.sourceId,sourceGuid:deal.sourceGuid,title:deal.title,url:deal.url,description:deal.description,content:deal.content,publishedAt:deal.publishedAt,observedAt:deal.observedAt,freshUntil:deal.freshUntil,imageScopes:(deal.imageScopes??[]).map(scope=>({origin:scope.origin,pathPrefix:scope.pathPrefix}))};
}
export function validOffer(v:unknown):v is Offer {
 if(!object(v)||!string(v.id,200)||/\s/.test(v.id)||!string(v.sourceId,80)||SOURCE_BY_ID.get(v.sourceId)?.presentation!=='normalized-inventory'
  ||!string(v.retailerId,80)||!string(v.sourceOfferId,200)||!string(v.variantKey,200)||v.recordType!=='inventory'||!string(v.title,240)
  ||!inList(v.category,CATEGORIES)||!inList(v.condition,['open-box','refurbished','used','scratch-and-dent','new-clearance','unspecified'])
  ||!optionalString(v.cosmeticGrade,100)||!inList(v.availability,['available','unavailable','unknown'])
  ||!(v.priceCents===null||validCents(v.priceCents))||v.currency!=='USD'||!safeExternalUrl(v.url)
  ||!(v.imageUrl===null||safeExternalUrl(v.imageUrl))||!optionalString(v.imageAlt,240)
  ||!date(v.observedAt)||!date(v.freshUntil)||Date.parse(v.freshUntil)<Date.parse(v.observedAt))return false;
 if(v.reference!==null){const r=v.reference;if(!object(r)||!validCents(r.cents)||r.currency!=='USD'||!string(r.variantKey,200)||!inList(r.basis,['current-new','msrp','retailer-list','retailer-regular','retailer-was'])||!date(r.observedAt)||!sequence(r.maxAgeSeconds)||r.maxAgeSeconds<1||r.maxAgeSeconds>604800||!safeExternalUrl(r.sourceUrl))return false;}
 if(v.pickup!==null){const p=v.pickup;if(!object(p)||!string(p.id,160)||!string(p.name,160)||!string(p.address,300)||typeof p.pickupVerified!=='boolean')return false;if(p.point!==null&&(!object(p.point)||typeof p.point.latitude!=='number'||typeof p.point.longitude!=='number'||!validPoint({latitude:p.point.latitude,longitude:p.point.longitude})))return false;}
 if(v.shipping!==null){const s=v.shipping;if(!object(s)||s.country!=='US'||!(s.costCents===null||validCents(s.costCents))||!optionalString(s.restrictions,500))return false;
  if(s.eligibility!==undefined){const e=s.eligibility;if(!object(e)||!inList(e.scope,['all-us','states'])||!stateList(e.states)||!stateList(e.excludedStates))return false;const excluded=e.excludedStates;if(e.states.some(state=>excluded.includes(state))||(e.scope==='all-us'&&e.states.length))return false;}}
 if(v.localDelivery!==null){const d=v.localDelivery;if(!object(d)||!string(d.description,500)||!(d.costCents===null||validCents(d.costCents)))return false;}
 return true;
}
export function validSyndication(v:unknown):v is SyndicatedDeal {
 return object(v)&&string(v.id,200)&&!/\s/.test(v.id)&&string(v.sourceId,80)&&SOURCE_BY_ID.get(v.sourceId)?.presentation==='unmodified-syndication'
  &&string(v.sourceGuid,2048)&&string(v.title,240)&&Boolean(safeExternalUrl(v.url))&&html(v.description)&&(v.content===null||html(v.content))
  &&Boolean(v.description||v.content)&&(v.publishedAt===null||date(v.publishedAt))&&date(v.observedAt)&&date(v.freshUntil)&&Date.parse(v.freshUntil)>=Date.parse(v.observedAt)&&(v.imageScopes===undefined||validImageScopes(v.imageScopes));
}
export function decodeCatalog(value:unknown):Catalog {
 if(!object(value)||value.schemaVersion!==2||!sequence(value.sequence)||!string(value.generation,128)||!string(value.revision,128)
  ||!(value.publishedAt===null||date(value.publishedAt))||!Array.isArray(value.offers)||value.offers.length>2000
  ||!Array.isArray(value.syndication)||value.syndication.length>100||!Array.isArray(value.sources)||value.sources.length>100)throw new TypeError('Invalid catalog envelope');
 const ids=new Set<string>(),units=new Set<string>();
 for(const offer of value.offers){if(!validOffer(offer)||ids.has(offer.id)||units.has(inventoryUnitIdentity(offer)))throw new TypeError('Invalid catalog offer');ids.add(offer.id);units.add(inventoryUnitIdentity(offer));}
 for(const deal of value.syndication){if(!validSyndication(deal)||ids.has(deal.id))throw new TypeError('Invalid syndicated deal');ids.add(deal.id);}
 const sources=new Set<string>(),health:SourceHealth[]=[];
 for(const source of value.sources){
  if(!object(source)||!string(source.sourceId,80)||!SOURCE_BY_ID.has(source.sourceId)||sources.has(source.sourceId)||!inList(source.status,['unconnected','ready','stale','error'])
   ||![source.lastAttemptAt,source.lastSuccessAt,source.nextCheckAt,source.lastCompleteAt].every(v=>v===null||date(v))||!sequence(source.lastCompleteSequence)||source.lastCompleteSequence>value.sequence
   ||(source.status==='ready'&&(!source.lastSuccessAt||!source.lastAttemptAt))
   ||(source.lastSuccessAt&&(!source.lastAttemptAt||Date.parse(source.lastSuccessAt as string)>Date.parse(source.lastAttemptAt as string)))
   ||(source.lastCompleteSequence>0&&(!source.lastCompleteAt||!source.lastSuccessAt))
   ||(source.lastCompleteAt&&(!source.lastSuccessAt||Date.parse(source.lastCompleteAt as string)>Date.parse(source.lastSuccessAt as string))))throw new TypeError('Invalid source health');
  if (source.lastSnapshotComplete !== undefined && typeof source.lastSnapshotComplete !== 'boolean') throw new TypeError('Invalid completeness evidence');
  if(source.blockedAt!==undefined&&source.blockedAt!==null&&(!date(source.blockedAt)||!source.lastAttemptAt||Date.parse(source.blockedAt)>Date.parse(source.lastAttemptAt as string)||source.status!=='error'))throw new TypeError('Invalid access block evidence');
  sources.add(source.sourceId);health.push({sourceId:source.sourceId,status:source.status,lastAttemptAt:source.lastAttemptAt,lastSuccessAt:source.lastSuccessAt,nextCheckAt:source.nextCheckAt,lastCompleteAt:source.lastCompleteAt,lastCompleteSequence:source.lastCompleteSequence,...(typeof source.lastSnapshotComplete === 'boolean'?{lastSnapshotComplete:source.lastSnapshotComplete}:{}),...(source.blockedAt!==undefined?{blockedAt:source.blockedAt}:{})} as SourceHealth);
 }
 return {schemaVersion:2,sequence:value.sequence,generation:value.generation,revision:value.revision,publishedAt:value.publishedAt as string|null,offers:value.offers.map(publicOffer),syndication:value.syndication.map(publicSyndication),sources:health};
}
export function acceptPublication(current:Catalog,incoming:Catalog):Catalog {
 if(incoming.sequence<current.sequence)throw new TypeError('Stale catalog publication');
 if(incoming.sequence===current.sequence&&JSON.stringify(incoming)!==JSON.stringify(current))throw new TypeError('Conflicting catalog publication');
 return incoming.sequence===current.sequence?current:incoming;
}
