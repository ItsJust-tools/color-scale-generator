# Color Scale Generator

Generate accessible color scales (tints and shades) from a single base color for design systems.

**Live:** [color-scale-generator.itsjust.tools](https://color-scale-generator.itsjust.tools)

## Features

- Input a hex (`#3b82f6`) or RGB (`rgb(59, 130, 246)`) base color via the toolbar picker, sidebar field, or both
- Configurable 10–14 step tonal scales (50–950 style labels)
- WCAG contrast ratio per step against white and black, with pass/fail coloring at 4.5
- Copy hex, RGB, or HSL values with one click from every swatch
- Export the whole scale as CSS variables, a Tailwind palette, or JSON
- Lightness curve presets: material, tailwind, linear, plus a ±20 tweak slider
- Locked contrast targets with automatic step adjustment (darken vs white, lighten vs black)
- Shareable URL state, `.itsjust.json` import/export, and image/PDF export
- 100% client-side — no data ever leaves your browser

## Keyboard shortcuts

| Key           | Action         |
| ------------- | -------------- |
| `Ctrl+Shift+C`| Copy the scale |

## Development

```bash
npm install
npm run dev
```

```bash
npm test        # unit tests with coverage
npm run build   # production build
```

All color math runs locally in your browser; nothing is uploaded.
