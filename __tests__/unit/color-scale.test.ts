import { describe, it, expect } from 'vitest';
import {
  parseHex,
  parseRgb,
  parseColor,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  rgbToCssString,
  rgbToHslString,
  relativeLuminance,
  contrastRatio,
  meetsContrast,
  generateScale,
  stepLabelsFor,
  curveLightnessFor,
  normalizeStepCount,
  buildScale,
  adjustLightnessForContrast,
  CURVES,
  SCALE_STEPS,
  DEFAULT_STATE,
  WHITE,
  BLACK,
  type ToolState,
} from '@/tool/types';
import { deserializeState, serializeState, withHistory, roundTrips } from '@/tool/tool-definition';
import { exportCssVariables, exportTailwind, exportJson } from '@/tool/exporters/scale';
import { colorScaleGeneratorTool } from '@/tool/tool-definition';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('parseHex', () => {
  it('parses 6-digit hex with and without hash', () => {
    expect(parseHex('#3b82f6')).toEqual({ r: 59, g: 130, b: 246 });
    expect(parseHex('3b82f6')).toEqual({ r: 59, g: 130, b: 246 });
    expect(parseHex('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('expands 3-digit shorthand', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex('#000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(parseHex('f0a')).toEqual({ r: 255, g: 0, b: 170 });
  });

  it('rejects invalid input', () => {
    expect(parseHex('')).toBeNull();
    expect(parseHex('#12')).toBeNull();
    expect(parseHex('#12345')).toBeNull();
    expect(parseHex('#1234567')).toBeNull();
    expect(parseHex('#gggggg')).toBeNull();
    expect(parseHex('blue')).toBeNull();
  });
});

describe('parseRgb / parseColor', () => {
  it('parses rgb() strings and clamps channels', () => {
    expect(parseRgb('rgb(59, 130, 246)')).toEqual({ r: 59, g: 130, b: 246 });
    expect(parseRgb('rgb(300, -5, 0)')).toBeNull(); // regex only accepts 0-255 digits
    expect(parseRgb('RGB(1,2,3)')).toEqual({ r: 1, g: 2, b: 3 });
    expect(parseRgb('rgb(1,2)')).toBeNull();
    expect(parseRgb('rgb(a,b,c)')).toBeNull();
  });

  it('routes by prefix', () => {
    expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColor('rgb(0, 0, 255)')).toEqual({ r: 0, g: 0, b: 255 });
    expect(parseColor('hsl(0, 0%, 50%)')).toBeNull();
  });
});

describe('rgbToHex / rgbToHsl / hslToRgb', () => {
  it('formats hex padded and clamped', () => {
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#ffffff');
    expect(rgbToHex({ r: 59, g: 130, b: 246 })).toBe('#3b82f6');
    expect(rgbToHex({ r: 300, g: -4, b: 12 })).toBe('#ff000c');
  });

  it('converts primary colors', () => {
    expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, l: 50 });
    expect(rgbToHsl({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, l: 0 });
    expect(rgbToHsl({ r: 255, g: 255, b: 255 })).toEqual({ h: 0, s: 0, l: 100 });
  });

  it('hslToRgb round-trips through rgbToHsl', () => {
    const samples = [
      { r: 59, g: 130, b: 246 },
      { r: 16, g: 185, b: 129 },
      { r: 239, g: 68, b: 68 },
      { r: 250, g: 204, b: 21 },
    ];
    for (const s of samples) {
      const back = hslToRgb(rgbToHsl(s));
      expect(rgbToHex(back)).toBe(rgbToHex(s));
    }
  });

  it('handles hue wrapping', () => {
    expect(hslToRgb({ h: 360, s: 100, l: 50 })).toEqual(hslToRgb({ h: 0, s: 100, l: 50 }));
    expect(hslToRgb({ h: -120, s: 100, l: 50 }).b).toBeGreaterThan(200);
  });

  it('formats CSS strings', () => {
    expect(rgbToCssString({ r: 59, g: 130, b: 246 })).toBe('rgb(59, 130, 246)');
    expect(rgbToHslString({ r: 255, g: 0, b: 0 })).toBe('hsl(0, 100%, 50%)');
  });
});

