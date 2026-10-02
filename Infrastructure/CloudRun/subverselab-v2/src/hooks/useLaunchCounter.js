import { useEffect, useState } from 'react';

// The one reader of GET /api/launch/codes?launch=<id> → {total, claimed}.
// Returns the counter, or null while loading and whenever it cannot be read
// (non-OK answer, {available:false}, network error): callers keep the free
// wording on null, so no price is ever shown on a guess.
export function useLaunchCounter(launchId = 'launch') {
  const [codes, setCodes] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/launch/codes?launch=${launchId}`)
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((body) => { if (alive) setCodes(body); })
      .catch(() => { if (alive) setCodes({ available: false }); });
    return () => { alive = false; };
  }, [launchId]);
  const known = codes && codes.available !== false && Number.isInteger(codes.claimed) && Number.isInteger(codes.total);
  return known ? codes : null;
}

// True only when the counter was read and the free 1,000 of launch 1 are gone.
export function useLaunch1Full() {
  const codes = useLaunchCounter('launch');
  return !!codes && codes.claimed >= codes.total;
}
