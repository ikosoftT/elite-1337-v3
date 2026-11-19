import { z } from 'zod';
import { normalizePath } from './site-stats-core';
import { userControlSets } from './user-controls';

const TTL_SECONDS = 180;
const INDEX_KEY = 'elite1337:presence:index';
const KEY_PREFIX = 'elite1337:presence:user:';
const entrySchema = z.object({ id: z.number().int().positive(), login: z.string().min(1).max(64), path: z.string().min(1).max(200), lastSeen: z.string().datetime() });
const pipelineSchema = z.array(z.object({ result: z.unknown().optional(), error: z.string().optional() }));
const membersSchema = z.array(z.string());
const valuesSchema = z.array(z.string().nullable());

export type SitePresence = z.infer<typeof entrySchema>;

function credentials() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function pipeline(commands: (string | number)[][]) {
  const config = credentials();
  if (!config) return null;
  const response = await fetch(`${config.url}/pipeline`, {
    method: 'POST', headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands), cache: 'no-store', signal: AbortSignal.timeout(2_500),
  });
  if (!response.ok) throw new Error(`Redis ${response.status}`);
  const parsed = pipelineSchema.parse(await response.json());
  if (parsed.some((item) => item.error)) throw new Error('Redis command failed');
  return parsed.map((item) => item.result);
}

/** Reduces a browser URL to the non-sensitive section stored for live presence. */
export function normalizePresencePath(path: string) {
  if (/^\/admin(?:[/?#]|$)/i.test(path)) return '/admin';
  return normalizePath(path);
}

/** Refreshes one signed-in student's expiring Redis presence without retaining history. */
export async function recordPresence(id: number, login: string, path: string) {
  if (!Number.isSafeInteger(id) || id <= 0 || !/^[a-z0-9_-]{1,64}$/i.test(login)) return false;
  const normalized = normalizePresencePath(path);
  if (!normalized || !credentials()) return false;
  const now = Date.now(), key = `${KEY_PREFIX}${id}`;
  const entry: SitePresence = { id, login: login.toLowerCase(), path: normalized, lastSeen: new Date(now).toISOString() };
  try {
    await pipeline([['SET', key, JSON.stringify(entry), 'EX', TTL_SECONDS], ['ZADD', INDEX_KEY, now, String(id)]]);
    return true;
  } catch (error) {
    console.error('Site presence failed:', error instanceof Error ? error.name : 'unknown');
    return false;
  }
}

/** Returns unexpired Redis presence rows, excluding students configured as anonymous. */
export async function listOnlinePresence(): Promise<SitePresence[] | null> {
  if (!credentials()) return null;
  try {
    const cutoff = Date.now() - TTL_SECONDS * 1_000;
    const first = await pipeline([['ZREMRANGEBYSCORE', INDEX_KEY, '-inf', cutoff], ['ZRANGEBYSCORE', INDEX_KEY, cutoff, '+inf']]);
    const ids = membersSchema.parse(first?.[1] ?? []);
    if (!ids.length) return [];
    const second = await pipeline([['MGET', ...ids.map((id) => `${KEY_PREFIX}${id}`)]]);
    const values = valuesSchema.parse(second?.[0] ?? []), entries = values.flatMap((value) => {
      if (!value) return [];
      let decoded: unknown;
      try { decoded = JSON.parse(value); } catch { return []; }
      const parsed = entrySchema.safeParse(decoded);
      return parsed.success && Date.parse(parsed.data.lastSeen) >= cutoff ? [parsed.data] : [];
    });
    const { anonymized } = await userControlSets();
    return entries.filter((entry) => !anonymized.has(entry.login)).sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  } catch (error) {
    console.error('Site presence unavailable:', error instanceof Error ? error.name : 'unknown');
    return null;
  }
}
