import type { Catalog, Language } from '../lib/offer.ts';
import { text } from '../lib/i18n.ts';
import { SOURCES } from '../lib/sources.ts';
import { Icon } from './Icon';

export function SourceStatus({ catalog, language, now, manualSourceIds = [] }: { manualSourceIds?: readonly string[]; catalog: Catalog; language: Language; now: number }) {
  return <section className="source-status" aria-labelledby="source-status-heading"><h2 id="source-status-heading">{text(language, 'sources')}</h2>
    <div className="source-rows">{SOURCES.map(source => {
      const state = catalog.sources.find(health => health.sourceId === source.id);
      const overdue = state?.nextCheckAt && Number.isFinite(now) && Date.parse(state.nextCheckAt) < now;
      const status = state?.blockedAt?text(language,'accessUnavailable'):state?.status === 'ready' ? text(language, overdue ? 'stale' : state.lastSnapshotComplete === false ? 'partialCatalog' : 'checked')
        : state?.status === 'stale' ? text(language, 'stale') : state?.status === 'error' ? text(language, 'updateFailed')
        : text(language, source.admission === 'manual-only' || manualSourceIds.includes(source.id) ? 'manualOnly' : source.admission === 'credentials-required' ? 'credentialsRequired' : source.admission === 'permission-required' ? 'permissionRequired' : 'awaitingSource');
      return <div className="source-row" key={source.id}><a href={source.website} target="_blank" rel="noopener noreferrer">{source.name}</a><span className="muted"><Icon name="clock" size={18}/>{status}</span></div>;
    })}</div><p className="muted small">{text(language, 'sourceHelp')}</p>
  </section>;
}
