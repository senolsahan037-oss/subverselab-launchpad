import React, { useMemo, useState } from 'react';

// The Members tab: one row per person (an account, or a buyer who never made one), searchable, with what they bought.
// "Last seen" is Firebase Auth's lastRefreshTime (server.js): lastSignInTime only moves on an explicit sign-in, so a
// member who stays signed in looked like they had not been back for weeks.
const DAY_MS = 24 * 60 * 60 * 1000;
const NAMES = { ru8: 'RU-8', jingfang: 'JING FANG', family: '7-plugin bundle' };
const productName = (slug) => NAMES[slug] || String(slug || '').toUpperCase();
const money = (cents) => `$${((Number(cents) || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ms = (v) => { const t = v ? new Date(v).getTime() : NaN; return Number.isNaN(t) ? null : t; };
const date = (v) => (ms(v) == null ? '—' : new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
const dateTime = (v) => (ms(v) == null ? '—' : new Date(v).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }));
function ago(v, now) {
  const t = ms(v);
  if (t == null) return '—';
  const m = Math.max(0, Math.round((now - t) / 60000));
  if (m < 60) return m <= 1 ? 'just now' : `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

const FILTERS = [
  { key: 'all', label: 'Everyone' },
  { key: 'buyers', label: 'Paid' },
  { key: 'free', label: 'Free only' },
  { key: 'guests', label: 'No account' },
];
const SORTS = [
  { key: 'seen', label: 'Last seen' },
  { key: 'spent', label: 'Spent' },
  { key: 'joined', label: 'Joined' },
];

const th = { padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 600, textAlign: 'left' };
const td = { padding: '10px 12px', fontSize: '0.9rem', verticalAlign: 'top' };

function Number_({ label, value }) {
  return (
    <div style={{ minWidth: '110px' }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary)' }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{label}</div>
    </div>
  );
}

function Chip({ p }) {
  const muted = p.kind !== 'paid';
  return (
    <span style={{
      display: 'inline-block', margin: '0 6px 6px 0', padding: '2px 8px', borderRadius: '999px', fontSize: '0.78rem',
      border: '1px solid var(--color-border)', color: muted ? 'var(--color-text-muted)' : 'var(--color-text)',
      textDecoration: p.kind === 'refunded' ? 'line-through' : 'none',
    }}>
      {productName(p.product)}{p.kind === 'paid' ? ` ${money(p.cents)}` : p.kind === 'free' ? ' free' : ' refunded'}
    </span>
  );
}

export default function MembersTab({ members, error }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('seen');
  const [open, setOpen] = useState(null);
  const now = Date.now();

  const counts = useMemo(() => {
    const accounts = members.filter((m) => m.hasAccount !== false);
    return {
      accounts: accounts.length,
      seen7: accounts.filter((m) => now - (ms(m.lastActiveAt || m.lastSignInAt) ?? 0) <= 7 * DAY_MS).length,
      new30: accounts.filter((m) => now - (ms(m.createdAt) ?? 0) <= 30 * DAY_MS).length,
      buyers: members.filter((m) => (m.purchases || []).some((p) => p.kind === 'paid')).length,
      revenue: members.reduce((n, m) => n + (m.spentCents || 0), 0),
    };
    // now is read once per render; the counts only need to follow the list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = members.filter((m) => {
      const bought = m.purchases || [];
      if (filter === 'buyers' && !bought.some((p) => p.kind === 'paid')) return false;
      if (filter === 'free' && (bought.length === 0 || bought.some((p) => p.kind === 'paid'))) return false;
      if (filter === 'guests' && m.hasAccount !== false) return false;
      if (!q) return true;
      return [m.email, m.displayName, ...bought.map((p) => productName(p.product))].some((s) => String(s || '').toLowerCase().includes(q));
    });
    const key = {
      seen: (m) => ms(m.lastActiveAt || m.lastSignInAt) ?? ms(m.purchases?.[0]?.at) ?? 0,
      spent: (m) => m.spentCents || 0,
      joined: (m) => ms(m.createdAt) ?? 0,
    }[sort];
    return list.sort((a, b) => key(b) - key(a));
  }, [members, query, filter, sort]);

  return (
    <>
      <div className="glass-panel" style={{ padding: '18px 22px', marginBottom: '18px', display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
        <Number_ label="accounts" value={counts.accounts} />
        <Number_ label="seen in 7 days" value={counts.seen7} />
        <Number_ label="new in 30 days" value={counts.new30} />
        <Number_ label="people who paid" value={counts.buyers} />
        <Number_ label="paid, all time (net of tax)" value={money(counts.revenue)} />
      </div>

      {error && <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px', color: 'var(--color-text-muted)' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
        <input
          type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search e-mail, name or product"
          aria-label="Search members"
          style={{ flex: '1 1 260px', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface, transparent)', color: 'var(--color-text)', fontSize: '0.95rem' }}
        />
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={`btn ${filter === f.key ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: '0.82rem', padding: '6px 12px' }}>{f.label}</button>
        ))}
        <label style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
          Sort{' '}
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface, transparent)', color: 'var(--color-text)' }}>
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>{rows.length} of {members.length}</div>

      <div className="glass-panel" style={{ padding: '6px 10px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th style={th}>Person</th>
              <th style={th}>Last seen</th>
              <th style={th}>Bought</th>
              <th style={{ ...th, textAlign: 'right' }}>Spent</th>
              <th style={{ ...th, textAlign: 'right' }}>Downloads</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const id = m.uid || m.email;
              const isOpen = open === id;
              const seen = m.lastActiveAt || m.lastSignInAt;
              return (
                <React.Fragment key={id}>
                  <tr onClick={() => setOpen(isOpen ? null : id)} style={{ borderBottom: isOpen ? 'none' : '1px solid var(--color-border)', cursor: 'pointer' }}>
                    <td style={{ ...td, wordBreak: 'break-all' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{m.email || '(no e-mail)'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        {m.hasAccount === false ? 'bought without an account' : [m.displayName, `joined ${date(m.createdAt)}`].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td style={td} title={dateTime(seen)}>{m.hasAccount === false ? '—' : ago(seen, now)}</td>
                    <td style={td}>{(m.purchases || []).length ? m.purchases.map((p, i) => <Chip key={i} p={p} />) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: m.spentCents ? 600 : 400 }}>{m.spentCents ? money(m.spentCents) : '—'}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{m.downloads || 0}</td>
                  </tr>
                  {isOpen && (
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td colSpan="5" style={{ ...td, paddingTop: 0, color: 'var(--color-text-muted)', fontSize: '0.84rem' }}>
                        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
                          <div>
                            <div>Joined: {dateTime(m.createdAt)}</div>
                            <div>Last seen: {dateTime(seen)}</div>
                            <div>Last explicit sign-in: {dateTime(m.lastSignInAt)}</div>
                            <div>Sign-in: {m.provider === 'google.com' ? 'Google' : m.provider === 'password' ? 'E-mail' : m.provider || '—'}</div>
                          </div>
                          <div>
                            {(m.purchases || []).map((p, i) => (
                              <div key={i}>{date(p.at)} · {productName(p.product)} · {p.kind === 'paid' ? money(p.cents) : p.kind}</div>
                            ))}
                            {!(m.purchases || []).length && <div>No orders.</div>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan="5" style={{ ...td, textAlign: 'center', color: 'var(--color-text-muted)', padding: '28px' }}>{members.length ? 'Nobody matches.' : 'No members yet.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
