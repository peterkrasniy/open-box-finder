import type { Language } from '../lib/offer.ts';
import type { ManualProduct } from '../lib/manual-products.ts';
import { manualSavedPointer } from '../lib/manual-products.ts';
import { savedIdentity } from '../lib/storage.ts';
import { text } from '../lib/i18n.ts';
import { Icon } from './Icon';

export function ManualProductFacts({ product, language }: { product: ManualProduct; language: Language }) {
  const price = new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'en-US', { style: 'currency', currency: product.currency }).format(product.observedPriceCents / 100);
  return <><p className="manual-condition">{text(language, 'certifiedRefurbished')}</p><p className="manual-price"><span>{price}</span><small>{text(language, 'observedPrice')}</small></p>
    <p className="manual-unknown">{text(language, 'manualUnknown')}</p>
    <p className="manual-review">{text(language, 'manualChecked')} <time dateTime={product.reviewedAt}>{new Date(product.reviewedAt).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })} UTC</time></p></>;
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
        <p className="manual-brand">{product.brand}</p><h3><a href={product.url} target="_blank" rel="noopener noreferrer">{product.model}</a></h3>
        <ManualProductFacts product={product} language={language}/>
        <a className="manual-retailer" href={product.url} target="_blank" rel="noopener noreferrer">{text(language, 'viewProductAtRetailer')}<Icon name="external" size={17}/></a>
      </article>;
    })}</div>
  </section>;
}
