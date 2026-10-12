import type { CSSProperties } from 'react';

const paths = {
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></>,
  box: <><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/></>,
  openBox: <><path d="m12 7-5-3-6 4 6 3 5-4 5 4 6-3-6-4-5 3Z"/><path d="M5 12v7l7 4 7-4v-7M12 14v9"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  filters: <><path d="M3 6h5m4 0h9M3 12h11m4 0h3M3 18h3m4 0h11"/><circle cx="10" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/></>,
  sort: <><path d="M7 20V4m-4 4 4-4 4 4M17 4v16m-4-4 4 4 4-4"/></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
  bookmark: <path d="M6 3h12v18l-6-4-6 4V3Z"/>,
  close: <path d="m5 5 14 14M5 19 19 5"/>,
  left: <path d="m14 5-7 7 7 7M7 12h14"/>,
  right: <path d="M3 12h18m-7-7 7 7-7 7"/>,
  down: <path d="m6 9 6 6 6-6"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  external: <><path d="M15 3h6v6m0-6-10 10"/><path d="M10 3H3v18h18v-7"/></>,
  truck: <><path d="M1 5h13v12H1V5Zm13 4h5l4 5v3h-9V9Z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
} as const;
export type IconName = keyof typeof paths;
export function Icon({ name, size = 24, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>{paths[name]}</svg>;
}
