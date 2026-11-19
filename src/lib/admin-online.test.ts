import { describe, expect, it, vi } from 'vitest';
import type { RankingDataset } from './dataset';
import { enrichOnlineStudents } from './admin-online';

vi.mock('./avatars/intra-photo', async (importOriginal) => ({
  ...await importOriginal<typeof import('./avatars/intra-photo')>(),
  photoReferences: (people: { id: number; photo?: string | null }[]) => Object.fromEntries(people.filter((person) => person.photo).map((person) => [person.id, `/api/photos/${person.id}`])),
}));

describe('online student enrichment', () => {
  it('adds ranking activity while preserving an unlisted fallback', () => {
    const dataset = {
      students: [{ id: 7, login: 'ranked', displayName: 'Ranked Student', level: 8.42, campusIds: [16], commonCoreCohort: '2024', globalRank: 12, campusRanks: { 16: 4 }, poolYear: null, poolMonth: null, photo: '/users/photo.jpg' }],
      blackholed: [], campuses: [{ id: 16, name: 'Khouribga' }], acceptedUserIds: [], fetchedAt: new Date().toISOString(), complete: true,
    } as RankingDataset;
    const at = new Date().toISOString();
    const result = enrichOnlineStudents([{ id: 7, login: 'ranked', path: '/stats', lastSeen: at }, { id: 8, login: 'new', path: '/', lastSeen: at }], dataset);
    expect(result[0]).toMatchObject({ avatar: '/api/photos/7', displayName: 'Ranked Student', campus: 'Khouribga', cohort: '2024', level: 8.42, rank: 12, status: 'ranked' });
    expect(result[1]).toMatchObject({ avatar: null, displayName: null, level: null, rank: null, status: 'unlisted' });
  });
});
