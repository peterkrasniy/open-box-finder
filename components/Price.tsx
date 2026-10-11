import type { Language, Offer } from '../lib/offer.ts';
import { savings } from '../lib/offer.ts';
import { formatPrice } from '../lib/money.ts';
import { referenceLabel, text } from '../lib/i18n.ts';

export function Price({ offer, language, now }: { offer: Offer; language: Language; now: number }) {
  const eligible = savings(offer, now);
  return <div className="price-group">
    <strong className="current-price">{offer.priceCents === null ? text(language, 'priceUnknown') : formatPrice(offer.priceCents, language)}</strong>
    {eligible && offer.reference && <div className="reference-price"><del aria-label={`${referenceLabel(language, offer.reference.basis)}: ${formatPrice(offer.reference.cents, language)}`}>{formatPrice(offer.reference.cents, language)}</del><span>{referenceLabel(language, offer.reference.basis)}</span></div>}
  </div>;
}
