'use client';

import { useState } from 'react';
import type { ProfileSkill } from '@/lib/student-overview';

/** Keeps long skill lists compact while preserving every official value on demand. */
export function ProfileSkills({ skills }: { skills: ProfileSkill[] }) {
  const [expanded, setExpanded] = useState(false), shown = expanded ? skills : skills.slice(0, 6);
  const max = Math.max(1, ...skills.map((skill) => skill.level));
  return <>
    <p className="sp-relative-note">Bars are relative to this student&apos;s strongest displayed skill.</p>
    <div className="sp-skill-list">{shown.map((skill) => <div key={skill.id} className="sp-skill">
      <span><b>{skill.name}</b><em>{skill.level.toFixed(2)}</em></span>
      <div className="sp-skill-track" role="img" aria-label={`${skill.name}, exact value ${skill.level.toFixed(2)}`}><i style={{ width: `${Math.max(0, Math.min(100, skill.level / max * 100))}%` }}/></div>
    </div>)}</div>
    {skills.length > 6 && <button type="button" className="sp-show-all" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>{expanded ? 'Show strongest only' : `Show all ${skills.length} skills`}</button>}
  </>;
}
