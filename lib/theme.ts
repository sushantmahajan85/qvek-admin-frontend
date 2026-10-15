'use client';

// Dynamic Qvek theme system (CR-3).
// - Every color lives here as a preset. To rebrand later, add/edit ONE preset object.
// - Applied via CSS vars on <html data-theme="..."> — Tailwind reads the same vars,
//   so no class changes are needed anywhere when colors change.
// - Persisted in localStorage. Default: light (white), per admin requirement.

import * as React from 'react';

export type ThemeName = 'light' | 'dark';

export interface ThemePreset {
  label: string;
  vars: Record<string, string>;
}

export const THEMES: Record<ThemeName, ThemePreset> = {
  light: {
    label: 'Light',
    vars: {
      '--qvek-bg': '#F7F7F5', // Light Background
      '--qvek-card': '#FFFFFF', // Pure White
      // Borders/hover are Metallic Silver tints — derived, still in-scheme.
      '--qvek-border': 'color-mix(in srgb, #9EA1A6 38%, #FFFFFF)',
      '--qvek-text': '#1C1C1C', // Primary Graphite
      '--qvek-text-2': '#A6A6A6', // Secondary Text
      '--qvek-accent': '#1C1C1C', // Primary Graphite
      '--qvek-accent-text': '#FFFFFF', // Pure White
      '--qvek-hover': 'color-mix(in srgb, #9EA1A6 16%, transparent)',
    },
  },
  dark: {
    label: 'Dark',
    vars: {
      '--qvek-bg': '#111111', // Dark Background
      '--qvek-card': '#1B1B1B', // Dark Card
      '--qvek-border': '#303030', // Dark Border
      '--qvek-text': '#F5F5F5', // Soft White Text
      '--qvek-text-2': '#A6A6A6', // Secondary Text
      '--qvek-accent': '#F5F5F5', // Soft White Text
      '--qvek-accent-text': '#1C1C1C', // Primary Graphite
      '--qvek-hover': 'color-mix(in srgb, #9EA1A6 18%, transparent)',
    },
  },
};

const STORAGE_KEY = 'qvek-theme';

export function resolveTheme(stored: string | null): ThemeName {
  return stored === 'dark' ? 'dark' : 'light';
}

export function applyTheme(name: ThemeName) {
  const root = document.documentElement;
  root.dataset.theme = name;
  root.classList.toggle('dark', name === 'dark');
  const preset = THEMES[name];
  for (const [k, v] of Object.entries(preset.vars)) root.style.setProperty(k, v);
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {
    /* private mode — theme just won't persist */
  }
}

export function useTheme() {
  const [theme, setTheme] = React.useState<ThemeName>('light');
  React.useEffect(() => {
    setTheme(resolveTheme(localStorage.getItem(STORAGE_KEY)));
  }, []);
  const toggle = React.useCallback(() => {
    setTheme((t) => {
      const next: ThemeName = t === 'light' ? 'dark' : 'light';
      applyTheme(next);
      return next;
    });
  }, []);
  return { theme, toggle, setTheme: (t: ThemeName) => { applyTheme(t); setTheme(t); } };
}

// Inline in <head> to apply the saved theme before first paint (no flash).
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('qvek-theme')||'light';var p=${JSON.stringify(
  THEMES,
)}[t]||${JSON.stringify(THEMES.light)};var r=document.documentElement;r.dataset.theme=t;if(t==='dark')r.classList.add('dark');for(var k in p.vars)r.style.setProperty(k,p.vars[k]);}catch(e){}})();`;
