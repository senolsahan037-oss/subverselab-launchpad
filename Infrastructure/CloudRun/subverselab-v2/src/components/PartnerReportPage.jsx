import React, { useEffect, useState } from 'react';
import PageMeta from './PageMeta';
import { apiUrl } from '../utils/endpoints';
import { pluginBySlug, FAMILY_NAME } from '../data/plugins';

// /partners/report#<token>: an affiliate partner's own sales (api/partners.js, GET /api/partner-report). The token is in the
// URL fragment, which the browser never sends to any server, and goes to the API only in the Authorization header.
// Private: not in the sitemap, noindex (here, server.js X-Robots-Tag, robots.txt).

const panelStyle = { background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', borderRadius: 'var(--radius-lg)', padding: '24px 24px 16px', marginBottom: 24 };
const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const productName = (slug) => (slug === 'family' ? FAMILY_NAME : pluginBySlug(slug)?.displayName || String(slug || '—'));
const monthName = (m) => {
  const [y, mo] = String(m).split('-').map(Number);
  if (!y || !mo) return m;
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};
const day = (iso) => (iso ? String(iso).slice(0, 10) : '—');

export default function PartnerReportPage() {
  const [token] = useState(() => (typeof window !== 'undefined' ? decodeURIComponent(window.location.hash.replace(/^#/, '')).trim() : ''));
  // state: loading | ready | denied | error
  const [state, setState] = useState(token ? 'loading' : 'denied');
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    fetch(apiUrl('/api/partner-report'), { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then(async (r) => {
        if (!alive) return;
        if (r.status === 401) { setState('denied'); return; }
        const body = await r.json().catch(() => null);
        if (r.ok && body) { setData(body); setState('ready'); } else setState('error');
      })
      .catch(() => alive && setState('error'));
    return () => { alive = false; };
  }, [token]);

  let content;
  if (state === 'loading') content = <div style={panelStyle} role="status"><p>Loading your report…</p></div>;
  else if (state === 'denied') {
    content = (<div style={panelStyle}><h1 style={{ marginTop: 0 }}>Partner report</h1>
      <p>This link is not valid. Open the report with the full link SubverseLab sent you, or ask us for a new one.</p></div>);
  } else if (state === 'error') {
    content = (<div style={panelStyle}><h1 style={{ marginTop: 0 }}>Partner report</h1>
      <p>The report did not load. Wait a moment and reload this page.</p></div>);
  } else {
    const { partner, sales = [], months = [] } = data;
    content = (<>
      <div style={panelStyle}>
        <h1 style={{ marginTop: 0 }}>{partner.name}: sales report</h1>
        <p>Commission {partner.commissionPct}% of the price without tax{partner.discountCode ? <>; reader code <strong>{partner.discountCode}</strong></> : null}. Refunded orders are listed but not counted.</p>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Sales through your link: Lemon Squeezy pays the commission into your Lemon Squeezy affiliate account.<br />
          Sales with only your discount code: SubverseLab pays the commission to you once a month.
        </p>
      </div>
      <div style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>By month</h2>
        {months.length ? (
          <div className="manual-table-wrap"><table className="manual-table">
            <thead><tr><th>Month</th><th>Orders</th><th>Sales</th><th>Commission</th><th>Paid by Lemon Squeezy</th><th>Paid by SubverseLab</th></tr></thead>
            <tbody>{months.map((m) => (
              <tr key={m.month}><th scope="row">{monthName(m.month)}</th><td>{m.orders}</td><td>{money(m.amountUsd)}</td><td>{money(m.commissionUsd)}</td><td>{money(m.paidByLemonSqueezyUsd)}</td><td>{money(m.owedBySubverselabUsd)}</td></tr>
            ))}</tbody>
          </table></div>
        ) : <p>No sales yet.</p>}
      </div>
      <div style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>Every sale</h2>
        {sales.length ? (
          <div className="manual-table-wrap"><table className="manual-table">
            <thead><tr><th>Date</th><th>Product</th><th>Sale</th><th>Commission</th><th>Through</th><th>Paid by</th></tr></thead>
            <tbody>{sales.map((s, i) => (
              <tr key={`${s.date}-${i}`} style={s.refunded ? { textDecoration: 'line-through' } : undefined}>
                <th scope="row">{day(s.date)}</th><td>{productName(s.product)}{s.refunded ? ' (refunded)' : ''}</td><td>{money(s.amountUsd)}</td><td>{money(s.commissionUsd)}</td>
                <td>{s.source === 'link' ? 'Your link' : 'Your code'}</td><td>{s.paidBy === 'lemonsqueezy' ? 'Lemon Squeezy' : 'SubverseLab'}</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <p>No sales yet.</p>}
      </div>
    </>);
  }

  return (
    <div className="container" style={{ padding: '56px 20px 96px' }}>
      <PageMeta title="Partner report | SubverseLab" noIndex />
      {content}
    </div>
  );
}
