import { z } from 'zod';
import { genderSchema, type Gender, type GenderRoster } from './gender-roster';
import moroccanNames from './moroccan-name-reference.json';

const counts = z.object({ man: z.number().int().min(0).max(1_000_000_000), woman: z.number().int().min(0).max(1_000_000_000) });
const names = z.record(z.string().min(1).max(100), counts);
type NameReference = ReadonlyMap<string, Gender | null>;
type NamedStudent = { id: number; first_name?: string | null; usual_first_name?: string | null };

const normalizeName = (name: string) => name.normalize('NFKD').toLowerCase().replace(/\p{M}|\u0640/gu, '').trim().replace(/\s+/gu, ' ');

/** A bundled reference keeps the filter usable without a service or private configuration. */
export const defaultGenderNameReference: NameReference = new Map(Object.entries(z.record(z.string(), genderSchema).parse(moroccanNames)));

/** Load aggregate counts once, retaining only names with strong and unambiguous evidence. */
export function parseGenderNameReference(value: string | undefined): NameReference | undefined {
  if (!value) return undefined;
  let input: unknown;
  try { input = JSON.parse(value); }
  catch { return undefined; }
  const parsed = names.safeParse(input);
  if (!parsed.success) return undefined;
  const reference = new Map<string, Gender | null>();
  for (const [name, { man, woman }] of Object.entries(parsed.data)) {
    const key = normalizeName(name), total = man + woman;
    if (!key) continue;
    // These are minimum reference-data requirements. Agreement in the reference is not prediction accuracy.
    const estimate = total >= 50 && Math.max(man, woman) * 100 >= total * 98 ? man > woman ? 'man' : 'woman' : null;
    reference.set(key, reference.has(key) && reference.get(key) !== estimate ? null : estimate);
  }
  if (reference.size) return reference;
}

/** Match whole given names, while explicit roster entries take precedence over an estimate. */
export function estimateGenderRoster(reference: NameReference, students: Iterable<NamedStudent>, explicit?: GenderRoster): GenderRoster {
  const byId = new Map<number, Gender | null>();
  for (const student of students) {
    if (explicit?.man.has(student.id) || explicit?.woman.has(student.id)) continue;
    const first = normalizeName(student.first_name ?? '');
    const preferred = normalizeName(student.usual_first_name ?? '');
    const estimate = reference.get(preferred || first) ?? null;
    const other = reference.get(first);
    const result = estimate && other && estimate !== other ? null : estimate;
    byId.set(student.id, byId.has(student.id) && byId.get(student.id) !== result ? null : result);
  }
  const roster = { man: new Set(explicit?.man), woman: new Set(explicit?.woman) };
  for (const [id, gender] of byId) if (gender) roster[gender].add(id);
  return roster;
}
