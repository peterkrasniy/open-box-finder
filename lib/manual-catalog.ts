import records from '../data/manual-records.json' with { type: 'json' };
import type { ManualProduct } from './manual-products.ts';
import { validManualSnapshot } from './manual-snapshot-schema.ts';
/** Checked factual snapshots. Archived records stay addressable for saved items. */
export const ALL_MANUAL_PRODUCTS: readonly ManualProduct[] = (records as unknown[]).filter(validManualSnapshot);
/** Original expansion retained as a stable regression fixture, not a second catalog. */
export const EXPANDED_MANUAL_PRODUCTS = ALL_MANUAL_PRODUCTS.filter(record => record.scopeKey === 'legacy-selected' && record.sourceId !== 'sennheiser-manual');
