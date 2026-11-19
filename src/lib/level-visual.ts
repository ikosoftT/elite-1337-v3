export const LEVEL_TIERS = [
  { min: 0, color: '#94a3b8', name: 'Slate' },
  { min: 3, color: '#6fcf97', name: 'Emerald' },
  { min: 5, color: '#22d3ee', name: 'Cyan' },
  { min: 7, color: '#a78bfa', name: 'Violet' },
  { min: 9, color: '#f59e0b', name: 'Amber' },
  { min: 11, color: '#f472b6', name: 'Rose' },
] as const;

/** Produces a safe decimal-level visual; tiers are UI accents, never academic classifications. */
export function levelVisual(input: number | null | undefined) {
  const level = typeof input === 'number' && Number.isFinite(input) && input >= 0 ? input : 0;
  const whole = Math.floor(level), progress = Number(((level - whole) * 100).toFixed(4));
  const tier = [...LEVEL_TIERS].reverse().find((item) => level >= item.min) ?? LEVEL_TIERS[0];
  return { level, whole, next: whole + 1, progress, color: tier.color, tier: tier.name };
}
