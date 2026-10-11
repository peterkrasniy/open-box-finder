import type { Offer, Condition } from '../../offer.ts';
import type { UnitObservation } from '../a4l-preflight.ts';
import type { PreflightObservation } from '../preflight.ts';
import type { AcquisitionResult } from '../pipeline.ts';
import { a4lUnitTransport } from '../fetch-source.ts';
import { canonicalInventoryId } from '../inventory-id.ts';
import { validOffer } from '../../validation.ts';

const condition = (value: string | null): Condition => /^https?:\/\/schema\.org\/RefurbishedCondition$/.test(value ?? '') ? 'refurbished'
  : /^https?:\/\/schema\.org\/UsedCondition$/.test(value ?? '') ? 'used' : 'unspecified';

/** Prepared offline mapping. No fetch, registration or public admission is performed. */
export async function mapA4lObservation(unit: UnitObservation, observedAt: string): Promise<Offer> {
  const url = a4lUnitTransport(unit.url).url, time = Date.parse(observedAt);
  if (!Number.isFinite(time) || unit.unitId !== new URL(url).pathname.split('/').at(-1)) throw new TypeError('Invalid exact-unit observation');
  const offer: Offer = {
    id: '', sourceId: 'a4l-sac', retailerId: 'a4l-sac', sourceOfferId: unit.unitId,
    variantKey: unit.model ?? unit.sku, recordType: 'inventory', title: unit.name, category: 'appliances',
    condition: condition(unit.itemCondition), cosmeticGrade: null, availability: unit.availability,
    priceCents: unit.currentCents, currency: 'USD', url,
    // Model-level MSRP, program condition, media and showroom notes are not exact-unit proof.
    reference: null, imageUrl: null, imageAlt: null, pickup: null, shipping: null, localDelivery: null,
    observedAt: new Date(time).toISOString(), freshUntil: new Date(time + 300000).toISOString(),
  };
  offer.id = await canonicalInventoryId(offer);
  if (!validOffer(offer)) throw new TypeError('Invalid mapped inventory facts');
  return offer;
}

export async function mapA4lProbe(observation: PreflightObservation): Promise<AcquisitionResult> {
  if (observation.sourceId !== 'a4l-sac') throw new TypeError('Wrong source mapping');
  const delay = Math.max(900, Math.ceil((Date.parse(observation.notBefore) - Date.parse(observation.checkedAt)) / 1000));
  if (!Number.isFinite(delay)) throw new TypeError('Invalid source backoff');
  if (observation.outcome !== 'observed' || !observation.units.length) return { ok: false, stopAutomatic: true, minimumNextCheckSeconds: delay };
  const offers = await Promise.all(observation.units.map(unit => mapA4lObservation(unit, observation.checkedAt)));
  if (new Set(offers.map(offer => offer.id)).size !== offers.length) throw new TypeError('Duplicate physical-unit mapping');
  return { ok: true, acquiredAt: observation.checkedAt, complete: false, offers, syndication: [], minimumNextCheckSeconds: delay };
}
