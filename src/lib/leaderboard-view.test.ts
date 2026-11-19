import { describe, expect, it } from 'vitest';
import { filtersSchema, leaderboardHref, listPage, resolveFilters, rowData } from './leaderboard-view';
import type { RankingDataset } from './dataset';
import type { StudentRank } from './ranking';

const student = (id: number, cohort: string): StudentRank => ({ id, login: `s${id}`, displayName: null, poolYear: '2018', poolMonth: 'july', commonCoreCohort: cohort, level: 20 - id, campusIds: [16], globalRank: id, campusRanks: { 16: id } });
const dataset: RankingDataset = {
  students: [student(1, '2019-03'), student(2, '2019-10')],
  blackholed: [
    { ...student(3, '2019-03'), blackholedAt: '2026-01-01T00:00:00Z', photo: null },
    { ...student(4, '2019-10'), blackholedAt: '2026-01-02T00:00:00Z', photo: null },
  ],
  acceptedUserIds: [1, 2, 3, 4], campuses: [{ id: 16, name: 'Khouribga' }], fetchedAt: '2026-11-08T00:00:00Z', complete: true,
};

describe('split promo filters', () => {
  it('defaults to the viewer’s precise promo and ranks within it', () => {
    const { filters, defaultCohort } = resolveFilters({}, dataset, null, '2');
    expect(defaultCohort).toBe('2019-10');
    expect(filters).toMatchObject({ campus: 16, cohort: '2019-10' });
    expect(listPage(dataset, filters, 2).listed).toMatchObject([{ id: 2, rank: 1 }]);
  });

  it.each(['2019-03', '2019-10', '2025'])('preserves %s through filter links and parsing', (cohort) => {
    const raw = Object.fromEntries(new URL(leaderboardHref({ campus: 16, cohort }), 'http://local').searchParams);
    expect(resolveFilters(raw, dataset, null, '2').filters.cohort).toBe(cohort);
    expect(filtersSchema.safeParse({ cohort }).success).toBe(true);
  });

  it('applies split promos to blackholed and combined lists too', () => {
    const filters = { campus: 16, cohort: '2019-03', page: 1 };
    expect(listPage(dataset, { ...filters, bh: 'blackholed' }).lostRows.map((student) => student.id)).toEqual([3]);
    const combined = listPage(dataset, { ...filters, bh: 'all' });
    expect(combined.total).toBe(2);
    expect(combined.listed.map((student) => student.id)).toEqual([1, 3]);
  });

  it('allows clearing the cohort to compare both promos', () => {
    const { filters } = resolveFilters({ cohort: 'all' }, dataset, null, '2');
    expect(filters.cohort).toBeUndefined();
    expect(listPage(dataset, filters).total).toBe(2);
  });

  it('preserves frozen-student ordering and last-seen dates within each split promo', () => {
    const data = { ...dataset, students: [...dataset.students, student(5, '2019-10')].map((student) => ({ ...student, frozen: true })) };
    const seen = new Map([[1, '2026-11-08T00:00:00Z'], [2, '2026-10-01T00:00:00Z'], [5, '2026-11-01T00:00:00Z']]);
    const view = listPage(data, { campus: 16, cohort: '2019-10', bh: 'frozen', page: 1 }, 2, seen);
    expect(view.listed.map((student) => student.id)).toEqual([5, 2]);
    expect(rowData(data, view, {}, '2')).toMatchObject([
      { id: 5, rank: 2, year: '2019-10', lastSeen: seen.get(5) },
      { id: 2, rank: 1, year: '2019-10', lastSeen: seen.get(2) },
    ]);
  });
});

describe('gender filters', () => {
  const roster = { man: new Set([1, 3]), woman: new Set([2, 4, 5]) };
  const data = { ...dataset, genderRoster: roster, students: [...dataset.students, { ...student(5, '2019-10'), anonymous: true }, student(6, '2019-10')] };

  it('round-trips the selection with other filters and ignores invalid values', () => {
    const raw = Object.fromEntries(new URL(leaderboardHref({ cohort: '2019-10', gender: 'woman', bh: 'all', q: 's', page: 2 }), 'http://local').searchParams);
    expect(resolveFilters(raw, data, null, '1').filters).toMatchObject({ cohort: '2019-10', gender: 'woman', bh: 'all', q: 's', page: 2 });
    expect(resolveFilters(raw, dataset, null, '1').filters.gender).toBe('woman');
    expect(resolveFilters({ ...raw, gender: 'invalid' }, data, null, '1').filters).toMatchObject({ cohort: '2019-10', bh: 'all', q: 's', page: 2 });
    expect(resolveFilters({ ...raw, gender: 'invalid' }, data, null, '1').filters.gender).toBeUndefined();
  });

  it('shows no gender matches without a roster and keeps every student under All', () => {
    expect(listPage(dataset, { gender: 'woman', bh: 'all', page: 1 })).toMatchObject({ total: 0, listed: [] });
    expect(listPage(dataset, { bh: 'all', page: 1 }).total).toBe(4);
  });

  it('filters ranked and blackholed rows without exposing anonymous students or changing ranks', () => {
    const filters = { gender: 'woman', bh: 'all', page: 1 } as const;
    const view = listPage(data, filters);
    expect(view.listed).toMatchObject([{ id: 2, rank: 2 }, { id: 4 }]);
    expect(rowData(data, view, {}, '1').every((row) => !('gender' in row))).toBe(true);
    expect(listPage(data, { ...filters, gender: 'man', bh: 'blackholed' }).lostRows).toMatchObject([{ id: 3 }]);
    expect(listPage(data, { ...filters, gender: undefined }).listed.map((row) => row.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('applies the gender selection before slicing the next page', () => {
    const students = Array.from({ length: 52 }, (_, index) => ({ ...student(index + 1, '2019-10'), level: 100 - index }));
    const genderRoster = { man: new Set<number>(), woman: new Set(students.filter(({ id }) => id % 2 === 0).map(({ id }) => id)) };
    const view = listPage({ ...dataset, students, genderRoster }, { gender: 'woman', page: 2 });
    expect(view).toMatchObject({ total: 26, pages: 2, listed: [{ id: 52, rank: 52 }] });
  });
});
