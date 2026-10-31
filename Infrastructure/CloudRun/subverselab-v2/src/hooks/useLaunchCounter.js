import { useEffect, useState } from 'react';
import { apiUrl } from '../utils/endpoints';

// The one reader of GET /api/launch/codes?launch=<id> → {total, claimed}.
// Returns the counter, or null while loading and whenever it cannot be read
// (non-OK answer, {available:false}, network error). Launch-1 callers treat
// null as "free quota gone" (useLaunch1Full below).
export function useLaunchCounter(launchId = 'launch') {
  const [codes, setCodes] = useState(null);
  useEffect(() => {
    let alive = true;
    if (!launchId) return undefined;   // a caller that must not read any counter (/launch2) passes null
    fetch(apiUrl(`/api/launch/codes?launch=${launchId}`))
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((body) => { if (alive) setCodes(body); })
      .catch(() => { if (alive) setCodes({ available: false }); });
    return () => { alive = false; };
  }, [launchId]);
  const known = codes && codes.available !== false && Number.isInteger(codes.claimed) && Number.isInteger(codes.total);
  return known ? codes : null;
}

// The free 1,000 of launch 1 are gone (1,000 / 1,000 on 2026-10-04, and a claimed
// seat is never given back). True when the counter says so AND while it cannot be
// read: no page may lead with "free" on a failed or slow request.
export function useLaunch1Full() {
  const codes = useLaunchCounter('launch');
  return !codes || codes.claimed >= codes.total;
}
