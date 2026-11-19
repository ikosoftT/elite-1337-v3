import { describe, expect, it } from 'vitest';
import { levelVisual } from './level-visual';

describe('level visual', () => {
  it('uses the decimal part as progress and selects the matching tier', () => {
    expect(levelVisual(4.34)).toMatchObject({ whole: 4, next: 5, progress: 34, color: '#6fcf97', tier: 'Emerald' });
    expect(levelVisual(11.75)).toMatchObject({ whole: 11, next: 12, progress: 75, color: '#f472b6' });
  });
  it('normalizes invalid and negative levels', () => {
    expect(levelVisual(-2)).toMatchObject({ level: 0, whole: 0, progress: 0 });
    expect(levelVisual(Number.NaN)).toMatchObject({ level: 0, whole: 0, progress: 0 });
  });
});
