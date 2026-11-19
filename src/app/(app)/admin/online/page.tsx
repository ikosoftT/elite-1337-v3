import { notFound } from 'next/navigation';
import { Avatar } from '@/components/avatar';
import { ArrowUpRight, Campus, Cohort, Globe, Ranking } from '@/components/icons';
import { loadOnlineStudents } from '@/lib/admin-online';
import { requireStudent } from '@/lib/guard';
import { timeAgo } from '@/lib/time';
import { isAccessAdmin } from '@/lib/user-controls';
import { AdminTabs } from '../admin-tabs';
import { OnlineRefresh } from './online-refresh';

export const metadata = { title: 'Online now', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const pageName = (path: string) => path === '/' ? 'Home' : path.slice(1).split('/').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' / ');
const studentStatus = (status: 'ranked' | 'blackholed' | 'unlisted') => status === 'ranked' ? 'Common Core' : status === 'blackholed' ? 'Blackholed' : 'Not in leaderboard';

/** Shows administrators live site activity enriched from the shared ranking dataset. */
export default async function OnlineAdminPage() {
  const user = await requireStudent();
  if (!await isAccessAdmin(user.login)) notFound();
  const students = await loadOnlineStudents();
  return <main className="shell of fa ao">
    <header className="of-head ao-head">
      <div><h1>Online now</h1><p>Signed-in students active on Elite 1337 during the last three minutes.</p></div>
      <div className="ao-live"><i aria-hidden="true"/><strong>{students?.length ?? 0}</strong><span>online</span><OnlineRefresh/></div>
    </header>
    <AdminTabs current="/admin/online"/>
    {students === null ? <p className="fa-empty">Live presence is unavailable. Check the Redis configuration.</p> : !students.length ? <p className="fa-empty">Nobody is actively using the site right now.</p> : <ol className="ao-grid">
      {students.map((student) => <li key={student.id} className="ao-card">
        <div className="ao-avatar"><Avatar login={student.login} name={student.displayName} src={student.avatar} size={58}/><i aria-label="Online"/></div>
        <div className="ao-person"><strong>{student.login}</strong><span>{student.displayName ?? '1337 student'}</span></div>
        <div className="ao-page"><Globe size={15}/><span>Viewing</span><strong>{pageName(student.path)}</strong></div>
        <div className="ao-meta">
          {student.campus && <span><Campus size={14}/>{student.campus}</span>}
          {student.cohort && <span><Cohort size={14}/>Cohort {student.cohort}</span>}
          {student.level !== null && <span><Ranking size={14}/>Level {student.level.toFixed(2)}{student.rank ? ` · #${student.rank} global` : ''}</span>}
          <span className={`is-${student.status}`}>{studentStatus(student.status)}</span>
        </div>
        <a className="ao-intra" href={`https://profile.intra.42.fr/users/${encodeURIComponent(student.login)}`} target="_blank" rel="noopener noreferrer"><img src="/assets/42-mark.webp" alt="" width={24} height={24}/><span>Open Intra</span><ArrowUpRight size={13} weight="bold"/></a>
        <small>Active {timeAgo(student.lastSeen)}</small>
      </li>)}
    </ol>}
    <p className="ao-foot">Presence expires automatically after three minutes. Only configured administrators can see these identities, and no presence history is retained.</p>
  </main>;
}
