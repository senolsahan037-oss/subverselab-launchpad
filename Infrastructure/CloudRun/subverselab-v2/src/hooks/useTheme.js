import { useCallback, useEffect, useState } from 'react';

const KEY = 'subverselab-theme';

// Three states, not two: 'light' and 'dark' are explicit choices stored on the
// <html> element, and null means "follow the system", which is the default and
// is resolved by prefers-color-scheme in CSS. The inline script in index.html
// applies a stored choice before first paint; this hook only has to keep the
// attribute and storage in step afterwards.
function readStored() {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'dark' || t === 'light' ? t : null;
  } catch {
    return null;
  }
}

function systemPrefersDark() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

export default function useTheme() {
  const [choice, setChoice] = useState(readStored);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (choice) root.setAttribute('data-theme', choice);
    else root.removeAttribute('data-theme');
    try {
      if (choice) localStorage.setItem(KEY, choice);
      else localStorage.removeItem(KEY);
    } catch {}
  }, [choice]);

  const isDark = choice ? choice === 'dark' : systemDark;

  // Toggling always writes an explicit choice — someone who deliberately
  // flips the switch wants that theme kept, not overridden the next time
  // their OS changes.
  const toggle = useCallback(() => setChoice(isDark ? 'light' : 'dark'), [isDark]);

  return { isDark, toggle };
}
