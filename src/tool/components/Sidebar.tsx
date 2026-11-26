'use client';

import React from 'react';
import { CURVE_LABELS } from '../ui-shared';
import {
  CURVES,
  buildScale,
  contrastRatio,
  BLACK,
  WHITE,
  type ScaleSwatch,
  type ToolState,
} from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

function contrastBadge(ratio: number): { label: string; ok: boolean } {
  return { label: ratio.toFixed(2), ok: ratio >= 4.5 };
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  const result = buildScale(state);
  const targetBg = state.contrastTargetMode === 'white' ? WHITE : BLACK;

  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="color-scale-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Base color</h3>
        <input
          type="text"
          value={state.baseColor}
          onChange={(e) => onChange({ ...state, baseColor: e.target.value })}
          data-testid="base-color-input"
          placeholder="#3b82f6 or rgb(59, 130, 246)"
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Lightness curve</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {CURVE_LABELS.map((curve) => (
            <li key={curve.value} className="flex justify-between gap-2">
              <span>{curve.label}</span>
              <span className="text-gray-500 dark:text-gray-400">{curve.hint}</span>
            </li>
          ))}
        </ul>
        <label className="mt-3 block text-xs font-medium text-gray-700 dark:text-gray-300">
          Curve tweak ({state.tweak > 0 ? '+' : ''}
          {state.tweak})
          <input
            type="range"
            min={-20}
            max={20}
            step={1}
            value={state.tweak}
            onChange={(e) => onChange({ ...state, tweak: Number(e.target.value) })}
            data-testid="tweak-slider"
            className="mt-1 w-full"
          />
        </label>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">
          Locked contrast target
        </h3>
        <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={state.lockedContrast}
            onChange={(e) => onChange({ ...state, lockedContrast: e.target.checked })}
            data-testid="lock-contrast"
          />
          Auto-adjust steps to hit target
        </label>
        {state.lockedContrast ? (
          <div className="mt-2 space-y-2">
            <div className="flex gap-1" role="group" aria-label="Contrast reference">
              {(['white', 'black'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={state.contrastTargetMode === mode}
                  data-testid={`target-${mode}`}
                  onClick={() => onChange({ ...state, contrastTargetMode: mode })}
                  className={`rounded-md border px-2 py-1 text-xs ${
                    state.contrastTargetMode === mode
                      ? 'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100'
                      : 'border-gray-200 bg-white text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
                  }`}
                >
                  vs {mode}
                </button>
              ))}
            </div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Minimum ratio: {state.contrastTargetValue.toFixed(1)}
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={state.contrastTargetValue}
                onChange={(e) =>
                  onChange({ ...state, contrastTargetValue: Number(e.target.value) })
                }
                data-testid="contrast-target-slider"
                className="mt-1 w-full"
              />
            </label>
          </div>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Contrast check</h3>
        {result.valid ? (
          <ul className="space-y-1 text-xs" data-testid="contrast-list">
            {result.swatches.map((s: ScaleSwatch) => {
              const w = contrastBadge(s.contrastWhite);
              const b = contrastBadge(s.contrastBlack);
              const cur = contrastBadge(contrastRatio(s.rgb, targetBg));
              return (
                <li key={s.step} className="flex items-center justify-between gap-2 font-mono">
                  <span className="w-8 text-gray-600 dark:text-gray-400">{s.step}</span>
                  <span
                    className={
                      w.ok
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-orange-600 dark:text-orange-400'
                    }
                    title="vs white"
                  >
                    W {w.label}
                  </span>
                  <span
                    className={
                      b.ok
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-orange-600 dark:text-orange-400'
                    }
                    title="vs black"
                  >
                    B {b.label}
                  </span>
                  {state.lockedContrast ? (
                    <span
                      className={
                        cur.ok
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }
                      title={`vs ${state.contrastTargetMode}`}
                    >
                      ✦ {cur.label}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">Enter a valid base color.</p>
        )}
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Curve data</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          {state.curvePreset}: {CURVES[state.curvePreset].length} stops, lightness{' '}
          {Math.round(CURVES[state.curvePreset][0] ?? 0)}% →{' '}
          {Math.round(CURVES[state.curvePreset][CURVES[state.curvePreset].length - 1] ?? 0)}%
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved results</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} entr{state.history.length === 1 ? 'y' : 'ies'} in history
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current scale; open it to
          restore these settings.
        </p>
      </div>
    </div>
  );
};
