import { z } from 'zod';

export const genderSchema = z.enum(['man', 'woman']);
export type Gender = z.infer<typeof genderSchema>;
export type GenderRoster = Record<Gender, ReadonlySet<number>>;

const rosterSchema = z.record(z.string().regex(/^[1-9]\d*$/).refine((id) => Number.isSafeInteger(Number(id))), genderSchema);

/** An optional private roster of students who agreed to appear in gender-filtered results. */
export function parseGenderRoster(value: string | undefined): GenderRoster | undefined {
  if (!value) return undefined;
  let raw: unknown;
  try { raw = JSON.parse(value); }
  catch { return undefined; }
  const parsed = rosterSchema.safeParse(raw);
  if (!parsed.success) return undefined;
  const roster = { man: new Set<number>(), woman: new Set<number>() };
  for (const [id, gender] of Object.entries(parsed.data)) roster[gender].add(Number(id));
  if (roster.man.size || roster.woman.size) return roster;
}
