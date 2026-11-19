import { describe, expect, it } from 'vitest';
import { resolveCorrectionProjects, summarizeCorrections } from './corrector-profile';

const ok = { name: 'Ok', positive: true }, crash = { name: 'Crash', positive: false };

describe('summarizeCorrections', () => {
  it('counts returns among filled evaluations and averages the ratings received', () => {
    const profile = summarizeCorrections([
      { id: 1, filled_at: '2026-11-04', flag: ok, comment: 'Solid work', feedback: null, correcteds: [{ id: 9, login: 'owner' }], team: { users: [], project: { id: 33, name: 'Minishell' } }, project: null, feedbacks: [{ rating: 5, comment: 'Helpful' }] },
      { id: 2, filled_at: '2026-11-03', flag: crash, comment: null, feedback: null, correcteds: [], team: { users: [], project_id: 40 }, project: null, feedbacks: [{ rating: 3, comment: null }] },
      { id: 3, filled_at: '2026-11-02', flag: ok, comment: null, feedback: null, correcteds: [], team: null, project: null, feedbacks: [] },
      { id: 4, filled_at: '2026-11-01', flag: ok, comment: null, feedback: null, correcteds: [], team: null, project: null, feedbacks: [{ rating: null, comment: null }] },
      { id: 5, filled_at: null, flag: crash, comment: null, feedback: null, correcteds: [], team: null, project: null, feedbacks: [{ rating: 0, comment: null }] },
    ]);
    expect(profile).toMatchObject({ evaluations: 4, returned: 1, rate: .25, rated: 2, rating: 4 });
    expect(profile.recent[0]).toEqual({ id: 1, at: '2026-11-04', project: 'Minishell', projectId: 33, owners: [{ id: 9, login: 'owner' }], returned: false, feedback: 'Solid work', correctedFeedback: 'Helpful', rating: 5 });
    expect(profile.recent[1]).toMatchObject({ project: null, projectId: 40 });
  });
  it('resolves ID-only corrections from the cached profile or another evaluation', async () => {
    const base = { filled_at: '2026-11-04', flag: ok, correcteds: [], feedbacks: [] };
    const { recent } = summarizeCorrections([
      { ...base, id: 1, team: { project_id: 10, users: [] } },
      { ...base, id: 2, team: { project_id: 11, users: [] } },
      { ...base, id: 3, project: { id: 11, name: 'Philosophers' } },
      { ...base, id: 4 },
    ]);
    const resolved = await resolveCorrectionProjects(recent, new Map([[10, 'Libft']]));
    expect(resolved.map(({ project }) => project)).toEqual(['Libft', 'Philosophers', 'Philosophers', null]);
    expect(recent[0].project).toBeNull();
  });

  it('has no rate or rating without evaluations', () => {
    expect(summarizeCorrections([])).toEqual({ evaluations: 0, returned: 0, rate: null, rated: 0, rating: null, recent: [] });
  });
});
