import { afterEach, describe, expect, it, vi } from 'vitest';
import { customBadgeLabelSchema, listCustomBadges, removeCustomBadge, setCustomBadge } from './custom-badges';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const configured = () => { vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example'); vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'secret'); };

describe('custom badges', () => {
  it('accepts short display labels and rejects markup', () => {
    expect(customBadgeLabelSchema.parse('Top Corrector')).toBe('Top Corrector');
    expect(customBadgeLabelSchema.safeParse('<script>').success).toBe(false);
  });

  it('writes and removes persistent hash fields without an expiry command', async () => {
    configured();
    const fetch = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ result: 1 }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    expect(await setCustomBadge('JDOE', 'Mentor', 'admin')).toBe(true);
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual(['HSET', 'elite1337:custom-badges', 'jdoe', expect.any(String)]);
    expect(await removeCustomBadge('jdoe')).toBe(true);
    expect(JSON.parse(String(fetch.mock.calls[1][1]?.body))).toEqual(['HDEL', 'elite1337:custom-badges', 'jdoe']);
  });

  it('parses valid hash entries and skips malformed ones', async () => {
    configured();
    const value = JSON.stringify({ label: 'Mentor', updatedBy: 'admin', updatedAt: new Date().toISOString() });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: ['jdoe', value, 'bad', '{}'] }), { status: 200 })));
    expect(await listCustomBadges()).toEqual([expect.objectContaining({ login: 'jdoe', label: 'Mentor' })]);
  });
});
