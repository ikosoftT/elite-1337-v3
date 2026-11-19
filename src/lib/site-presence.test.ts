import { afterEach, describe, expect, it, vi } from 'vitest';
import { listOnlinePresence, normalizePresencePath, recordPresence } from './site-presence';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('site presence', () => {
  it('stores only normalized public sections and collapsed admin paths', () => {
    expect(normalizePresencePath('/students/jdoe?tab=activity')).toBe('/students/:id');
    expect(normalizePresencePath('/admin/feedback')).toBe('/admin');
    expect(normalizePresencePath('/unknown/private')).toBeNull();
  });

  it('writes an expiring value and timestamp through the Redis pipeline', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'secret');
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ result: 'OK' }, { result: 1 }]), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    expect(await recordPresence(42, 'JDOE', '/leaderboard')).toBe(true);
    const request = fetch.mock.calls[0], body = JSON.parse(String(request[1]?.body));
    expect(request[0]).toBe('https://redis.example/pipeline');
    expect(body[0][0]).toBe('SET');
    expect(body[0].slice(-2)).toEqual(['EX', 180]);
    expect(JSON.parse(body[0][2])).toMatchObject({ id: 42, login: 'jdoe', path: '/leaderboard' });
    expect(body[1][0]).toBe('ZADD');
  });

  it('reads active entries and ignores missing expiring keys', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'secret');
    vi.stubEnv('DATABASE_URL', '');
    const active = JSON.stringify({ id: 42, login: 'jdoe', path: '/stats', lastSeen: new Date().toISOString() });
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ result: 0 }, { result: ['42', '43'] }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ result: [active, null] }]), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    expect(await listOnlinePresence()).toEqual([expect.objectContaining({ id: 42, login: 'jdoe', path: '/stats' })]);
  });

  it('turns off quietly without Redis credentials', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    expect(await recordPresence(42, 'jdoe', '/leaderboard')).toBe(false);
  });
});
