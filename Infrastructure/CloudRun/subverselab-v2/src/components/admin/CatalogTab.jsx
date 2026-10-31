import React, { useEffect, useMemo, useState } from 'react';
import { KINDS, KIND_LABELS, FIELDS, latestOf } from '../../../api/catalogSchema.js';
import CatalogEditor from './CatalogEditor';
import { catalogGet, catalogPost, uploadSoldFile, formatBytes } from './catalogApi';
import { refreshCatalog } from '../../catalog/catalog';
import { liveNews } from '../../data/news';
import { ROOM_PLUGINS, PRICES, CHECKOUT, LAUNCH_PRICES, LAUNCH_ENDS } from '../../data/plugins';
import { visiblePacks } from '../../data/packFacts';
import { PRESET_PACK_LIST } from '../../data/presetPacks';
import { PACK_PRICES, PACK_CHECKOUT } from '../../data/samplePackPrices';
import { PRODUCT_DATES } from '../../data/productDates';

/* The Catalogue tab (owner 2026-10-31: "yeni bir ürün, haber ya da sample paketi yükleyeceğimiz zaman panel üzerinden manuel
   ekleyeceğiz; yeni bir şey çıktığında bütün siteyi yeniden deploy etmek zorunda kalmayacağız").
   Four lists (news, plug-ins, sample packs, preset packs) and the sold files. Each list shows the items that are in the code
   (static, from src/data) and the live items (Firestore, through the API). A live item with a static id edits that item;
   a new id is a new product or frame. Saved items reach the site within a minute (GET /api/catalog is cached 60 s). */

const th = { padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: '0.8rem', textAlign: 'left', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' };
const td = { padding: '10px 12px', fontSize: '0.9rem', borderBottom: '1px solid var(--color-border)', verticalAlign: 'top' };
const pill = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 700, background: bg, color: 'var(--color-text)' });

// What the code already has, so the owner sees the whole store in one list and can edit a static item by its id.
function staticRows(kind) {
  if (kind === 'news') return liveNews().map((n, i) => ({ id: n.key, name: n.title, sub: n.kicker, order: (i + 1) * 10, prefill: { id: n.key, kicker: n.kicker, dateLabel: n.date || '', title: n.title, line: n.line, image: n.image, alt: n.alt || '', to: n.to || '', cta: n.cta || '', bare: n.bare === 'flat' ? 'flat' : n.bare ? 'bare' : '', order: (i + 1) * 10 } }));
  if (kind === 'plugins') return ROOM_PLUGINS.map((p) => ({ id: p.slug, name: p.displayName, sub: p.kind, date: latestOf(PRODUCT_DATES[p.slug]), prefill: { id: p.slug, displayName: p.displayName, kind: p.kind, model: p.model || '', tagline: p.tagline, price: PRICES[p.slug] ?? null, checkout: CHECKOUT[p.slug] || '', launchPrice: LAUNCH_PRICES[p.slug] ?? null, launchEnds: LAUNCH_ENDS[p.slug] || '', free: Boolean(p.free), released: PRODUCT_DATES[p.slug]?.released || '', updated: PRODUCT_DATES[p.slug]?.updated || '', cardImage: p.cardImage, intro: p.intro } }));
  if (kind === 'samplePacks') return visiblePacks().map((p) => ({ id: p.slug, name: p.name, sub: p.kindLine, date: latestOf(PRODUCT_DATES[p.slug]), prefill: { id: p.slug, name: p.name, fullName: p.fullName, kindLine: p.kindLine, price: PACK_PRICES[p.slug] ?? null, checkout: PACK_CHECKOUT[p.slug] || '', cover: p.cover?.jpg || '', snippet: p.snippet?.src || '', released: PRODUCT_DATES[p.slug]?.released || '', updated: PRODUCT_DATES[p.slug]?.updated || '', listedAt: PRODUCT_DATES[p.slug]?.released ? `${PRODUCT_DATES[p.slug].released}T00:00:00+03:00` : '' } }));
  if (kind === 'presetPacks') return PRESET_PACK_LIST.map((p) => ({ id: p.id, name: p.name, sub: p.kind, date: latestOf(PRODUCT_DATES[p.id]), prefill: { id: p.id, name: p.name, kind: p.kind, cover: p.cover, image: p.image, imageAlt: p.imageAlt, summary: p.summary, inside: p.inside, requirements: p.requirements, install: p.install, download: p.download, free: Boolean(p.free), price: PACK_PRICES[p.id] ?? null, checkout: PACK_CHECKOUT[p.id] || '', released: PRODUCT_DATES[p.id]?.released || '', updated: PRODUCT_DATES[p.id]?.updated || '' } }));
  return [];
}

