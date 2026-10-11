'use client';
import type { Filters, Language } from '../lib/offer.ts';
import { US_STATES } from '../lib/shipping.ts';
import { text } from '../lib/i18n.ts';

export const AREAS = [
  { label: 'Rocklin, CA', latitude: 38.7907, longitude: -121.2358 },
  { label: 'Sacramento, CA', latitude: 38.5816, longitude: -121.4944 },
  { label: 'Roseville, CA', latitude: 38.7521, longitude: -121.288 },
  { label: 'West Sacramento, CA', latitude: 38.5805, longitude: -121.5302 },
  { label: 'Folsom, CA', latitude: 38.6779, longitude: -121.1761 },
  { label: 'Elk Grove, CA', latitude: 38.4088, longitude: -121.3716 },
] as const;
export interface LocationDraft { label: string; latitude: string; longitude: string; radius: string; shippingState: string | null }
export type LocationErrorField = 'label' | 'latitude' | 'longitude' | 'radius';
export function locationDraft(filters: Filters): LocationDraft {
  return { label: filters.origin.label, latitude: String(filters.origin.latitude), longitude: String(filters.origin.longitude), radius: String(filters.radiusMiles), shippingState: filters.origin.shippingState };
}
export function LocationFields({ draft, language, onChange, error,errorField }: { draft: LocationDraft; language: Language; onChange: (value: LocationDraft) => void; error: string | null;errorField:LocationErrorField|null }) {
  const area = AREAS.find(place => place.label === draft.label && String(place.latitude) === draft.latitude && String(place.longitude) === draft.longitude);
  const invalid = (field:LocationErrorField) => Boolean(error && errorField===field);
  const fieldError = (field:LocationErrorField) => invalid(field)?<p id={`location-${field}-error`} className="form-error" role="alert">{error}</p>:null;
  return <div className="location-fields"><p className="muted">{text(language, 'originHint')}</p>
    <label className="field-label" htmlFor="location-area">{text(language, 'area')}<select id="location-area" value={area?.label ?? 'custom'} onChange={event => {
      const selected = AREAS.find(place => place.label === event.target.value);
      if (selected) onChange({ ...draft, label: selected.label, latitude: String(selected.latitude), longitude: String(selected.longitude), shippingState: 'CA' });
      else onChange({ ...draft, label: '', shippingState: null });
    }}>{AREAS.map(place => <option key={place.label} value={place.label}>{place.label}</option>)}<option value="custom">{text(language, 'customLocation')}</option></select></label>
    <div className="location-field"><label className="field-label" htmlFor="location-label">{text(language, 'location')}<input id="location-label" data-location-control="label" aria-invalid={invalid('label')} aria-describedby={invalid('label')?'location-label-error':undefined} value={draft.label} maxLength={80} onChange={event => onChange({ ...draft, label: event.target.value })}/></label>{fieldError('label')}</div>
    <div className="coordinate-inputs">{(['latitude','longitude'] as const).map(field=><div className="location-field" key={field}><label className="field-label" htmlFor={`location-${field}`}>{text(language,field)}<input id={`location-${field}`} data-location-control={field} aria-invalid={invalid(field)} aria-describedby={invalid(field)?`location-${field}-error`:undefined} inputMode="decimal" value={draft[field]} maxLength={16} onChange={event=>onChange({...draft,[field]:event.target.value})}/></label>{fieldError(field)}</div>)}</div>
    <div className="location-field"><label className="field-label" htmlFor="location-radius">{text(language, 'radius')}<input id="location-radius" data-location-control="radius" aria-invalid={invalid('radius')} aria-describedby={invalid('radius')?'location-radius-error':undefined} inputMode="decimal" value={draft.radius} maxLength={6} onChange={event => onChange({ ...draft, radius: event.target.value })}/></label>{fieldError('radius')}</div>
    <label className="field-label" htmlFor="shipping-state">{text(language, 'shippingState')}<select id="shipping-state" value={draft.shippingState ?? ''} onChange={event => onChange({ ...draft, shippingState: event.target.value || null })}><option value="">{text(language, 'shippingStateUnknown')}</option>{[...US_STATES].sort().map(state => <option key={state} value={state}>{state}</option>)}</select></label>
    <p className="muted small">{text(language, 'shippingStateHint')}</p>
    <p className="muted small">{text(language, 'approximateLocation')}</p>
  </div>;
}
