import { useState } from 'react';
import { SOURCE_BY_ID } from '../lib/sources.ts';

// Ordinary source-published logo URLs. Full text remains visible if a retailer blocks its image.
const LOGOS: Record<string, string> = {
  'best-buy': 'https://corporate.bestbuy.com/wp-content/uploads/2018/05/2018_rebrand_blog_logo_LEAD_ART.jpg',
  'target-manual': 'https://corporate.target.com/getmedia/2cee849d-5862-475f-a383-ed47324afe97/target_bullseye-logo.png?width=220',
  'sennheiser-manual': 'https://newsroom.sennheiser.com/images/logo-plain.jpg',
  'vitamix-manual': 'https://www.vitamix.com/us/en_us/media_1b6df617f80b582bd4723381f3183d40d52ec867b.png?format=png&optimize=medium&width=750',
  'dyson-manual': 'https://dyson-h.assetsadobe2.com/is/image/content/dam/dyson/leap-petite-global/reasons-to-buy/lifetime-help-support.png',
};
const INITIALS: Record<string, string> = { 'best-buy': 'BB', 'direct-tools-manual': 'DTO', 'cuckoo-manual': 'C', 'epson-manual': 'E', 'newegg-manual': 'N', 'target-manual': 'T', 'dyson-manual': 'D', 'vitamix-manual': 'V', 'sennheiser-manual': 'S' };
export function RetailerBadge({ sourceId }: { sourceId: string }) {
  const [failed, setFailed] = useState(false), name = SOURCE_BY_ID.get(sourceId)?.name ?? sourceId;
  return <span className="retailer-badge" data-retailer={sourceId}><span className="retailer-mark" aria-hidden="true">{LOGOS[sourceId] && !failed ?
    // eslint-disable-next-line @next/next/no-img-element
    <img src={LOGOS[sourceId]} alt="" width="36" height="28" loading="lazy" decoding="async" onError={() => setFailed(true)}/>
    : <span>{INITIALS[sourceId] ?? name.slice(0, 1)}</span>}</span><span>{name}</span></span>;
}
