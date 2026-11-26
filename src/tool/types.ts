/**
 * Color math utilities: hex/RGB/HSL conversion, tonal scale generation,
 * WCAG contrast ratios, and lightness curve presets.
 * All functions are pure and client-safe.
 */

export interface Rgb {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface Hsl {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** Clamp RGB channel to 0-255. */
export function clampChannel(value: number): number {
  return clamp(Math.round(value), 0, 255);
}

const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Parse a hex color string (#abc, #aabbcc, with or without '#'); null on failure. */
export function parseHex(input: string): Rgb | null {
  const trimmed = input.trim();
  const match = HEX_RE.exec(trimmed);
  if (!match) return null;
  let hex = match[1] ?? '';
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const value = hex; // narrowed: HEX_RE guarantees 6 chars after expansion
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

const RGB_RE = /^\s*rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)\s*$/i;

/** Parse an rgb(r, g, b) string; null on failure. Channel values clamp to 0-255. */
export function parseRgb(input: string): Rgb | null {
  const match = RGB_RE.exec(input);
  if (!match) return null;
  return {
    r: clamp(Number(match[1]), 0, 255),
    g: clamp(Number(match[2]), 0, 255),
    b: clamp(Number(match[3]), 0, 255),
  };
}

/** Parse hex or rgb() input; null on failure. */
export function parseColor(input: string): Rgb | null {
  const trimmed = input.trim();
  if (trimmed.startsWith('rgb')) return parseRgb(trimmed);
  return parseHex(trimmed);
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (v: number) => clamp(v, 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return {
    h: Math.round(h * 10) / 10,
    s: Math.round(s * 1000) / 10,
    l: Math.round(l * 1000) / 10,
  };
}

function hueToRgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hn = (((h % 360) + 360) % 360) / 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;

  if (sn === 0) {
    const v = clampChannel(ln * 255);
    return { r: v, g: v, b: v };
  }

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  return {
    r: clampChannel(hueToRgb(p, q, hn + 1 / 3) * 255),
    g: clampChannel(hueToRgb(p, q, hn) * 255),
    b: clampChannel(hueToRgb(p, q, hn - 1 / 3) * 255),
  };
}

export function rgbToCssString({ r, g, b }: Rgb): string {
  return `rgb(${Math.round(clamp(r, 0, 255))}, ${Math.round(clamp(g, 0, 255))}, ${Math.round(
    clamp(b, 0, 255)
  )})`;
}

export function rgbToHslString(rgb: Rgb): string {
  const { h, s, l } = rgbToHsl(rgb);
  return `hsl(${h}, ${s}%, ${l}%)`;
}

// ─── WCAG contrast ───────────────────────────────────────────────────────────

/** WCAG relative luminance from sRGB channels (0-255). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export const WHITE: Rgb = { r: 255, g: 255, b: 255 };
export const BLACK: Rgb = { r: 0, g: 0, b: 0 };

/** WCAG contrast ratio between two colors, rounded to 2 decimals. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  const raw = (lighter + 0.05) / (darker + 0.05);
  return Math.round(raw * 100) / 100;
}

/** True when the WCAG contrast ratio meets the given threshold (e.g. 4.5). */
export function meetsContrast(one: Rgb, other: Rgb, target = 4.5): boolean {
  return contrastRatio(one, other) >= target - 1e-9;
}

// ─── Lightness curve presets ────────────────────────────────────────────────

export type CurvePreset = 'material' | 'tailwind' | 'linear';

export const CURVE_PRESETS: CurvePreset[] = ['material', 'tailwind', 'linear'];

/**
 * Lightness (%) per scale step for each curve preset, from lightest (first)
 * to darkest (last). Curves start near 97-98% and end near 8-12%.
 */
export const CURVES: Record<CurvePreset, number[]> = {
  // Material-inspired tonal curve (HCT-alike behavior approximated in HSL).
  material: [98, 96, 94, 91, 87, 80, 71, 61, 49, 38, 27, 17, 10, 6],
  // Tailwind-style vivid curve.
  tailwind: [97, 94, 89, 81, 74, 64, 54, 45, 37, 30, 25, 19, 15, 10],
  // Evenly spaced linear ramp.
  linear: [95, 89, 83, 76, 70, 64, 58, 52, 46, 40, 34, 28, 20, 12],
};

/** Canonical scale step labels (50-950 style). */
export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type ScaleStep = (typeof SCALE_STEPS)[number];

/** Number of scale steps: 10-14 (clamped). */
export function normalizeStepCount(count: number): number {
  if (!Number.isFinite(count)) return 11;
  return clamp(Math.round(count), 10, 14);
}

/**
 * Extract the per-step lightness values for `count` steps from a curve.
 * The last curve entry is always kept as the darkest step.
 */
export function sampleCurve(curve: number[], count: number): number[] {
  if (count >= curve.length) {
    return curve.slice(-count).map((v) => v ?? 0);
  }
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const pos = t * (curve.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(curve.length - 1, lo + 1);
    const frac = pos - lo;
    const loV = curve[lo] ?? 0;
    const hiV = curve[hi] ?? loV;
    result.push(loV + (hiV - loV) * frac);
  }
  return result;
}

/** Curve lightness values resampled to exactly `count` steps. */
export function curveLightnessFor(preset: CurvePreset, count: number): number[] {
  return sampleCurve(CURVES[preset], normalizeStepCount(count));
}

// ─── Scale generation ───────────────────────────────────────────────────────

export interface ScaleSwatch {
  /** Step label, e.g. 50, 100 ... 950. */
  step: number;
  hex: string;
  rgb: Rgb;
  rgbString: string;
  hslString: string;
  contrastWhite: number;
  contrastBlack: number;
  /** True when this step is the input base color. */
  isBase: boolean;
}

/**
 * Generate a tonal scale from a base RGB.
 *
 * Steps go from lightest to darkest. The base color's lightness and the hue
 * and saturation are preserved; only lightness is redistributed per curve.
 * Steps clamp at the extremes (L 0-100), so a very light/dark base still
 * produces a monotone ramp.
 */
export function generateScale(base: Rgb, preset: CurvePreset, count: number): ScaleSwatch[] {
  const { h, s } = rgbToHsl(base);
  const hsls = curveLightnessFor(preset, count).map((l) => ({
    h,
    s: baseClampSaturation(s, l),
    l,
  }));
  const baseHsl = rgbToHsl(base);
  const baseHex = rgbToHex(base);

  const rgbSteps = hsls.map(hslToRgb);

  // Choose the step labels: use SCALE_STEPS when count matches, otherwise
  // generate evenly spaced numeric labels from 50 to 950.
  const labels: number[] = stepLabelsFor(count);

  return rgbSteps.map((rgb, i) => {
    const label = labels[i] ?? i * 50;
    return {
      step: label,
      hex: rgbToHex(rgb),
      rgb,
      rgbString: rgbToCssString(rgb),
      hslString: rgbToHslString(rgb),
      contrastWhite: contrastRatio(rgb, WHITE),
      contrastBlack: contrastRatio(rgb, BLACK),
      isBase: rgbToHex(rgb) === baseHex && baseWithinTolerance(rgbToHsl(rgb), baseHsl),
    };
  });
}

/** Keep saturation reasonable at extreme lightness so tints stay usable. */
function baseClampSaturation(s: number, l: number): number {
  const clamped = clamp(s, 0, 100);
  if (l >= 96) return Math.min(clamped, 80);
  if (l <= 8) return Math.min(clamped, 90);
  return clamped;
}

function baseWithinTolerance(a: Hsl, b: Hsl): boolean {
  const dh = Math.abs(a.h - b.h);
  return dh < 1 && Math.abs(a.s - b.s) < 1.5 && Math.abs(a.l - b.l) < 1.5;
}

/** Step labels for a given count (interpolated 50-950 ladder). */
export function stepLabelsFor(count: number): number[] {
  const n = normalizeStepCount(count);
  if (n === SCALE_STEPS.length) return [...SCALE_STEPS];
  // Evenly spread the canonical ladder positions across n steps.
  const src: number[] = [...SCALE_STEPS];
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const pos = (i / (n - 1)) * (src.length - 1);
    const lo = Math.min(Math.floor(pos), src.length - 1);
    const hi = Math.min(src.length - 1, lo + 1);
    const frac = pos - lo;
    const val = (src[lo] ?? 0) + ((src[hi] ?? 0) - (src[lo] ?? 0)) * frac;
    out.push(roundStepLabel(val));
  }
  return out;
}

function roundStepLabel(v: number): number {
  const candidates: number[] = [...SCALE_STEPS];
  let best: number = candidates[0] ?? 50;
  let bestDiff = Infinity;
  for (const c of candidates) {
    const diff = Math.abs(c - v);
    if (diff < bestDiff) {
      best = c;
      bestDiff = diff;
    }
  }
  return best;
}

// ─── Locked contrast targets ────────────────────────────────────────────────

export type ContrastTarget = { mode: 'white'; min: number } | { mode: 'black'; min: number };

/**
 * When a locked contrast target is enabled, lighten or darken steps so every
 * step hits at least `min` contrast against the locked reference (white or
 * black). Returns adjusted lightness values (0-100).
 */
export function adjustLightnessForContrast(
  lightness: number[],
  target: ContrastTarget,
  hue: number,
  saturation: number
): number[] {
  return lightness.map((l) => {
    let current = clamp(l, 0, 100);
    let rgb = hslToRgb({ h: hue, s: saturation, l: current });
    let ratio = contrastRatio(rgb, target.mode === 'white' ? WHITE : BLACK);
    if (ratio >= target.min - 1e-9) return current;

    // Search direction: for white, darken the color; for black, lighten it.
    const stepSize = 1.5;
    const maxIterations = 40;
    for (let i = 0; i < maxIterations && ratio < target.min - 1e-9; i++) {
      const next = clamp(target.mode === 'white' ? current - stepSize : current + stepSize, 0, 100);
      if (next === current) break;
      current = next;
      rgb = hslToRgb({ h: hue, s: saturation, l: current });
      ratio = contrastRatio(rgb, target.mode === 'white' ? WHITE : BLACK);
    }
    return current;
  });
}

/** Serialized shareable tool state. */
export interface ToolState {
  baseColor: string;
  curvePreset: CurvePreset;
  stepCount: number;
  /** Lightness tweak offset (-20..20) applied to the selected curve. */
  tweak: number;
  lockedContrast: boolean;
  contrastTargetValue: number; // e.g. 3.0 or 4.5
  contrastTargetMode: 'white' | 'black';
  history: HistoryEntry[];
}

export interface HistoryEntry {
  text: string;
  createdAt: string;
}

export const DEFAULT_STATE: ToolState = {
  baseColor: '#3b82f6',
  curvePreset: 'tailwind',
  stepCount: 11,
  tweak: 0,
  lockedContrast: false,
  contrastTargetValue: 4.5,
  contrastTargetMode: 'white',
  history: [],
};

export const MAX_HISTORY = 20;

/** Parse tool base color input to RGB; null on failure. */
export function parseBaseColor(input: string): Rgb | null {
  return parseColor(input);
}

export interface ScaleResult {
  swatches: ScaleSwatch[];
  baseRgb: Rgb;
  valid: boolean;
  error: string | null;
}

/** Full pipeline: parse base color, apply curve + tweak + locked contrast. */
export function resultText(state: ToolState): string | null {
  const result = buildScale(state);
  if (!result.valid) return null;
  return result.swatches.map((s) => s.hex).join(' ');
}

export function buildScale(state: ToolState): ScaleResult {
  const base = parseColor(state.baseColor);
  if (!base) {
    return {
      swatches: [],
      baseRgb: BLACK,
      valid: false,
      error: `Invalid color: "${state.baseColor}". Use #rrggbb or rgb(r, g, b).`,
    };
  }
  const count = normalizeStepCount(state.stepCount);
  const preset = CURVE_PRESETS.includes(state.curvePreset) ? state.curvePreset : 'tailwind';
  const { h, s } = rgbToHsl(base);
  let lightness: number[] = curveLightnessFor(preset, count).map((l) =>
    clamp(l + state.tweak, 0, 100)
  );
  if (state.lockedContrast) {
    lightness = adjustLightnessForContrast(
      lightness,
      { mode: state.contrastTargetMode, min: state.contrastTargetValue },
      h,
      s
    );
  }
  const swatches: ScaleSwatch[] = lightness.map((l, i) => {
    const rgb = hslToRgb({ h, s: baseClampSaturation(s, l), l });
    const labels: number[] = stepLabelsFor(count);
    const label = labels[i] ?? i * 50;
    return {
      step: label,
      hex: rgbToHex(rgb),
      rgb,
      rgbString: rgbToCssString(rgb),
      hslString: rgbToHslString(rgb),
      contrastWhite: contrastRatio(rgb, WHITE),
      contrastBlack: contrastRatio(rgb, BLACK),
      isBase: false,
    };
  });
  // Mark the step closest to the base color lightness.
  if (swatches.length > 0) {
    const baseHsl = rgbToHsl(base);
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < swatches.length; i++) {
      const sw = swatches[i] as ScaleSwatch;
      const l = rgbToHsl(sw.rgb).l;
      const diff = Math.abs(l - baseHsl.l);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    const target = swatches[bestIdx] as ScaleSwatch;
    swatches[bestIdx] = { ...target, isBase: true };
  }
  return { swatches, baseRgb: base, valid: true, error: null };
}
