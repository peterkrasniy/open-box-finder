'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppRoute } from '../lib/routes.ts';
import { historyDepth, readRoute, routeUrl } from '../lib/routes.ts';

export function useRoute() {
  const [route, setRoute] = useState<AppRoute>({ view: 'deals', offerId: null, panel: null });
  const closing = useRef(false);
  useEffect(() => {
    const state = history.state && typeof history.state === 'object' ? history.state : {};
    if (!state.openBoxFinder) history.replaceState({ ...state, openBoxFinder: { depth: 0, scrollY: window.scrollY } }, '', window.location.href);
    setRoute(readRoute(window.location.href));
    const pop = () => {
      closing.current = false;
      const next = readRoute(window.location.href);
      setRoute(next);
      const position = history.state?.openBoxFinder?.scrollY;
      if (!next.offerId && !next.panel && typeof position === 'number' && Number.isFinite(position) && position >= 0) requestAnimationFrame(() => window.scrollTo(0, position));
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  const navigate = useCallback((next: AppRoute, replace = false) => {
    if (closing.current) return;
    const previous = history.state && typeof history.state === 'object' ? history.state : {};
    const depth = historyDepth(previous);
    history.replaceState({ ...previous, openBoxFinder: { depth, scrollY: window.scrollY } }, '', window.location.href);
    const value = { ...previous, openBoxFinder: { depth: replace ? depth : depth + 1, scrollY: window.scrollY } };
    if (replace) history.replaceState(value, '', routeUrl(next)); else history.pushState(value, '', routeUrl(next));
    setRoute(next);
    if (!next.offerId && !next.panel) requestAnimationFrame(() => window.scrollTo(0, 0));
  }, []);
  const dismiss = useCallback(() => {
    if (closing.current) return;
    if (historyDepth(history.state) > 0) { closing.current = true; history.back(); }
    else navigate({ view: route.view, offerId: null, panel: null }, true);
  }, [navigate, route.view]);
  return { route, navigate, dismiss };
}
