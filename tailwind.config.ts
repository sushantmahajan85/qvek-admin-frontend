import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './features/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  // The prototype's own reset (styles/base.css) is the baseline, so Tailwind's preflight stays off.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      // Qvek admin palette (CSS variables are defined on `body.admin` in styles/admin.css).
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        primary: 'var(--primary)',
        text: 'var(--text)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        border: 'var(--border)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        info: 'var(--info)',
      },
    },
  },
  plugins: [],
};

export default config;
