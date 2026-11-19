import { photoReferences } from './avatars/intra-photo';
import { campusName, loadRankingDataset, type RankingDataset } from './dataset';
import { listOnlinePresence, type SitePresence } from './site-presence';
import { withTimeout } from './timeout';

export type OnlineStudent = SitePresence & {
  avatar: string | null; displayName: string | null; campus: string | null; cohort: string | null;
  level: number | null; rank: number | null; status: 'ranked' | 'blackholed' | 'unlisted';
};

/** Adds already-shared ranking details to live presence without making per-student requests. */
export function enrichOnlineStudents(presence: SitePresence[], dataset: RankingDataset | null): OnlineStudent[] {
  const people = dataset ? new Map([...dataset.students, ...dataset.blackholed].filter((student) => !student.anonymous).map((student) => [student.id, student])) : new Map();
  const avatars = photoReferences([...people.values()]);
  return presence.map((entry) => {
    const person = people.get(entry.id), ranked = person && 'globalRank' in person;
    return {
      ...entry, avatar: avatars[entry.id] ?? null, displayName: person?.displayName ?? null,
      campus: person && dataset ? person.campusIds.map((id: number) => campusName(dataset, id)).join(' · ') : null,
      cohort: person?.commonCoreCohort ?? null, level: person?.level ?? null,
      rank: ranked ? person.globalRank : null, status: ranked ? 'ranked' : person ? 'blackholed' : 'unlisted',
    };
  });
}

/** Loads Redis presence and enriches it only when the shared ranking cache responds quickly. */
export async function loadOnlineStudents(): Promise<OnlineStudent[] | null> {
  const presence = await listOnlinePresence();
  if (presence === null) return null;
  if (!presence.length) return [];
  const ranking = await withTimeout(loadRankingDataset(), 2_000, null);
  return enrichOnlineStudents(presence, ranking?.status === 'ready' ? ranking.data : null);
}
