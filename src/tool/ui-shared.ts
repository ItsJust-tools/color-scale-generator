import { CURVE_PRESETS, DEFAULT_STATE, type CurvePreset, type ToolState } from './types';

export const CURVE_LABELS: { value: CurvePreset; label: string; hint: string }[] = [
  { value: 'material', label: 'Material', hint: 'Material Design tonal curve' },
  { value: 'tailwind', label: 'Tailwind', hint: 'Tailwind CSS vivid curve' },
  { value: 'linear', label: 'Linear', hint: 'Evenly spaced lightness ramp' },
];

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return (
    typeof v.baseColor === 'string' &&
    typeof v.stepCount === 'number' &&
    typeof v.lockedContrast === 'boolean' &&
    DEFAULT_STATE !== undefined
  );
}

export { CURVE_PRESETS };
