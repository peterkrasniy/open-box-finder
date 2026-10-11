'use client';
import { useState } from 'react';
import type { Language, Offer } from '../lib/offer.ts';
import { safeExternalUrl } from '../lib/storage.ts';
import { text } from '../lib/i18n.ts';

export function OfferMedia({ offer, language, priority = false }: { offer: Offer; language: Language; priority?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src = safeExternalUrl(offer.imageUrl);
  return <div className="offer-media">{src && failedUrl !== src
    ? <img src={src} alt={offer.imageAlt || offer.title} loading={priority ? 'eager' : 'lazy'} decoding="async" fetchPriority={priority ? 'high' : 'auto'} width="640" height="480" onError={() => setFailedUrl(src)}/>
    : <span className="no-image">{text(language, 'noImage')}</span>}</div>;
}
