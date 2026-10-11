'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_FILTERS } from '../lib/offer.ts';
import type { Filters, Offer } from '../lib/offer.ts';
import { filterAndSort, validPoint } from '../lib/filter.ts';
import { editPrice, parsePrice, validateRange } from '../lib/money.ts';
import { categoryLabel, SORTS, sortLabel, text } from '../lib/i18n.ts';
import type { TextKey } from '../lib/i18n.ts';
import { useCatalog } from '../hooks/useCatalog';
import { usePreferences } from '../hooks/usePreferences';
import { useRoute } from '../hooks/useRoute';
import { Icon } from './Icon';
import { Dialog } from './Dialog';
import { FilterFields } from './FilterFields';
import type { FilterDraft } from './FilterFields';
import { LocationFields, locationDraft } from './LocationFields';
import { OfferCard } from './OfferCard';
import { OfferDetail } from './OfferDetail';
import { SavedRows } from './SavedRows';
import { SourceStatus } from './SourceStatus';

export function OpenBoxApp() {
  const { preferences, setPreferences, saved, ready, storageAvailable, saveError, toggleSaved, removeSaved } = usePreferences();
  const { route, navigate, dismiss } = useRoute();
  const { catalog, status, now, refresh } = useCatalog(ready);
  const { language, filters, sort } = preferences;
  const t = (key: TextKey) => text(language, key);
  const makeDraft = (value: Filters): FilterDraft => ({ filters: structuredClone(value), min: editPrice(value.minCents, language), max: editPrice(value.maxCents, language), radius: String(value.radiusMiles) });
  const [draft, setDraft] = useState<FilterDraft>(() => makeDraft(DEFAULT_FILTERS));
  const [location, setLocation] = useState(() => locationDraft(DEFAULT_FILTERS));
  const [error, setError] = useState<TextKey | null>(null);
  const [wide, setWide] = useState(false), [visibleCount, setVisibleCount] = useState(60);
  const initialized = useRef(false), previousPanel = useRef(route.panel);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const changed = () => setWide(media.matches); changed();
    media.addEventListener('change', changed); return () => media.removeEventListener('change', changed);
  }, []);
  useEffect(() => {
    if (ready && !initialized.current) { initialized.current = true; setDraft(makeDraft(filters)); setLocation(locationDraft(filters)); }
  }, [ready, filters]);
  useEffect(() => {
    if (previousPanel.current && !route.panel) { setDraft(makeDraft(filters)); setLocation(locationDraft(filters)); setError(null); }
    previousPanel.current = route.panel;
  }, [route.panel, filters]);
  const listings = useMemo(() => filterAndSort(catalog.offers, filters, sort, now), [catalog.offers, filters, sort, now]);
  const savedIds = useMemo(() => new Set(saved.map(record => record.offerId)), [saved]);
  const detail = useMemo(() => catalog.offers.find(offer => offer.id === route.offerId) ?? null, [catalog.offers, route.offerId]);
  useEffect(() => setVisibleCount(60), [filters, sort]);
  const updateFilters = (change: Partial<Filters>) => {
    setPreferences(previous => ({ ...previous, filters: { ...previous.filters, ...change } }));
    setDraft(previous => ({ ...previous, filters: { ...previous.filters, ...change } }));
  };
  const openOffer = (offer: Offer) => navigate({ view: route.view, offerId: offer.id, panel: null });
  const openPanel = (panel: 'filters' | 'location') => { setError(null); if (panel === 'location') setLocation(locationDraft(filters)); navigate({ view: route.view, offerId: null, panel }); };
  const cancelFilters = () => { setDraft(makeDraft(filters)); setError(null); if (route.panel) dismiss(); };
  const resetFilters = () => { const next = { ...structuredClone(DEFAULT_FILTERS), origin: filters.origin, radiusMiles: filters.radiusMiles }; setPreferences(previous => ({ ...previous, filters: next })); setDraft(makeDraft(next)); };
  const applyFilters = () => {
    const minimum = parsePrice(draft.min), maximum = parsePrice(draft.max);
    if (!minimum.ok || !maximum.ok) { setError('invalidPrice'); return; }
    const range = validateRange(minimum.cents, maximum.cents);
    if (range) { setError(range === 'invalid-range' ? 'invalidRange' : 'invalidPrice'); return; }
    const radius = Number(draft.radius.replace(',', '.'));
    if (!/^\d{1,3}(?:[.,]\d{1,2})?$/.test(draft.radius) || !Number.isFinite(radius) || radius < 0 || radius > 500) { setError('invalidRadius'); return; }
    const next = { ...draft.filters, query: filters.query, origin: filters.origin, minCents: minimum.cents, maxCents: maximum.cents, radiusMiles: radius };
    setPreferences(previous => ({ ...previous, filters: next })); setDraft(makeDraft(next)); setError(null); if (route.panel) dismiss();
  };
  const applyLocation = () => {
    const coordinate = (value: string) => /^[+-]?\d{1,3}(?:[.,]\d{1,8})?$/.test(value.trim()) ? Number(value.replace(',', '.')) : NaN;
    const point = { latitude: coordinate(location.latitude), longitude: coordinate(location.longitude) };
    if (!location.label.trim() || location.label.length > 80 || !validPoint(point)) { setError('invalidLocation'); return; }
    const radius = Number(location.radius.replace(',', '.'));
    if (!/^\d{1,3}(?:[.,]\d{1,2})?$/.test(location.radius) || !Number.isFinite(radius) || radius < 0 || radius > 500) { setError('invalidRadius'); return; }
    updateFilters({ origin: { ...point, label: location.label.trim() }, radiusMiles: radius }); setError(null); dismiss();
  };

  return <div className="app-shell">
    <a className="skip-link" href="#listings">{t('skip')}</a>
    <header className="app-header"><div className="brand"><Icon name="box" size={32}/><span>{t('brand')}</span></div>
      <nav className="desktop-nav" aria-label={t('deals')}><button type="button" aria-current={route.view === 'deals' ? 'page' : undefined} onClick={() => navigate({ view: 'deals', offerId: null, panel: null })}>{t('deals')}</button><button type="button" aria-current={route.view === 'saved' ? 'page' : undefined} onClick={() => navigate({ view: 'saved', offerId: null, panel: null })}>{t('saved')}{saved.length > 0 && <span>{saved.length}</span>}</button></nav>
      <div className="language-switch" role="group" aria-label={t('language')}>{(['en', 'ru'] as const).map(value => <button type="button" key={value} lang={value} aria-pressed={language === value} onClick={() => setPreferences(previous => ({ ...previous, language: value }))}>{value === 'en' ? 'EN' : 'РУ'}</button>)}</div>
    </header>
    <div className="search-location" role="search" aria-label={t('search')}><label className="search-field"><Icon name="search"/><span className="sr-only">{t('search')}</span><input type="search" value={filters.query} placeholder={t('searchHint')} maxLength={160} onChange={event => updateFilters({ query: event.target.value })}/></label><button type="button" className="location-button" onClick={() => openPanel('location')}><Icon name="pin"/><span><strong>{filters.origin.label}</strong><small>{filters.radiusMiles} {t('miles')}</small></span><Icon name="down" size={18}/></button></div>
    <div className="shopping-layout">
      {wide && route.view === 'deals' && <aside className="filter-rail" aria-label={t('filters')}>{route.panel !== 'filters' && <><FilterFields draft={draft} language={language} onChange={setDraft} error={error ? t(error) : null} idPrefix="rail"/><div className="filter-actions"><button type="button" className="secondary-button" onClick={cancelFilters}>{t('cancel')}</button><button type="button" className="primary-button" onClick={applyFilters}>{t('apply')}</button></div></>}</aside>}
      <main id="listings" className={`listing-main${route.view === 'saved' ? ' saved-main' : ''}`} tabIndex={-1}>
        {!wide && route.view === 'deals' && <div className="mobile-controls"><button type="button" className="secondary-button" onClick={() => openPanel('filters')}><Icon name="filters" size={20}/>{t('filters')}</button><label className="sort-mobile"><span className="sr-only">{t('sort')}</span><Icon name="sort" size={20}/><select value={sort} onChange={event => setPreferences(previous => ({ ...previous, sort: event.target.value as typeof sort }))}>{SORTS.map(value => <option key={value} value={value}>{sortLabel(language, value)}</option>)}</select></label></div>}
        <div className="listing-toolbar"><h1>{t(route.view === 'saved' ? 'saved' : 'deals')}</h1>{wide && route.view === 'deals' && <label className="sort-desktop">{t('sort')}<select value={sort} onChange={event => setPreferences(previous => ({ ...previous, sort: event.target.value as typeof sort }))}>{SORTS.map(value => <option key={value} value={value}>{sortLabel(language, value)}</option>)}</select></label>}</div>
        {route.view === 'deals' && <div className="category-chips" aria-label={t('categories')}>
          <button type="button" aria-pressed={filters.categories.mode === 'all'} onClick={() => updateFilters({ categories: { mode: 'all', ids: [] } })}>{t('all')}</button>
          <button type="button" aria-pressed={filters.categories.mode === 'selected' && filters.categories.ids.length === 1 && filters.categories.ids[0] === 'appliances'} onClick={() => updateFilters({ categories: { mode: 'selected', ids: ['appliances'] } })}>{categoryLabel(language, 'appliances')}</button>
          <button type="button" aria-pressed={filters.categories.mode === 'selected' && filters.categories.ids.length === 6 && ['tv', 'computers', 'phones', 'audio', 'smart-home', 'gaming'].every(category => filters.categories.ids.includes(category))} onClick={() => updateFilters({ categories: { mode: 'selected', ids: ['tv', 'computers', 'phones', 'audio', 'smart-home', 'gaming'] } })}>{t('electronics')}</button>
        </div>}
        {!storageAvailable && <p className="notice" role="status">{t('storageUnavailable')}</p>}
        {saveError && <p className="notice error" role="alert">{t(saveError)}</p>}
        <div className="catalog-status" role="status" aria-live="polite" aria-atomic="true">
          {status === 'loading' ? t('updating') : status === 'offline' ? t('offline') : status === 'error' ? t('updateFailed') : catalog.generation === 'uninitialized' ? t('noSourceConnected') : `${listings.length} ${t('count')}`}
          {(status === 'error' || status === 'offline') && <button type="button" className="text-action" onClick={refresh}>{t('refresh')}</button>}
        </div>
        {route.view === 'saved' ? <>
          <p className="saved-privacy"><Icon name="bookmark" size={18}/>{t('savedPrivacy')}</p>
          {saved.length ? <SavedRows saved={saved} offers={catalog.offers} language={language} now={now} onOpen={openOffer} onRemove={removeSaved}/>
            : <section className="empty-state"><span className="empty-icon"><Icon name="bookmark" size={38}/></span><h2>{t('noSaved')}</h2><p>{t('noSavedHelp')}</p></section>}
        </> : listings.length ? <>
          <div className="offer-grid">{listings.slice(0, visibleCount).map((offer, index) => <OfferCard key={offer.id} offer={offer} language={language} now={now} filters={filters} saved={savedIds.has(offer.id)} priority={index === 0} onOpen={() => openOffer(offer)} onSave={() => void toggleSaved(offer)}/>)}</div>
          {listings.length > visibleCount && <button type="button" className="secondary-button show-more" onClick={() => setVisibleCount(value => value + 60)}>{t('showMore')}</button>}
        </> : <>
          <section className="empty-state"><span className="empty-icon"><Icon name="openBox" size={42}/></span><h2>{t(catalog.offers.length ? 'noMatches' : 'noVerified')}</h2><p>{t(catalog.offers.length ? 'noMatchesHelp' : 'noVerifiedHelp')}</p>{catalog.offers.length > 0 && <button type="button" className="secondary-button" onClick={resetFilters}>{t('reset')}</button>}</section>
          {!catalog.offers.length && <SourceStatus catalog={catalog} language={language}/>}
        </>}
      </main>
    </div>
    <nav className="bottom-nav" aria-label={t('deals')}>{(['deals', 'saved'] as const).map(view => <button type="button" key={view} aria-current={route.view === view ? 'page' : undefined} onClick={() => navigate({ view, offerId: null, panel: null })}><Icon name={view === 'deals' ? 'box' : 'bookmark'}/><span>{t(view)}</span>{view === 'saved' && saved.length > 0 && <span className="nav-count">{saved.length}</span>}</button>)}</nav>
    <Dialog open={ready && Boolean(route.offerId || route.panel)} title={t(route.panel === 'filters' ? 'filters' : route.panel === 'location' ? 'location' : 'details')} language={language} onDismiss={route.panel ? cancelFilters : dismiss} className={route.offerId ? 'detail-dialog' : 'filter-dialog'}>
      {route.panel === 'filters' ? <div className="dialog-content"><FilterFields draft={draft} language={language} onChange={setDraft} error={error ? t(error) : null} idPrefix="sheet"/><div className="filter-actions"><button type="button" className="secondary-button" onClick={cancelFilters}>{t('cancel')}</button><button type="button" className="primary-button" onClick={applyFilters}>{t('apply')}</button></div></div>
        : route.panel === 'location' ? <div className="dialog-content"><LocationFields draft={location} language={language} onChange={setLocation} error={error ? t(error) : null}/><div className="filter-actions"><button type="button" className="secondary-button" onClick={cancelFilters}>{t('cancel')}</button><button type="button" className="primary-button" onClick={applyLocation}>{t('apply')}</button></div></div>
          : <OfferDetail savedView={route.view === 'saved'} offer={detail} language={language} now={now} saved={detail ? savedIds.has(detail.id) : false} onSave={() => { if (detail) void toggleSaved(detail); }} onBack={dismiss}/>}
    </Dialog>
  </div>;
}
