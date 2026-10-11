import { SaxesParser } from 'saxes';
import { safeExternalUrl } from '../storage.ts';
import { SourceParseError } from './parse-evidence.ts';

export interface RssEntry {
  guid: string; title: string; link: string; description: string; content: string | null; publishedAt: string | null;
}
export interface RssResult { entries: RssEntry[]; complete: boolean; rejected: number }
const MAX_XML_BYTES=1024*1024, MAX_FIELD_CHARS=32768, MAX_ITEMS=100;
const FIELDS=new Set(['guid','title','link','description','content:encoded','pubDate']);

/** Strict bounded RSS 2 parser. No DTD/entity fetch, HTML repair or price inference. */
export function parseRss(xml:string):RssResult {
  if(new TextEncoder().encode(xml).byteLength>MAX_XML_BYTES)throw new SourceParseError('rss-size');
  const parser=new SaxesParser({xmlns:false,position:false});
  const path:string[]=[], entries:RssEntry[]=[], ids=new Set<string>();
  let item:Map<string,string>|null=null,nodes=0,count=0,rejected=0,rss=false,channel=false,nestedField=false;
  parser.on('doctype',()=>{throw new SourceParseError('rss-doctype');});
  parser.on('opentag',tag=>{
    if(++nodes>30000||path.length>=32||Object.keys(tag.attributes).length>32)throw new SourceParseError('rss-structure');
    path.push(tag.name);
    if(path.length===1){if(tag.name!=='rss'||tag.attributes.version!=='2.0')throw new SourceParseError('rss-envelope');rss=true;}
    if(path.join('/')==='rss/channel')channel=true;
    if(path.join('/')==='rss/channel/item'){if(++count>MAX_ITEMS)throw new SourceParseError('rss-item-limit');item=new Map();nestedField=false;}
    if(item&&path.length===4&&FIELDS.has(tag.name)){if(item.has(tag.name))throw new SourceParseError('rss-duplicate-field');item.set(tag.name,'');}
    if(item&&path.length>4&&FIELDS.has(path[3]))nestedField=true;
  });
  const append=(value:string)=>{
    if(!item||path.length!==4||!FIELDS.has(path[3]))return;
    const next=(item.get(path[3])??'')+value;if(next.length>MAX_FIELD_CHARS)throw new SourceParseError('rss-field-limit');item.set(path[3],next);
  };
  parser.on('text',append);parser.on('cdata',append);
  parser.on('closetag',()=>{
    if(path.join('/')==='rss/channel/item'&&item){
      const title=item.get('title')??'',link=item.get('link')??'',description=item.get('description')??'',content=item.get('content:encoded')??null;
      const guid=item.get('guid')||link;
      // Keep supplied content/link spelling; skip the whole item rather than silently repairing it.
      if(nestedField||!title||title.length>240||/[\u0000-\u001f]/.test(title)||!guid||guid.length>2048||!safeExternalUrl(link)||(!description&&!content)||ids.has(guid)){rejected++;}
      else{ids.add(guid);const date=item.get('pubDate');entries.push({guid,title,link,description,content,publishedAt:date&&Number.isFinite(Date.parse(date))?new Date(date).toISOString():null});}
      item=null;
    }
    path.pop();
  });
  parser.write(xml).close();
  if(!rss||!channel||item||path.length)throw new SourceParseError('rss-incomplete');
  return {entries,complete:rejected===0,rejected};
}
