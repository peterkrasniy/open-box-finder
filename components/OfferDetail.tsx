import type { Language, Offer } from '../lib/offer.ts';
import { isFresh } from '../lib/offer.ts';
import { directionsUrl } from '../lib/filter.ts';
import { conditionLabel, text } from '../lib/i18n.ts';
import { formatPrice } from '../lib/money.ts';
import { safeExternalUrl } from '../lib/storage.ts';
import { SOURCE_BY_ID } from '../lib/sources.ts';
import { Icon } from './Icon';
import { OfferMedia } from './OfferMedia';
import { Price } from './Price';

export function OfferDetail({ offer, language, now, saved, onSave, onBack, savedView }: {
  offer: Offer | null; language: Language; now: number; saved: boolean; onSave: (offer: Offer) => void; onBack: () => void; savedView: boolean;
}) {
  if (!offer) return <div className="detail-missing"><h3>{text(language, 'unavailable')}</h3><p>{text(language, 'unavailableHelp')}</p><button type="button" className="secondary-button" onClick={onBack}>{text(language, savedView ? 'backSaved' : 'back')}</button></div>;
  const retailer = SOURCE_BY_ID.get(offer.retailerId)?.name ?? SOURCE_BY_ID.get(offer.sourceId)?.name ?? offer.retailerId;
  const url = safeExternalUrl(offer.url), navigate = directionsUrl(offer);
  const observed = new Date(offer.observedAt);
  return <div className="offer-detail">
    <button type="button" className="back-button" onClick={onBack}><Icon name="left" size={20}/>{text(language, savedView ? 'backSaved' : 'back')}</button>
    <div className="detail-layout"><OfferMedia offer={offer} language={language} priority/>
      <div className="detail-information"><p className="muted">{retailer}</p><h3>{offer.title}</h3>
        <p>{conditionLabel(language, offer.condition)}{offer.cosmeticGrade && <> · {offer.cosmeticGrade}</>}</p>
        {!isFresh(offer, now) && <p className="muted small">{text(language, 'lastObservedPrice')}</p>}
        <Price offer={offer} language={language} now={now}/><p className="muted small">{text(language, 'savingsBasis')}</p>
        <p className="availability">{!isFresh(offer, now) ? text(language, 'stale') : text(language, offer.availability === 'available' ? 'available' : offer.availability === 'unavailable' ? 'unavailable' : 'unknownStock')}</p>
        {offer.pickup?.pickupVerified && <section className="detail-section"><h4>{text(language, 'pickupAt')}</h4><strong>{offer.pickup.name}</strong><p>{offer.pickup.address}</p>{navigate && <a className="secondary-button" href={navigate} target="_blank" rel="noopener noreferrer"><Icon name="pin" size={19}/>{text(language, 'navigate')}</a>}</section>}
        {offer.shipping && <section className="detail-section"><h4>{text(language, 'shipping')}</h4><p>{offer.shipping.costCents === null ? text(language, 'shippingUnknown') : offer.shipping.costCents === 0 ? text(language, 'freeShipping') : formatPrice(offer.shipping.costCents, language)}</p>{offer.shipping.restrictions && <p>{offer.shipping.restrictions}</p>}</section>}
        {offer.localDelivery && <section className="detail-section"><h4>{text(language, 'localDelivery')}</h4><p>{offer.localDelivery.description}</p>{offer.localDelivery.costCents !== null && <p>{formatPrice(offer.localDelivery.costCents, language)}</p>}</section>}
        {!offer.pickup?.pickupVerified && !offer.shipping && !offer.localDelivery && <p className="muted">{text(language, 'fulfillmentUnknown')}</p>}
        <div className="detail-actions">{url && <a className="primary-button" href={url} target="_blank" rel="noopener noreferrer">{text(language, 'openRetailer')}<Icon name="external" size={18}/></a>}<button type="button" className="secondary-button" aria-pressed={saved} onClick={() => onSave(offer)}><Icon name="heart" size={19}/>{text(language, saved ? 'unsave' : 'save')}</button></div>
        <p className="muted small">{text(language, 'checked')}: <time dateTime={offer.observedAt}>{Number.isFinite(observed.getTime()) ? new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(observed) : text(language, 'neverChecked')}</time></p>
        <dl className="identity-details"><dt>{text(language, 'variant')}</dt><dd>{offer.variantKey}</dd><dt>{text(language, 'sourceListing')}</dt><dd>{offer.sourceOfferId}</dd></dl>
      </div>
    </div>
  </div>;
}
