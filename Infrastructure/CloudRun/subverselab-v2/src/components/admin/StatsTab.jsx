import React, { useState, useEffect } from 'react';

// The Stats tab: orders, accounts, downloads and page views from our own data (GET /api/admin/stats), so it does not depend
// on Google Analytics, which only runs for visitors who accepted the cookie banner. Page views are counted by our own
// cookieless counter and exist only from the day it went live ("Counting since").
const DAY_CHOICES = [7, 30, 90];
const money = (cents) => `$${((Number(cents) || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n) => (Number(n) || 0).toLocaleString('en-US');
const th = { padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: '0.85rem' };
const td = { padding: '10px 12px', fontSize: '0.9rem' };
const right = { textAlign: 'right' };

function Kpi({ label, value, sub, color }) {
  return (
    <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
      <h3 style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>{label}</h3>
      <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: color || 'var(--color-primary)' }}>{value}</div>
      {sub && <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '6px' }}>{sub}</div>}
    </div>
  );
}

function Table({ title, note, head, rows, empty = 'Nothing yet.', minWidth = 420 }) {
  return (
    <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
      <h3 style={{ fontSize: '1.05rem', marginBottom: note ? '4px' : '12px' }}>{title}</h3>
      {note && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: '0 0 12px', lineHeight: '1.5' }}>{note}</p>}
      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            {head.map((h, i) => <th key={h} style={{ ...th, ...(i > 0 ? right : {}) }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} style={{ borderBottom: '1px solid var(--color-border)' }}>
              {r.cells.map((c, i) => <td key={i} style={{ ...td, ...(i > 0 ? right : {}), ...(i === 0 ? { wordBreak: 'break-all' } : {}) }}>{c}</td>)}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={head.length} style={{ ...td, textAlign: 'center', color: 'var(--color-text-muted)' }}>{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// A ranked list with an inline SVG bar behind each row (top paths, top referrers).
function BarList({ title, items, nameKey }) {
  const max = Math.max(1, ...items.map((i) => i.views));
  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <h3 style={{ fontSize: '1.05rem', marginBottom: '12px' }}>{title}</h3>
      {items.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>Nothing counted yet.</p>}
      {items.map((i) => (
        <div key={i[nameKey]} style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.88rem' }}>
            <span style={{ wordBreak: 'break-all' }}>{i[nameKey]}</span>
            <strong>{num(i.views)}</strong>
          </div>
          <svg width="100%" height="6" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 6">
            <rect x="0" y="0" width="100" height="6" rx="3" fill="var(--color-border)" />
            <rect x="0" y="0" width={Math.max(1, (i.views / max) * 100)} height="6" rx="3" fill="var(--color-accent)" />
          </svg>
        </div>
      ))}
    </div>
  );
}

// Visits per day, oldest on the left. The server sends newest first.
function VisitBars({ series }) {
  const days = [...series].reverse();
  const max = Math.max(1, ...days.map((d) => d.visits));
  const w = 600 / days.length;
  return (
    <svg width="100%" height="80" viewBox="0 0 600 80" preserveAspectRatio="none" role="img" aria-label="Visits per day">
      {days.map((d, i) => {
        const h = d.visits ? Math.max(2, (d.visits / max) * 76) : 0;
        return <rect key={d.date} x={i * w + 1} y={78 - h} width={Math.max(1, w - 2)} height={h} fill="var(--color-primary)"><title>{`${d.date}: ${d.visits} visits`}</title></rect>;
      })}
    </svg>
  );
}

export default function StatsTab({ user }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    setLoading(true);
    user.getIdToken()
      .then((token) => fetch(`/api/admin/stats?days=${days}`, { headers: { Authorization: `Bearer ${token}` } }))
      .then(async (r) => { const body = await r.json().catch(() => ({})); if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`); return body; })
      .then((body) => { if (!cancelled) { setData(body); setError(null); } })
      .catch((err) => { if (!cancelled) setError('Stats are unavailable right now: ' + err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, days]);

  const w = data?.orders.window;
  const family = data?.orders.products.find((p) => p.slug === 'family')?.window;
  const buyers = data?.orders.buyers;

  return (
    <>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
        {DAY_CHOICES.map((d) => (
          <button key={d} onClick={() => setDays(d)} className={`btn ${days === d ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: '0.85rem' }}>{d} days</button>
        ))}
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          {loading ? 'Loading...' : data ? `${data.from} to ${data.to} (UTC)` : ''}
        </span>
      </div>

      {error && <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px', color: 'var(--color-text-muted)' }}>{error}</div>}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '16px', marginBottom: '24px' }}>
            <Kpi label="Paid orders" value={num(w.paid)} sub={`${money(w.revenue_cents)} before tax`} />
            <Kpi label="Family orders" value={num(family?.paid)} sub="paid, in this window" color="var(--color-accent)" />
            <Kpi label="Free orders" value={num(w.free)} sub={`${num(w.refunded)} refunded`} color="#ffb347" />
            <Kpi label="New accounts" value={num(data.accounts.new_in_window)} sub={`${num(data.accounts.total)} in total`} color="var(--color-accent)" />
            <Kpi label="Page views" value={num(data.traffic.views)} sub={`${num(data.traffic.visits)} visits`} />
          </div>

          <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--color-text)' }}>{num(buyers.free_and_family)}</strong> e-mail{buyers.free_and_family === 1 ? '' : 's'} took a free plugin (ALEV or TABAN) and bought the family; <strong style={{ color: 'var(--color-text)' }}>{num(buyers.free_first_then_family)}</strong> of them took the free plugin first.
            {' '}{num(buyers.paid_emails)} distinct e-mails paid, {num(buyers.free_emails)} took a free plugin. Orders ever: {num(data.orders.all_time.paid)} paid, {num(data.orders.all_time.free)} free, {num(data.orders.all_time.refunded)} refunded, {money(data.orders.all_time.revenue_cents)}.
            {' '}Page views are counted by our own cookieless counter{data.traffic.tracking_since ? `, counting since ${data.traffic.tracking_since}` : ', which has not counted anything in this window yet'}; earlier days have no view numbers.
          </div>

          <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>Visits per day</h3>
            <VisitBars series={data.series} />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <Table
              title="Per day"
              note="Revenue is what the buyer paid in USD without tax. Visits are the first page of a tab; views are all pages."
              head={['Date', 'Visits', 'Views', 'Sign-ups', 'Paid', 'Free', 'Revenue']}
              minWidth={560}
              rows={data.series.map((d) => ({ key: d.date, cells: [d.date, num(d.visits), num(d.views), num(d.signups), num(d.paid), num(d.free), money(d.revenue_cents)] }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))', gap: '20px', marginBottom: '24px' }}>
            <Table
              title="Per product"
              note="Window / all time."
              head={['Product', 'Paid', 'Free', 'Refunded', 'Revenue']}
              rows={data.orders.products
                .filter((p) => p.all.paid || p.all.free || p.all.refunded)
                .map((p) => ({ key: p.slug, cells: [p.slug, `${num(p.window.paid)} / ${num(p.all.paid)}`, `${num(p.window.free)} / ${num(p.all.free)}`, `${num(p.window.refunded)} / ${num(p.all.refunded)}`, `${money(p.window.revenue_cents)} / ${money(p.all.revenue_cents)}`] }))}
            />
            <Table
              title="Downloads"
              note={`All time, by account. ${num(data.downloads.accounts_any)} accounts downloaded something; ${num(data.downloads.first_per_day.reduce((n, d) => n + d.count, 0))} first-time downloads in this window.`}
              head={['Plugin', 'Mac', 'Windows', 'Accounts']}
              rows={data.downloads.by_product.map((p) => ({ key: p.slug, cells: [p.slug, `${num(p.mac.count)} (${num(p.mac.accounts)})`, `${num(p.win.count)} (${num(p.win.accounts)})`, num(p.accounts)] }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '20px', marginBottom: '24px' }}>
            <BarList title="Top pages" items={data.traffic.paths} nameKey="path" />
            <BarList title="Top referrers" items={data.traffic.refs} nameKey="host" />
            <div className="glass-panel" style={{ padding: '20px', color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: '1.8' }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '12px', color: 'var(--color-text)' }}>Accounts</h3>
              Signed in within 1 day: <strong style={{ color: 'var(--color-text)' }}>{num(data.accounts.active.d1)}</strong><br />
              Within 7 days: <strong style={{ color: 'var(--color-text)' }}>{num(data.accounts.active.d7)}</strong><br />
              Within 30 days: <strong style={{ color: 'var(--color-text)' }}>{num(data.accounts.active.d30)}</strong><br />
              Google: <strong style={{ color: 'var(--color-text)' }}>{num(data.accounts.providers.google)}</strong> · E-mail and password: <strong style={{ color: 'var(--color-text)' }}>{num(data.accounts.providers.password)}</strong> · Other: <strong style={{ color: 'var(--color-text)' }}>{num(data.accounts.providers.other)}</strong>
            </div>
          </div>
        </>
      )}
    </>
  );
}
