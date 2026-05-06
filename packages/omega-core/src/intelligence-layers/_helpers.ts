import type { LayerContribution } from '../types.js';

export const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

export const empty = (note: string): LayerContribution => ({
  signal: 0,
  uncertainty: 1,
  notes: note,
});

export const weightedMean = (values: Array<{ value: number; weight: number }>): number => {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, v) => sum + v.weight, 0);
  if (total === 0) return 0;
  return values.reduce((sum, v) => sum + v.value * v.weight, 0) / total;
};
