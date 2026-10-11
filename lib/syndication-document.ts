/** HTML is already admitted as a complete original fragment by the server; never rewrite it. */
export function syndicationDocument(url: string, body: string): string {
  const base = url.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll("'",'&#39;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; frame-src 'none'; connect-src 'none'; form-action 'none'; base-uri https://www.dealnews.com"><base href="${base}" target="_blank"><style>body{font:16px/1.5 -apple-system,BlinkMacSystemFont,Arial,sans-serif;color:#0b1220;margin:16px;overflow-wrap:anywhere}img{max-width:100%}a{color:#075bc9}table{max-width:100%}</style></head><body>${body}</body></html>`;
}
