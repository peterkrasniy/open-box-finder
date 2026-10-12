'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_FILTERS } from '../lib/offer.ts';
import type { Category, Filters, Offer, Language } from '../lib/offer.ts';
import { savedIdentity, offerIdentity } from '../lib/storage.ts';
import { filterAndSort, validPoint } from '../lib/filter.ts';
import { editPrice, parsePrice, validateRange } from '../lib/money.ts';
import { categoryLabel, listingCount, SORTS, sortLabel, text } from '../lib/i18n.ts';
import type { TextKey } from '../lib/i18n.ts';
import { useCatalog } from '../hooks/useCatalog';
import { usePreferences } from '../hooks/usePreferences';
import { useRoute } from '../hooks/useRoute';
import { Icon } from './Icon';
import { Dialog } from './Dialog';
import { FilterFields } from './FilterFields';
import type { FilterDraft } from './FilterFields';
import { LocationFields, locationDraft } from './LocationFields';
import type {LocationErrorField} from './LocationFields';
import { OfferCard } from './OfferCard';
import { OfferDetail } from './OfferDetail';
import { SavedRows } from './SavedRows';
import { SyndicatedDeals } from './SyndicatedDeals';
import { SourceCoverage } from './SourceCoverage';
import { SourceStatus } from './SourceStatus';
import { OutboundLinks } from './OutboundLinks';
import { ManualProducts } from './ManualProducts';
import { useManualCatalog } from '../hooks/useManualCatalog';
import { useResaleCatalog } from '../hooks/useResaleCatalog';
import { ResaleProducts } from './ResaleProducts';
import { resaleActive } from '../lib/resale.ts';
import { useDismissedListings } from '../hooks/useDismissedListings';
import { manualDismissIdentity, resaleDismissIdentity, offerDismissIdentity } from '../lib/dismissals.ts';
import { manualProductActive, manualProductsForFilters } from '../lib/manual-products.ts';

function filterFingerprint(value: Filters): string {
  const { retailers, categories, fulfillment, minCents, maxCents, radiusMiles } = value;
  return JSON.stringify({ retailers, categories, fulfillment, minCents, maxCents, radiusMiles });
}
function makeFilterDraft(value: Filters, language: Language): FilterDraft {
  return { filters: structuredClone(value), min: editPrice(value.minCents, language), max: editPrice(value.maxCents, language), radius: String(value.radiusMiles) };
}

