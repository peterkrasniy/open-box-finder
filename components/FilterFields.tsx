'use client';

import type { Filters, Language, Selection } from '../lib/offer.ts';
import { CATEGORIES, categoryLabel, text } from '../lib/i18n.ts';
import { SOURCES } from '../lib/sources.ts';

export interface FilterDraft { filters: Filters; min: string; max: string; radius: string }
export function toggleSelection(value: Selection, id: string, available: readonly string[]): Selection {
  const current = new Set(value.mode === 'all' ? available : value.ids);
  if (current.has(id)) current.delete(id); else current.add(id);
  return { mode: 'selected', ids: [...current] };
}

export function FilterFields({ draft, language, onChange, error, errorField, idPrefix }: {
  draft: FilterDraft; language: Language; onChange: (draft: FilterDraft) => void; error: string | null; errorField: 'min' | 'max' | 'radius' | null; idPrefix: string;
}) {
  const f = draft.filters;
  const update = (change: Partial<Filters>) => onChange({ ...draft, filters: { ...f, ...change } });
  return <div className="filter-fields">
    <fieldset><legend>{text(language, 'retailers')}</legend><div className="fieldset-heading"><div className="small-actions"><button type="button" onClick={() => update({ retailers: { mode: 'all', ids: [] } })}>{text(language, 'all')}</button><button type="button" onClick={() => update({ retailers: { mode: 'selected', ids: [] } })}>{text(language, 'clear')}</button></div></div>
      {SOURCES.map(source => <label className="check-row" key={source.id}><input data-filter-control={`retailer-${source.id}`} type="checkbox" checked={f.retailers.mode === 'all' || f.retailers.ids.includes(source.id)} onChange={() => update({ retailers: toggleSelection(f.retailers, source.id, SOURCES.map(s => s.id)) })}/><span>{source.name}</span></label>)}
      {f.retailers.mode === 'selected' && f.retailers.ids.length === 0 && <p className="muted small">{text(language, 'noneSelected')}</p>}
    </fieldset>
    <fieldset><legend>{text(language, 'categories')}</legend><div className="fieldset-heading"><div className="small-actions"><button type="button" onClick={() => update({ categories: { mode: 'all', ids: [] } })}>{text(language, 'all')}</button></div></div>
      {CATEGORIES.map(category => <label className="check-row" key={category}><input data-filter-control={`category-${category}`} type="checkbox" checked={f.categories.mode === 'all' || f.categories.ids.includes(category)} onChange={() => update({ categories: toggleSelection(f.categories, category, CATEGORIES) })}/><span>{categoryLabel(language, category)}</span></label>)}
    </fieldset>
    <fieldset><legend>{text(language, 'fulfillment')}</legend><div className="fulfillment-options">{(['both', 'pickup', 'shipped'] as const).map(mode => <label className="radio-row" key={mode}><input data-filter-control={`fulfillment-${mode}`} type="radio" name={`${idPrefix}-fulfillment`} value={mode} checked={f.fulfillment === mode} onChange={() => update({ fulfillment: mode })}/><span>{text(language, mode)}</span></label>)}</div></fieldset>
    <fieldset><legend>{text(language, 'price')}</legend><div className="price-inputs"><label htmlFor={`${idPrefix}-min`}>{text(language, 'minPrice')}<input id={`${idPrefix}-min`} data-filter-control="min" aria-invalid={Boolean(error && errorField !== 'radius')} type="text" inputMode="decimal" maxLength={10} autoComplete="off" value={draft.min} onChange={event => onChange({ ...draft, min: event.target.value })} aria-describedby={error && errorField !== 'radius' ? `${idPrefix}-price-error` : undefined}/></label><label htmlFor={`${idPrefix}-max`}>{text(language, 'maxPrice')}<input id={`${idPrefix}-max`} data-filter-control="max" aria-invalid={Boolean(error && errorField !== 'radius')} type="text" inputMode="decimal" maxLength={10} autoComplete="off" value={draft.max} onChange={event => onChange({ ...draft, max: event.target.value })} aria-describedby={error && errorField !== 'radius' ? `${idPrefix}-price-error` : undefined}/></label></div>{error && errorField !== 'radius' && <p id={`${idPrefix}-price-error`} className="form-error" role="alert">{error}</p>}</fieldset>
    <label className="field-label" htmlFor={`${idPrefix}-radius`}>{text(language, 'radius')}<input id={`${idPrefix}-radius`} data-filter-control="radius" aria-invalid={Boolean(error && errorField === 'radius')} type="text" inputMode="decimal" maxLength={6} value={draft.radius} onChange={event => onChange({ ...draft, radius: event.target.value })} aria-describedby={error && errorField === 'radius' ? `${idPrefix}-error` : undefined}/></label>
    {error && errorField === 'radius' && <p id={`${idPrefix}-error`} className="form-error" role="alert">{error}</p>}
  </div>;
}
