import type { Filters, Language, SyndicatedDeal } from '../lib/offer.ts';
import { isFresh } from '../lib/offer.ts';
import { text } from '../lib/i18n.ts';

/** Complete original feed text remains separate from normalized, verified stock. */
export function SyndicatedDeals({ deals, language, filters, now }: { deals: readonly SyndicatedDeal[]; language: Language; filters: Filters; now: number }) {
  const visible = deals.filter(deal => (filters.retailers.mode === 'all' || filters.retailers.ids.includes(deal.sourceId))
    && (!filters.query || `${deal.title} ${deal.description} ${deal.content ?? ''}`.toLocaleLowerCase().includes(filters.query.toLocaleLowerCase())));
  if (!visible.length) return null;
  return <section className="syndicated-deals" aria-labelledby="syndicated-heading"><h2 id="syndicated-heading">{text(language, 'editorialDeals')}</h2><p className="muted">{text(language, 'editorialHelp')}</p>
    {visible.map(deal => <article className="syndicated-deal" key={deal.id}><h3><a href={deal.url} target="_blank" rel="noopener noreferrer">{deal.title}</a></h3>
      <p className="muted small">{text(language, 'providedBy')} <a href="https://www.dealnews.com/" target="_blank" rel="noopener noreferrer">DealNews</a> · {text(language, isFresh(deal, now) ? 'checked' : 'stale')} <time dateTime={deal.observedAt}>{new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(deal.observedAt))}</time></p>
      {[deal.description, deal.content].filter((body): body is string => body !== null && body !== '').map((body, index) => <iframe key={index} title={`${deal.title} — ${index === 0 ? 'description' : 'full content'}`} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" loading="lazy" srcDoc={`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; frame-src 'none'; connect-src 'none'; form-action 'none'; base-uri https://www.dealnews.com"><base href="https://www.dealnews.com/" target="_blank"><style>body{font:16px/1.5 -apple-system,BlinkMacSystemFont,Arial,sans-serif;color:#0b1220;margin:16px;overflow-wrap:anywhere}img{max-width:100%}a{color:#075bc9}table{max-width:100%}</style></head><body>${body}</body></html>`}/>)}
    </article>)}
  </section>;
}
