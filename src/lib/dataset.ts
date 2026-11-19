import { unstable_cache } from 'next/cache';
import { singleFlight } from './single-flight';
import { campusIds, cursusId, excludedUserIds } from './config';
import { fortyTwoApi, IncompletePopulationError, RateBudgetError, type ApiCampus, type ApiCursusUser } from './fortytwo-api';
import { commonCoreCohort } from './cohorts';
import { classifyPopulation, type StudentRank } from './ranking';
import { maskAnonymous } from './anonymous';
import { demoDataset, isDemo } from './demo';
import { userControlSets } from './user-controls';
import { listCustomBadges } from './custom-badges';
import { withTimeout } from './timeout';
import { parseGenderRoster, type GenderRoster } from './gender-roster';
import { defaultGenderNameReference, estimateGenderRoster, parseGenderNameReference } from './gender-name-estimates';

export type BlackholedStudent = { id: number; login: string; displayName: string | null; level: number; campusIds: number[]; commonCoreCohort: string | null; blackholedAt: string; photo: string | null; anonymous?: boolean; hacker?: boolean; customBadge?: string };
export type RankingDataset = { students: StudentRank[]; blackholed: BlackholedStudent[]; acceptedUserIds: number[]; campuses: ApiCampus[]; fetchedAt: string; complete: true; genderRoster?: GenderRoster; estimatedGender?: boolean };
const explicitGenders = parseGenderRoster(process.env.LEADERBOARD_GENDERS);
const genderNameReference = parseGenderNameReference(process.env.LEADERBOARD_GENDER_NAME_COUNTS) ?? defaultGenderNameReference;

export function collectBlackholed(sources: { campusId: number; records: ApiCursusUser[] }[], curriculum: number, ranked: ReadonlySet<number>, now = Date.now()): BlackholedStudent[] {
  const found = new Map<number, BlackholedStudent>();
  for (const { campusId, records } of sources) for (const record of records) {
    const user = record.user, at = record.blackholed_at ? Date.parse(record.blackholed_at) : NaN;
    if (record.cursus_id !== curriculum || ranked.has(user.id) || !Number.isFinite(at) || at > now) continue;
    if (user['staff?'] === true || (user.kind && user.kind !== 'student') || user['alumni?'] === true || user.alumni === true) continue;
    if (!record.end_at || Date.parse(record.end_at) > now) continue;
    const previous = found.get(user.id);
    if (previous) { if (!previous.campusIds.includes(campusId)) previous.campusIds.push(campusId); if (Date.parse(previous.blackholedAt) >= at) continue; }
    found.set(user.id, { id: user.id, login: user.login, displayName: user.displayname ?? null, level: record.level ?? 0, campusIds: previous?.campusIds ?? [campusId], commonCoreCohort: commonCoreCohort(record.begin_at), blackholedAt: record.blackholed_at!, photo: user.image ?? null });
  }
  return [...found.values()].sort((a, b) => Date.parse(b.blackholedAt) - Date.parse(a.blackholedAt) || a.login.localeCompare(b.login));
}
/**
 * Each campus is cached on its own. A cold download takes 30+ seconds of paced requests; if a visit is cut off
 * at the 60 s function limit, the campuses it finished stay cached and the next visit only fetches the rest,
 * instead of starting over and spending every request again. Rankings refresh every 30 minutes: a full download is
 * about 50 requests, so about 100 an hour.
 */
const campusRecords = singleFlight(unstable_cache(async (campusId: number, curriculum: number) => ({ records: await fortyTwoApi.cursusUsers(campusId, curriculum), fetchedAt: new Date().toISOString() }),
  ['1337-campus-cursus-users-v3'], { revalidate: 1800 }));
const campusInfo = singleFlight(unstable_cache(async (campusId: number) => fortyTwoApi.campus(campusId), ['1337-campus-info-v1'], { revalidate: 86_400 }));

