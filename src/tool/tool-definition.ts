import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  MAX_HISTORY,
  CURVE_PRESETS,
  SCALE_STEPS,
  buildScale,
  resultText,
  type CurvePreset,
  type HistoryEntry,
  type ToolState,
} from './types';

const VALID_CURVES: CurvePreset[] = CURVE_PRESETS;
const VALID_TARGET_MODES = ['white', 'black'] as const;

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function numberOrDefault(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function validHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).text === 'string' &&
        typeof (entry as HistoryEntry).createdAt === 'string'
    )
    .slice(0, MAX_HISTORY);
}

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    baseColor: state.baseColor,
    curvePreset: state.curvePreset,
    stepCount: state.stepCount,
    tweak: state.tweak,
    lockedContrast: state.lockedContrast,
    contrastTargetValue: state.contrastTargetValue,
    contrastTargetMode: state.contrastTargetMode,
    history: state.history,
  });
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected color scale generator state object',
    };
  }
  const v = data as Record<string, unknown>;
  const curvePreset: CurvePreset = VALID_CURVES.includes(v.curvePreset as CurvePreset)
    ? (v.curvePreset as CurvePreset)
    : DEFAULT_STATE.curvePreset;
  const contrastTargetMode =
    typeof v.contrastTargetMode === 'string' &&
    (VALID_TARGET_MODES as readonly string[]).includes(v.contrastTargetMode)
      ? (v.contrastTargetMode as ToolState['contrastTargetMode'])
      : DEFAULT_STATE.contrastTargetMode;
  const state: ToolState = {
    baseColor: stringOr(v.baseColor, DEFAULT_STATE.baseColor),
    curvePreset,
    stepCount: Math.round(numberOrDefault(v.stepCount, DEFAULT_STATE.stepCount, 10, 14)),
    tweak: numberOrDefault(v.tweak, DEFAULT_STATE.tweak, -20, 20),
    lockedContrast:
      typeof v.lockedContrast === 'boolean' ? v.lockedContrast : DEFAULT_STATE.lockedContrast,
    contrastTargetValue: numberOrDefault(
      v.contrastTargetValue,
      DEFAULT_STATE.contrastTargetValue,
      1,
      21
    ),
    contrastTargetMode,
    history: validHistory(v.history),
  };
  return { success: true, data: state };
}

/** Append a history entry to state, capped at MAX_HISTORY, newest first. */
export function withHistory(state: ToolState, text: string, now = new Date()): ToolState {
  const entry: HistoryEntry = { text, createdAt: now.toISOString() };
  return { ...state, history: [entry, ...state.history].slice(0, MAX_HISTORY) };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

/** Human-readable result for the active state, or null when inputs are invalid. */
export { resultText };

export const colorScaleGeneratorTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export { SCALE_STEPS, buildScale };
