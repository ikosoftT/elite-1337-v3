import { describe, expect, it } from 'vitest';
import { parseGenderRoster } from './gender-roster';

describe('leaderboard gender roster', () => {
  it('indexes opted-in students by their numeric 42 IDs', () => {
    expect(parseGenderRoster('{"900000101":"man","900000102":"woman"}')).toEqual({
      man: new Set([900000101]), woman: new Set([900000102]),
    });
  });

  it.each([undefined, '', '{}', '{', 'null', '["woman"]', '{"student":"woman"}', '{"001":"woman"}', '{"9007199254740993":"man"}', '{"42":"unknown"}'])('disables missing or invalid rosters (%s)', (value) => {
    expect(parseGenderRoster(value)).toBeUndefined();
  });
});
