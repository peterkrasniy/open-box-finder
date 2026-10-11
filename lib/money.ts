import type { Language } from './offer.ts';
import { validCents } from './offer.ts';

export type ParsedPrice = { ok: true; cents: number | null } | { ok: false; error: 'invalid-price' };

/** Decimal separator may be comma or period; grouping and scientific notation are rejected. */
export function parsePrice(input: string): ParsedPrice {
  const text = input.trim();
  if (text === '') return { ok: true, cents: null };
  if (!/^\d{1,7}(?:[.,]\d{1,2})?$/.test(text)) return { ok: false, error: 'invalid-price' };
  const [whole, fraction = ''] = text.split(/[.,]/);
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return validCents(cents) ? { ok: true, cents } : { ok: false, error: 'invalid-price' };
}

export function formatPrice(cents: number, language: Language): string {
  if (!validCents(cents)) throw new RangeError('Invalid USD cents');
  return new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function editPrice(cents: number | null, language: Language): string {
  if (cents === null) return '';
  if (!validCents(cents)) throw new RangeError('Invalid USD cents');
  const text = `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
  return language === 'ru' ? text.replace('.', ',') : text;
}

export function validateRange(min: number | null, max: number | null): 'invalid-price' | 'invalid-range' | null {
  if ((min !== null && !validCents(min)) || (max !== null && !validCents(max))) return 'invalid-price';
  return min !== null && max !== null && min > max ? 'invalid-range' : null;
}
