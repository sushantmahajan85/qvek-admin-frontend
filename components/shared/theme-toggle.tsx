'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      onClick={toggle}
      className="rounded-md border border-edge p-2 hover:bg-hover"
    >
      {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}
