import { Suspense } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/avatar';
import { HackerBadge } from '@/components/hacker-badge';
import { CustomBadge } from '@/components/custom-badge';
import { ArrowUpRight, BarChart, Calculator, Campus, Check, Clock3, Cohort, Corrections, FolderKanban, Ranking, Star, Survival, Wallet } from '@/components/icons';
import { intraPhotoUrl, photoReferences } from '@/lib/avatars/intra-photo';
import { KiwiNote } from '@/components/kiwi-guide';
import { CORRECTOR_SAMPLE, loadCorrectorProfile, resolveCorrectionProjects } from '@/lib/corrector-profile';
import { campusName, type RankingDataset } from '@/lib/dataset';
import { cohortRank, topPercent } from '@/lib/ranking';
import { withTimeout } from '@/lib/timeout';
import { profileCursus, profileProjects, profileSkills, type StudentProfileSummary } from '@/lib/student-overview';
import { ProfileSkills } from '@/components/profile-skills';
import { CorrectionFeedbackCard } from '@/components/correction-feedback-card';
import { levelVisual } from '@/lib/level-visual';
import { ProfileProjects } from '@/components/profile-projects';
import { cursusId } from '@/lib/config';
import { ProfileActivity, ProfileCursusTimeline } from '@/components/profile-dashboard-parts';

const fmt = (value: number) => value.toLocaleString('en-US');
const dateOf = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
/** Below this many evaluations, the corrector numbers say little; they are shown with a note. */
const FEW_EVALUATIONS = 5;

/** The student as corrector, as an XP-calculator panel: return rate with its bar, then the details. */
export async function CorrectorCard({ userId, login, self, dataset, showRecent = false, profile = false, knownProjects }: { userId: number; login: string; self: boolean; dataset?: RankingDataset; showRecent?: boolean; profile?: boolean; knownProjects?: ReadonlyMap<number, string> }) {
  // One cached 42 request; past 4 s the panel is left out rather than holding the page.
  const result = await withTimeout(loadCorrectorProfile(userId), 4000, null);
  if (!result || result.status !== 'ready') return profile ? <p className="sp-profile-note">Correction activity is unavailable right now.</p> : null;
  if (!result.profile.evaluations) return profile ? <p className="sp-profile-note">No completed evaluations yet.</p> : null;
  const { evaluations, returned, rate, rated, rating } = result.profile;
  const recent = showRecent ? await resolveCorrectionProjects(result.profile.recent, knownProjects) : [];
  const ownerIds = new Set(recent.flatMap((item) => item.owners.map((owner) => owner.id)));
  const owners = dataset ? [...dataset.students, ...dataset.blackholed].filter((student) => ownerIds.has(student.id) && !student.anonymous) : [];
  const ownerAvatars = photoReferences(owners);
  return <section className="xp-panel sp-panel" aria-labelledby="sp-corrector">
    <h3 id="sp-corrector">{profile ? 'Evaluations given' : 'As a corrector'}</h3>
    <p className="sp-figure"><b>{rate === null ? '—' : `${Math.round(rate * 100)}%`}</b><span>of {fmt(evaluations)} {evaluations === 1 ? 'evaluation' : 'evaluations'} returned the project</span></p>
    {rate !== null && <div className="xp-bar sp-bar-coral" role="img" aria-label={`${Math.round(rate * 100)}% of evaluations returned`}><i style={{ width: `${rate * 100}%` }}/></div>}
    <dl className="sp-rows">
      <div><dt>Projects returned</dt><dd>{fmt(returned)}</dd></div>
      <div><dt>Average rating</dt><dd>{rating === null ? '—' : <span className="sp-rating">
        <span className="sp-stars" role="img" aria-label={`Rated ${rating.toFixed(1)} out of 5`} style={{ '--fill': `${rating / 5 * 100}%` } as React.CSSProperties}>
          <span>{[0, 1, 2, 3, 4].map((at) => <Star key={at} size={13}/>)}</span><span className="sp-stars-on">{[0, 1, 2, 3, 4].map((at) => <Star key={at} size={13} weight="fill"/>)}</span>
        </span>{rating.toFixed(1)}</span>}</dd></div>
      <div><dt>Ratings received</dt><dd>{fmt(rated)}</dd></div>
    </dl>
    {showRecent && recent.length > 0 && <div className="sp-correction-feed">
      <div className="sp-correction-title"><h4>Latest corrections</h4></div>
      <ol>{recent.map((item) => <CorrectionFeedbackCard key={item.id} item={item} avatars={ownerAvatars}/>)}</ol>
    </div>}
    <p className="xp-note">{evaluations < FEW_EVALUATIONS ? `Only ${evaluations} ${evaluations === 1 ? 'evaluation' : 'evaluations'} so far${self ? '' : ` for ${login}`}, so these numbers can move a lot.` : `From the ${evaluations >= CORRECTOR_SAMPLE ? `last ${CORRECTOR_SAMPLE}` : fmt(evaluations)} evaluations.`}</p>
  </section>;
}

