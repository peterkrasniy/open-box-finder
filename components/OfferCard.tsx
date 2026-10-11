import { memo } from 'react';
import type { Filters, Language, Offer } from '../lib/offer.ts';
import { displayDiscount, isFresh } from '../lib/offer.ts';
import { pickupDistance } from '../lib/filter.ts';
import { shippingEligibility } from '../lib/shipping.ts';
import { conditionLabel, text } from '../lib/i18n.ts';
import { SOURCE_BY_ID } from '../lib/sources.ts';
import { Icon } from './Icon';
import { OfferMedia } from './OfferMedia';
import { Price } from './Price';

export const OfferCard = memo(function OfferCard({ offer, language, filters, now, saved, onSave, onOpen, priority = false }: {
  offer: Offer; language: Language; filters: Filters; now: number; saved: boolean;
  onSave: (offer: Offer) => void; onOpen: (offer: Offer) => void; priority?: boolean;
}) {
  const distance = pickupDistance(offer, filters);
  const shipping = shippingEligibility(offer.shipping, filters.origin);
  const discount = displayDiscount(offer, now);
  const retailer = SOURCE_BY_ID.get(offer.retailerId)?.name ?? SOURCE_BY_ID.get(offer.sourceId)?.name ?? offer.retailerId;
  return <article className="offer-card">
    <button type="button" className="media-action" aria-label={`${text(language, 'details')}: ${offer.title}`} onClick={() => onOpen(offer)}><OfferMedia offer={offer} language={language} priority={priority} actionLabel={text(language,'details')}/></button>
    <div className="offer-card-body">
      <div className="offer-source"><span>{retailer}</span><button type="button" className={`icon-button save-button${saved ? ' is-saved' : ''}`} aria-label={`${text(language, saved ? 'unsave' : 'save')}: ${offer.title}`} aria-pressed={saved} onClick={() => onSave(offer)}><Icon name="heart"/></button></div>
      <h2><button type="button" className="text-action" onClick={() => onOpen(offer)}>{offer.title}</button></h2>
      <p className="condition">{conditionLabel(language, offer.condition)}{offer.cosmeticGrade && <> · {offer.cosmeticGrade}</>}</p>
      {!isFresh(offer, now) && <p className="muted small">{text(language, 'lastObservedPrice')}</p>}
      <Price offer={offer} language={language} now={now}/>
      {discount !== null && <p className="saving-text">{discount}% · {text(language, 'advertisedSavings')}</p>}
      <div className="fulfillment-lines">
        {offer.pickup?.pickupVerified && <p><Icon name="pin" size={17}/><span>{offer.pickup.name}{distance !== null && ` · ${new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 1 }).format(distance)} ${text(language, 'miles')}`}</span></p>}
        {offer.shipping && <p><Icon name="truck" size={17}/><span>{text(language, shipping === 'eligible' ? 'shipping' : shipping === 'ineligible' ? 'shippingIneligible' : 'shippingEligibilityUnknown')}</span></p>}
        {offer.pickup?.pickupVerified && distance === null && <p>{text(language, 'distanceUnknown')}</p>}
        {offer.shipping?.restrictions && <p>{offer.shipping.restrictions}</p>}
        {!offer.pickup?.pickupVerified && !offer.shipping && <p>{text(language, offer.localDelivery ? 'localDelivery' : 'fulfillmentUnknown')}</p>}
      </div>
      <p className={`availability${offer.availability === 'unknown' || !isFresh(offer, now) ? ' muted' : ''}`}>{!isFresh(offer, now) ? text(language, 'stale') : text(language, offer.availability === 'available' ? 'available' : 'unknownStock')}</p>
      <button type="button" className="detail-action" onClick={() => onOpen(offer)}>{text(language, 'details')}<Icon name="right" size={18}/></button>
    </div>
  </article>;
});
