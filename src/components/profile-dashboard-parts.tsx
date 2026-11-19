import { Calendar, ChevronDown } from '@/components/icons';
import { formatLogtime, LogtimeProgress } from '@/components/logtime-progress';
import { loadStudentLogtime, type ProfileProject } from '@/lib/student-overview';
import { withTimeout } from '@/lib/timeout';

const dateOf = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const projectState = (project: ProfileProject) => project.validated === true ? 'done' : project.validated === false ? 'failed' : 'active';

/** Keeps chronological project history available without taking space from the project explorer. */
export function ProfileCursusTimeline({ projects }: { projects: ProfileProject[] }) {
  return <details className="sp-profile-card sp-profile-timeline">
    <summary><Calendar size={18}/><span>Cursus timeline</span><ChevronDown size={16}/></summary>
    <div className="sp-timeline-scroll" tabIndex={0} role="region" aria-label="Common Core projects in chronological order"><ol className="sp-timeline">
      {[...projects].reverse().map((project) => <li key={project.projectId} className={`is-${projectState(project)}`}>
        <span>{project.validated === true ? 'Validated' : project.validated === false ? 'Needs retry' : 'Pending'}</span>
        <strong>{project.name}</strong><small>{dateOf(project.at)}{project.mark !== null ? ` · ${project.mark}/100` : ''}</small>
      </li>)}
    </ol></div>
  </details>;
}

/** Streams the owner's private workstation totals and calendar from the same cached sessions. */
export async function ProfileActivity({ userId }: { userId: string }) {
  const summary = await withTimeout(loadStudentLogtime(userId), 10_000, null);
  if (!summary) return <p className="sp-profile-note">42 workstation activity is unavailable right now.</p>;
  const daily = summary.daily, peak = Math.max(1, ...daily.map((day) => day.seconds));
  const blanks = (new Date(summary.monthStartIso).getUTCDay() + 6) % 7;
  return <div className="sp-profile-logtime">
    <LogtimeProgress summary={summary}/>
    {daily.length > 0 && <div className="sp-profile-calendar">
      <h3>Daily activity</h3>
      <div className="sp-cal-weekdays" aria-hidden="true">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div>
      <ul className="sp-cal-days" aria-label="Daily workstation logtime">
        {Array.from({ length: blanks }, (_, index) => <li key={index} aria-hidden="true"/>)}
        {daily.map((day) => {
          const level = day.seconds === 0 ? 0 : Math.max(1, Math.ceil(day.seconds / peak * 4));
          const label = `${dateOf(`${day.date}T00:00:00Z`)} · ${formatLogtime(day.seconds)}`;
          return <li key={day.date} className={`is-l${level}`} title={label}><span aria-hidden="true">{Number(day.date.slice(-2))}</span><span className="sr-only">{label}</span></li>;
        })}
      </ul>
    </div>}
  </div>;
}
