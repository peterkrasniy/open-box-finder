import type { Language, Offer } from '../lib/offer.ts';
import { savings } from '../lib/offer.ts';
import { formatPrice } from '../lib/money.ts';
import { safeExternalUrl } from '../lib/storage.ts';
import { referenceLabel, text } from '../lib/i18n.ts';

export function Price({ offer, language, now, showEvidence = false }: { offer: Offer; language: Language; now: number; showEvidence?: boolean }) {
  const eligible = savings(offer, now);
  const label = offer.sourceId === 'buydig' && offer.reference?.basis === 'retailer-list' ? text(language, 'estimatedListReference') : offer.reference ? referenceLabel(language, offer.reference.basis) : '';
  const evidence = safeExternalUrl(offer.reference?.sourceUrl);
  return <div className="price-group">
    <strong className="current-price">{offer.priceCents === null ? text(language, 'priceUnknown') : formatPrice(offer.priceCents, language)}</strong>
    {eligible && offer.reference && <div className="reference-price"><del aria-label={`${label}: ${formatPrice(offer.reference.cents, language)}`}>{formatPrice(offer.reference.cents, language)}</del><span>{label}</span></div>}
    {showEvidence && eligible && offer.reference && <div className="comparison-evidence">{offer.sourceId === 'buydig' && offer.reference.basis === 'retailer-list' && <p>{text(language, 'estimatedListHelp')}</p>}{evidence && <a href={evidence} target="_blank" rel="noopener noreferrer">{text(language, 'referenceEvidence')}</a>}<p>{text(language, 'referenceChecked')}: <time dateTime={offer.reference.observedAt}>{new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', {dateStyle:'medium',timeStyle:'short'}).format(new Date(offer.reference.observedAt))}</time></p></div>}
  </div>;
}
