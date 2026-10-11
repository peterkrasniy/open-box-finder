import type { Language } from '../lib/offer.ts';
import { text } from '../lib/i18n.ts';
import { BEST_BUY_OUTLET_STORES_URL, BEST_BUY_OUTLET_URL, COMMUNITY_LEADS, OPEN_BOX_LINKS } from '../lib/outbound-links.ts';
import { Icon } from './Icon';

export function OutboundLinks({ language, now }: { language: Language; now: number }) {
  const leads = COMMUNITY_LEADS.filter(lead => Number.isFinite(now) && now >= Date.parse(lead.reviewedAt) && now < Date.parse(lead.reviewUntil));
  return <section className="outbound-links" aria-labelledby="outbound-links-heading">
    <div className="outbound-heading"><span className="outbound-icon"><Icon name="external" size={22}/></span><div><h2 id="outbound-links-heading">{text(language, 'browseOpenBox')}</h2><p>{text(language, 'outboundHelp')}</p></div></div>
    <div className="outbound-actions">
      <a href={BEST_BUY_OUTLET_URL} target="_blank" rel="noopener noreferrer">{text(language, 'bestBuyOutlet')}<Icon name="external" size={16}/></a>
      <a href={BEST_BUY_OUTLET_STORES_URL} target="_blank" rel="noopener noreferrer">{text(language, 'outletLocations')}<Icon name="external" size={16}/></a>
    </div>
    <p className="outbound-caption">{text(language, 'bestBuyCategories')}</p>
    <div className="outbound-grid">{OPEN_BOX_LINKS.map(([id, en, ru, slug, categoryId]) => <a key={id} href={`https://www.bestbuy.com/site/open-box-electronics/${slug}/pcmcat${categoryId}.c?id=pcmcat${categoryId}`} target="_blank" rel="noopener noreferrer"><span>{language === 'ru' ? ru : en}</span><Icon name="external" size={15}/></a>)}</div>
    {leads.length > 0 && <div className="outbound-discussions"><h3>{text(language, 'communityLinks')}</h3><p>{text(language, 'communityLinksHelp')}</p>{leads.map(lead => <a key={lead.id} href={lead.url} target="_blank" rel="noopener noreferrer"><span>{lead.label[language]}</span><Icon name="external" size={16}/></a>)}</div>}
    <p className="outbound-footer">{text(language, 'outboundNotice')}</p>
  </section>;
}
