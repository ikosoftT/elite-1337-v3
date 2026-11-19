import type { CSSProperties } from 'react';
import { levelVisual } from '@/lib/level-visual';

/** Makes fractional cursus progress the visual anchor without implying total curriculum completion. */
export function LevelProgressRing({ level }: { level: number }) {
  const visual = levelVisual(level);
  return <div className="sp-level-ring" style={{ '--level-color': visual.color, '--level-progress': visual.progress } as CSSProperties}>
    <svg viewBox="0 0 120 120" role="progressbar" aria-label={`${Math.round(visual.progress)}% toward level ${visual.next}`} aria-valuenow={Math.round(visual.progress)} aria-valuemin={0} aria-valuemax={100}>
      <circle className="sp-ring-track" cx="60" cy="60" r="51" pathLength="100"/>
      <circle className="sp-ring-value" cx="60" cy="60" r="51" pathLength="100"/>
    </svg>
    <span><strong>{(Math.floor(visual.level * 100) / 100).toFixed(2)}</strong><small>{visual.tier} tier</small></span>
  </div>;
}
