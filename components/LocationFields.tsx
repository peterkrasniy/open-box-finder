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
export function locationDraft(filters: Filters): LocationDraft {
  return { label: filters.origin.label, latitude: String(filters.origin.latitude), longitude: String(filters.origin.longitude), radius: String(filters.radiusMiles), shippingState: filters.origin.shippingState };
}
export function LocationFields({ draft, language, onChange, error }: { draft: LocationDraft; language: Language; onChange: (value: LocationDraft) => void; error: string | null }) {
  const area = AREAS.find(place => place.label === draft.label && String(place.latitude) === draft.latitude && String(place.longitude) === draft.longitude);
  return <div className="location-fields"><p className="muted">{text(language, 'originHint')}</p>
    <label className="field-label" htmlFor="location-area">{text(language, 'area')}<select id="location-area" value={area?.label ?? 'custom'} onChange={event => {
      const selected = AREAS.find(place => place.label === event.target.value);
      if (selected) onChange({ ...draft, label: selected.label, latitude: String(selected.latitude), longitude: String(selected.longitude), shippingState: 'CA' });
      else onChange({ ...draft, label: '', shippingState: null });
    }}>{AREAS.map(place => <option key={place.label} value={place.label}>{place.label}</option>)}<option value="custom">{text(language, 'customLocation')}</option></select></label>
    <label className="field-label" htmlFor="location-label">{text(language, 'location')}<input id="location-label" value={draft.label} maxLength={80} onChange={event => onChange({ ...draft, label: event.target.value })}/></label>
    <div className="coordinate-inputs"><label className="field-label" htmlFor="location-latitude">{text(language, 'latitude')}<input id="location-latitude" inputMode="decimal" value={draft.latitude} onChange={event => onChange({ ...draft, latitude: event.target.value })}/></label><label className="field-label" htmlFor="location-longitude">{text(language, 'longitude')}<input id="location-longitude" inputMode="decimal" value={draft.longitude} onChange={event => onChange({ ...draft, longitude: event.target.value })}/></label></div>
    <label className="field-label" htmlFor="location-radius">{text(language, 'radius')}<input id="location-radius" inputMode="decimal" value={draft.radius} onChange={event => onChange({ ...draft, radius: event.target.value })}/></label>
    <label className="field-label" htmlFor="shipping-state">{text(language, 'shippingState')}<select id="shipping-state" value={draft.shippingState ?? ''} onChange={event => onChange({ ...draft, shippingState: event.target.value || null })}><option value="">{text(language, 'shippingStateUnknown')}</option>{[...US_STATES].sort().map(state => <option key={state} value={state}>{state}</option>)}</select></label>
    <p className="muted small">{text(language, 'shippingStateHint')}</p>
    <p className="muted small">{text(language, 'approximateLocation')}</p>{error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}
