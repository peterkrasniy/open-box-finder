import type { Language } from '../lib/offer.ts';
import type { ManualProduct } from '../lib/manual-products.ts';
import { manualSavedPointer, manualNewModelComparison, manualRetailerComparison, manualSupportedReference } from '../lib/manual-products.ts';
import { useState } from 'react';
import { savedIdentity } from '../lib/storage.ts';
import { conditionLabel, referenceLabel, text } from '../lib/i18n.ts';
import { Icon } from './Icon';
import { SOURCE_BY_ID } from '../lib/sources.ts';

export function ManualProductFacts({ product, language, now }: { product: ManualProduct; language: Language; now: number }) {
  const formatter = new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'en-US', { style: 'currency', currency: product.currency });
  const price = formatter.format(product.observedPriceCents / 100), comparison = manualNewModelComparison(product, now);
  const retailerComparison = manualRetailerComparison(product, now), supported = manualSupportedReference(product, now);
  return <><p className="manual-condition">{product.conditionDetail?.[language] ?? conditionLabel(language, product.condition)}</p><p className="manual-price"><span>{price}</span><small>{text(language, 'observedPrice')}</small></p>
    {supported && <><p className="manual-comparison"><a href={supported.url} target="_blank" rel="noopener noreferrer">{referenceLabel(language, supported.basis)}</a><s className="manual-reference">{formatter.format(supported.cents / 100)}</s></p><p className="manual-saving">{formatter.format(supported.savingCents / 100)} · {product.observedPriceCents === 0 ? 100 : Math.min(99, Math.round(supported.fraction * 100))}% <span>{text(language, 'referenceSavings')}</span></p></>}
    {retailerComparison && <p className="manual-comparison"><a href={retailerComparison.url} target="_blank" rel="noopener noreferrer">{text(language, 'retailerComparisonPrice')}</a><s className="manual-reference">{formatter.format(retailerComparison.cents / 100)}</s></p>}
    {comparison && <p className="manual-new-price"><a href={comparison.url} target="_blank" rel="noopener noreferrer">{text(language, 'observedNewModel')}</a><span>{formatter.format(comparison.cents / 100)}{comparison.cents === product.observedPriceCents && ` · ${text(language, 'sameNewPrice')}`}</span></p>}
    <p className="manual-unknown">{text(language, product.observedStock === 'available' ? 'observedInStock' : 'manualUnknown')}</p>
    {product.fulfillmentNote && <p className="manual-fulfillment">{product.fulfillmentNote[language]}</p>}
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
export function ManualProducts({ products, language, now, savedIds, onSave }: {
  products: readonly ManualProduct[]; language: Language; now: number; savedIds: ReadonlySet<string>; onSave: (product: ManualProduct) => void;
}) {
  if (!products.length) return null;
  return <section className="manual-products" aria-labelledby="manual-products-heading"><div className="manual-section-heading"><h2 id="manual-products-heading">{text(language, 'manualProducts')}</h2><span>{products.length}</span></div><p className="manual-help">{text(language, 'manualProductsHelp')}</p>
    <div className="manual-product-grid">{products.map(product => {
      const pointer = manualSavedPointer(product, now), saved = pointer ? savedIds.has(savedIdentity(pointer)) : false;
      const title = `${product.brand} ${product.model}`;
      return <article className="manual-product-card" key={product.id}>
        <div className="manual-card-top"><span className="manual-badge">{text(language, 'manualOnly')}</span><button type="button" className="manual-save" aria-label={`${text(language, saved ? 'unsave' : 'save')}: ${title}`} aria-pressed={saved} onClick={() => onSave(product)}><Icon name="bookmark" size={21}/></button></div>
        <p className="manual-brand">{SOURCE_BY_ID.get(product.sourceId)?.name ?? product.sourceId} · {product.brand}</p><h3><a href={product.url} target="_blank" rel="noopener noreferrer">{product.model}</a></h3>
        <ManualProductVisual product={product} language={language}/>
        <ManualProductFacts product={product} language={language} now={now}/>
        <a className="manual-retailer" href={product.url} target="_blank" rel="noopener noreferrer">{text(language, 'viewProductAtRetailer')}<Icon name="external" size={17}/></a>
      </article>;
    })}</div>
  </section>;
}
