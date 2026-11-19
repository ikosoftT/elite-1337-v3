'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Avatar } from '@/components/avatar';
import { Star } from '@/components/icons';
import type { RecentCorrection } from '@/lib/corrector-profile';

const dateOf = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** One accurate correction record with expandable, unmodified feedback and owner identity. */
export function CorrectionFeedbackCard({ item, avatars }: { item: RecentCorrection; avatars: Record<number, string> }) {
  const [expanded, setExpanded] = useState(false), candidate: unknown = item.owners[0];
  const owner = candidate && typeof candidate === 'object' && 'id' in candidate && 'login' in candidate && typeof candidate.id === 'number' && typeof candidate.login === 'string' && candidate.login.trim() ? candidate as RecentCorrection['owners'][number] : null;
  const long = (item.feedback?.length ?? 110) > 110 || (item.correctedFeedback?.length ?? 75) > 75;
  const rating = item.rating === null ? null : Math.max(0, Math.min(5, Math.round(item.rating)));
  return <li className="sp-feedback-card">
    <div className="sp-profile-review-title"><h5>{item.project ?? 'Project name unavailable'}</h5><span className={`sp-review-status is-${item.returned ? 'returned' : 'passed'}`}>{item.returned ? 'Returned' : 'Validated'}</span></div>
    <div className="sp-profile-review-meta">
      {owner ? <Link href={`/students/${encodeURIComponent(owner.login)}`} className="sp-feedback-person"><Avatar login={owner.login} src={avatars[owner.id] ?? null} size={36}/><span><strong>{owner.login}</strong><small>{item.owners.length > 1 ? `Project owner · +${item.owners.length - 1} teammate${item.owners.length === 2 ? '' : 's'}` : 'Project owner'}</small></span></Link> : <span>Owner unavailable</span>}
      <time dateTime={item.at}>{dateOf(item.at)}</time>
    </div>
    <div className="sp-feedback-stars" role="img" aria-label={item.rating === null ? 'Not rated by the student' : `Student rating ${item.rating.toFixed(1)} out of 5`}>
      {rating === null ? <span>Not rated</span> : <>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={16} weight={index < rating ? 'fill' : 'regular'}/>)}<b>{item.rating?.toFixed(1)}</b></>}
    </div>
    <div className={`sp-feedback-copy${expanded ? ' is-expanded' : ''}`}><span>Corrector feedback</span><blockquote>{item.feedback ?? 'No written feedback'}</blockquote></div>
    <div className={`sp-feedback-response${expanded ? ' is-expanded' : ''}`}><span>Student response</span><p>{item.correctedFeedback ?? 'No written feedback'}</p></div>
    {long && <button type="button" className="sp-feedback-more" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>{expanded ? 'Show less' : 'Read more'}</button>}
  </li>;
}