const WHAT_A_LIVE_EDIT_DOES = {
  news: 'A live item with a static key replaces that frame’s words, picture, link and order, or hides it (Published off). A new key is a new frame.',
  plugins: 'For a plug-in that is in the code, a live item sets its price, checkout, launch price, release dates and MuseHub link; its room stays as written. A new slug is a new product with its own room at /plugins/<slug>.',
  samplePacks: 'For a pack the importer knows, a live item sets its words, cover, preview, price, checkout and dates, or hides it. A new slug is a new pack at /sample-packs/<slug>: sold from the day in "On sale from", downloadable once its zip is published under Files.',
  presetPacks: 'For a pack in the code, a live item sets its words, pictures, price, checkout and dates, or hides it. A new id is a new pack on /preset-packs; its zip is published under Files.',
  publishers: 'Producers, labels and studios whose products the site sells. A product points at a publisher by its id (the Publisher field) and the pages print "by <name>". The e-mail stays private. Ended: nothing new points at it, existing products keep the name.',
};

function nameOf(kind, d) {
  return kind === 'news' ? d.title : kind === 'plugins' ? d.displayName : d.name;
}
const subOf = (kind, d) => (kind === 'news' ? d.kicker : kind === 'publishers' ? [d.role, d.location].filter(Boolean).join(' · ') : d.kind || d.kindLine || '');
function status(d, now) {
  if (d.published === false) return ['Hidden', 'var(--tint-soft)'];
  if (d.publishAt && Date.parse(d.publishAt) > now) return [`From ${d.publishAt.slice(0, 10)}`, 'var(--tint-softer)'];
  if (d.unpublishAt && Date.parse(d.unpublishAt) <= now) return ['Ended', 'var(--tint-soft)'];
  return ['Live', 'rgba(42,157,143,0.18)'];
}

