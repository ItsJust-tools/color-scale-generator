import type { ScaleSwatch, ToolState } from '../types';
import { buildScale } from '../types';

/** CSS custom properties for the whole scale. */
export function exportCssVariables(state: ToolState, varPrefix = '--color'): string {
  const { swatches, valid } = buildScale(state);
  if (!valid || swatches.length === 0) return '';
  const lines = swatches.map((s) => `  ${varPrefix}-${s.step}: ${s.hex};`);
  return `:root {\n${lines.join('\n')}\n}\n`;
}

/** Tailwind color palette configuration snippet. */
export function exportTailwind(state: ToolState, paletteName = 'primary'): string {
  const { swatches, valid } = buildScale(state);
  if (!valid || swatches.length === 0) return '';
  const lines = swatches.map((s) => `        ${s.step}: '${s.hex}',`);
  return `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n        ${paletteName}: {\n${lines.join('\n')}\n        },\n      },\n    },\n  },\n};\n`;
}

/** JSON export of the scale with contrast data. */
export interface ScaleJsonSwatch {
  step: number;
  hex: string;
  rgb: string;
  hsl: string;
  contrastWhite: number;
  contrastBlack: number;
}

export interface ScaleJson {
  baseColor: string;
  curvePreset: string;
  stepCount: number;
  swatches: ScaleJsonSwatch[];
}

export function exportJson(state: ToolState): string {
  const { swatches, baseRgb, valid } = buildScale(state);
  if (!valid) return '';
  const payload: ScaleJson = {
    baseColor: `rgb(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b})`,
    curvePreset: state.curvePreset,
    stepCount: swatches.length,
    swatches: swatches.map(
      ({
        step,
        hex,
        rgbString,
        hslString,
        contrastWhite,
        contrastBlack,
      }: ScaleSwatch): ScaleJsonSwatch => ({
        step,
        hex,
        rgb: rgbString,
        hsl: hslString,
        contrastWhite,
        contrastBlack,
      })
    ),
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}
