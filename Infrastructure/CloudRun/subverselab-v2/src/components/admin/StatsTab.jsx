import React, { useState, useEffect } from 'react';
import { apiUrl } from '../../utils/endpoints';

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

// Visits from the social platforms we post on (stats.js SOCIAL_CHANNELS): the referrer host plus links tagged
// ?utm_source=<channel>, each visit counted once. Every channel is listed, a zero too.
const CHANNEL_NAMES = { youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', soundcloud: 'SoundCloud', mastodon: 'Mastodon',
  bluesky: 'Bluesky', kofi: 'Ko-fi', x: 'X (Twitter)', facebook: 'Facebook', threads: 'Threads', linkedin: 'LinkedIn' };
function SocialList({ items }) {
  const total = items.reduce((n, i) => n + i.visits, 0);
  const tagged = items.reduce((n, i) => n + i.tagged, 0);
  return (
    <div style={{ marginBottom: '24px' }}>
      <BarList
        title={`From social platforms: ${num(total)} visits${tagged ? `, ${num(tagged)} by our tagged links` : ''}`}
        items={items.map((i) => ({ name: `${CHANNEL_NAMES[i.channel] || i.channel}${i.tagged ? ` (${num(i.tagged)} tagged)` : ''}`, views: i.visits }))}
        nameKey="name"
      />
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
      .then((token) => fetch(apiUrl(`/api/admin/stats?days=${days}`), { headers: { Authorization: `Bearer ${token}` } }))
      .then(async (r) => { const body = await r.json().catch(() => ({})); if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`); return body; })
      .then((body) => { if (!cancelled) { setData(body); setError(null); } })
      .catch((err) => { if (!cancelled) setError('Stats are unavailable right now: ' + err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, days]);

  const w = data?.orders.window;
  const buyers = data?.orders.buyers;
  const sold = (data?.orders.products || [])
    .filter((p) => p.all.paid || p.all.free || p.all.refunded)
    .sort((a, b) => b.window.revenue_cents - a.window.revenue_cents || b.all.revenue_cents - a.all.revenue_cents);

  return (
    <>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
        {DAY_CHOICES.map((d) => (
          <button key={d} onClick={() => setDays(d)} className={`btn ${days === d ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: '0.85rem' }}>Last {d} days</button>
        ))}
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          {loading ? 'Loading...' : data ? `${data.from} to ${data.to} (UTC)` : ''}
        </span>
      </div>

      {error && <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px', color: 'var(--color-text-muted)' }}>{error}</div>}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '16px', marginBottom: '24px' }}>
            <Kpi label="Money in" value={money(w.revenue_cents)} sub={`${num(w.paid)} paid order${w.paid === 1 ? '' : 's'}, net of tax`} />
            <Kpi label="Free downloads ordered" value={num(w.free)} sub={w.refunded ? `${num(w.refunded)} refunded` : 'no refunds'} color="var(--color-gold)" />
            <Kpi label="Visits" value={num(data.traffic.visits)} sub={`${num(data.traffic.buy_clicks)} Buy clicks`} color="var(--color-accent)" />
            <Kpi label="New accounts" value={num(data.accounts.new_in_window)} sub={`${num(data.accounts.active.d7)} seen in 7 days`} color="var(--color-accent)" />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <Table
              title="What sold"
              note="This window first, all time after the slash. Money is what the buyer paid in USD without tax."
              head={['Product', 'Paid', 'Free', 'Money']}
              rows={sold.map((p) => ({ key: p.slug, cells: [p.slug.toUpperCase(), `${num(p.window.paid)} / ${num(p.all.paid)}`, `${num(p.window.free)} / ${num(p.all.free)}`, `${money(p.window.revenue_cents)} / ${money(p.all.revenue_cents)}`] }))}
              empty="No orders yet."
            />
          </div>

          <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>Visits per day</h3>
            <VisitBars series={data.series} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '20px', marginBottom: '24px' }}>
            <BarList title="Top pages" items={data.traffic.paths} nameKey="path" />
            <BarList title="Where visitors came from" items={data.traffic.refs} nameKey="host" />
          </div>

          {data.traffic.social && <SocialList items={data.traffic.social} />}

          <details className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>More detail: per day, downloads, Buy clicks, buyers</summary>
            <div style={{ marginTop: '16px', display: 'grid', gap: '20px' }}>
              <Table
                title="Per day"
                note="Visits are the first page of a tab; views are all pages."
                head={['Date', 'Visits', 'Views', 'Buy clicks', 'Sign-ups', 'Paid', 'Free', 'Money']}
                minWidth={620}
                rows={data.series.map((d) => ({ key: d.date, cells: [d.date, num(d.visits), num(d.views), num(d.buy_clicks), num(d.signups), num(d.paid), num(d.free), money(d.revenue_cents)] }))}
              />
              <Table
                title="Downloads"
                note={`All time; the number in brackets is accounts. ${num(data.downloads.accounts_any)} accounts downloaded something.`}
                head={['Plugin', 'Mac', 'Windows', 'Accounts']}
                rows={data.downloads.by_product.map((p) => ({ key: p.slug, cells: [p.slug.toUpperCase(), `${num(p.mac.count)} (${num(p.mac.accounts)})`, `${num(p.win.count)} (${num(p.win.accounts)})`, num(p.accounts)] }))}
              />
              <Table
                title="Buy clicks"
                note={'A click opens the checkout; the order may or may not follow. "Opening seen" = the homepage opening was shown in that tab.'}
                head={['Product', 'Page', 'Place', 'Opening seen', 'Clicks']}
                minWidth={520}
                empty="No Buy clicks counted yet."
                rows={(data.traffic.buys || []).map((b) => ({ key: `${b.slug}|${b.path}|${b.place}|${b.intro}`, cells: [b.slug.toUpperCase(), b.path, b.place, b.intro ? 'yes' : 'no', num(b.clicks)] }))}
              />
              <Table
                title={`Sample pack preview plays (${num(data.traffic.preview_plays || 0)})`}
                note="One play = a preview started once on a page load (a pause and resume is not counted again). Card = the play key on /sample-packs, Page = the preview on a pack page, SoundCloud = the playlist under the grid (also counted on SoundCloud)."
                head={['Pack', 'Card', 'Page', 'SoundCloud', 'Total']}
                minWidth={480}
                empty="No preview plays counted yet."
                rows={(data.traffic.previews || []).map((p) => ({ key: p.slug, cells: [p.slug, num(p.card), num(p.page), num(p.soundcloud), num(p.total)] }))}
              />
              <Table
                title="Buy clicks by where the visit came from"
                note={'The channel of the tab\'s first page: a social link tag (?utm_source) or the referring site; "direct" = no referrer, "other" = another site, "unknown" = clicks counted before 6 Nov 2026 tracking.'}
                head={['Came from', 'Buy clicks', 'Products']}
                minWidth={480}
                empty="No Buy clicks with a source yet."
                rows={(data.traffic.buy_via || []).map((r) => ({ key: r.channel, cells: [r.channel, num(r.clicks), Object.entries(r.products).sort((x, y) => y[1] - x[1]).map(([k, n]) => `${k.toUpperCase()} ${n}`).join(', ')] }))}
              />
              <Table
                title="Footer social icon clicks"
                note="Clicks on the social icons at the bottom of every page (people leaving to follow us)."
                head={['Channel', 'Clicks']}
                minWidth={320}
                empty="No social icon clicks yet."
                rows={(data.traffic.social_out || []).map((r) => ({ key: r.channel, cells: [r.channel, num(r.clicks)] }))}
              />
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', lineHeight: '1.7', margin: 0 }}>
                {num(buyers.paid_emails)} e-mails have paid, {num(buyers.free_emails)} took a free plugin; {num(buyers.free_and_family)} took a free plugin and bought the 7-plugin bundle ({num(buyers.free_first_then_family)} free first).
                {' '}All time: {num(data.orders.all_time.paid)} paid, {num(data.orders.all_time.free)} free, {num(data.orders.all_time.refunded)} refunded, {money(data.orders.all_time.revenue_cents)}.
                {' '}Accounts seen within 1 / 7 / 30 days: {num(data.accounts.active.d1)} / {num(data.accounts.active.d7)} / {num(data.accounts.active.d30)}. Google {num(data.accounts.providers.google)}, e-mail {num(data.accounts.providers.password)}, other {num(data.accounts.providers.other)}.
                {' '}Page views come from our own cookieless counter{data.traffic.tracking_since ? `, counting since ${data.traffic.tracking_since}` : ''}.
              </p>
            </div>
          </details>
        </>
      )}
    </>
  );
}
