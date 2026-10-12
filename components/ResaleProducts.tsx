'use client';
import { useState } from 'react';
import type { Language } from '../lib/offer.ts';
import type { ResaleListing } from '../lib/resale.ts';
import { netCashRange, resaleSavedPointer } from '../lib/resale.ts';
import { savedIdentity } from '../lib/storage.ts';
import { text } from '../lib/i18n.ts';
import { Icon } from './Icon';
import { HideCategory, type HideCategoryAction } from './HideCategory';

function ResalePhoto({ listing, language }: { listing: ResaleListing; language: Language }) {
  const [failed, setFailed] = useState(false), photo = listing.photos[0];
  return <figure className="manual-visual"><div className="manual-photo">{photo && !failed ?
    // Exact public listing photo. No copied asset, photo proxy or generated replacement.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo.url} alt={photo.alt[language]} width="600" height="450" loading="lazy" decoding="async" onError={() => setFailed(true)}/> : <p className="manual-image-unavailable">{text(language, 'productImageUnavailable')}</p>}</div><figcaption className="manual-photo-caption"><a href={listing.url} target="_blank" rel="noopener noreferrer">{language === 'ru' ? 'Фото объявления' : 'Listing photo'} · {listing.platform === 'craigslist' ? 'Craigslist' : listing.platform === 'facebook' ? 'Facebook' : 'OfferUp'}</a></figcaption></figure>;
}
export function ResaleFacts({ listing, language }: { listing: ResaleListing; language: Language }) {
  const ru = language === 'ru', money = (cents: number) => new Intl.NumberFormat(ru ? 'ru-RU' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
  const net = netCashRange(listing);
  const range = (low: number, high: number) => low === high ? money(low) : `${money(low)}–${money(high)}`;
  const soldSources = new Set(listing.soldComparisons.map(sample => sample.source ?? 'ebay'));
  const soldLabel = soldSources.size === 1 ? (soldSources.has('reverb') ? 'Reverb' : 'eBay') : 'eBay / Reverb';
  const family = listing.facebookComparisons.filter(sample => sample.match === 'related-family');
  const familyPrices = family.map(sample => sample.askingCents);
  return <>
    {listing.status === 'hold' && <p className="notice resale-hold">{ru ? 'Продавец попросил аванс; время и место самовывоза не согласованы. Не платите до личного осмотра. Это повышенный риск, не доказательство мошенничества.' : 'Seller requested an advance deposit; pickup time and place are not agreed. Do not pay before inspecting in person. Increased risk, not proof of fraud.'}</p>}
    <p className="manual-price"><span>{money(listing.askingCents)}</span><small>{ru ? 'Цена продавца' : 'Seller asking price'}</small></p>
    <div className="resale-estimates"><p><span>{ru ? 'Оценка перепродажи б/у' : 'Estimated used resale'}</span><strong>{range(listing.resaleLowCents, listing.resaleHighCents)}</strong></p><p><span>{ru ? 'Резерв расходов' : 'Cost reserve'}</span><strong>{money(listing.reserveCents)}</strong></p><p className="resale-net"><span>{ru ? 'Оценка денежной маржи' : 'Estimated cash margin'}</span><strong>{range(net.lowCents, net.highCents)}</strong></p></div>
    <p className="resale-caveat">{ru ? 'Только после всех проверок. Местная продажа за наличные, до налогов и оплаты труда. Это оценка, не гарантированный доход.' : 'Only if every check passes. Local cash sale, before income tax and labor. An estimate, never guaranteed profit.'}</p>
    <p className="manual-fulfillment">{listing.location} · {ru ? 'Самовывоз, точка не подтверждена' : 'Pickup; exact location unconfirmed'}</p>
    <details className="resale-details"><summary>{ru ? 'Сравнения, риски и проверка' : 'Comparisons, risks & inspection'}</summary>
      <p>{listing.notes[language]}</p>
      <h4>{ru ? 'Facebook: цены объявлений' : 'Facebook asking comparisons'}</h4>
      <p>{ru ? 'Точных совпадений: 0. Средняя цена точной модели и комплекта пока недоступна. Это не проданные товары.' : 'Exact matches: 0. An exact model and bundle average is pending. These are asking prices, not sold prices.'}</p>
      {family.length > 1 && <p>{ru ? 'Похожие модели семейства' : 'Related product family'}: {money(Math.min(...familyPrices))}–{money(Math.max(...familyPrices))} · {ru ? 'Средняя' : 'Mean'} {money(Math.round(familyPrices.reduce((sum, value) => sum + value, 0) / family.length))} · n={family.length}. {ru ? 'Модель и комплект не подтверждены.' : 'Exact labels and bundles unverified.'}</p>}
      <ul>{listing.facebookComparisons.map(sample => <li key={sample.url}><a href={sample.url} target="_blank" rel="noopener noreferrer">{money(sample.askingCents)} · {sample.location}</a> — {sample.notes[language]} <time dateTime={sample.checkedAt}>{new Date(sample.checkedAt).toLocaleString(ru ? 'ru-RU' : 'en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })} UTC</time></li>)}</ul>
      <h4>{soldLabel} · {ru ? 'Свидетельства продаж' : 'Sold evidence'}</h4><ul>{listing.soldComparisons.map((sample, index) => <li key={`${sample.url}:${sample.soldAt}:${index}`}><a href={sample.url} target="_blank" rel="noopener noreferrer">{sample.source === 'reverb' ? 'Reverb · ' : 'eBay · '}{money(sample.amountCents)}{sample.shippingCents ? ` + ${money(sample.shippingCents)} ${ru ? 'доставка' : 'shipping'}` : ''} · {sample.soldAt}</a> — {sample.notes[language]}{sample.basis === 'displayed-sold-price' && <strong> · {ru ? 'Показанная цена продажи; итоговые поступления не подтверждены' : 'Displayed sold price; final proceeds unverified'}</strong>}{sample.basis === 'accepted-offer-upper-bound' && <strong> · {ru ? 'Верхняя граница; принятая цена скрыта' : 'Upper bound; accepted price hidden'}</strong>}</li>)}</ul>
      <p className="muted small">{ru ? 'Местный диапазон — осторожная оценка на основе этих сравнений, а не средняя цена рынка.' : 'The local resale range is a conservative estimate from these comparisons, not a market average.'}</p>
      {listing.newPriceReference && <p><a href={listing.newPriceReference.url} target="_blank" rel="noopener noreferrer">{money(listing.newPriceReference.cents)}</a> — {listing.newPriceReference.notes[language]}</p>}
      <h4>{ru ? 'Размеры и перевозка' : 'Size & transport'}</h4><p>{listing.dimensions[language]}</p>{listing.dimensionsSource && <p><a href={listing.dimensionsSource} target="_blank" rel="noopener noreferrer">{ru ? 'Размеры производителя' : 'Manufacturer dimensions'}</a></p>}<p>{ru ? 'Модель Tesla неизвестна. Совместимость с конкретным багажником не подтверждена.' : 'Tesla model unknown. Fit in a particular trunk is unverified.'}</p>
      <h4>{ru ? 'Проверить до покупки' : 'Test before buying'}</h4><ul>{listing.tests.map((item, index) => <li key={index}>{item[language]}</li>)}</ul>
    </details>
    <p className="manual-review">{ru ? 'Объявление просмотрено' : 'Listing observed'} <time dateTime={listing.checkedAt}>{new Date(listing.checkedAt).toLocaleString(ru ? 'ru-RU' : 'en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })} UTC</time>. {ru ? 'Продавец наличие не подтвердил.' : 'Availability not confirmed by seller.'}</p>
  </>;
}
export function ResaleProducts({ listings, records, language, now, savedIds, onSave, onHide }: { listings: readonly ResaleListing[]; records: readonly ResaleListing[]; language: Language; now: number; savedIds: ReadonlySet<string>; onSave: (listing: ResaleListing) => void; onHide?: HideCategoryAction }) {
  return <section aria-label={language === 'ru' ? 'Объявления для перепродажи' : 'Resale inspection leads'} className="manual-products"><h2 className="sr-only">{language === 'ru' ? 'Варианты для проверки' : 'Inspection leads'}</h2><div className="manual-product-grid">{listings.map(listing => {
    const pointer = resaleSavedPointer(listing, now, records), saved = pointer ? savedIds.has(savedIdentity(pointer)) : false;
    return <article className="manual-product-card resale-card" key={listing.id} data-category={listing.category} data-listing-key={`resale:${listing.id}`}>
      <div className="manual-card-top"><p className="retailer-badge">{listing.platform === 'craigslist' ? 'Craigslist' : listing.platform === 'facebook' ? 'Facebook' : 'OfferUp'}</p><button type="button" className="manual-save" aria-label={`${text(language, saved ? 'unsave' : 'save')}: ${listing.title[language]}`} aria-pressed={saved} onClick={() => onSave(listing)}><Icon name="bookmark" size={21}/></button></div>
      <h3><a href={listing.url} target="_blank" rel="noopener noreferrer">{listing.title[language]}</a></h3>
      <p className={`resale-inspect${listing.status === 'hold' ? ' resale-hold' : ''}`}>{listing.status === 'hold' ? (language === 'ru' ? 'Приостановлено · риск авансового платежа' : 'On hold · advance-deposit risk') : listing.status === 'inspect-first' ? (language === 'ru' ? 'Проверить лично' : 'Inspect first') : (language === 'ru' ? 'Условный вариант · нужна проверка' : 'Conditional · inspection required')}</p>
      <ResalePhoto key={listing.photos[0]?.url} listing={listing} language={language}/><ResaleFacts listing={listing} language={language}/>
      <a className="manual-retailer" href={listing.url} target="_blank" rel="noopener noreferrer">{language === 'ru' ? 'Открыть объявление' : 'Open listing'}<Icon name="external" size={17}/></a><HideCategory category={listing.category} language={language} onHide={onHide}/>
    </article>;
  })}</div></section>;
}
