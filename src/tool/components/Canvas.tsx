'use client';

import React from 'react';
import { buildScale, rgbToHex, type ScaleSwatch, type ToolState } from '../types';
import { exportCssVariables, exportJson, exportTailwind } from '../exporters/scale';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy value"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function SwatchRow({ swatch }: { swatch: ScaleSwatch }) {
  const light = swatch.contrastWhite >= 4.5 || swatch.contrastWhite >= 3;
  const fg = light ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.85)';
  return (
    <div
      data-testid={`swatch-${swatch.step}`}
      className="flex items-center justify-between gap-3 rounded-lg px-4 py-3"
      style={{ backgroundColor: swatch.hex, color: fg }}
    >
      <div className="flex items-baseline gap-3 min-w-0">
        <span className="font-mono text-sm font-bold w-10 shrink-0">{swatch.step}</span>
        <span className="font-mono text-xs truncate">{swatch.hex}</span>
        {swatch.isBase ? (
          <span className="text-[10px] uppercase tracking-wider rounded-full border px-2 py-0.5 shrink-0">
            base
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-mono opacity-80" data-testid={`contrast-${swatch.step}`}>
          W {swatch.contrastWhite.toFixed(2)} · B {swatch.contrastBlack.toFixed(2)}
        </span>
        <CopyButton value={swatch.hex} testid={`copy-hex-${swatch.step}`} />
        <CopyButton value={swatch.rgbString} testid={`copy-rgb-${swatch.step}`} />
        <CopyButton value={swatch.hslString} testid={`copy-hsl-${swatch.step}`} />
      </div>
    </div>
  );
}

export const Canvas: React.FC<CanvasProps> = ({ state, onChange }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const result = buildScale(state);
  const [exportFormat, setExportFormat] = React.useState<'css' | 'tailwind' | 'json'>('css');

  const exportText = React.useMemo(() => {
    if (!result.valid) return '';
    if (exportFormat === 'css') return exportCssVariables(state);
    if (exportFormat === 'tailwind') return exportTailwind(state);
    return exportJson(state);
  }, [result.valid, exportFormat, state]);

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="color-scale-canvas">
      {!result.valid ? (
        <div
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200"
          role="alert"
          data-testid="invalid-color"
        >
          {result.error}
        </div>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Scale preview ({result.swatches.length} steps · {state.curvePreset} curve)
        </h3>
        <div className="space-y-1.5" data-testid="scale-list">
          {result.swatches.map((swatch) => (
            <SwatchRow key={swatch.step} swatch={swatch} />
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="flex gap-1" role="tablist" aria-label="Export format">
            {(['css', 'tailwind', 'json'] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={exportFormat === f}
                data-testid={`export-tab-${f}`}
                onClick={() => setExportFormat(f)}
                className={`rounded-md border px-3 py-1 text-xs font-medium ${
                  exportFormat === f
                    ? 'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
                }`}
              >
                {f === 'css' ? 'CSS variables' : f === 'tailwind' ? 'Tailwind palette' : 'JSON'}
              </button>
            ))}
          </div>
          <span className="ml-auto">
            <CopyButton value={exportText} testid="copy-export" />
          </span>
        </div>
        <pre
          data-testid="export-output"
          className="max-h-72 overflow-auto rounded-md bg-gray-900 p-3 text-[11px] leading-4 text-gray-100"
        >
          <code>{exportText || '—'}</code>
        </pre>
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        All color math runs locally in your browser; nothing is uploaded.
      </p>
    </div>
  );
};

export { rgbToHex };
