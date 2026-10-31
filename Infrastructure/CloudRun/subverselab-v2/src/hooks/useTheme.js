import { useCallback, useEffect, useState } from 'react';

const KEY = 'subverselab-theme';

// Light is the default for everyone (owner 2026-10-22); dark is only ever an
// explicit choice, stamped on <html> as data-theme="dark" and kept in storage.
// The inline script in index.html applies a stored choice before first paint;
// this hook only has to keep the attribute and storage in step afterwards.
function readStored() {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'dark' || t === 'light' ? t : null;
  } catch {
    return null;
  }
}

export default function useTheme() {
  const [choice, setChoice] = useState(readStored);
  useEffect(() => {
    const root = document.documentElement;
    if (choice) root.setAttribute('data-theme', choice);
    else root.removeAttribute('data-theme');
    try {
      if (choice) localStorage.setItem(KEY, choice);
      else localStorage.removeItem(KEY);
    } catch {}
  }, [choice]);

  const isDark = choice === 'dark';

  // Toggling always writes an explicit choice, so a deliberate dark stays dark.
  const toggle = useCallback(() => setChoice(isDark ? 'light' : 'dark'), [isDark]);

  return { isDark, toggle };
}
