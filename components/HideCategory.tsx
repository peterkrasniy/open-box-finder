import type { Category, Language } from '../lib/offer.ts';
import { categoryLabel, text } from '../lib/i18n.ts';
export type HideCategoryAction = (category: Category, trigger?: HTMLElement) => void;
export function HideCategory({ category, language, onHide }: { category: Category; language: Language; onHide?: HideCategoryAction }) {
  return onHide ? <button type="button" className="hide-category" aria-label={`${text(language, 'hideCategory')}: ${categoryLabel(language, category)}`} onClick={event => onHide(category, event.currentTarget)}>{text(language, 'hideCategory')}</button> : null;
}
