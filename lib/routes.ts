export interface AppRoute { view: 'deals' | 'saved'; offerId: string | null; panel: 'filters' | 'location' | null; offerIdentity?: string | null }
export function readRoute(url: string): AppRoute {
  const params = new URL(url).searchParams;
  const candidate = params.get('offer');
  const panel = params.get('panel');
  return { view: params.get('view') === 'saved' ? 'saved' : 'deals',
    offerId: candidate && candidate.length <= 200 && !/[\u0000-\u0020]/.test(candidate) ? candidate : null,
    offerIdentity: candidate && (params.get('unit')?.length ?? 0) <= 1500 ? params.get('unit') : null,
    panel: candidate ? null : panel === 'filters' || panel === 'location' ? panel : null };
}
export function routeUrl(route: AppRoute): string {
  const params = new URLSearchParams();
  if (route.view === 'saved') params.set('view', 'saved');
  if (route.offerId) { params.set('offer', route.offerId); if (route.offerIdentity) params.set('unit', route.offerIdentity); }
  else if (route.panel) params.set('panel', route.panel);
  return `/${params.size ? `?${params}` : ''}`;
}
export function historyDepth(state: unknown): number {
  if (!state || typeof state !== 'object' || !('openBoxFinder' in state)) return 0;
  const marker = (state as Record<string, unknown>).openBoxFinder;
  if (!marker || typeof marker !== 'object' || !('depth' in marker)) return 0;
  const depth = (marker as { depth: unknown }).depth;
  return typeof depth === 'number' && Number.isSafeInteger(depth) && depth >= 0 && depth <= 10000 ? depth : 0;
}