function FilesPanel({ user, manifest, slugs, onChanged }) {
  const [form, setForm] = useState({ slug: '', version: '1.0.0', platform: 'zip', file: null });
  const [state, setState] = useState({ busy: false, progress: 0, msg: '', error: '' });
  const entries = Object.entries(manifest || {}).sort(([a], [b]) => a.localeCompare(b));
  const go = async (e) => {
    e.preventDefault();
    if (!form.file) { setState((s) => ({ ...s, error: 'Choose the file first.' })); return; }
    setState({ busy: true, progress: 0, msg: '', error: '' });
    try {
      const out = await uploadSoldFile(user, { slug: form.slug.trim().toLowerCase(), version: form.version.trim(), platform: form.platform, file: form.file, onProgress: (p) => setState((s) => ({ ...s, progress: p })) });
      setState({ busy: false, progress: 1, msg: `Published ${out.slug} ${out.platform} ${out.version}: ${out.entry.files[out.platform].name} (${formatBytes(out.entry.files[out.platform].size)}). The site shows it within a minute.`, error: '' });
      setForm((f) => ({ ...f, file: null }));
      onChanged();
    } catch (err) { setState({ busy: false, progress: 0, msg: '', error: err.message }); }
  };
  const remove = async (slug, platform) => {
    if (!window.confirm(`Remove ${slug} ${platform} from the download manifest? The file stays in the bucket; the button on the site goes off.`)) return;
    try { await catalogPost(user, '/api/admin/catalog/file/remove', { slug, platform }); onChanged(); } catch (err) { setState((s) => ({ ...s, error: err.message })); }
  };
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <form onSubmit={go} className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 6px' }}>Publish a sold file</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 14px', lineHeight: 1.5 }}>
          The installer (.pkg, .zip, .dmg) or the pack zip goes into the private downloads bucket under plugins/&lt;slug&gt;/&lt;version&gt;/ and the manifest points at it, as publish_download.sh does. The Download button on the site turns on within a minute; the Account page lists it for its buyers. A new version moves the product to the top of the store once its "Updated" date is set on the item.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <div><label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Slug</label>
            <input className="input-field" list="cat-slugs" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="torna" required />
            <datalist id="cat-slugs">{slugs.map((s) => <option key={s} value={s} />)}</datalist></div>
          <div><label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Version</label>
            <input className="input-field" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="1.0.0" required /></div>
          <div><label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Platform</label>
            <select className="input-field" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
              <option value="mac">mac (installer .pkg)</option><option value="win">win (.zip)</option><option value="zip">zip (sample / preset pack)</option>
            </select></div>
          <div><label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>File</label>
            <input className="input-field" type="file" accept=".pkg,.zip,.dmg" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} /></div>
          <div><button type="submit" className="btn btn-primary" disabled={state.busy}>{state.busy ? `Uploading ${Math.round(state.progress * 100)} %` : 'Upload and publish'}</button></div>
        </div>
        {form.file && <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '10px 0 0' }}>{form.file.name} · {formatBytes(form.file.size)}</p>}
        {state.msg && <p role="status" style={{ color: 'var(--color-accent)', fontSize: '0.88rem', margin: '12px 0 0' }}>{state.msg}</p>}
        {state.error && <p role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.88rem', margin: '12px 0 0' }}>{state.error}</p>}
      </form>
      <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
        <h3 style={{ margin: '0 0 12px' }}>Download manifest</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
          <thead><tr><th style={th}>Slug</th><th style={th}>Version</th><th style={th}>Files</th><th style={th}></th></tr></thead>
          <tbody>
            {entries.map(([slug, e]) => (
              <tr key={slug}>
                <td style={td}><strong>{slug}</strong></td>
                <td style={td}>{e.version || '—'}</td>
                <td style={td}>{Object.entries(e.files || {}).map(([pl, f]) => (
                  <div key={pl} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={pill('var(--tint-softer)')}>{pl}</span><span>{f.name}</span><span style={{ color: 'var(--color-text-muted)' }}>{formatBytes(f.size)} · v{f.version}</span>
                    <button type="button" className="link-button" style={{ fontSize: '0.8rem' }} onClick={() => remove(slug, pl)}>remove</button>
                  </div>
                ))}</td>
                <td style={td}></td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td style={td} colSpan={4}>No manifest read yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Admin agent keys (api/agents.js; owner 31 Oct: agents use this panel too). A key is shown once; the API keeps its hash.
function AgentsPanel({ user }) {
  const [agents, setAgents] = useState(null);
  const [label, setLabel] = useState('');
  const [made, setMade] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => { setError(''); try { setAgents((await catalogGet(user, '/api/admin/catalog/agents')).agents || []); } catch (err) { setError(err.message); } };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const make = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setMade(null);
    try { const out = await catalogPost(user, '/api/admin/catalog/agents', { label }); setMade(out); setLabel(''); await load(); } catch (err) { setError(err.message); }
    setBusy(false);
  };
  const revoke = async (a) => {
    if (!window.confirm(`Revoke the key "${a.label}"? Every script that uses it stops at once.`)) return;
    setBusy(true); setError('');
    try { await catalogPost(user, '/api/admin/catalog/agents/revoke', { id: a.id }); await load(); } catch (err) { setError(err.message); }
    setBusy(false);
  };
  const live = (agents || []).filter((a) => !a.revokedAt);
  const gone = (agents || []).filter((a) => a.revokedAt);
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <form onSubmit={make} className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 6px' }}>Agent keys</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 14px', lineHeight: 1.5 }}>
          A key lets a Claude agent or a script do what this panel does (news, products, publishers, files, testers) without a Google sign-in:
          <code> node scripts/catalog-cli.js</code> with <code>SVL_AGENT_KEY</code>, or the routes in <code>docs/CATALOG.md</code>. The key is shown once, here; the API keeps only its hash. Making and revoking keys stays with a signed-in admin.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="input-field" style={{ maxWidth: '320px' }} value={label} placeholder="Label, e.g. claude-packs" onChange={(e) => setLabel(e.target.value)} required />
          <button type="submit" className="btn btn-primary" disabled={busy}>Make a key</button>
        </div>
        {made && (
          <div role="status" style={{ marginTop: '14px', padding: '12px 14px', background: 'var(--tint-softer)', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>The key for <strong>{made.label}</strong>. Copy it now; it is not shown again.</div>
            <code style={{ fontSize: '0.95rem', wordBreak: 'break-all', userSelect: 'all' }}>{made.key}</code>
          </div>
        )}
        {error && <p role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.88rem', margin: '12px 0 0' }}>{error}</p>}
      </form>
      <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
          <thead><tr><th style={th}>Label</th><th style={th}>Made</th><th style={th}>Last used</th><th style={th}>By</th><th style={th}></th></tr></thead>
          <tbody>
            {live.map((a) => (
              <tr key={a.id}>
                <td style={td}><strong>{a.label}</strong><div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{a.id.slice(0, 12)}…</div></td>
                <td style={td}>{a.createdAt ? a.createdAt.slice(0, 16).replace('T', ' ') : '—'}</td>
                <td style={td}>{a.lastUsedAt ? a.lastUsedAt.slice(0, 16).replace('T', ' ') : 'never'}</td>
                <td style={td}>{a.createdBy || '—'}</td>
                <td style={td}><button type="button" className="link-button" style={{ fontSize: '0.8rem' }} disabled={busy} onClick={() => revoke(a)}>revoke</button></td>
              </tr>
            ))}
            {agents && live.length === 0 && <tr><td style={td} colSpan={5}>No keys yet.</td></tr>}
            {!agents && !error && <tr><td style={td} colSpan={5}>Reading…</td></tr>}
          </tbody>
        </table>
        {gone.length > 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: '12px 0 0' }}>Revoked: {gone.map((a) => `${a.label} (${String(a.revokedAt).slice(0, 10)})`).join(', ')}</p>}
      </div>
    </div>
  );
}

export default function CatalogTab({ user }) {
  const [kind, setKind] = useState('news');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);   // { doc, isNew }
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const now = Date.now();

  const load = async () => {
    setError('');
    try { setData(await catalogGet(user, '/api/admin/catalog?fresh=1')); } catch (err) { setError(err.message); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const live = useMemo(() => (data?.[kind] || []), [data, kind]);
  const liveById = useMemo(() => new Map(live.map((d) => [d.id, d])), [live]);
  const statics = useMemo(() => (kind === 'files' || kind === 'agents' ? [] : staticRows(kind)), [kind]);
  const rows = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const s of statics) {
      const d = liveById.get(s.id);
      seen.add(s.id);
      out.push({ id: s.id, name: d ? nameOf(kind, d) || s.name : s.name, sub: s.sub, source: d ? 'both' : 'code', doc: d || null, prefill: s.prefill, order: d?.order ?? s.order, date: d ? latestOf(d) || s.date : s.date });
    }
    for (const d of live) if (!seen.has(d.id)) out.push({ id: d.id, name: nameOf(kind, d), sub: subOf(kind, d), source: 'live', doc: d, order: d.order ?? 10000, date: kind === 'publishers' ? (d.joined || '') : latestOf(d) });
    if (kind === 'news') out.sort((a, b) => (a.order ?? 10000) - (b.order ?? 10000));
    else out.sort((a, b) => ((b.date || '') > (a.date || '') ? 1 : (b.date || '') < (a.date || '') ? -1 : 0));
    return out;
  }, [statics, live, liveById, kind]);

  const save = async (doc) => {
    setBusy(true); setNotice(''); setError('');
    try {
      await catalogPost(user, `/api/admin/catalog/${kind}`, doc);
      setEditing(null);
      setNotice(`Saved ${doc.id}. The site shows it within a minute.`);
      await load();
      refreshCatalog();
    } catch (err) { setError(err.errors ? err.errors.join(' · ') : err.message); }
    setBusy(false);
  };
  const remove = async (id) => {
    setBusy(true); setNotice(''); setError('');
    try { await catalogPost(user, `/api/admin/catalog/${kind}/delete`, { id }); setEditing(null); setNotice(`Deleted ${id} from the live catalogue.`); await load(); refreshCatalog(); } catch (err) { setError(err.message); }
    setBusy(false);
  };
  const toggle = async (row) => {
    const base = row.doc || { ...row.prefill };
    await save({ ...base, published: row.doc ? row.doc.published === false : false });
  };

  const newDoc = () => {
    const d = { published: true };
    for (const f of FIELDS[kind]) if (f.type === 'bool') d[f.key] = Boolean(f.default);
    if (kind === 'publishers') { d.joined = new Date().toISOString().slice(0, 10); d.role = 'producer'; d.status = 'active'; return d; }
    if (kind !== 'news') { const today = new Date().toISOString().slice(0, 10); d.released = today; d.updated = today; if (kind !== 'plugins') d.listedAt = `${today}T00:00:00+03:00`; }
    return d;
  };

  const allSlugs = useMemo(() => Array.from(new Set([...ROOM_PLUGINS.map((p) => p.slug), ...visiblePacks().map((p) => p.slug), ...PRESET_PACK_LIST.map((p) => p.id), ...(data?.plugins || []).map((d) => d.id), ...(data?.samplePacks || []).map((d) => d.id), ...(data?.presetPacks || []).map((d) => d.id)])).sort(), [data]);

  return (
    <div style={{ display: 'grid', gap: '18px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {[...KINDS, 'files', 'agents'].map((k) => (
          <button key={k} type="button" className={`plugin-filter-chip${kind === k ? ' active' : ''}`} aria-pressed={kind === k} onClick={() => { setKind(k); setEditing(null); setNotice(''); }}>
            {k === 'files' ? 'Files' : k === 'agents' ? 'Agents' : KIND_LABELS[k]}{KINDS.includes(k) && data?.[k]?.length ? ` · ${data[k].length}` : ''}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-outline" style={{ padding: '8px 14px', fontSize: '0.85rem' }} onClick={load}>Refresh</button>
          {kind !== 'files' && kind !== 'agents' && <button type="button" className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.85rem' }} onClick={() => setEditing({ doc: newDoc(), isNew: true })}>New {kind === 'news' ? 'news item' : kind === 'plugins' ? 'plug-in' : kind === 'samplePacks' ? 'sample pack' : 'preset pack'}</button>}
        </span>
      </div>

      {error && <p role="alert" style={{ color: 'var(--color-danger)', margin: 0 }}>{error}</p>}
      {notice && <p role="status" style={{ color: 'var(--color-accent)', margin: 0 }}>{notice}</p>}
      {!data && !error && <p style={{ color: 'var(--color-text-muted)' }}>Reading the catalogue…</p>}

      {kind === 'files' && data && <FilesPanel user={user} manifest={data.manifest} slugs={allSlugs} onChanged={load} />}
      {kind === 'agents' && <AgentsPanel user={user} />}

      {kind !== 'files' && kind !== 'agents' && editing && (
        <CatalogEditor key={`${kind}-${editing.doc.id || 'new'}`} user={user} kind={kind} initial={editing.doc} isNew={editing.isNew} busy={busy}
          onSave={save} onCancel={() => setEditing(null)} onDelete={editing.doc?.id && liveById.has(editing.doc.id) ? remove : null} />
      )}

      {kind !== 'files' && kind !== 'agents' && data && !editing && (
        <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 14px', lineHeight: 1.5 }}>{WHAT_A_LIVE_EDIT_DOES[kind]}</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
            <thead>
              <tr>
                <th style={th}>{kind === 'news' ? 'Key' : 'Slug'}</th><th style={th}>{kind === 'news' ? 'Title' : 'Name'}</th><th style={th}>{kind === 'news' ? 'Order' : 'Latest release'}</th><th style={th}>Source</th><th style={th}>State</th><th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const [st, bg] = r.doc ? status(r.doc, now) : ['In code', 'var(--tint-softer)'];
                return (
                  <tr key={r.id}>
                    <td style={td}><code style={{ fontSize: '0.85rem' }}>{r.id}</code></td>
                    <td style={td}><div style={{ fontWeight: 600 }}>{r.name}</div>{r.sub && <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{r.sub}</div>}</td>
                    <td style={td}>{kind === 'news' ? r.order : (r.date || '—')}</td>
                    <td style={td}><span style={pill('var(--tint-softer)')}>{r.source === 'code' ? 'code' : r.source === 'both' ? 'code + live' : 'live'}</span></td>
                    <td style={td}><span style={pill(bg)}>{st}</span></td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn-outline" style={{ padding: '6px 10px', fontSize: '0.8rem', marginRight: '6px' }} onClick={() => setEditing({ doc: r.doc || { ...r.prefill, published: true }, isNew: !r.doc && !r.prefill })}>{r.doc ? 'Edit' : 'Edit live'}</button>
                      {(kind !== 'plugins' || r.source === 'live') && (
                        <button type="button" className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.8rem' }} disabled={busy} onClick={() => toggle(r)}>{r.doc && r.doc.published === false ? 'Show' : 'Hide'}</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td style={td} colSpan={6}>Nothing here yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', margin: 0 }}>
        Live items are kept in Firestore and served by the API; the pages lay them over the data in the code. Visitors and the store see a saved item within a minute; the prerendered HTML and the sitemap learn of it at the next build.
      </p>
    </div>
  );
}
