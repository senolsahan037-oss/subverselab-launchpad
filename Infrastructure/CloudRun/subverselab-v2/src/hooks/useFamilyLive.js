import { useEffect, useState } from 'react';
import { FAMILY_STARTS_AT, isFamilyLive } from '../data/plugins';

// True from FAMILY_STARTS_AT on (the family offer replaces the $15 Kubbe + Kaset
// bundle). Decided in the visitor's browser at render time, and flips by itself
// at the moment if the page is open then.
export function useFamilyLive() {
  const [live, setLive] = useState(() => isFamilyLive());
  useEffect(() => {
    if (live) return undefined;
    const wait = Date.parse(FAMILY_STARTS_AT) - Date.now();
    if (wait <= 0) { setLive(true); return undefined; }
    if (wait > 2147483000) return undefined; // setTimeout limit (~24 days)
    const t = setTimeout(() => setLive(true), wait + 50);
    return () => clearTimeout(t);
  }, [live]);
  return live;
}
