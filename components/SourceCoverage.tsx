import type { Catalog, Language } from '../lib/offer.ts';
import { text } from '../lib/i18n.ts';
import { SOURCES } from '../lib/sources.ts';
import { SourceStatus } from './SourceStatus';
export function SourceCoverage({ catalog, language, now }: { catalog: Catalog; language: Language; now: number }) {
  const states = SOURCES.map(source => catalog.sources.find(health => health.sourceId === source.id));
  const ready = states.filter(state => state?.status === 'ready' && state.lastSnapshotComplete !== false && (!state.nextCheckAt || Date.parse(state.nextCheckAt) >= now)).length;
  const disconnected = states.filter(state => !state || state.status === 'unconnected').length;
  const issues = states.length - ready - disconnected;
  return <details className="source-coverage"><summary>{text(language, 'sourceCoverage')}<span className="coverage-summary">{text(language, 'sourcesReady')}: {ready} · {text(language, 'sourcesAttention')}: {issues} · {text(language, 'sourcesDisconnected')}: {disconnected}</span></summary><SourceStatus catalog={catalog} language={language} now={now}/></details>;
}
