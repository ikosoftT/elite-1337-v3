import { z } from 'zod';

const HASH_KEY = 'elite1337:custom-badges';
export const customBadgeLabelSchema = z.string().trim().min(1).max(18).regex(/^[A-Za-z0-9][A-Za-z0-9 ._-]*$/);
const loginSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_.-]{2,40}$/);
const badgeSchema = z.object({ label: customBadgeLabelSchema, updatedBy: loginSchema, updatedAt: z.string().datetime() });
const responseSchema = z.object({ result: z.unknown().optional(), error: z.string().optional() });

export type CustomBadge = z.infer<typeof badgeSchema> & { login: string };
let cached: { badges: CustomBadge[]; until: number } | undefined;

function credentials() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function command(parts: string[]) {
  const config = credentials();
  if (!config) return null;
  const response = await fetch(config.url, {
    method: 'POST', headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(parts), cache: 'no-store', signal: AbortSignal.timeout(2_500),
  });
  if (!response.ok) throw new Error(`Redis ${response.status}`);
  const parsed = responseSchema.parse(await response.json());
  if (parsed.error) throw new Error('Redis command failed');
  return parsed.result;
}

/** Lists persistent custom badge assignments, cached briefly across ranking reads. */
export async function listCustomBadges(): Promise<CustomBadge[] | null> {
  if (!credentials()) return null;
  if (cached && cached.until > Date.now()) return cached.badges;
  try {
    const raw = z.array(z.string()).parse(await command(['HGETALL', HASH_KEY]) ?? []), badges: CustomBadge[] = [];
    for (let index = 0; index + 1 < raw.length; index += 2) {
      const login = loginSchema.safeParse(raw[index]);
      let value: unknown;
      try { value = JSON.parse(raw[index + 1]); } catch { continue; }
      const badge = badgeSchema.safeParse(value);
      if (login.success && badge.success) badges.push({ login: login.data, ...badge.data });
    }
    badges.sort((a, b) => a.login.localeCompare(b.login));
    cached = { badges, until: Date.now() + 30_000 };
    return badges;
  } catch (error) {
    console.error('Custom badges unavailable:', error instanceof Error ? error.name : 'unknown');
    return null;
  }
}

/** Creates or replaces one persistent Redis badge assignment. */
export async function setCustomBadge(loginValue: string, labelValue: string, actorValue: string) {
  const login = loginSchema.safeParse(loginValue), label = customBadgeLabelSchema.safeParse(labelValue), actor = loginSchema.safeParse(actorValue);
  if (!credentials() || !login.success || !label.success || !actor.success) return false;
  const value = badgeSchema.parse({ label: label.data, updatedBy: actor.data, updatedAt: new Date().toISOString() });
  try { await command(['HSET', HASH_KEY, login.data, JSON.stringify(value)]); cached = undefined; return true; }
  catch (error) { console.error('Custom badge save failed:', error instanceof Error ? error.name : 'unknown'); return false; }
}

/** Removes one persistent Redis badge assignment. */
export async function removeCustomBadge(loginValue: string) {
  const login = loginSchema.safeParse(loginValue);
  if (!credentials() || !login.success) return false;
  try { await command(['HDEL', HASH_KEY, login.data]); cached = undefined; return true; }
  catch (error) { console.error('Custom badge removal failed:', error instanceof Error ? error.name : 'unknown'); return false; }
}
