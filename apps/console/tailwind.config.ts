import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        omega: {
          bg: '#0b0d10',
          panel: '#13161b',
          border: '#1f242b',
          text: '#e7e9ec',
          muted: '#8b939d',
          accent: '#6ee7b7',
          warn: '#f59e0b',
          danger: '#ef4444',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