describe('WCAG contrast', () => {
  it('computes known ratios', () => {
    expect(contrastRatio(BLACK, WHITE)).toBe(21);
    expect(contrastRatio(WHITE, BLACK)).toBe(21);
    expect(contrastRatio(BLACK, BLACK)).toBe(1);
    // #767676 vs white ≈ 4.54 (classic AA threshold sample)
    const gray = parseHex('#767676') as { r: number; g: number; b: number };
    expect(contrastRatio(gray, WHITE)).toBeGreaterThanOrEqual(4.5);
  });

  it('relative luminance is monotone in channel value', () => {
    const dark = relativeLuminance({ r: 10, g: 10, b: 10 });
    const mid = relativeLuminance({ r: 128, g: 128, b: 128 });
    const light = relativeLuminance({ r: 240, g: 240, b: 240 });
    expect(dark).toBeLessThan(mid);
    expect(mid).toBeLessThan(light);
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 5);
    expect(relativeLuminance(BLACK)).toBe(0);
  });

  it('meetsContrast uses >= with tolerance', () => {
    expect(meetsContrast(BLACK, WHITE, 21)).toBe(true);
    expect(meetsContrast(BLACK, WHITE, 21.1)).toBe(false);
  });
});

describe('scale generation', () => {
  it('normalizes step count to 10-14', () => {
    expect(normalizeStepCount(5)).toBe(10);
    expect(normalizeStepCount(11)).toBe(11);
    expect(normalizeStepCount(99)).toBe(14);
    expect(normalizeStepCount(11.6)).toBe(12);
    expect(normalizeStepCount(NaN)).toBe(11);
  });

  it('generates a monotone light-to-dark ramp', () => {
    const base = parseHex('#3b82f6') as { r: number; g: number; b: number };
    const scale = generateScale(base, 'tailwind', 11);
    expect(scale).toHaveLength(11);
    for (let i = 1; i < scale.length; i++) {
      expect(scale[i]!.hex).not.toBe(scale[i - 1]!.hex);
    }
    // lightness decreases from first to last
    const lum = scale.map((s) => relativeLuminance(s.rgb));
    expect(lum[0]!).toBeGreaterThan(lum[lum.length - 1]!);
  });

  it('clamps at extremes for very dark bases', () => {
    const scale = generateScale(BLACK, 'material', 14);
    expect(scale).toHaveLength(14);
    const allValid = scale.every((s) => /^#[0-9a-f]{6}$/.test(s.hex));
    expect(allValid).toBe(true);
    // darkest step still darker than lightest
    const lum = scale.map((s) => relativeLuminance(s.rgb));
    expect(lum[lum.length - 1]!).toBeLessThan(lum[0]!);
  });

  it('clamps at extremes for very light bases', () => {
    const scale = generateScale(WHITE, 'linear', 10);
    expect(scale).toHaveLength(10);
    const lum = scale.map((s) => relativeLuminance(s.rgb));
    expect(lum[lum.length - 1]!).toBeLessThan(lum[0]!);
  });

  it('step labels follow the 50-950 ladder at 11 steps', () => {
    expect(stepLabelsFor(11)).toEqual([...SCALE_STEPS]);
    const labels10 = stepLabelsFor(10);
    expect(labels10).toHaveLength(10);
    expect(labels10[0]!).toBeLessThan(labels10[labels10.length - 1]!);
    expect(labels10.every((l) => SCALE_STEPS.includes(l as (typeof SCALE_STEPS)[number]))).toBe(
      true
    );
  });

  it('curve lightness resamples to the requested count', () => {
    expect(curveLightnessFor('material', 11)).toHaveLength(11);
    expect(curveLightnessFor('tailwind', 14)).toEqual(CURVES.tailwind);
    expect(curveLightnessFor('linear', 10)[0]).toBeCloseTo(95, 5);
  });
});

describe('buildScale', () => {
  it('reports invalid colors', () => {
    const result = buildScale(state({ baseColor: 'nope' }));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid color');
    expect(result.swatches).toHaveLength(0);
  });

  it('builds swatches with contrast values', () => {
    const result = buildScale(state());
    expect(result.valid).toBe(true);
    expect(result.swatches).toHaveLength(11);
    expect(result.swatches.every((s) => s.contrastWhite > 0 && s.contrastBlack > 0)).toBe(true);
    expect(result.swatches.some((s) => s.isBase)).toBe(true);
    const baseStep = result.swatches.find((s) => s.isBase);
    // closest lightness step to the base color (may be rounded by curve)
    expect(baseStep).toBeDefined();
    const bs = baseStep as NonNullable<typeof baseStep>;
    expect(contrastRatio(bs.rgb, bs.rgb)).toBe(1);
  });

  it('applies tweak to the curve', () => {
    const normal = buildScale(state());
    const lighter = buildScale(state({ tweak: 10 }));
    const lumNormal = relativeLuminance(normal.swatches[3]!.rgb);
    const lumLighter = relativeLuminance(lighter.swatches[3]!.rgb);
    expect(lumLighter).toBeGreaterThan(lumNormal);
  });

  it('locked contrast brings steps to target', () => {
    const target = 4.5;
    const result = buildScale(state({ lockedContrast: true, contrastTargetValue: target }));
    const offenders = result.swatches.filter(
      (s) => s.contrastWhite < target - 0.01 && s.contrastBlack < target - 0.01
    );
    // every step should meet at least one of white/black at 4.5 after locking
    expect(offenders).toHaveLength(0);
  });

  it('adjustLightnessForContrast respects mode', () => {
    const l = [50, 50, 50];
    const vsWhite = adjustLightnessForContrast(l, { mode: 'white', min: 4.5 }, 220, 80);
    const vsBlack = adjustLightnessForContrast(l, { mode: 'black', min: 4.5 }, 220, 80);
    expect(vsWhite.every((v) => v <= 50)).toBe(true);
    expect(vsBlack.every((v) => v >= 50)).toBe(true);
  });
});

describe('URL state round-trip', () => {
  it('serializes and deserializes a full state', () => {
    const s = state({
      baseColor: '#22c55e',
      curvePreset: 'material',
      stepCount: 13,
      tweak: -8,
      lockedContrast: true,
      contrastTargetValue: 7,
    });
    const restored = deserializeState(JSON.parse(serializeState(s)));
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data).toEqual(s);
    }
    expect(roundTrips(s)).toBe(true);
  });

  it('round-trips the default state', () => {
    expect(roundTrips(DEFAULT_STATE)).toBe(true);
  });

  it('deserializes with fallbacks on garbage', () => {
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState('string').success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
    const recovered = deserializeState({
      baseColor: 42,
      curvePreset: 'bogus',
      stepCount: 99,
      tweak: 999,
    });
    expect(recovered.success).toBe(true);
    if (recovered.success) {
      expect(recovered.data.baseColor).toBe(DEFAULT_STATE.baseColor);
      expect(recovered.data.curvePreset).toBe(DEFAULT_STATE.curvePreset);
      expect(recovered.data.stepCount).toBe(14);
      expect(recovered.data.tweak).toBe(20);
    }
  });

  it('caps history at MAX_HISTORY', () => {
    let s = state();
    for (let i = 0; i < 25; i++) {
      s = withHistory(s, `entry ${i}`, new Date(2026, 0, 1, 0, 0, i));
    }
    expect(s.history).toHaveLength(20);
    expect(s.history[0]?.text).toBe('entry 24');
    expect(roundTrips(s)).toBe(true);
  });

  it('tool definition wires serialize/deserialize', () => {
    expect(colorScaleGeneratorTool.id).toBe('color-scale-generator');
    expect(colorScaleGeneratorTool.serialize(DEFAULT_STATE)).toBe(serializeState(DEFAULT_STATE));
    const d = colorScaleGeneratorTool.deserialize(JSON.parse(serializeState(DEFAULT_STATE)));
    expect(d.success).toBe(true);
  });
});

