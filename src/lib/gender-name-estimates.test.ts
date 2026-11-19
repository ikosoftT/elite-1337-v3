import { describe, expect, it } from 'vitest';
import { defaultGenderNameReference, estimateGenderRoster, parseGenderNameReference } from './gender-name-estimates';

const reference = parseGenderNameReference(JSON.stringify({
  Salma: { man: 1, woman: 49 },
  سَلْمى: { man: 0, woman: 70 },
  'Younès': { man: 80, woman: 0 },
  Rare: { man: 0, woman: 49 },
  Shared: { man: 60, woman: 60 },
  'Ambiguë': { man: 70, woman: 0 },
  Ambigue: { man: 0, woman: 80 },
}))!;

describe('given-name leaderboard estimates', () => {
  it('matches bundled Moroccan names in both scripts and abstains for an ambiguous given name', () => {
    const students = [
      { id: 1, first_name: 'Youssef' },
      { id: 2, first_name: 'Salma' },
      { id: 3, first_name: 'خَدِيجَة' },
      { id: 4, first_name: 'Simo' },
    ];
    expect(estimateGenderRoster(defaultGenderNameReference, students)).toEqual({ man: new Set([1]), woman: new Set([2, 3]) });
  });
  it('matches normalized whole given names and leaves weak, conflicting and missing values unclassified', () => {
    const students = [
      { id: 1, first_name: '  YOUNES ' },
      { id: 2, first_name: 'سلمى' },
      { id: 3, first_name: 'Salma' },
      { id: 4, first_name: 'Salma Jane' },
      { id: 5, first_name: 'Rare' },
      { id: 6, first_name: 'Shared' },
      { id: 7, first_name: 'Ambigue' },
      { id: 8 },
    ];
    expect(estimateGenderRoster(reference, students)).toEqual({ man: new Set([1]), woman: new Set([2, 3]) });
  });

  it('uses the preferred name and abstains when two recognized names disagree', () => {
    const students = [
      { id: 1, first_name: 'Unknown', usual_first_name: 'Salma' },
      { id: 2, first_name: 'Younès', usual_first_name: 'Salma' },
      { id: 3, first_name: 'Salma', usual_first_name: 'Unknown' },
      { id: 4, first_name: 'Younès', usual_first_name: '' },
    ];
    expect(estimateGenderRoster(reference, students)).toEqual({ man: new Set([4]), woman: new Set([1]) });
  });

  it('keeps explicit roster entries and drops conflicting estimates across duplicate records', () => {
    const students = [
      { id: 1, first_name: 'Salma' },
      { id: 1, first_name: 'Younès' },
      { id: 2, first_name: 'Younès' },
    ];
    const explicit = { man: new Set<number>(), woman: new Set([2, 3]) };
    expect(estimateGenderRoster(reference, students, explicit)).toEqual(explicit);
  });

  it.each([undefined, '', '{}', 'null', '{', '{"Name":{"man":-1,"woman":100}}', '{"Name":{"man":100}}'])('ignores an invalid or empty reference (%s)', (value) => {
    expect(parseGenderNameReference(value)).toBeUndefined();
  });
});
