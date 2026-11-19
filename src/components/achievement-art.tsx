'use client';

import { useState } from 'react';
import { Trophy } from '@/components/icons';

/** Falls back cleanly when an old official achievement asset is no longer available. */
export function AchievementArt({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className="sp-achievement-fallback"><Trophy size={18}/></span>;
  return <img className="sp-achievement-art" src={src} alt="" title={`${name} achievement`} loading="lazy" onError={() => setFailed(true)}/>;
}
