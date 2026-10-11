import { parseFragment } from 'parse5';
import type { DefaultTreeAdapterTypes } from 'parse5';
import type { RssResult } from './rss.ts';

type Condition = 'open-box' | 'returned' | 'refurbished';
const patterns: Record<Condition, RegExp> = {
  'open-box': /\bopen[\s\u2010-\u2015-]*box\b/i,
  returned: /\b(?:returned|customer[ -]returns?)\b/i,
  refurbished: /\b(?:refurbished|reconditioned|renewed|recertified)\b/i,
};
const conditions = (value: string) => (Object.keys(patterns) as Condition[]).filter(key => patterns[key].test(value));
const bytes = (value: string) => new TextEncoder().encode(value).byteLength;
export interface FeedEvidence {
  entries: number; rejected: number; complete: boolean; linkOrigins: string[];
  contentLinkOrigins: string[]; mediaOrigins: string[]; originsTruncated: boolean;
  titleConditionEntries: number; bodyOnlyConditionEntries: number; noConditionMentionEntries: number;
  uninspectedBodyEntries: number; unsafeResourceReferences: number;
  titleConditions: Record<Condition, number>;
  // Explicit publisher mentions for private review only, never verified retailer stock.
  samples: { title: string; url: string; conditions: Condition[] }[];
  verifiedInventory: false;
}

/** Inspect the supplied RSS only. No links/media are fetched and no original HTML is retained. */
export function inspectFeed(feed: RssResult): FeedEvidence {
  const evidence: FeedEvidence = { entries: feed.entries.length, rejected: feed.rejected, complete: feed.complete,
    linkOrigins: [], contentLinkOrigins: [], mediaOrigins: [], originsTruncated: false,
    titleConditionEntries: 0, bodyOnlyConditionEntries: 0, noConditionMentionEntries: 0,
    uninspectedBodyEntries: 0, unsafeResourceReferences: 0,
    titleConditions: { 'open-box': 0, returned: 0, refurbished: 0 }, samples: [], verifiedInventory: false };
  const entryOrigins = new Set<string>(), linkOrigins = new Set<string>(), mediaOrigins = new Set<string>();
  const addOrigin = (value: string, base: string, target: Set<string>) => {
    try {
      const url = new URL(value, base);
      if (url.protocol !== 'https:' || url.username || url.password || url.port) { evidence.unsafeResourceReferences++; return; }
      if (bytes(url.origin) > 160 || target.size >= 8 && !target.has(url.origin)) evidence.originsTruncated = true;
      else target.add(url.origin);
    } catch { evidence.unsafeResourceReferences++; }
  };
  for (const entry of feed.entries) {
    addOrigin(entry.link, entry.link, entryOrigins);
    const titleConditions = conditions(entry.title); let visible = '', inspected = true, nodes = 0;
    try {
      for (const html of [entry.description, entry.content ?? '']) {
        if ((html.match(/</g)?.length ?? 0) > 10000) throw new TypeError('inspection-limit');
        const walk = (node: DefaultTreeAdapterTypes.Node, depth: number): void => {
          if (++nodes > 10000 || depth > 32) throw new TypeError('inspection-limit');
          if ('tagName' in node) {
            if (['script', 'style', 'template'].includes(node.tagName) || node.attrs.some(attribute => attribute.name === 'hidden' || attribute.name === 'aria-hidden' && attribute.value === 'true')) return;
            for (const attribute of node.attrs) {
              if (node.tagName === 'a' && attribute.name === 'href') addOrigin(attribute.value, entry.link, linkOrigins);
              if (node.tagName === 'img' && attribute.name === 'src') addOrigin(attribute.value, entry.link, mediaOrigins);
            }
          }
          if ('value' in node) visible += node.value + ' ';
          if ('childNodes' in node) for (const child of node.childNodes) walk(child, depth + 1);
        };
        walk(parseFragment(html), 0);
      }
    } catch { inspected = false; evidence.uninspectedBodyEntries++; }
    if (titleConditions.length) {
      evidence.titleConditionEntries++;
      for (const condition of titleConditions) evidence.titleConditions[condition]++;
      if (evidence.samples.length < 4 && bytes(entry.title) <= 512 && bytes(entry.link) <= 1024) evidence.samples.push({ title: entry.title, url: entry.link, conditions: titleConditions });
    } else if (inspected && conditions(visible).length) evidence.bodyOnlyConditionEntries++;
    else if (inspected) evidence.noConditionMentionEntries++;
  }
  evidence.linkOrigins = [...entryOrigins].sort(); evidence.contentLinkOrigins = [...linkOrigins].sort(); evidence.mediaOrigins = [...mediaOrigins].sort();
  return evidence;
}
