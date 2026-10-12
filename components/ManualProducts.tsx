import type { Language } from '../lib/offer.ts';
import type { ManualProduct } from '../lib/manual-products.ts';
import { manualSavedPointer, manualNewModelComparison, manualRetailerComparison, manualSupportedReference } from '../lib/manual-products.ts';
import { useState } from 'react';
import { savedIdentity } from '../lib/storage.ts';
import { conditionLabel, referenceLabel, text } from '../lib/i18n.ts';
import { Icon } from './Icon';
import { HideCategory, type HideCategoryAction } from './HideCategory';
import { RetailerBadge } from './RetailerBadge';
import { directionsUrl } from '../lib/filter.ts';
import { SOURCE_BY_ID } from '../lib/sources.ts';

export function ManualProductFacts({ product, language, now }: { product: ManualProduct; language: Language; now: number }) {
  const formatter = new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'en-US', { style: 'currency', currency: product.currency });
  const price = formatter.format(product.observedPriceCents / 100), comparison = manualNewModelComparison(product, now);
  const retailerComparison = manualRetailerComparison(product, now), supported = manualSupportedReference(product, now);
  const grade = product.sourceId === 'best-buy' && new URL(product.url).searchParams.get('condition') === 'fair'
    ? (language === 'ru' ? 'Открытая упаковка · Fair, детали могут отсутствовать' : 'Open-Box Fair · parts may be missing')
    : product.conditionDetail?.[language] ?? conditionLabel(language, product.condition);
  const navigate = directionsUrl({ pickup: product.pickup ?? null });
  return <><p className="manual-condition">{grade} · {text(language, 'manualOnly')}</p><p className="manual-price"><span>{price}</span><small>{text(language, 'observedPrice')}</small></p>
    {supported && <><p className="manual-comparison"><a href={supported.url} target="_blank" rel="noopener noreferrer">{referenceLabel(language, supported.basis)}</a><s className="manual-reference">{formatter.format(supported.cents / 100)}</s></p><p className="manual-saving">{formatter.format(supported.savingCents / 100)} · {product.observedPriceCents === 0 ? 100 : Math.min(99, Math.round(supported.fraction * 100))}% <span>{text(language, 'referenceSavings')}</span></p></>}
    {retailerComparison && <p className="manual-comparison"><a href={retailerComparison.url} target="_blank" rel="noopener noreferrer">{retailerComparison.label?.[language] ?? text(language, 'retailerComparisonPrice')}</a><s className="manual-reference">{formatter.format(retailerComparison.cents / 100)}</s></p>}
    {comparison && <p className="manual-new-price"><a href={comparison.url} target="_blank" rel="noopener noreferrer">{text(language, 'observedNewModel')}</a><span>{formatter.format(comparison.cents / 100)}{comparison.cents === product.observedPriceCents && ` · ${text(language, 'sameNewPrice')}`}</span></p>}
    <p className="manual-unknown">{text(language, product.observedStock === 'available' ? 'observedInStock' : 'manualUnknown')}</p>
    {product.fulfillmentNote && <p className="manual-fulfillment">{product.fulfillmentNote[language]}</p>}
    {product.pickup?.pickupVerified && <div className="manual-pickup"><p>{text(language, 'pickupAt')}: {product.pickup.name}</p><p>{product.pickup.address}</p>{navigate && <a className="secondary-button" href={navigate} target="_blank" rel="noopener noreferrer"><Icon name="pin" size={18}/>{text(language, 'navigate')}</a>}</div>}
    {product.details && <p className="manual-details">{product.details[language]}</p>}
    <p className="manual-review">{text(language, 'manualChecked')} <time dateTime={product.reviewedAt}>{new Date(product.reviewedAt).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })} UTC</time></p></>;
}
export function ManualProductVisual({ product, language }: { product: ManualProduct; language: Language }) {
  const [failed, setFailed] = useState(false);
  const photo = product.image;
  return <figure className="manual-visual">
    <div className="manual-photo">{photo && !failed ?
      // Exact retailer-hosted image: no proxy, copied asset or synthetic replacement.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photo.url} alt={photo.alt[language]} width={photo.width} height={photo.height} loading="lazy" decoding="async" onError={() => setFailed(true)}/>
      : <p className="manual-image-unavailable">{text(language, 'productImageUnavailable')}</p>}</div>
    <figcaption className="manual-photo-caption"><a href={photo.listingUrl} target="_blank" rel="noopener noreferrer">{text(language, 'retailerProductPhoto')} · {SOURCE_BY_ID.get(product.sourceId)?.name ?? product.brand}</a><span>{text(language, 'productPhotoNote')}</span></figcaption>
  </figure>;
}
export function ManualProducts({ products, records, filterKey, failedSources, checkFailed, language, now, savedIds, onSave, onHide }: {
  onHide?: HideCategoryAction; records: readonly ManualProduct[]; filterKey: string; failedSources: readonly string[]; checkFailed: boolean; products: readonly ManualProduct[]; language: Language; now: number; savedIds: ReadonlySet<string>; onSave: (product: ManualProduct) => void;
}) {
  const [page, setPage] = useState({ filterKey, count: 24 });
  const count = page.filterKey === filterKey ? page.count : 24;
  if (!products.length) return null;
  return <section className="manual-products" aria-labelledby="manual-products-heading"><h2 className="sr-only" id="manual-products-heading">{text(language, 'manualProducts')}</h2>
    {checkFailed && <p className="notice" role="status">{language === 'ru' ? 'Обновить проверку не удалось. Показана последняя сохранённая подборка.' : 'Update check failed. Showing the last published selection.'}</p>}
    <div className="manual-product-grid">{products.slice(0, count).map(product => {
      const pointer = manualSavedPointer(product, now, records), saved = pointer ? savedIds.has(savedIdentity(pointer)) : false;
      const title = `${product.brand} ${product.model}`;
      return <article className="manual-product-card" key={`${product.sourceId}:${product.id}`} data-product-key={product.productKey} data-category={product.category} data-listing-key={`manual:${product.sourceId}:${product.id}`}>
        <div className="manual-card-top"><RetailerBadge sourceId={product.sourceId}/><button type="button" className="manual-save" aria-label={`${text(language, saved ? 'unsave' : 'save')}: ${title}`} aria-pressed={saved} onClick={() => onSave(product)}><Icon name="bookmark" size={21}/></button></div>
        <h3><a href={product.url} target="_blank" rel="noopener noreferrer">{product.brand} {product.model}</a></h3>
        <ManualProductVisual key={product.image.url} product={product} language={language}/>
        {failedSources.includes(product.sourceId) && <p className="notice">{language === 'ru' ? 'Последняя проверка магазина не удалась. Данные ниже — из предыдущей проверки.' : 'Latest retailer check failed. Details below are from the previous check.'}</p>}
        <ManualProductFacts product={product} language={language} now={now}/>
        <a className="manual-retailer" href={product.url} target="_blank" rel="noopener noreferrer">{text(language, 'viewProductAtRetailer')}<Icon name="external" size={17}/></a>
        <HideCategory category={product.category} language={language} onHide={onHide}/>
      </article>;
    })}</div>
    {products.length > count && <button type="button" className="secondary-button show-more" onClick={() => setPage({ filterKey, count: count + 24 })}>{text(language, 'showMore')} · {Math.min(count, products.length)} / {products.length}</button>}
  </section>;
}
