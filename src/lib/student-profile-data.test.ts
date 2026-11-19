import { describe, expect, it } from 'vitest';
import { achievementImageUrl, profileCursus, profileProjects, profileSkills, type StudentProfileSummary } from './student-overview';

const profile = { wallet: 0, correction_point: 0, pool_year: null, pool_month: null, image: null, campus_users: [], achievements: [], titles: [], expertises_users: [], cursus_users: [
  { cursus_id: 9, level: 4, begin_at: null, end_at: null, skills: [{ id: 1, name: 'Shell', level: 2 }] },
  { cursus_id: 21, level: 8, begin_at: null, end_at: null, skills: [{ id: 2, name: 'Unix', level: 8 }, { id: 3, name: 'Algorithms', level: 12 }] },
], projects_users: [
  { id: 1, status: 'finished', final_mark: 100, 'validated?': true, marked_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', cursus_ids: [21], project: { id: 1, name: 'Older', slug: 'older', parent_id: null } },
  { id: 2, status: 'in_progress', final_mark: null, 'validated?': null, marked_at: null, updated_at: '2026-02-01T00:00:00Z', cursus_ids: [21], project: { id: 2, name: 'Newer', slug: 'newer', parent_id: null } },
  { id: 3, status: 'failed', final_mark: 42, 'validated?': false, marked_at: '2025-12-01T00:00:00Z', updated_at: '2025-12-01T00:00:00Z', cursus_ids: [21], project: { id: 1, name: 'Older', slug: 'older', parent_id: null } },
] } satisfies StudentProfileSummary;

describe('student profile data', () => {
  it('uses only Common Core skills and sorts strongest first', () => expect(profileSkills(profile).map((skill) => skill.name)).toEqual(['Algorithms', 'Unix']));
  it('prefers an active cursus record over an ended duplicate', () => {
    const duplicate = { ...profile, cursus_users: [{ cursus_id: 21, level: 12, begin_at: '2024-01-01T00:00:00Z', end_at: '2025-01-01T00:00:00Z', skills: [] }, ...profile.cursus_users] };
    expect(profileCursus(duplicate)?.level).toBe(8);
  });
  it('sorts activity, collapses retries and keeps the latest verdict', () => expect(profileProjects(profile)).toMatchObject([{ name: 'Newer', validated: null }, { name: 'Older', mark: 100, validated: true, attempts: 2 }]));
  it('accepts only official relative achievement image paths', () => {
    expect(achievementImageUrl('/uploads/achievement/image/10/logo.svg')).toBe('https://cdn.intra.42.fr/achievement/image/10/logo.svg');
    expect(achievementImageUrl('https://example.com/tracker.svg')).toBeNull();
  });
});
