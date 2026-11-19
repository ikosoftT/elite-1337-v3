import { unstable_cache } from 'next/cache';
import { z } from 'zod';
import { singleFlight } from './single-flight';
import { fortyTwoApi, RateBudgetError, scaleTeamSchema } from './fortytwo-api';
import { withTimeout } from './timeout';

/** How many of a student's latest evaluations as corrector are summarized: one 42 request. */
export const CORRECTOR_SAMPLE = 100;
export type CorrectionOwner = { id: number; login: string };
export type RecentCorrection = { id: number; at: string; project: string | null; projectId: number | null; owners: CorrectionOwner[]; returned: boolean; feedback: string | null; correctedFeedback: string | null; rating: number | null };
export type CorrectorProfile = { evaluations: number; returned: number; rate: number | null; rated: number; rating: number | null; recent: RecentCorrection[] };

const personSchema = z.object({ id: z.number().int(), login: z.string() });
const projectIdSchema = z.number().int().positive();
const projectSchema = z.object({ id: projectIdSchema.nullish(), name: z.string().nullish() });
const rowSchema = scaleTeamSchema.extend({
  comment: z.string().nullish(), feedback: z.string().nullish(),
  correcteds: z.array(personSchema).default([]),
  team: z.object({ project_id: projectIdSchema.nullish(), users: z.array(personSchema).default([]), project: projectSchema.nullish() }).nullish(),
  project: projectSchema.nullish(),
  feedbacks: z.array(z.object({ rating: z.number().nullish(), comment: z.string().nullish() })).default([]),
});
type Row = z.infer<typeof rowSchema>;

/**
 * A student as corrector: the share of their filled evaluations that returned the project (a negative flag), and the
 * average rating (0 to 5) the evaluated students gave them. Unfilled evaluations and missing ratings are skipped.
 */
export function summarizeCorrections(rows: Pick<Row, 'id' | 'filled_at' | 'flag' | 'feedbacks' | 'comment' | 'feedback' | 'correcteds' | 'team' | 'project'>[]): CorrectorProfile {
  const filled = rows.filter((row) => row.filled_at && row.flag);
  const returned = filled.filter((row) => !row.flag!.positive).length;
  const ratings = filled.flatMap((row) => row.feedbacks.map((feedback) => feedback.rating).filter((rating): rating is number => typeof rating === 'number' && rating >= 0 && rating <= 5));
  const recent = filled.slice(0, 5).map((row): RecentCorrection => {
    const rowRatings = row.feedbacks.map((item) => item.rating).filter((rating): rating is number => typeof rating === 'number' && rating >= 0 && rating <= 5);
    const comments = row.feedbacks.map((item) => item.comment).filter((comment): comment is string => !!comment?.trim());
    const owners = [...new Map((row.correcteds.length ? row.correcteds : row.team?.users ?? []).map((person) => [person.id, { id: person.id, login: person.login }])).values()];
    return {
      id: row.id, at: row.filled_at!, returned: !row.flag!.positive,
      project: row.team?.project?.name?.trim() || row.project?.name?.trim() || null,
      projectId: row.team?.project_id ?? row.team?.project?.id ?? row.project?.id ?? null, owners,
      feedback: row.comment?.trim() ? row.comment : row.feedback?.trim() ? row.feedback : null, correctedFeedback: comments.join('\n\n') || null,
      rating: rowRatings.length ? rowRatings.reduce((sum, rating) => sum + rating, 0) / rowRatings.length : null,
    };
  });
  return {
    evaluations: filled.length, returned, rate: filled.length ? returned / filled.length : null,
    rated: ratings.length, rating: ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null, recent,
  };
}

/** One request per student, shared by everyone who opens their page, refreshed every 6 hours. */
const cached = singleFlight(unstable_cache(async (userId: number) => {
  const { data } = await fortyTwoApi.request(`users/${userId}/scale_teams/as_corrector`, z.array(rowSchema), { sort: '-filled_at', 'page[size]': String(CORRECTOR_SAMPLE) });
  return summarizeCorrections(data);
}, ['1337-corrector-profile-v5'], { revalidate: 21_600 }));

const projectNames = singleFlight(unstable_cache(async (ids: number[]) => {
  const { data } = await fortyTwoApi.request('projects', z.array(z.object({ id: projectIdSchema, name: z.string().trim().min(1) })), { 'filter[id]': ids.join(','), 'page[size]': String(ids.length) });
  return data.filter((project) => ids.includes(project.id));
}, ['1337-correction-project-names-v1'], { revalidate: 7 * 86_400 }));

/** Resolves the five displayed projects in one cached read when their names are missing locally. */
export async function resolveCorrectionProjects(recent: RecentCorrection[], known?: ReadonlyMap<number, string>): Promise<RecentCorrection[]> {
  const names = new Map(known);
  for (const { projectId, project } of recent) if (projectId && project) names.set(projectId, project);
  const ids = [...new Set(recent.flatMap(({ projectId }) => projectId && !names.get(projectId) ? [projectId] : []))].sort((a, b) => a - b);
  const projects = ids.length ? await withTimeout(projectNames(ids).catch(() => []), 4_000, []) : [];
  for (const project of projects) names.set(project.id, project.name);
  return recent.map((item) => !item.project && item.projectId ? { ...item, project: names.get(item.projectId) || null } : item);
}

/** The student's corrector summary, or why it is missing; never throws, so the page renders without it. */
export async function loadCorrectorProfile(userId: number): Promise<{ status: 'ready'; profile: CorrectorProfile } | { status: 'rate-limited' | 'unavailable' }> {
  try { return { status: 'ready', profile: await cached(userId) }; }
  catch (error) {
    if (error instanceof RateBudgetError) return { status: 'rate-limited' };
    console.error('42 corrector profile failed:', error instanceof Error ? error.name : 'unknown');
    return { status: 'unavailable' };
  }
}
