import { useState, useCallback } from 'react';

export type ThemeId = 'basic' | 'blue' | 'orange';

const STORAGE_KEY = 'kiosk-theme';

function getInitialTheme(): ThemeId {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'basic' || saved === 'blue' || saved === 'orange') return saved;
  return 'blue';
}

export default function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const initial = getInitialTheme();
    document.documentElement.dataset.theme = initial;
    return initial;
  });

  const setTheme = useCallback((t: ThemeId) => {
    document.documentElement.dataset.theme = t;
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  }, []);

  return { theme, setTheme } as const;
}
