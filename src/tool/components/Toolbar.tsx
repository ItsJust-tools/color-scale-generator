'use client';

import React from 'react';
import { CURVE_PRESETS, type CurvePreset, type ToolState } from '../types';

interface ToolbarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
  onClear: () => void;
  onCopy?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear, onCopy }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Scale controls">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(state.baseColor) ? state.baseColor : '#3b82f6'}
          onChange={(e) => onChange({ ...state, baseColor: e.target.value })}
          data-testid="color-picker"
          className="h-8 w-10 cursor-pointer rounded border border-gray-300 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-800"
          aria-label="Pick base color"
        />
        <div className="flex gap-1" role="group" aria-label="Curve preset">
          {CURVE_PRESETS.map((preset: CurvePreset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={state.curvePreset === preset}
              data-testid={`curve-${preset}`}
              onClick={() => onChange({ ...state, curvePreset: preset })}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                state.curvePreset === preset
                  ? 'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          Steps
          <input
            type="number"
            min={10}
            max={14}
            value={state.stepCount}
            onChange={(e) => {
              const v = Number(e.target.value);
              onChange({ ...state, stepCount: Number.isFinite(v) ? v : state.stepCount });
            }}
            data-testid="step-count"
            className="w-16 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>
        <button
          type="button"
          onClick={onClear}
          data-testid="btn-clear"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Reset
        </button>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            data-testid="btn-copy-result"
            className="rounded-md bg-sky-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-sky-600"
          >
            Copy scale
          </button>
        ) : null}
      </div>
    </div>
  );
};
