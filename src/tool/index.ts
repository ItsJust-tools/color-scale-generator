export { default as toolConfig } from './tool.config';
export { templateBaseVersion } from './template-metadata';
export { templateMetadata, getPublicSiteUrl } from './template-metadata';
export {
  colorScaleGeneratorTool,
  serializeState,
  deserializeState,
  withHistory,
  roundTrips,
  resultText,
} from './tool-definition';
export { Canvas } from './components/Canvas';
export { Sidebar } from './components/Sidebar';
export { Toolbar } from './components/Toolbar';
export { CURVE_LABELS, isState } from './ui-shared';
export {
  DEFAULT_STATE,
  MAX_HISTORY,
  CURVE_PRESETS,
  CURVES,
  SCALE_STEPS,
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
  resultText as scaleResultText,
} from './types';
export { exportCssVariables, exportTailwind, exportJson } from './exporters/scale';
export type { CurvePreset, HistoryEntry, ScaleSwatch, ToolState } from './types';
