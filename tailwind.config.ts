/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './features/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // All colors resolve to runtime CSS vars (lib/theme.ts) — rebranding later
      // means editing ONE preset object, zero class changes.
      colors: {
        graphite: '#1C1C1C',
        silver: '#9EA1A6',
        cream: 'var(--qvek-bg)',
        ink: 'var(--qvek-text)',
        card: 'var(--qvek-card)',
        edge: 'var(--qvek-border)',
        softwhite: 'var(--qvek-text)',
        muted2: 'var(--qvek-text-2)',
        hover: 'var(--qvek-hover)',
      },
    },
  },
  plugins: [],
};
