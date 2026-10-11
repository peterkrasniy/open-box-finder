'use client';
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { AppRoute } from '../lib/routes.ts';
import { historyDepth, readRoute, routeUrl } from '../lib/routes.ts';

const ROUTE_EVENT='open-box-finder:route';
const browserSnapshot=()=>window.location.href;
const serverSnapshot=()=> 'https://open-box-finder.invalid/';

/** Browser history is an external store; hydration and Back/Forward read the same URL. */
export function useRoute() {
  const closing = useRef(false);
  const subscribe = useCallback((changed:()=>void)=>{
    const pop=()=>{
      closing.current=false;changed();
      const next=readRoute(window.location.href),position=history.state?.openBoxFinder?.scrollY;
      if(!next.offerId&&!next.panel&&typeof position==='number'&&Number.isFinite(position)&&position>=0)requestAnimationFrame(()=>window.scrollTo(0,position));
    };
    window.addEventListener('popstate',pop);window.addEventListener(ROUTE_EVENT,changed);
    return ()=>{window.removeEventListener('popstate',pop);window.removeEventListener(ROUTE_EVENT,changed);};
  },[]);
  const href=useSyncExternalStore(subscribe,browserSnapshot,serverSnapshot);
  const route=useMemo(()=>readRoute(href),[href]);
  useEffect(()=>{
    const state=history.state&&typeof history.state==='object'?history.state:{};
    if(!state.openBoxFinder)history.replaceState({...state,openBoxFinder:{depth:0,scrollY:window.scrollY}},'',window.location.href);
  },[]);
  const navigate=useCallback((next:AppRoute,replace=false)=>{
    if(closing.current)return;
    const previous=history.state&&typeof history.state==='object'?history.state:{},depth=historyDepth(previous);
    history.replaceState({...previous,openBoxFinder:{depth,scrollY:window.scrollY}},'',window.location.href);
    const value={...previous,openBoxFinder:{depth:replace?depth:depth+1,scrollY:window.scrollY}};
    if(replace)history.replaceState(value,'',routeUrl(next));else history.pushState(value,'',routeUrl(next));
    window.dispatchEvent(new Event(ROUTE_EVENT));
    if(!next.offerId&&!next.panel)requestAnimationFrame(()=>window.scrollTo(0,0));
  },[]);
  const dismiss=useCallback(()=>{
    if(closing.current)return;
    if(historyDepth(history.state)>0){closing.current=true;history.back();}
    else navigate({view:route.view,offerId:null,panel:null},true);
  },[navigate,route.view]);
  return {route,navigate,dismiss};
}
