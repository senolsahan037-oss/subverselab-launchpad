import React from 'react';
import { formatDay } from '../../data/plugins';
import { apiUrl } from '../../utils/endpoints';

// Shared by the public /testers page and the tester space (TesterSpace.jsx, shown on /account for a tester).
export const OS_LIST = ['macOS Apple Silicon', 'macOS Intel', 'Windows 11', 'Windows 10'];
export const dayOf = (iso) => formatDay(String(iso || '').slice(0, 10));

export async function api(user, path, body) {
  const token = await user.getIdToken();
  const r = await fetch(apiUrl(path), {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

export function Field({ id, label, hint, children }) {
  return (
    <div className="input-group">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <small style={{ color: 'var(--color-text-muted)' }}>{hint}</small>}
    </div>
  );
}
