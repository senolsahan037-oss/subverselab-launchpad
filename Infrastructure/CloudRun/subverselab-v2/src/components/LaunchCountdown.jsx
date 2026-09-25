import React, { useEffect, useState } from 'react';
import { RELEASE_AT } from '../data/plugins';

// Days / hours / minutes to the plugins' release (both ship at the same
// moment). After the moment passes it says so instead of counting into
// negative numbers.
const pad = (n) => String(n).padStart(2, '0');

function remaining(target) {
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return null;
  const m = Math.floor(ms / 60000);
  return { d: Math.floor(m / 1440), h: Math.floor((m % 1440) / 60), m: m % 60 };
}

export default function LaunchCountdown({ compact = false, target = RELEASE_AT }) {
  const [left, setLeft] = useState(() => remaining(target));

  useEffect(() => {
    const tick = () => setLeft(remaining(target));
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [target]);

  if (!left) {
    return <span className="plugin-count plugin-count-out">Out now</span>;
  }
  if (compact) {
    return <span className="plugin-count">{left.d}d {pad(left.h)}h {pad(left.m)}m</span>;
  }
  return (
    <div className="plugin-count-grid" aria-label={`${left.d} days, ${left.h} hours, ${left.m} minutes until release`}>
      {[[left.d, 'days'], [pad(left.h), 'hours'], [pad(left.m), 'min']].map(([v, l]) => (
        <div key={l} className="plugin-count-cell">
          <span className="plugin-count-num">{v}</span>
          <span className="plugin-count-label">{l}</span>
        </div>
      ))}
    </div>
  );
}
