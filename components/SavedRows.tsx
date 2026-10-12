import { isFresh } from '../lib/offer.ts';
import type { Catalog, Language, Offer } from '../lib/offer.ts';
import type { SavedListing } from '../lib/storage.ts';
import { offerIdentity, safeExternalUrl, savedIdentity } from '../lib/storage.ts';
import { text } from '../lib/i18n.ts';
import { SOURCE_BY_ID } from '../lib/sources.ts';
import { OfferMedia } from './OfferMedia';
import { Price } from './Price';
import { MANUAL_PRODUCTS, manualProductActive, type ManualProduct } from '../lib/manual-products.ts';
import { ManualProductFacts } from './ManualProducts';

export function SavedRows({ saved, catalog, status, language, now, onOpen, onRemove, manualRecords = MANUAL_PRODUCTS }: {
  manualRecords?: readonly ManualProduct[]; saved: readonly SavedListing[]; catalog: Catalog; status: 'idle' | 'loading' | 'ready' | 'error' | 'offline'; language: Language; now: number;
  onOpen: (offer: Offer) => void; onRemove: (id: string) => void;
}) {
  const current = new Map(catalog.offers.map(offer => [offerIdentity(offer), offer]));
  return <div className="saved-rows">{saved.map(record => {
    const offer = current.get(savedIdentity(record)) ?? null;
    const manual = manualRecords.find(product => product.sourceId === record.sourceId && product.id === record.sourceOfferId && (product.url === record.url || product.previousUrls?.includes(record.url)));
    const health = catalog.sources.find(source => source.sourceId === record.sourceId);
    const absence = status === 'loading' || status === 'idle' ? 'checkingSaved' : status === 'error' || status === 'offline' ? 'savedCheckFailed'
      : health?.lastCompleteAt && health.lastCompleteSequence > (record.savedAgainstSequence ?? catalog.sequence) ? 'notInCatalog' : 'savedUnknown';
    const url = safeExternalUrl(record.url);
    return <article className="saved-row" key={savedIdentity(record)}>
      {offer && <button type="button" className="saved-media-action" aria-label={`${text(language, 'details')}: ${offer.title}`} onClick={() => onOpen(offer)}><OfferMedia offer={offer} language={language} actionLabel={text(language,'details')}/></button>}
      <div className="saved-row-information"><p className="muted small">{SOURCE_BY_ID.get(record.sourceId)?.name ?? record.sourceId}</p>
        {offer ? <><h2><button type="button" className="text-action" onClick={() => onOpen(offer)}>{offer.title}</button></h2>{!isFresh(offer, now) && <p className="notice">{text(language, 'stale')}</p>}<Price offer={offer} language={language} now={now}/>{offer.availability !== 'available' && <p className="muted">{text(language, offer.availability==='unknown'?'unknownStock':'unavailable')}</p>}</>
          : <><h2>{record.title ?? record.sourceOfferId ?? record.variantKey}</h2>{manual ? manualProductActive(manual, now) ? <ManualProductFacts product={manual} language={language} now={now}/> : <p className="muted">{manual.archived ? (language === 'ru' ? 'Товар больше не доступен по последней проверке. Он остаётся в сохранённом.' : 'No longer available at the last check. Kept in your saved list.') : text(language, Number.isFinite(now) ? 'manualReviewExpired' : 'checkingSaved')}</p> : <><p className="muted">{text(language, absence)}</p><p className="muted small">{record.variantKey}</p></>}{url && <a href={url} target="_blank" rel="noopener noreferrer">{text(language, 'openRetailer')}</a>}</>}
      </div><button type="button" className="remove-button" aria-label={`${text(language, 'remove')}: ${offer?.title ?? record.variantKey}`} onClick={() => onRemove(savedIdentity(record))}>{text(language, 'remove')}</button>
    </article>;
  })}</div>;
}
