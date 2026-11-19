import { notFound } from 'next/navigation';
import { CustomBadge } from '@/components/custom-badge';
import { Plus, Trash } from '@/components/icons';
import { listCustomBadges } from '@/lib/custom-badges';
import { requireStudent } from '@/lib/guard';
import { isAccessAdmin } from '@/lib/user-controls';
import { withTimeout } from '@/lib/timeout';
import { AdminTabs } from '../admin-tabs';
import { deleteCustomBadge, saveCustomBadge } from './actions';

export const metadata = { title: 'Custom badges', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
const notices: Record<string, string> = { saved: 'Custom badge saved.', removed: 'Custom badge removed.', invalid: 'Enter a valid login and badge label.', unavailable: 'Custom badges are unavailable. Check the Redis configuration.' };

/** Lets administrators assign persistent Redis-backed recognition badges. */
export default async function BadgesAdminPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const user = await requireStudent();
  if (!await isAccessAdmin(user.login)) notFound();
  const [badges, query] = await Promise.all([withTimeout(listCustomBadges(), 2_000, null), searchParams]);
  return <main className="shell of fa ac cb-admin">
    <header className="of-head"><div><h1>Custom badges</h1><p>Recognize selected students with a label shown beside their login.</p></div></header>
    <AdminTabs current="/admin/badges"/>
    {query.result && notices[query.result] && <p className={`ac-notice is-${query.result}`}>{notices[query.result]}</p>}
    <form action={saveCustomBadge} className="ac-add cb-add">
      <label htmlFor="cb-login">42 login</label><input id="cb-login" name="login" required minLength={2} maxLength={40} pattern="[A-Za-z0-9_.-]+" placeholder="jdoe"/>
      <label htmlFor="cb-label">Badge label</label><input id="cb-label" name="label" required minLength={1} maxLength={18} pattern="[A-Za-z0-9][A-Za-z0-9 ._-]*" placeholder="Mentor"/>
      <button type="submit"><Plus size={15}/>Assign badge</button>
    </form>
    {badges === null ? <p className="fa-empty">Custom badges are unavailable. Check the Redis configuration.</p> : !badges.length ? <p className="fa-empty">No custom badges assigned yet.</p> : <div className="ac-table-wrap"><table className="ex-table ac-table cb-table"><thead><tr><th>Student</th><th>Badge</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
      {badges.map((badge) => <tr key={badge.login}><td><strong>{badge.login}</strong></td><td><CustomBadge label={badge.label}/></td><td><small>{new Date(badge.updatedAt).toLocaleString('en-GB', { timeZone: 'Africa/Casablanca' })}<br/>by {badge.updatedBy}</small></td><td><form action={deleteCustomBadge}><input type="hidden" name="login" value={badge.login}/><button className="ac-remove" type="submit" aria-label={`Remove custom badge from ${badge.login}`}><Trash size={15}/></button></form></td></tr>)}
    </tbody></table></div>}
    <p className="ao-foot">Badge assignments stay in Redis until removed. Changes appear across app instances within about 30 seconds.</p>
  </main>;
}