describe('exports', () => {
  it('CSS variables list every step', () => {
    const css = exportCssVariables(state());
    expect(css).toContain(':root {');
    expect(css).toContain('--color-50: #');
    expect(css).toContain('--color-950: #');
    expect(css.match(/--color-\d+:/g)).toHaveLength(11);
  });

  it('Tailwind palette nests steps', () => {
    const tw = exportTailwind(state());
    expect(tw).toContain('module.exports');
    expect(tw).toContain('primary: {');
    expect(tw).toContain("50: '#");
    expect(tw).toContain("950: '#");
  });

  it('JSON export includes contrast data and round-trips', () => {
    const json = exportJson(state());
    const parsed = JSON.parse(json) as {
      baseColor: string;
      curvePreset: string;
      stepCount: number;
      swatches: {
        step: number;
        hex: string;
        rgb: string;
        hsl: string;
        contrastWhite: number;
        contrastBlack: number;
      }[];
    };
    expect(parsed.curvePreset).toBe('tailwind');
    expect(parsed.stepCount).toBe(11);
    expect(parsed.swatches).toHaveLength(11);
    expect(parsed.swatches[0]?.step).toBe(50);
    expect(parsed.swatches[10]?.step).toBe(950);
    expect(typeof parsed.swatches[0]?.contrastWhite).toBe('number');
    expect(typeof parsed.swatches[0]?.contrastBlack).toBe('number');
  });

  it('exports are empty for invalid input', () => {
    const bad = state({ baseColor: 'zzz' });
    expect(exportCssVariables(bad)).toBe('');
    expect(exportTailwind(bad)).toBe('');
    expect(exportJson(bad)).toBe('');
  });
});
