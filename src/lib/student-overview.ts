import { unstable_cache } from 'next/cache';
import { singleFlight } from './single-flight';
import { z } from 'zod';
import { fortyTwoApi, IncompletePopulationError } from './fortytwo-api';
import { isDemo } from './demo';
import { intraPhotoPath } from './avatars/intra-photo';

const profileSchema = z.object({
  wallet: z.number().nullish(),
  correction_point: z.number().nullish(),
  pool_year: z.string().nullish(),
  pool_month: z.string().nullish(),
  image: z.unknown().transform(intraPhotoPath).optional(),
  campus_users: z.array(z.object({ campus_id: z.number().int(), is_primary: z.boolean().nullish() })).default([]),
  cursus_users: z.array(z.object({
    cursus_id: z.number().int(), level: z.number().nullish(), begin_at: z.string().nullish(), end_at: z.string().nullish(),
    skills: z.array(z.object({ id: z.number().int(), name: z.string(), level: z.number() })).default([]),
  })).default([]),
  projects_users: z.array(z.object({
    id: z.number().int(), status: z.string(), final_mark: z.number().nullish(), 'validated?': z.boolean().nullish(), marked_at: z.string().nullish(), updated_at: z.string(),
    cursus_ids: z.array(z.number().int()).default([]),
    project: z.object({ id: z.number().int(), name: z.string(), slug: z.string(), parent_id: z.number().int().nullish() }),
  })).default([]),
  achievements: z.array(z.object({ id: z.number().int(), name: z.string(), description: z.string().nullish(), tier: z.string().nullish(), kind: z.string().nullish(), image: z.string().nullish() })).default([]),
  titles: z.array(z.object({ id: z.number().int(), name: z.string() })).default([]),
  expertises_users: z.array(z.object({ id: z.number().int(), expertise_id: z.number().int(), value: z.number().nullish(), contact_me: z.boolean().nullish() })).default([]),
});
const locationSchema = z.object({ begin_at: z.string(), end_at: z.string().nullish() });
export type StudentProfileSummary = z.infer<typeof profileSchema>;
export type LocationSession = z.infer<typeof locationSchema>;
export type DailyLogtime = { date: string; seconds: number };
export type LogtimeSummary = { todaySeconds: number; weekSeconds: number; monthSeconds: number; weekStartIso: string; monthStartIso: string; monthEndIso: string; daily: DailyLogtime[] };
export type ProfileSkill = { id: number; name: string; level: number };
export type ProfileProject = { id: number; projectId: number; name: string; slug: string; status: string; mark: number | null; validated: boolean | null; at: string; attempts: number; cursusIds: number[] };

/** Selects the active matching enrollment, falling back to the most recently started one. */
export function profileCursus(profile: StudentProfileSummary, curriculum = 21) {
  return profile.cursus_users.filter((entry) => entry.cursus_id === curriculum).sort((a, b) => Number(a.end_at != null) - Number(b.end_at != null) || Date.parse(b.begin_at ?? '') - Date.parse(a.begin_at ?? ''))[0];
}

/** Common Core skills sorted by strength, without duplicate skill names. */
export function profileSkills(profile: StudentProfileSummary, curriculum = 21): ProfileSkill[] {
  const cursus = profileCursus(profile, curriculum);
  return [...new Map((cursus?.skills ?? []).map((skill) => [skill.name.toLowerCase(), skill])).values()].sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
}

