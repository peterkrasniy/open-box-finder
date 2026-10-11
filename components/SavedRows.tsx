import type { Language, Offer } from '../lib/offer.ts';
import type { SavedListing } from '../lib/storage.ts';
import { safeExternalUrl } from '../lib/storage.ts';
import { text } from '../lib/i18n.ts';
import { SOURCE_BY_ID } from '../lib/sources.ts';
import { OfferMedia } from './OfferMedia';
import { Price } from './Price';

export function SavedRows({ saved, offers, language, now, onOpen, onRemove }: {
  saved: readonly SavedListing[]; offers: readonly Offer[]; language: Language; now: number;
  onOpen: (offer: Offer) => void; onRemove: (id: string) => void;
}) {
  const current = new Map(offers.map(offer => [offer.id, offer]));
  return <div className="saved-rows">{saved.map(record => {
    const candidate = current.get(record.offerId);
    const offer = candidate?.variantKey === record.variantKey && (candidate.pickup?.id ?? null) === record.storeId ? candidate : null;
    const url = safeExternalUrl(record.url);
    return <article className="saved-row" key={record.offerId}>
      {offer && <button type="button" className="saved-media-action" aria-label={`${text(language, 'details')}: ${offer.title}`} onClick={() => onOpen(offer)}><OfferMedia offer={offer} language={language}/></button>}
      <div className="saved-row-information"><p className="muted small">{SOURCE_BY_ID.get(record.sourceId)?.name ?? record.sourceId}</p>
        {offer ? <><h3><button type="button" className="text-action" onClick={() => onOpen(offer)}>{offer.title}</button></h3><Price offer={offer} language={language} now={now}/>{offer.availability === 'unavailable' && <p className="muted">{text(language, 'unavailable')}</p>}</>
          : <><h3>{text(language, 'unavailable')}</h3><p className="muted small">{record.variantKey}</p>{url && <a href={url} target="_blank" rel="noopener noreferrer">{text(language, 'openRetailer')}</a>}</>}
      </div><button type="button" className="remove-button" aria-label={`${text(language, 'remove')}: ${offer?.title ?? record.variantKey}`} onClick={() => onRemove(record.offerId)}>{text(language, 'remove')}</button>
    </article>;
  })}</div>;
}
