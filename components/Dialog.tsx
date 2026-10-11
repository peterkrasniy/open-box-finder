'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { Language } from '../lib/offer.ts';
import { text } from '../lib/i18n.ts';

export function Dialog({ open, title, language, onDismiss, children, className = '' }: {
  open: boolean; title: string; language: Language; onDismiss: () => void; children: ReactNode; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!open) { if (dialog.open) dialog.close(); return; }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!dialog.open) dialog.showModal();
    return () => { document.body.style.overflow = previousOverflow; if (dialog.open) dialog.close(); };
  }, [open]);
  return <dialog ref={ref} className={`app-dialog ${className}`} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); onDismiss(); }}>
    <header className="dialog-header"><h2 id="dialog-title">{title}</h2><button type="button" className="icon-button" aria-label={text(language, 'close')} onClick={onDismiss}><Icon name="close"/></button></header>
    {children}
  </dialog>;
}