/** Collapses retries to the latest project record so the profile never counts one project twice. */
export function profileProjects(profile: StudentProfileSummary, curriculum = 21): ProfileProject[] {
  const relevant = profile.projects_users.filter((record) => record.project.parent_id == null && (!record.cursus_ids.length || record.cursus_ids.includes(curriculum)));
  const grouped = new Map<number, typeof relevant>();
  for (const record of relevant) grouped.set(record.project.id, [...(grouped.get(record.project.id) ?? []), record]);
  return [...grouped.values()].map((records) => {
    const latest = records.sort((a, b) => Date.parse(b.marked_at ?? b.updated_at) - Date.parse(a.marked_at ?? a.updated_at))[0];
    return { id: latest.id, projectId: latest.project.id, name: latest.project.name, slug: latest.project.slug, status: latest.status, mark: latest.final_mark ?? null, validated: latest['validated?'] ?? null, at: latest.marked_at ?? latest.updated_at, attempts: records.length, cursusIds: latest.cursus_ids };
  }).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/** Turns only official relative achievement paths into public CDN URLs. */
export function achievementImageUrl(path: string | null | undefined): string | null {
  if (!path?.startsWith('/uploads/achievement/image/')) return null;
  return `https://cdn.intra.42.fr${path.replace('/uploads', '')}`;
}

function checkedId(id: string) {
  if (!/^\d+$/.test(id)) throw new Error('Invalid 42 user ID');
  return id;
}

export const getStudentProfile = singleFlight(unstable_cache(async (id: string) => {
  if (isDemo()) return { wallet: 420, correction_point: 7, pool_year: '2023', pool_month: 'july', image: null, campus_users: [{ campus_id: 21, is_primary: true }], cursus_users: [{ cursus_id: 21, level: 8.42, begin_at: '2023-10-01T00:00:00Z', end_at: null, skills: [{ id: 1, name: 'Unix', level: 12.4 }, { id: 2, name: 'Imperative programming', level: 10.8 }] }], projects_users: [], achievements: [{ id: 1, name: 'Welcome!', description: 'Start the Common Core.', tier: 'none', kind: 'project', image: null }], titles: [], expertises_users: [] } satisfies StudentProfileSummary;
  return (await fortyTwoApi.request(`users/${checkedId(id)}`, profileSchema)).data;
}, ['42-student-profile-v4'], { revalidate: 600 }));

export function calculateLogtimeSeconds(sessions: LocationSession[], dayStart: number, now: number): number {
  const intervals = sessions.map((session) => {
    const begin = Date.parse(session.begin_at);
    const end = session.end_at ? Date.parse(session.end_at) : now;
    return [Math.max(begin, dayStart), Math.min(end, now)] as const;
  }).filter(([begin, end]) => Number.isFinite(begin) && Number.isFinite(end) && end > begin).sort((a, b) => a[0] - b[0]);
  let total = 0;
  let lastEnd = dayStart;
  for (const [begin, end] of intervals) {
    total += Math.max(0, end - Math.max(begin, lastEnd));
    lastEnd = Math.max(lastEnd, end);
  }
  return Math.floor(total / 1000);
}

/** Splits the already-fetched location window into UTC days for private activity calendars. */
export function dailyLogtime(sessions: LocationSession[], start: number, end: number): DailyLogtime[] {
  const days: DailyLogtime[] = [];
  for (let day = start; day < end; day += 86_400_000) days.push({ date: new Date(day).toISOString().slice(0, 10), seconds: calculateLogtimeSeconds(sessions, day, Math.min(day + 86_400_000, end)) });
  return days;
}

export function logtimePeriods(now: Date) {
  const year = now.getUTCFullYear(), month = now.getUTCMonth(), day = now.getUTCDate();
  const todayStart = Date.UTC(year, month, day);
  const weekStart = Date.UTC(year, month, day - ((now.getUTCDay() + 6) % 7));
  const monthStart = Date.UTC(year, month + (day >= 28 ? 0 : -1), 28);
  const monthEnd = Date.UTC(year, month + (day >= 28 ? 1 : 0), 28);
  return { todayStartIso: new Date(todayStart).toISOString(), weekStartIso: new Date(weekStart).toISOString(), monthStartIso: new Date(monthStart).toISOString(), monthEndIso: new Date(monthEnd).toISOString(), earliestStartIso: new Date(Math.min(weekStart, monthStart)).toISOString() };
}

const getLogtimeSummary = singleFlight(unstable_cache(async (id: string, periods: ReturnType<typeof logtimePeriods>): Promise<LogtimeSummary> => {
  const earliestStart = Date.parse(periods.earliestStartIso);
  const sessions: LocationSession[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data } = await fortyTwoApi.request(`users/${checkedId(id)}/locations`, z.array(locationSchema), { sort: '-begin_at', 'page[size]': '100', 'page[number]': String(page) });
    sessions.push(...data);
    if (data.length < 100 || data.some((session) => Date.parse(session.begin_at) < earliestStart)) {
      const now = Date.now();
      return {
        todaySeconds: calculateLogtimeSeconds(sessions, Date.parse(periods.todayStartIso), now),
        weekSeconds: calculateLogtimeSeconds(sessions, Date.parse(periods.weekStartIso), now),
        monthSeconds: calculateLogtimeSeconds(sessions, Date.parse(periods.monthStartIso), now),
        weekStartIso: periods.weekStartIso,
        monthStartIso: periods.monthStartIso,
        monthEndIso: periods.monthEndIso,
        daily: dailyLogtime(sessions, Date.parse(periods.monthStartIso), Math.min(now, Date.parse(periods.monthEndIso))),
      };
    }
  }
  throw new IncompletePopulationError('Recent location sessions exceed the bounded request budget');
}, ['42-logtime-summary-v2'], { revalidate: 300 }));

/** Lets the owner's logtime load independently of the rest of the profile. */
export async function loadStudentLogtime(id: string, now = new Date()): Promise<LogtimeSummary | null> {
  if (isDemo()) return null;
  return getLogtimeSummary(id, logtimePeriods(now)).catch(() => null);
}
