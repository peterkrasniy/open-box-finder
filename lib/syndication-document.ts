import type {SyndicationImageScope} from './offer.ts';
import {safeExternalUrl} from './storage.ts';
const attribute=(value:string)=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll("'",'&#39;').replaceAll('<','&lt;').replaceAll('>','&gt;');
/** CSP directory prefixes and server URL inspection must share the same exact boundary. */
export function validImageScopes(value:unknown):value is SyndicationImageScope[]{
  return Array.isArray(value)&&value.length<=16&&value.every(scope=>{
    if(!scope||typeof scope!=='object'||typeof scope.origin!=='string'||typeof scope.pathPrefix!=='string'||!safeExternalUrl(scope.origin))return false;
    try {const url=new URL(scope.origin);return url.origin===scope.origin&&!url.port&&/^\/[A-Za-z0-9_./~-]*\/$|^\/$/.test(scope.pathPrefix)&&scope.pathPrefix.length<=500&&new URL(scope.pathPrefix,url).pathname===scope.pathPrefix&&!scope.pathPrefix.includes('//');}catch{return false;}
  })&&new Set(value.map(scope=>scope.origin+scope.pathPrefix)).size===value.length;
}
/** HTML is admitted as a complete original fragment; only its reviewed resources are allowed. */
export function syndicationDocument(url: string, body: string, imageScopes:readonly SyndicationImageScope[]=[]): string {
  if(!validImageScopes(imageScopes))throw new TypeError('Invalid syndication image scopes');
  const images=imageScopes.map(scope=>scope.origin+scope.pathPrefix).join(' ')||"'none'";
  const policy=`default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src ${images}; frame-src 'none'; connect-src 'none'; form-action 'none'; base-uri https://www.dealnews.com`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${attribute(policy)}"><base href="${attribute(url)}" target="_blank"><style>body{font:16px/1.5 -apple-system,BlinkMacSystemFont,Arial,sans-serif;color:#0b1220;margin:16px;overflow-wrap:anywhere}img{max-width:100%}a{color:#075bc9}table{max-width:100%}</style></head><body>${body}</body></html>`;
}