/**
 * The ranked view is rebuilt from the campus caches, not cached a second time: a second cache would be rebuilt
 * from campus entries that are themselves about to expire, showing data up to twice the refresh interval old.
 * Classifying is cheap, so each server instance keeps the last result until a campus entry changes.
 */
let built: { stamp: string; data: RankingDataset } | undefined;
async function fetchCompleteDataset(): Promise<RankingDataset> {
  if (isDemo()) return demoDataset();
  const ids = campusIds(), curriculum = cursusId();
  const [campuses, loaded, controls, custom] = await Promise.all([
    Promise.all(ids.map((id) => campusInfo(id))),
    Promise.all(ids.map(async (campusId) => ({ campusId, ...(await campusRecords(campusId, curriculum)) }))),
    userControlSets(),
    withTimeout(listCustomBadges(), 750, null),
  ]);
  const customBadges = new Map((custom ?? []).map((badge) => [badge.login, badge.label]));
  const controlStamp = [...controls.hackers].sort().join(',') + '|' + [...controls.anonymized].sort().join(',') + '|' + [...customBadges].map(([login, label]) => `${login}:${label}`).join(',');
  const stamp = `${loaded.map((source) => `${source.campusId}:${source.fetchedAt}`).join('|')}|${controlStamp}`;
  if (built?.stamp === stamp) return built.data;
  const sources = loaded.map(({ campusId, records }) => ({ campusId, records }));
  const { students, exclusions } = classifyPopulation(sources, curriculum, excludedUserIds());
  console.info('42 ranking population:', { eligible: students.length, exclusions });
  const acceptedUserIds = [...new Set(sources.flatMap((source) => source.records.filter((record) => record.cursus_id === curriculum && !!record.begin_at).map((record) => record.user.id)))];
  const blackholed = collectBlackholed(sources, curriculum, new Set(students.map((student) => student.id)));
  // "Updated" is the oldest campus download, so the label never claims fresher data than it shows.
  const fetchedAt = loaded.map((source) => source.fetchedAt).sort()[0];
  // Ranks were computed above with everyone; the removed students keep their place but lose their identity.
  const mark = <T extends { login: string }>(items: T[]) => items.map((item) => {
    const login = item.login.toLowerCase(), customBadge = customBadges.get(login);
    return { ...item, ...(controls.hackers.has(login) ? { hacker: true as const } : {}), ...(customBadge ? { customBadge } : {}) };
  });
  const visibleStudents = maskAnonymous(mark(students), controls.anonymized);
  const visibleBlackholed = maskAnonymous(mark(blackholed), controls.anonymized);
  const visibleIds = new Set([...visibleStudents, ...visibleBlackholed].filter((student) => !student.anonymous).map((student) => student.id));
  const selected = sources.flatMap(({ records }) => records.filter(({ user }) => visibleIds.has(user.id)).map(({ user }) => user));
  const genderRoster = estimateGenderRoster(genderNameReference, selected, explicitGenders);
  const data: RankingDataset = { students: visibleStudents, blackholed: visibleBlackholed, acceptedUserIds, campuses, fetchedAt, complete: true, genderRoster, estimatedGender: true };
  built = { stamp, data };
  return data;
}
export const getRankingDataset = singleFlight(fetchCompleteDataset, 5_000);
export async function loadRankingDataset(): Promise<{ status: 'ready'; data: RankingDataset } | { status: 'incomplete' | 'rate-limited' | 'unavailable' }> {
  try { return { status: 'ready', data: await getRankingDataset() }; }
  catch (error) {
    if (error instanceof IncompletePopulationError) return { status: 'incomplete' };
    if (error instanceof RateBudgetError) return { status: 'rate-limited' };
    console.error('42 ranking refresh failed:', error instanceof Error ? error.name : 'unknown error');
    return { status: 'unavailable' };
  }
}
export function campusName(dataset: RankingDataset, id: number) { return dataset.campuses.find((campus) => campus.id === id)?.name ?? `Campus ${id}`; }
