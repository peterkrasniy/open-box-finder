import type { Language } from '../lib/offer.ts';
import { text } from '../lib/i18n.ts';
import { Icon } from './Icon';
export type DeleteListingAction = (identity: string, title: string, trigger?: HTMLElement) => void;
export function DeleteListing({ identity, title, language, onDelete, deleted = false, onRestore }: { identity: string; title: string; language: Language; onDelete?: DeleteListingAction; deleted?: boolean; onRestore?: (identity: string) => void }) {
  return deleted ? <button type="button" className="restore-listing" aria-label={`${text(language, 'restore')}: ${title}`} onClick={() => onRestore?.(identity)}>{text(language, 'restore')}</button>
    : onDelete ? <button type="button" className="delete-listing" aria-label={`${text(language, 'deleteListing')}: ${title}`} onClick={event => { if (event.detail < 2) onDelete(identity, title, event.currentTarget); }}><Icon name="trash" size={16}/>{text(language, 'deleteListing')}</button> : null;
}
