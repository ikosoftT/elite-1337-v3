'use client';

import { useState } from 'react';
import { Check, Clock3, X } from '@/components/icons';
import type { ProfileProject } from '@/lib/student-overview';

const dateOf = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const stateOf = (project: ProfileProject) => project.validated === true ? 'passed' : project.validated === false ? 'failed' : 'active';
const labelOf = (project: ProfileProject) => project.validated === true ? 'Validated' : project.validated === false ? 'Failed' : project.status.replaceAll('_', ' ');
const states = { all: 'All', active: 'Pending', passed: 'Validated', failed: 'Needs retry' } as const;
type ProjectState = keyof typeof states;

/** Prioritizes recent project activity while keeping the complete deduplicated history available. */
export function ProfileProjects({ projects }: { projects: ProfileProject[] }) {
  const [state, setState] = useState<ProjectState>('all');
  const [expanded, setExpanded] = useState(false);
  const matching = state === 'all' ? projects : projects.filter((project) => stateOf(project) === state);
  const shown = expanded ? matching : matching.slice(0, 6);
  return <>
    <div className="sp-project-filters" role="group" aria-label="Project status">
      {(Object.keys(states) as ProjectState[]).map((key) => <button key={key} type="button" className="pl-chip is-mint" aria-pressed={state === key} data-active={state === key || undefined} aria-controls="sp-project-results" onClick={() => { setState(key); setExpanded(false); }}>{states[key]}</button>)}
    </div>
    <div id="sp-project-results">
    <span className="sr-only" role="status">{matching.length} matching projects</span>
    {shown.length > 0 ? <ol className="sp-projects">{shown.map((project) => <li key={project.projectId}>
      <span className={`sp-project-state is-${stateOf(project)}`} aria-hidden="true">{project.validated === true ? <Check size={14}/> : project.validated === false ? <X size={14}/> : <Clock3 size={14}/>}</span>
      <span><strong>{project.name}</strong><small>{labelOf(project)} · {dateOf(project.at)}{project.attempts > 1 ? ` · ${project.attempts} records` : ''}</small></span>
      {project.mark !== null && <span className="sp-project-mark"><b>{project.mark}</b><small>/ 100</small></span>}
    </li>)}</ol> : <p className="sp-profile-note">No projects match this status.</p>}
    {matching.length > 6 && <button type="button" className="sp-show-all" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>{expanded ? 'Show recent projects' : `Show all ${matching.length} projects`}</button>}
    </div>
  </>;
}
