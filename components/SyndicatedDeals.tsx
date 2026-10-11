import type { Filters, Language, SyndicatedDeal } from '../lib/offer.ts';
import { isFresh } from '../lib/offer.ts';
import { text } from '../lib/i18n.ts';
import { syndicationDocument } from '../lib/syndication-document.ts';

/** Complete original feed text remains separate from normalized, verified stock. */
export function SyndicatedDeals({ deals, language, filters, now }: { deals: readonly SyndicatedDeal[]; language: Language; filters: Filters; now: number }) {
  const visible = deals.filter(deal => (filters.retailers.mode === 'all' || filters.retailers.ids.includes(deal.sourceId))
    && (!filters.query || `${deal.title} ${deal.description} ${deal.content ?? ''}`.toLocaleLowerCase().includes(filters.query.toLocaleLowerCase())));
  if (!visible.length) return null;
  return <section className="syndicated-deals" aria-labelledby="syndicated-heading"><h2 id="syndicated-heading">{text(language, 'editorialDeals')}</h2><p className="muted">{text(language, 'editorialHelp')}</p>
    {visible.map(deal => <article className="syndicated-deal" key={deal.id}><h3><a href={deal.url} target="_blank" rel="noopener noreferrer">{deal.title}</a></h3>
      <p className="muted small">{text(language, 'providedBy')} <a href="https://www.dealnews.com/" target="_blank" rel="noopener noreferrer">DealNews</a> · {text(language, isFresh(deal, now) ? 'checked' : 'stale')} <time dateTime={deal.observedAt}>{new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(deal.observedAt))}</time></p>
      {[{body:deal.description,label:'sourceDescription' as const},{body:deal.content,label:'sourceFullContent' as const}].filter((part):part is {body:string;label:'sourceDescription'|'sourceFullContent'}=>part.body!==null&&part.body!=='').map((part,index)=><iframe key={index} title={`${deal.title} — ${text(language,part.label)}`} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" loading="lazy" srcDoc={syndicationDocument(deal.url,part.body)}/>)}
    </article>)}
  </section>;
}