export function OpenBoxApp() {
  const { preferences, setPreferences, saved, ready, storageAvailable, saveError, toggleSaved, toggleManualSaved, toggleResaleSaved, removeSaved } = usePreferences();
  const { dismissedIds, dismissalStorageAvailable, dismissListing, restoreListing, restoreAllListings } = useDismissedListings();
  const { route, navigate, dismiss } = useRoute();
  const { catalog, status, now, refresh } = useCatalog(ready);
  const { language, filters, sort } = preferences;
  const manualCatalog = useManualCatalog(ready);
  const resaleCatalog = useResaleCatalog(ready);
  const hiddenCategories = useMemo(() => preferences.hiddenCategories ?? [], [preferences.hiddenCategories]);
  const manualProducts = useMemo(() => manualProductsForFilters(filters, sort, now, manualCatalog.records).filter(product => !hiddenCategories.includes(product.category) && !dismissedIds.has(manualDismissIdentity(product))), [filters, sort, now, manualCatalog.records, hiddenCategories, dismissedIds]);
  const undoScroll = useRef(0);
  const resaleProducts = useMemo(() => resaleCatalog.records.filter(listing => resaleActive(listing, now)
    && !hiddenCategories.includes(listing.category) && !dismissedIds.has(resaleDismissIdentity(listing))
    && (!preferences.resalePlatform || preferences.resalePlatform === 'all' || listing.platform === preferences.resalePlatform)
    && (filters.categories.mode === 'all' || filters.categories.ids.includes(listing.category))
    && (filters.minCents === null || listing.askingCents >= filters.minCents)
    && (filters.maxCents === null || listing.askingCents <= filters.maxCents)
    && filters.fulfillment !== 'shipped'
    && `${listing.title.en} ${listing.title.ru} ${listing.location}`.toLocaleLowerCase().includes(filters.query.trim().toLocaleLowerCase())), [resaleCatalog.records, now, hiddenCategories, preferences.resalePlatform, filters, dismissedIds]);
  const [lastHidden, setLastHidden] = useState<Category | null>(null);
  const [lastDeleted, setLastDeleted] = useState<{ identity: string; title: string; scrollY: number } | null>(null);
  const deletionGestureAt = useRef(-Infinity);
  const restoreIndividualListing = (identity: string) => { restoreListing(identity); deletionGestureAt.current = -Infinity; };
  const restoreDeleted = () => { restoreAllListings(); setLastDeleted(null); };
  const deleteListing = useCallback((identity: string, title: string, trigger?: HTMLElement) => {
    // An immediate repeated click must not delete a successor that moves under the pointer.
    const gestureNow = performance.now();
    if (dismissedIds.has(identity) || gestureNow - deletionGestureAt.current < 300) return;
    deletionGestureAt.current = gestureNow;
    const scrollY = window.scrollY;
    const cards = [...document.querySelectorAll<HTMLElement>('[data-listing-key]')];
    const current = trigger?.closest<HTMLElement>('[data-listing-key]') ?? cards.find(card => card.dataset.dismissKey === identity);
    const index = current ? cards.indexOf(current) : -1;
    const anchor = [...cards.slice(index + 1), ...cards.slice(0, index)].find(card => card.dataset.dismissKey !== identity);
    const key = anchor?.dataset.listingKey, top = anchor?.getBoundingClientRect().top;
    dismissListing(identity); setLastDeleted({ identity, title, scrollY }); setLastHidden(null);
    if (route.offerId) navigate({ view: route.view, offerId: null, panel: null }, true, true);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const target = key ? [...document.querySelectorAll<HTMLElement>('[data-listing-key]')].find(card => card.dataset.listingKey === key) : null;
      if (target && top !== undefined) { window.scrollBy({ top: target.getBoundingClientRect().top - top, behavior: 'instant' }); target.tabIndex = -1; target.focus({ preventScroll: true }); }
      else document.querySelector<HTMLElement>('#listing-undo-button')?.focus({ preventScroll: true });
    }));
  }, [dismissedIds, dismissListing, navigate, route.offerId, route.view]);
  const restoreCategory = (category: Category | null) => { setPreferences(previous => ({ ...previous, hiddenCategories: category ? (previous.hiddenCategories ?? []).filter(value => value !== category) : [] })); setLastHidden(null); };
  const hideCategory = (category: Category, trigger?: HTMLElement) => {
    const cards = [...document.querySelectorAll<HTMLElement>('[data-listing-key]')];
    const current = trigger?.closest<HTMLElement>('[data-listing-key]');
    undoScroll.current = window.scrollY;
    const index = current ? cards.indexOf(current) : Math.max(0, cards.findIndex(card => card.getBoundingClientRect().bottom > 160) - 1);
    const anchor = [...cards.slice(index + 1), ...cards.slice(0, index)].find(card => card.dataset.category !== category);
    const key = anchor?.dataset.listingKey, top = anchor?.getBoundingClientRect().top;
    setPreferences(previous => ({ ...previous, hiddenCategories: [...new Set([...(previous.hiddenCategories ?? []), category])] }));
    setLastHidden(category); setLastDeleted(null);
    if (route.offerId) navigate({ view: route.view, offerId: null, panel: null }, true, true);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const target = key ? [...document.querySelectorAll<HTMLElement>('[data-listing-key]')].find(card => card.dataset.listingKey === key) : null;
      if (target && top !== undefined) { window.scrollBy({ top: target.getBoundingClientRect().top - top, behavior: 'instant' }); target.tabIndex = -1; target.focus({ preventScroll: true }); }
      else document.querySelector<HTMLElement>('#category-undo-button')?.focus({ preventScroll: true });
    }));
  };
  const hasReviewedProducts = manualCatalog.records.some(product => manualProductActive(product, now));
  const t = (key: TextKey) => text(language, key);
  const [edited, setEdited] = useState<{ value: FilterDraft; base: string } | null>(null);
  const fingerprint = filterFingerprint(filters);
  const draft = edited?.value ?? makeFilterDraft(filters, language);
  const conflict = edited !== null && edited.base !== fingerprint;
  const setDraft = (value: FilterDraft) => { setEdited(previous => ({ value, base: previous?.base ?? fingerprint })); setError(null); };
  const [errorField, setErrorField] = useState<'min' | 'max' | 'radius' | null>(null);
  const lastFilterFocus = useRef('min');
  const [location, setLocation] = useState(() => locationDraft(DEFAULT_FILTERS));
  const [locationErrorField,setLocationErrorField] = useState<LocationErrorField | null>(null);
  const [error, setError] = useState<TextKey | null>(null);
  const [wide, setWide] = useState(false);
  const [pagination, setPagination] = useState<{ filters: Filters | null; sort: typeof sort | null; count: number }>({ filters: null, sort: null, count: 60 });
  const visibleCount = pagination.filters === filters && pagination.sort === sort ? pagination.count : 60;
  const previousPanel = useRef(route.panel);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    // CSS can blur a hidden rail before matchMedia fires. Retain intentional filter focus.
    let priorFilterFocus = false;
    const isFilterTarget = (target: HTMLElement) => Boolean(target.closest('.filter-rail, .filter-dialog') || target.matches('[data-filter-opener]'));
    const changed = () => {
      const active = document.activeElement as HTMLElement | null;
      const hadFilterFocus = priorFilterFocus || Boolean(active && isFilterTarget(active));
      setWide(media.matches);
      if (hadFilterFocus) requestAnimationFrame(() => requestAnimationFrame(() => {
        if (document.querySelector('dialog[open]')) return;
        const target = media.matches ? document.querySelector<HTMLElement>(`[data-filter-control="${lastFilterFocus.current}"]`) : document.querySelector<HTMLElement>('[data-filter-opener]');
        target?.focus();
      }));
    };
    const focused = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target !== document.body) priorFilterFocus = isFilterTarget(target);
      if (target.dataset?.filterControl) lastFilterFocus.current = target.dataset.filterControl;
    };
    const pointed = (event: PointerEvent) => { if (event.target instanceof HTMLElement && !isFilterTarget(event.target)) priorFilterFocus = false; };
    changed(); media.addEventListener('change', changed); document.addEventListener('focusin', focused); document.addEventListener('pointerdown', pointed);
    return () => { media.removeEventListener('change', changed); document.removeEventListener('focusin', focused); document.removeEventListener('pointerdown', pointed); };
  }, []);
  useEffect(() => {
    if (previousPanel.current === 'filters' && route.panel !== 'filters') { setEdited(null); setError(null); }
    previousPanel.current = route.panel;
  }, [route.panel]);
  const listings = useMemo(() => filterAndSort(catalog.offers, filters, sort, now).filter(offer => !hiddenCategories.includes(offer.category) && !dismissedIds.has(offerDismissIdentity(offer))), [catalog.offers, filters, sort, now, hiddenCategories, dismissedIds]);
  const savedIds = useMemo(() => new Set(saved.map(savedIdentity)), [saved]);
  const detail = useMemo(() => catalog.offers.find(offer => offer.id === route.offerId && offerIdentity(offer) === route.offerIdentity && (route.view === 'saved' || !dismissedIds.has(offerDismissIdentity(offer)))) ?? null, [catalog.offers, route.offerId, route.offerIdentity, route.view, dismissedIds]);
  const updateFilters = (change: Partial<Filters>) => {
    setPreferences(previous => ({ ...previous, filters: { ...previous.filters, ...change } }));
    if (edited) setEdited(previous => previous ? ({ ...previous, value: { ...previous.value, filters: { ...previous.value.filters, ...change } }, base: previous.base === fingerprint ? filterFingerprint({ ...filters, ...change }) : previous.base }) : null);
  };
  const openOffer = useCallback((offer: Offer) => navigate({ view: route.view, offerId: offer.id, offerIdentity: offerIdentity(offer), panel: null }), [navigate, route.view]);
  const saveOffer = useCallback((offer: Offer) => { toggleSaved(offer, catalog.sequence); }, [toggleSaved, catalog.sequence]);
  const openPanel = (panel: 'filters' | 'location') => { setError(null); setLocationErrorField(null); if (panel === 'location') setLocation(locationDraft(filters)); navigate({ view: route.view, offerId: null, panel }); };
  const restoreFilterFocus = () => requestAnimationFrame(() => requestAnimationFrame(() => { if (!wide) return; document.querySelector<HTMLElement>(`[data-filter-control="${lastFilterFocus.current}"]`)?.focus(); }));
  const resolveConflict=(keep:boolean)=>{setEdited(previous=>keep&&previous?{...previous,base:fingerprint}:null);setError(null);requestAnimationFrame(()=>{document.querySelector<HTMLElement>(`${route.panel==='filters'?'dialog':'.filter-rail'} [data-filter-control="${lastFilterFocus.current}"]`)?.focus();});};
  const cancelFilters = () => { setEdited(null); setError(null); if (route.panel) { dismiss(); restoreFilterFocus(); } };
  const cancelLocation = () => { setLocation(locationDraft(filters)); setError(null); dismiss(); };
  const showFilterError = (key: TextKey, field: 'min' | 'max' | 'radius') => {
    setError(key); setErrorField(field);
    requestAnimationFrame(() => { const input = document.querySelector<HTMLInputElement>(`${route.panel === 'filters' ? 'dialog' : '.filter-rail'} [data-filter-control="${field}"]`); input?.scrollIntoView({ block: 'center', behavior: 'instant' }); input?.focus({ preventScroll: true }); });
  };
  const resetFilters = () => { const next = { ...structuredClone(DEFAULT_FILTERS), origin: filters.origin, radiusMiles: filters.radiusMiles }; setPreferences(previous => ({ ...previous, filters: next })); setEdited(null); };
  const applyFilters = () => {
    if (conflict) {
      requestAnimationFrame(() => {
        const notice = document.querySelector<HTMLElement>(`${route.panel === 'filters' ? 'dialog' : '.filter-rail'} [data-filter-conflict]`);
        notice?.scrollIntoView({ block: 'center', behavior: 'instant' }); notice?.focus({ preventScroll: true });
      });
      return;
    }
    const minimum = parsePrice(draft.min), maximum = parsePrice(draft.max);
    if (!minimum.ok || !maximum.ok) { showFilterError('invalidPrice', !minimum.ok ? 'min' : 'max'); return; }
    const range = validateRange(minimum.cents, maximum.cents);
    if (range) { showFilterError(range === 'invalid-range' ? 'invalidRange' : 'invalidPrice', 'min'); return; }
    const radius = Number(draft.radius.replace(',', '.'));
    if (!/^\d{1,3}(?:[.,]\d{1,2})?$/.test(draft.radius) || !Number.isFinite(radius) || radius < 0 || radius > 500) { showFilterError('invalidRadius', 'radius'); return; }
    const next = { ...draft.filters, query: filters.query, origin: filters.origin, minCents: minimum.cents, maxCents: maximum.cents, radiusMiles: radius };
    setPreferences(previous => ({ ...previous, filters: next })); setEdited(null); setError(null); if (route.panel) { dismiss(); restoreFilterFocus(); }
  };
  const applyLocation = () => {
    const coordinate = (value: string) => /^[+-]?\d{1,3}(?:[.,]\d{1,8})?$/.test(value.trim()) ? Number(value.replace(',', '.')) : NaN;
    const point = { latitude: coordinate(location.latitude), longitude: coordinate(location.longitude) };
    const locationError = (key:TextKey,field:LocationErrorField) => { setError(key);setLocationErrorField(field);requestAnimationFrame(()=>{const input=document.querySelector<HTMLInputElement>(`dialog [data-location-control="${field}"]`);input?.closest('.location-field')?.scrollIntoView({block:'center',behavior:'instant'});input?.focus({preventScroll:true});}); };
    if (!location.label.trim() || location.label.length > 80) { locationError('invalidLocation','label'); return; }
    if (!validPoint(point)) { locationError('invalidLocation',!Number.isFinite(point.latitude)||point.latitude < -90||point.latitude > 90?'latitude':'longitude'); return; }
    const radius = Number(location.radius.replace(',', '.'));
    if (!/^\d{1,3}(?:[.,]\d{1,2})?$/.test(location.radius) || !Number.isFinite(radius) || radius < 0 || radius > 500) { locationError('invalidRadius','radius'); return; }
    updateFilters({ origin: { ...point, label: location.label.trim(), shippingState: location.shippingState }, radiusMiles: radius }); setError(null); dismiss();
  };

  const filterError = error && route.panel !== 'location' ? t(error) : null;
  return <div className="app-shell">
    <a className="skip-link" href="#listings">{t('skip')}</a>
    <header className="app-header"><h1 className="brand"><Icon name="box" size={24}/><span>{t('brand')}</span></h1>
      <nav className="desktop-nav" aria-label={t('deals')}><button type="button" aria-current={route.view === 'deals' ? 'page' : undefined} onClick={() => navigate({ view: 'deals', offerId: null, panel: null })}>{t('deals')}</button><button type="button" aria-current={route.view === 'resale' ? 'page' : undefined} onClick={() => navigate({ view: 'resale', offerId: null, panel: null })}>{t('resale')}</button><button type="button" aria-current={route.view === 'saved' ? 'page' : undefined} onClick={() => navigate({ view: 'saved', offerId: null, panel: null })}>{t('saved')}{saved.length > 0 && <span>{saved.length}</span>}</button></nav>
      <div className="language-switch" role="group" aria-label={t('language')}>{(['en', 'ru'] as const).map(value => <button type="button" key={value} lang={value} aria-pressed={language === value} onClick={() => setPreferences(previous => ({ ...previous, language: value }))}>{value === 'en' ? 'EN' : 'РУ'}</button>)}</div>
    </header>
    <div className="search-location" role="search" aria-label={t('search')}><label className="search-field"><Icon name="search"/><span className="sr-only">{t('search')}</span><input type="search" value={filters.query} placeholder={t('searchHint')} maxLength={160} onChange={event => updateFilters({ query: event.target.value })}/></label><button type="button" className="location-button" onClick={() => openPanel('location')}><Icon name="pin"/><span><strong>{filters.origin.label}</strong><small>{filters.radiusMiles} {t('miles')}</small></span><Icon name="down" size={18}/></button>{<><button type="button" className="secondary-button compact-filter" data-filter-opener aria-label={t('filters')} title={t('filters')} onClick={() => openPanel('filters')}><Icon name="filters" size={20}/></button>{route.view === 'resale' ? <label className="compact-sort"><span className="sr-only">{language === 'ru' ? 'Площадка' : 'Marketplace'}</span><select value={preferences.resalePlatform ?? 'all'} onChange={event => setPreferences(previous => ({ ...previous, resalePlatform: event.target.value as 'all' | 'craigslist' | 'facebook' | 'offerup' }))}><option value="all">{language === 'ru' ? 'Все площадки' : 'All marketplaces'}</option><option value="facebook">Facebook</option><option value="craigslist">Craigslist</option><option value="offerup">OfferUp</option></select></label> : <label className="sort-mobile compact-sort"><span className="sr-only">{t('sort')}</span><select value={sort} onChange={event => setPreferences(previous => ({ ...previous, sort: event.target.value as typeof sort }))}>{SORTS.map(value => <option key={value} value={value}>{sortLabel(language, value)}</option>)}</select></label>}</>}</div>
    <div className="shopping-layout">
      {route.view !== 'saved' && <aside className="filter-rail" aria-label={t('filters')}>{route.panel !== 'filters' && <><FilterFields deletedCount={dismissedIds.size} onRestoreDeleted={restoreDeleted} mode={route.view === 'resale' ? 'resale' : 'retail'} hiddenCategories={hiddenCategories} onRestore={restoreCategory} draft={draft} language={language} onChange={setDraft} error={filterError} errorField={errorField} idPrefix="rail"/>{conflict && <div className="notice" role="alert" data-filter-conflict tabIndex={-1}><p>{t('filtersChanged')}</p><button type="button" className="text-action" onClick={() => resolveConflict(false)}>{t('useUpdatedFilters')}</button><button type="button" className="text-action" onClick={() => resolveConflict(true)}>{t('keepMyEdits')}</button></div>}<div className="filter-actions"><button type="button" className="secondary-button" onClick={cancelFilters}>{t('cancel')}</button><button type="button" className="primary-button" onClick={applyFilters}>{t('apply')}</button></div></>}</aside>}
      <main id="listings" className={`listing-main${route.view === 'saved' ? ' saved-main' : ''}`} tabIndex={-1}>
        {route.view === 'saved' && <div className="listing-toolbar"><h2>{t('saved')}</h2></div>}
        {(!storageAvailable || !dismissalStorageAvailable) && <p className="notice" role="status">{t('storageUnavailable')}</p>}
        {saveError && <p className="notice error" role="alert">{t(saveError)}</p>}
        <div className="catalog-status" role="status" aria-live="polite" aria-atomic="true">
          {route.view === 'resale' ? `${resaleProducts.length} ${language === 'ru' ? 'проверенных наблюдения' : 'checked observations'}` : status === 'loading' ? t('updating') : status === 'offline' ? t('offline') : status === 'error' ? t('updateFailed') : route.view === 'deals' && !catalog.offers.length && hasReviewedProducts ? listingCount(language, manualProducts.length, true) : route.view === 'saved' ? listingCount(language, saved.length) : catalog.sequence === 0 ? t('noSourceConnected') : listingCount(language, listings.length)}
          {(status === 'error' || status === 'offline') && <button type="button" className="text-action" onClick={refresh}>{t('refresh')}</button>}
        </div>
        {route.view === 'deals' && catalog.offers.length > 0 && <SourceCoverage catalog={catalog} language={language} now={now}/>}
        {route.view === 'deals' && <ManualProducts onDelete={deleteListing} onHide={hideCategory} products={manualProducts} records={manualCatalog.records} filterKey={JSON.stringify([filters, sort])} failedSources={manualCatalog.failedSources} checkFailed={manualCatalog.failed} language={language} now={now} savedIds={savedIds} onSave={product => toggleManualSaved(product, now, manualCatalog.records)}/>}
        {route.view === 'resale' ? <>
          {resaleCatalog.failed && <p className="notice" role="status">{language === 'ru' ? 'Не удалось обновить. Показана последняя проверенная подборка.' : 'Update failed. Showing the last checked selection.'}</p>}
          <ResaleProducts onDelete={deleteListing} listings={resaleProducts} records={resaleCatalog.records} language={language} now={now} savedIds={savedIds} onSave={listing => toggleResaleSaved(listing, now, resaleCatalog.records)} onHide={hideCategory}/>
          {!resaleProducts.length && <section className="empty-state"><h2>{language === 'ru' ? 'Подходящих проверенных объявлений нет' : 'No matching checked leads'}</h2><p>{language === 'ru' ? 'Для этой площадки или фильтров пока нет подходящего проверенного варианта. Цены и наличие не выдумываются.' : 'No qualifying checked lead for this marketplace or these filters yet.'}</p></section>}
          <p className="muted small resale-method">{language === 'ru' ? 'Ручная проверка, не поток живых объявлений. Точная точка самовывоза не подтверждена; радиус не проверен. Обновления опубликованной подборки появляются автоматически. Подборка истекает через 24 часа.' : 'Manually checked, not a live marketplace feed. Exact pickup point is unconfirmed; radius is unverified. Published updates appear automatically. Observations expire after 24 hours.'}</p>
        </> : route.view === 'saved' ? <>
          <p className="saved-privacy"><Icon name="bookmark" size={18}/>{t('savedPrivacy')}</p>
          {saved.length ? <SavedRows onDelete={deleteListing} dismissedIds={dismissedIds} onRestore={restoreIndividualListing} resaleRecords={resaleCatalog.records} hiddenCategories={hiddenCategories} onHide={hideCategory} manualRecords={manualCatalog.records} saved={saved} catalog={catalog} status={status} language={language} now={now} onOpen={openOffer} onRemove={removeSaved}/>
            : <section className="empty-state"><span className="empty-icon"><Icon name="bookmark" size={38}/></span><h2>{t('noSaved')}</h2><p>{t('noSavedHelp')}</p></section>}
        </> : listings.length ? <>
          <div className="offer-grid">{listings.slice(0, visibleCount).map((offer, index) => <OfferCard onDelete={deleteListing} onHide={hideCategory} key={offer.id} offer={offer} language={language} now={now} filters={filters} saved={savedIds.has(offerIdentity(offer))} priority={index === 0} onOpen={openOffer} onSave={saveOffer}/>)}</div>
          {listings.length > visibleCount && <button type="button" className="secondary-button show-more" onClick={() => setPagination(previous => ({ filters, sort, count: (previous.filters === filters && previous.sort === sort ? previous.count : 60) + 60 }))}>{t('showMore')}</button>}
        </> : <>
          {!manualProducts.length && <section className="empty-state"><span className="empty-icon"><Icon name="openBox" size={42}/></span><h2>{t(catalog.offers.length || hasReviewedProducts ? 'noMatches' : 'noVerified')}</h2><p>{t(catalog.offers.length || hasReviewedProducts ? 'noMatchesHelp' : 'noVerifiedHelp')}</p>{(catalog.offers.length > 0 || hasReviewedProducts) && <button type="button" className="secondary-button" onClick={resetFilters}>{t('reset')}</button>}</section>}
        </>}
        {route.view === 'deals' && <details className="browse-more"><summary>{t('browseMoreLinks')}</summary><OutboundLinks language={language} now={now}/></details>}
        {route.view === 'deals' && !catalog.offers.length && <SourceStatus manualSourceIds={manualCatalog.records.filter(product => manualProductActive(product, now)).map(product => product.sourceId)} catalog={catalog} language={language} now={now}/>}
        {route.view === 'deals' && <SyndicatedDeals deals={catalog.syndication} language={language} filters={filters} now={now}/>}
      </main>
    </div>
    {lastDeleted && dismissedIds.has(lastDeleted.identity) && <div className="category-undo listing-undo" role="status" aria-live="polite"><span>{t('deletedHere')}<small>{lastDeleted.title}</small></span><button type="button" id="listing-undo-button" onClick={() => { const prior = lastDeleted; restoreListing(prior.identity); setLastDeleted(null); deletionGestureAt.current = -Infinity; requestAnimationFrame(() => requestAnimationFrame(() => { window.scrollTo({ top: prior.scrollY, behavior: 'instant' }); const card = [...document.querySelectorAll<HTMLElement>('[data-dismiss-key]')].find(item => item.dataset.dismissKey === prior.identity); card?.querySelector<HTMLElement>('.delete-listing')?.focus({ preventScroll: true }); })); }}>{t('undo')}</button></div>}
    {lastHidden && <div className="category-undo" role="status" aria-live="polite"><span>{language === 'ru' ? 'Скрыта категория: ' : 'Category hidden: '}{categoryLabel(language, lastHidden)}</span><button type="button" id="category-undo-button" onClick={() => { restoreCategory(lastHidden); requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: undoScroll.current, behavior: 'instant' }))); }}>{t('undo')}</button></div>}
    <nav className="bottom-nav" aria-label={t('deals')}>{(['deals', 'resale', 'saved'] as const).map(view => <button type="button" key={view} aria-current={route.view === view ? 'page' : undefined} onClick={() => navigate({ view, offerId: null, panel: null })}><Icon name={view === 'deals' ? 'box' : view === 'resale' ? 'openBox' : 'bookmark'}/><span>{t(view)}</span>{view === 'saved' && saved.length > 0 && <span className="nav-count">{saved.length}</span>}</button>)}</nav>
    <Dialog open={ready && Boolean(route.offerId || route.panel)} title={t(route.panel === 'filters' ? 'filters' : route.panel === 'location' ? 'location' : 'details')} language={language} onDismiss={route.panel === 'filters' ? cancelFilters : route.panel === 'location' ? cancelLocation : dismiss} className={route.offerId ? 'detail-dialog' : 'filter-dialog'}>
      {route.panel === 'filters' ? <div className="dialog-content"><FilterFields deletedCount={dismissedIds.size} onRestoreDeleted={restoreDeleted} mode={route.view === 'resale' ? 'resale' : 'retail'} hiddenCategories={hiddenCategories} onRestore={restoreCategory} draft={draft} language={language} onChange={setDraft} error={filterError} errorField={errorField} idPrefix="sheet"/>{conflict && <div className="notice" role="alert" data-filter-conflict tabIndex={-1}><p>{t('filtersChanged')}</p><button type="button" className="text-action" onClick={() => resolveConflict(false)}>{t('useUpdatedFilters')}</button><button type="button" className="text-action" onClick={() => resolveConflict(true)}>{t('keepMyEdits')}</button></div>}<div className="filter-actions"><button type="button" className="secondary-button" onClick={cancelFilters}>{t('cancel')}</button><button type="button" className="primary-button" onClick={applyFilters}>{t('apply')}</button></div></div>
        : route.panel === 'location' ? <div className="dialog-content"><LocationFields draft={location} language={language} onChange={value=>{setLocation(value);setError(null);setLocationErrorField(null);}} error={error ? t(error) : null} errorField={locationErrorField}/><div className="filter-actions"><button type="button" className="secondary-button" onClick={cancelLocation}>{t('cancel')}</button><button type="button" className="primary-button" onClick={applyLocation}>{t('apply')}</button></div></div>
          : <OfferDetail onDelete={deleteListing} deleted={detail ? dismissedIds.has(offerDismissIdentity(detail)) : false} onRestore={restoreIndividualListing} onHide={hideCategory} loading={status === 'idle' || status === 'loading'} origin={filters.origin} savedView={route.view === 'saved'} offer={detail} language={language} now={now} saved={detail ? savedIds.has(offerIdentity(detail)) : false} onSave={() => { if (detail) void toggleSaved(detail, catalog.sequence); }} onBack={dismiss}/>}
    </Dialog>
  </div>;
}
