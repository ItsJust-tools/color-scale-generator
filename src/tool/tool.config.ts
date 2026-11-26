import type { ToolConfig } from '@itsjust/core';

export const toolConfig = {
  id: 'color-scale-generator',
  name: 'Color Scale Generator',
  description:
    'Generate accessible color scales (tints and shades) from a single base color for design systems.',
  version: '1.0.0',
  exportFormats: ['json', 'png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#0ea5e9',
    accentHover: '#0284c7',
    accentSubtle: 'rgba(14, 165, 233, 0.08)',
    brand: 'Color Scale Generator',
    icon: '🎨',
  },
  shortcuts: [
    {
      title: 'Color Scale Generator',
      shortcuts: [
        {
          keys: 'Ctrl+Shift+C',
          label: 'Copy scale',
          description: 'copy the whole generated scale summary',
        },
      ],
    },
  ],
} satisfies ToolConfig;

export default toolConfig;