/** Puts Common Core progress first and keeps workstation activity and balances on the owner's view. */
export function StudentProfile({ dataset, userId, details, self = false }: { dataset: RankingDataset; userId: number; details?: StudentProfileSummary | null; self?: boolean }) {
  const ranked = dataset.students.find((student) => student.id === userId);
  const lost = ranked ? undefined : dataset.blackholed.find((student) => student.id === userId);
  const person = ranked ?? lost;
  if (!person) return null;
  const campus = details?.campus_users.find((entry) => entry.is_primary && person.campusIds.includes(entry.campus_id))?.campus_id ?? person.campusIds[0];
  const campusLabel = campus ? campusName(dataset, campus) : null;
  const curriculum = cursusId();
  const commonCore = details ? profileCursus(details, curriculum) : undefined;
  const visual = levelVisual(commonCore?.level ?? person.level);
  const peers = ranked && campus ? dataset.students.filter((student) => student.campusIds.includes(campus)) : [];
  const cohortPeers = person.commonCoreCohort ? peers.filter((student) => student.commonCoreCohort === person.commonCoreCohort) : [];
  const inCohort = ranked && campus ? cohortRank(dataset.students, ranked, campus) : null;
  const pool = ranked?.poolMonth && ranked.poolYear ? `${ranked.poolMonth[0].toUpperCase()}${ranked.poolMonth.slice(1)} ${ranked.poolYear}` : null;
  const status = lost ? 'Blackholed' : ranked?.alumni ? 'Alumni' : ranked?.frozen ? 'Frozen' : 'Active';
  const ranks = ranked ? [
    ...(inCohort ? [{ title: 'Cohort', scope: ranked.commonCoreCohort, rank: inCohort, total: cohortPeers.length, icon: Cohort }] : []),
    ...(campus && ranked.campusRanks[campus] ? [{ title: 'Campus', scope: campusLabel, rank: ranked.campusRanks[campus], total: peers.length, icon: Campus }] : []),
    { title: '1337', scope: 'All campuses', rank: ranked.globalRank, total: dataset.students.length, icon: Ranking },
  ] : [];
  const skills = details ? profileSkills(details, curriculum) : [], projects = details ? profileProjects(details, curriculum) : [];
  const validated = projects.filter((project) => project.validated === true);
  const active = projects.find((project) => project.status === 'in_progress' && project.validated == null);
  const milestone = active ?? validated[0];
  const titles = details ? [...new Set(details.titles.map((title) => title.name.replace('%login', person.login)))].slice(0, 3) : [];
  const intra = `https://profile.intra.42.fr/users/${encodeURIComponent(person.login)}`;

  return <div className="sp-profile">
    <header className="sp-profile-hero">
      <div className="sp-profile-identity">
        <div className="sp-profile-person">
          <Avatar login={person.login} name={person.displayName} src={intraPhotoUrl(person.id, person.photo)} size={84} className="sp-profile-avatar"/>
          <div className="sp-profile-name">
            <p>{person.login}{campusLabel && <> · {campusLabel}</>}</p>
            <h1>{person.displayName || person.login}</h1>
            <div className="sp-profile-tags">
              {person.commonCoreCohort && <span>Cohort {person.commonCoreCohort}</span>}
              <span className={status === 'Active' ? 'is-active' : undefined}>{status}</span>
              {person.hacker && <HackerBadge/>}{person.customBadge && <CustomBadge label={person.customBadge}/>}
              {titles.map((title) => <span key={title}>{title}</span>)}
            </div>
          </div>
        </div>
        <div className="sp-profile-actions">
          <Link href={self ? '/me' : `/me?vs=${encodeURIComponent(person.login)}`} prefetch={false}><Survival size={17}/>{self ? 'My race' : 'Race against'}</Link>
          {(self || ranked) && <Link href={self ? '/xp' : `/xp?user=${encodeURIComponent(person.login)}`} prefetch={false}><Calculator size={17}/>Plan XP</Link>}
          <a href={intra} target="_blank" rel="noopener noreferrer">42 Intra<ArrowUpRight size={15}/></a>
        </div>
      </div>
      <div className="sp-profile-level">
        <div className="sp-profile-level-value"><span>Common Core level</span><strong>{visual.level.toFixed(2)}</strong></div>
        <div className="sp-profile-level-ring" style={{ backgroundImage: `conic-gradient(currentColor ${visual.progress}%, #14251c24 0)` }} role="progressbar" aria-label={`Progress to level ${visual.next}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={visual.progress}>
          <b>{Math.floor(visual.progress)}%</b>
        </div>
        <span className="sp-profile-level-next">Next level <b>{visual.next}</b></span>
      </div>

      {!!ranks.length && <section aria-label="Leaderboard ranks" className="sp-profile-ranks">
        {ranks.map(({ title, scope, rank, total, icon: Icon }) => <div key={title}>
          <span className="sp-profile-rank-label"><Icon size={16}/>{title}</span>
          <div className="sp-profile-rank-score"><strong>#{fmt(rank)}</strong><span>of {fmt(total)}</span></div>
          <small>{scope} · Top {topPercent(rank, total)}%</small>
        </div>)}
      </section>}
    </header>

    <nav className="sp-profile-nav" aria-label="Profile sections">
      <a href="#sp-projects"><FolderKanban size={16}/>Projects</a><a href="#sp-skills"><BarChart size={16}/>Skills</a>
      {self && <a href="#sp-activity"><Clock3 size={16}/>My activity</a>}<a href="#sp-evaluations"><Corrections size={16}/>Corrections</a>
    </nav>

    <div className="sp-profile-grid">
      <div className="sp-profile-column">
        <section className="sp-profile-card" id="sp-projects" aria-labelledby="sp-projects-title">
          <div className="sp-profile-heading"><h2 id="sp-projects-title">Projects</h2>{details && projects.length > 0 && <span>{fmt(validated.length)} of {fmt(projects.length)} validated</span>}</div>
          {milestone && <div className="sp-profile-milestone">
            <span className="sp-profile-milestone-icon">{active ? <Clock3 size={20}/> : <Check size={20}/>}</span>
            <div><span>{active ? 'In progress' : 'Latest validation'}</span><strong>{milestone.name}</strong></div>
            {!active && milestone.mark !== null && <b>{milestone.mark}<small>/100</small></b>}
          </div>}
          {projects.length > 0 ? <ProfileProjects key={person.id} projects={projects}/> : <KiwiNote><p>{details ? 'No Common Core project activity yet.' : 'Project activity is unavailable right now.'}</p></KiwiNote>}
        </section>
        {projects.length > 0 && <ProfileCursusTimeline projects={projects}/>}
      </div>

      <div className="sp-profile-column">
        <section className="sp-profile-card" id="sp-skills" aria-labelledby="sp-skills-title">
          <div className="sp-profile-heading"><h2 id="sp-skills-title">Common Core skills</h2></div>
          {skills.length > 0 ? <ProfileSkills key={person.id} skills={skills}/> : <p className="sp-profile-note">{details ? 'No skill values have been recorded yet.' : 'Skills are unavailable right now.'}</p>}
        </section>
        <section className="sp-profile-card" aria-labelledby="sp-about-title">
          <div className="sp-profile-heading"><h2 id="sp-about-title">Enrollment</h2></div>
          <dl className="sp-profile-facts">
            {campusLabel && <div><dt>Campus</dt><dd>{campusLabel}</dd></div>}
            {person.commonCoreCohort && <div><dt>Cohort</dt><dd>{person.commonCoreCohort}</dd></div>}
            {pool && <div><dt>Piscine</dt><dd>{pool}</dd></div>}
            {commonCore?.begin_at && <div><dt>Started</dt><dd>{dateOf(commonCore.begin_at)}</dd></div>}
            <div><dt>Status</dt><dd>{status}{lost && <> · {dateOf(lost.blackholedAt)}</>}</dd></div>
          </dl>
        </section>
      </div>
    </div>

    {self && <section className="sp-profile-card sp-profile-activity" id="sp-activity" aria-labelledby="sp-activity-title">
      <div className="sp-profile-heading"><h2 id="sp-activity-title">My activity</h2><span>Only visible to you</span></div>
      <dl className="sp-profile-balances">
        <div><Wallet size={17}/><dt>Wallet</dt><dd>{details?.wallet != null ? `${fmt(details.wallet)} ₳` : '—'}</dd></div>
        <div><Corrections size={17}/><dt>Evaluation points</dt><dd>{details?.correction_point != null ? fmt(details.correction_point) : '—'}</dd></div>
      </dl>
      <Suspense fallback={<div className="sp-skel is-panel" role="status" aria-label="Loading private logtime"/>}><ProfileActivity userId={String(person.id)}/></Suspense>
    </section>}

    <section className="sp-profile-card sp-profile-corrections" id="sp-evaluations" aria-labelledby="sp-evaluations-title">
      <div className="sp-profile-heading"><h2 id="sp-evaluations-title">Corrections</h2></div>
      <Suspense fallback={<div className="sp-skel is-panel" role="status" aria-label="Loading correction activity"/>}><CorrectorCard userId={person.id} login={person.login} self={self} dataset={self ? dataset : undefined} showRecent={self} profile knownProjects={self && details ? new Map(details.projects_users.map(({ project }) => [project.id, project.name.trim()])) : undefined}/></Suspense>
    </section>
  </div>;
}
