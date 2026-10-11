import type { Language } from '../lib/offer.ts';
import type { ManualProduct } from '../lib/manual-products.ts';
import { manualSavedPointer, manualNewModelComparison, manualRetailerComparison } from '../lib/manual-products.ts';
import { useEffect, useRef, useState } from 'react';
import { savedIdentity } from '../lib/storage.ts';
import { text } from '../lib/i18n.ts';
import { Icon } from './Icon';

export function ManualProductFacts({ product, language, now }: { product: ManualProduct; language: Language; now: number }) {
  const formatter = new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'en-US', { style: 'currency', currency: product.currency });
  const price = formatter.format(product.observedPriceCents / 100), comparison = manualNewModelComparison(product, now);
  const retailerComparison = manualRetailerComparison(product, now);
  return <><p className="manual-condition">{text(language, 'certifiedRefurbished')}</p><p className="manual-price"><span>{price}</span><small>{text(language, 'observedPrice')}</small></p>
    {retailerComparison && <p className="manual-comparison"><a href={retailerComparison.url} target="_blank" rel="noopener noreferrer">{text(language, 'retailerComparisonPrice')}</a><s className="manual-reference">{formatter.format(retailerComparison.cents / 100)}</s></p>}
    {comparison && <p className="manual-new-price"><a href={comparison.url} target="_blank" rel="noopener noreferrer">{text(language, 'observedNewModel')}</a><span>{formatter.format(comparison.cents / 100)}{comparison.cents === product.observedPriceCents && ` · ${text(language, 'sameNewPrice')}`}</span></p>}
    <p className="manual-unknown">{text(language, 'manualUnknown')}</p>
    <p className="manual-review">{text(language, 'manualChecked')} <time dateTime={product.reviewedAt}>{new Date(product.reviewedAt).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })} UTC</time></p></>;
}
export function ManualProductVisual({ product, language }: { product: ManualProduct; language: Language }) {
  const [load, setLoad] = useState(false), target = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!target.current) return;
    if (!('IntersectionObserver' in window)) {
      const frame = requestAnimationFrame(() => setLoad(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setLoad(true); observer.disconnect(); }
    }, { rootMargin: '160px 0px' });
    observer.observe(target.current);
    return () => observer.disconnect();
  }, []);
  const video = product.video;
  return <div className="manual-visual" ref={target}>
    <div className="manual-player">{load ? <iframe title={`${text(language, 'modelVideo')}: ${product.brand} ${product.model} · ${video.creator}`} src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=0&playsinline=1&cc_load_policy=1&cc_lang_pref=${language}&hl=${language}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen/> : <span className="manual-player-loading">{text(language, 'modelVideo')}</span>}</div>
    <div className="manual-video-caption"><span>{text(language, video.kind === 'manufacturer' ? 'manufacturerVideo' : video.kind === 'retailer-review' ? 'retailerVideo' : 'independentVideo')} · {video.creator}</span><a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer">YouTube<Icon name="external" size={13}/><span className="sr-only"> · {text(language, 'watchOnYouTube')}</span></a></div>
    <p className="manual-video-note">{text(language, 'modelVideoNote')}</p>
  </div>;
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
        <ManualProductVisual product={product} language={language}/>
        <ManualProductFacts product={product} language={language} now={now}/>
        <a className="manual-retailer" href={product.url} target="_blank" rel="noopener noreferrer">{text(language, 'viewProductAtRetailer')}<Icon name="external" size={17}/></a>
      </article>;
    })}</div>
  </section>;
}
