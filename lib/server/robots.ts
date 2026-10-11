/** Conservative robots path check (not an access or redistribution grant) for a fixed public path. Unsupported syntax fails closed. */
export function robotsAllows(text: string, path: string, agent = 'OpenBoxFinder'): boolean {
  if (text.length > 131072 || /[^\x09\x0a\x0d\x20-\x7e]/.test(text) || !path.startsWith('/') || path.length > 2000 || /[%\\\u0000-\u0020]/.test(path) || !/^[a-z_-]+$/i.test(agent)) return false;
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
  let group = { agents: [] as string[], rules: [] as { allow: boolean; path: string }[] }, hasRules = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split('#')[0].trim(); if (!line) continue;
    const match = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line); if (!match) return false;
    const field = match[1].toLowerCase(), value = match[2].trim();
    if (field === 'user-agent') {
      if (hasRules) { groups.push(group); group = { agents: [], rules: [] }; hasRules = false; }
      if (!/^(?:\*|[a-z_-]+)$/i.test(value)) return false;
      group.agents.push(value.toLowerCase());
    } else if (field === 'allow' || field === 'disallow') {
      if (!group.agents.length) return false;
      hasRules = true;
      if (value === '') continue;
      if (!value.startsWith('/') || /[%\\\u0000-\u0020]/.test(value)) return false;
      group.rules.push({ allow: field === 'allow', path: value });
    } else if (!['sitemap','crawl-delay','host'].includes(field)) return false;
    if (field === 'crawl-delay' && (!/^\d{1,6}(?:\.\d{1,3})?$/.test(value) || Number(value) > 0)) return false;
  }
  if (group.agents.length) groups.push(group);
  const token=agent.toLowerCase();
  // Decline ambiguous token aliases rather than letting a prefix group's Allow override an exact denial.
  if(groups.some(group=>group.agents.some(name=>name!=='*'&&name!==token&&(token.startsWith(name)||name.startsWith(token)))))return false;
  const exact = groups.filter(group => group.agents.includes(token));
  const selected = exact.length ? exact : groups.filter(group => group.agents.includes('*'));
  let longest = -1, allowed = true;
  for (const group of selected) for (const rule of group.rules) {
    const anchored = rule.path.endsWith('$'), body = anchored ? rule.path.slice(0, -1) : rule.path;
    if (body.length > 2000) return false;
    const parts = body.split('*');
    if (parts.length > 17) return false;
    if (!path.startsWith(parts[0])) continue;
    let position = parts[0].length, matched = true;
    for (let index = 1; index < parts.length; index++) {
      const part = parts[index];
      const found = anchored && index === parts.length - 1 ? (path.endsWith(part) ? path.length - part.length : -1) : path.indexOf(part, position);
      if (found < position) { matched = false; break; }
      position = found + part.length;
    }
    if (!matched || anchored && parts.length === 1 && path !== body) continue;
    const specificity = body.replaceAll('*', '').length;
    if (specificity > longest || specificity === longest && rule.allow) { longest = specificity; allowed = rule.allow; }
  }
  return allowed;
}
