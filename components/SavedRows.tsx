import { isFresh } from '../lib/offer.ts';
import type { Catalog, Category, Language, Offer } from '../lib/offer.ts';
import type { SavedListing } from '../lib/storage.ts';
import { offerIdentity, safeExternalUrl, savedIdentity } from '../lib/storage.ts';
import { text } from '../lib/i18n.ts';
import { SOURCE_BY_ID } from '../lib/sources.ts';
import { OfferMedia } from './OfferMedia';
import { Price } from './Price';
import { MANUAL_PRODUCTS, manualProductActive, type ManualProduct } from '../lib/manual-products.ts';
import { DeleteListing, type DeleteListingAction } from './DeleteListing';
import { savedDismissIdentity } from '../lib/dismissals.ts';
import { HideCategory, type HideCategoryAction } from './HideCategory';
import { RESALE_RECORDS, resaleActive } from '../lib/resale.ts';
import type { ResaleListing } from '../lib/resale.ts';
import { ResaleFacts } from './ResaleProducts';
import { ManualProductFacts } from './ManualProducts';

export function SavedRows({ saved, catalog, status, language, now, onOpen, onRemove, manualRecords = MANUAL_PRODUCTS, hiddenCategories = [], onHide, resaleRecords = RESALE_RECORDS, onDelete, dismissedIds = new Set(), onRestore }: {
  onDelete?: DeleteListingAction; dismissedIds?: ReadonlySet<string>; onRestore?: (identity: string) => void; resaleRecords?: readonly ResaleListing[]; hiddenCategories?: readonly Category[]; onHide?: HideCategoryAction; manualRecords?: readonly ManualProduct[]; saved: readonly SavedListing[]; catalog: Catalog; status: 'idle' | 'loading' | 'ready' | 'error' | 'offline'; language: Language; now: number;
  onOpen: (offer: Offer) => void; onRemove: (id: string) => void;
}) {
  const current = new Map(catalog.offers.map(offer => [offerIdentity(offer), offer]));
  const visibleSaved = saved.filter(record => { const category = current.get(savedIdentity(record))?.category ?? manualRecords.find(product => product.sourceId === record.sourceId && product.id === record.sourceOfferId)?.category ?? resaleRecords.find(product => product.sourceId === record.sourceId && product.id === record.sourceOfferId)?.category ?? record.category; return !category || !hiddenCategories.includes(category); });
  if (!visibleSaved.length) return <p className="notice">{language === 'ru' ? 'Категории сохранённых товаров скрыты. Восстановите их в фильтрах; товары остаются в сохранённом.' : 'Your saved categories are hidden. Restore them in Filters; your saved items are kept.'}</p>;
  return <div className="saved-rows">{visibleSaved.map(record => {
    const identity = savedDismissIdentity(record), deleted = dismissedIds.has(identity);
    const offer = current.get(savedIdentity(record)) ?? null;
    const manual = manualRecords.find(product => product.sourceId === record.sourceId && product.id === record.sourceOfferId && (product.url === record.url || product.previousUrls?.includes(record.url)));
    const resale = resaleRecords.find(product => product.sourceId === record.sourceId && product.id === record.sourceOfferId && product.url === record.url);
    const category = offer?.category ?? manual?.category ?? resale?.category ?? record.category;
    if (category && hiddenCategories.includes(category)) return null;
    const health = catalog.sources.find(source => source.sourceId === record.sourceId);
    const absence = status === 'loading' || status === 'idle' ? 'checkingSaved' : status === 'error' || status === 'offline' ? 'savedCheckFailed'
      : health?.lastCompleteAt && health.lastCompleteSequence > (record.savedAgainstSequence ?? catalog.sequence) ? 'notInCatalog' : 'savedUnknown';
    const url = safeExternalUrl(record.url);
    return <article className="saved-row" key={savedIdentity(record)} data-category={category} data-dismiss-key={identity} data-listing-key={`saved:${savedIdentity(record)}`}>
      {offer && <button type="button" className="saved-media-action" aria-label={`${text(language, 'details')}: ${offer.title}`} onClick={() => onOpen(offer)}><OfferMedia offer={offer} language={language} actionLabel={text(language,'details')}/></button>}
      <div className="saved-row-information"><p className="muted small">{SOURCE_BY_ID.get(record.sourceId)?.name ?? record.sourceId}</p>
        {offer ? <><h2><button type="button" className="text-action" onClick={() => onOpen(offer)}>{offer.title}</button></h2>{!isFresh(offer, now) && <p className="notice">{text(language, 'stale')}</p>}<Price offer={offer} language={language} now={now}/>{offer.availability !== 'available' && <p className="muted">{text(language, offer.availability==='unknown'?'unknownStock':'unavailable')}</p>}</>
          : <><h2>{record.title ?? record.sourceOfferId ?? record.variantKey}</h2>{resale ? resaleActive(resale, now) ? <ResaleFacts listing={resale} language={language} now={now} onDelete={onDelete} deleted={deleted} onRestore={onRestore}/> : <p className="muted">{language === 'ru' ? 'Проверка объявления истекла или оно снято. Сохранённая ссылка остаётся.' : 'Observation expired or listing archived. Your saved link is kept.'}</p> : manual ? manualProductActive(manual, now) ? <ManualProductFacts product={manual} language={language} now={now}/> : <p className="muted">{manual.archived ? (language === 'ru' ? 'Товар больше не доступен по последней проверке. Он остаётся в сохранённом.' : 'No longer available at the last check. Kept in your saved list.') : text(language, Number.isFinite(now) ? 'manualReviewExpired' : 'checkingSaved')}</p> : <><p className="muted">{text(language, absence)}</p><p className="muted small">{record.variantKey}</p></>}{url && <a href={url} target="_blank" rel="noopener noreferrer">{text(language, 'openRetailer')}</a>}</>}
        {deleted && <p className="muted small">{text(language, 'deletedHere')}</p>}
        <DeleteListing identity={identity} title={record.title ?? record.variantKey} language={language} onDelete={onDelete} deleted={deleted} onRestore={onRestore}/>
        {category && <HideCategory category={category} language={language} onHide={onHide}/>}
      </div><button type="button" className="remove-button" aria-label={`${text(language, 'remove')}: ${offer?.title ?? record.variantKey}`} onClick={() => onRemove(savedIdentity(record))}>{text(language, 'remove')}</button>
    </article>;
  })}</div>;
}
