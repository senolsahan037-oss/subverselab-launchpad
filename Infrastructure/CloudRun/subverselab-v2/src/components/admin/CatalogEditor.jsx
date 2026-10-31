import React, { useState } from 'react';
import { FIELDS, cleanDoc } from '../../../api/catalogSchema.js';
import { uploadMedia } from './catalogApi';

// One form per catalogue kind, built from the shared schema (api/catalogSchema.js): the same fields, limits and help the
// API checks. Pictures, audio and PDFs upload from here straight into the bucket and the URL lands in the field.

const label = { display: 'block', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '6px' };
const help = { fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '6px 0 0', lineHeight: 1.5 };
const row = { marginBottom: '18px' };

function Upload({ user, kind, group, slug, onDone }) {
  const [state, setState] = useState({ busy: false, progress: 0, error: '' });
  const accept = { image: 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml', audio: 'audio/mpeg,audio/mp4,audio/wav,audio/ogg,.mp3,.m4a,.wav,.ogg', pdf: 'application/pdf', json: 'application/json,.json' }[kind];
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setState({ busy: true, progress: 0, error: '' });
    try {
      const out = await uploadMedia(user, { kind, file, group, slug, onProgress: (p) => setState((s) => ({ ...s, progress: p })) });
      onDone(out.url, out, file);
      setState({ busy: false, progress: 1, error: '' });
    } catch (err) {
      setState({ busy: false, progress: 0, error: err.message });
    }
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <label className="btn btn-outline" style={{ cursor: state.busy ? 'progress' : 'pointer', padding: '8px 14px', fontSize: '0.85rem' }}>
        {state.busy ? `Uploading ${Math.round(state.progress * 100)} %` : `Upload ${kind}`}
        <input type="file" accept={accept} onChange={pick} disabled={state.busy} style={{ display: 'none' }} />
      </label>
      {state.error && <span style={{ color: 'var(--color-danger)', fontSize: '0.82rem' }}>{state.error}</span>}
    </span>
  );
}

// The preview waveform the store draws (scripts/import-sample-packs.js writes the same file for the importer's packs):
// 800 buckets of the loudest sample, scaled so the loudest is 1, with the length in seconds. Decoded in the browser,
// uploaded as JSON next to the preview; the pack's `peaks` field points at it.
async function peaksFromFile(file, buckets = 800) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) throw new Error('This browser cannot decode audio');
  const ctx = new Ctx();
  try {
    const buf = await ctx.decodeAudioData(await file.arrayBuffer());
    const n = buf.length;
    const out = new Array(buckets).fill(0);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const data = buf.getChannelData(ch);
      for (let b = 0; b < buckets; b++) {
        const a = Math.floor((b * n) / buckets); const z = Math.max(a + 1, Math.floor(((b + 1) * n) / buckets));
        let m = 0; for (let i = a; i < z; i++) { const v = Math.abs(data[i]); if (v > m) m = v; }
        if (m > out[b]) out[b] = m;
      }
    }
    const top = Math.max(...out) || 1;
    return { seconds: Math.round(buf.duration * 1000) / 1000, peaks: out.map((v) => Math.round((v / top) * 1000) / 1000) };
  } finally { ctx.close?.(); }
}

function Preview({ type, url }) {
  if (!url) return null;
  if (type === 'image') return <img src={url} alt="" style={{ display: 'block', maxWidth: '100%', maxHeight: '220px', marginTop: '10px', borderRadius: '8px', boxShadow: 'var(--shadow-card)' }} />;
  if (type === 'audio') return <audio controls preload="none" src={url} style={{ display: 'block', marginTop: '10px', width: '100%' }} />;
  if (type === 'pdf') return <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '8px', fontSize: '0.85rem' }}>Open the PDF</a>;
  return null;
}

function ListEditor({ value, onChange, placeholder }) {
  const text = Array.isArray(value) ? value.join('\n') : (value || '');
  return <textarea className="input-field" rows={Math.min(12, Math.max(3, text.split('\n').length + 1))} value={text} placeholder={placeholder} onChange={(e) => onChange(e.target.value.split('\n'))} />;
}

function PairsEditor({ value, onChange }) {
  const list = Array.isArray(value) ? value : [];
  const set = (i, j, v) => { const next = list.map((p) => [...p]); next[i][j] = v; onChange(next); };
  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      {list.map((p, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) 2fr auto', gap: '8px' }}>
          <input className="input-field" value={p[0] || ''} placeholder="Control" onChange={(e) => set(i, 0, e.target.value)} />
          <input className="input-field" value={p[1] || ''} placeholder="What it does" onChange={(e) => set(i, 1, e.target.value)} />
          <button type="button" className="btn btn-ghost" onClick={() => onChange(list.filter((_, k) => k !== i))} aria-label="Remove">×</button>
        </div>
      ))}
      <div><button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={() => onChange([...list, ['', '']])}>Add a control</button></div>
    </div>
  );
}

function SectionsEditor({ value, onChange }) {
  const list = Array.isArray(value) ? value : [];
  const set = (i, k, v) => { const next = list.map((s) => ({ ...s })); next[i][k] = v; onChange(next); };
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= list.length) return; const next = [...list]; [next[i], next[j]] = [next[j], next[i]]; onChange(next); };
  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {list.map((s, i) => (
        <div key={i} className="glass-panel" style={{ padding: '12px', display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input className="input-field" value={s.heading || ''} placeholder="Heading" onChange={(e) => set(i, 'heading', e.target.value)} />
            <button type="button" className="btn btn-ghost" onClick={() => move(i, -1)} aria-label="Up">↑</button>
            <button type="button" className="btn btn-ghost" onClick={() => move(i, 1)} aria-label="Down">↓</button>
            <button type="button" className="btn btn-ghost" onClick={() => onChange(list.filter((_, k) => k !== i))} aria-label="Remove">×</button>
          </div>
          <textarea className="input-field" rows={4} value={s.text || ''} placeholder="Paragraph" onChange={(e) => set(i, 'text', e.target.value)} />
        </div>
      ))}
      <div><button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={() => onChange([...list, { heading: '', text: '' }])}>Add a section</button></div>
    </div>
  );
}

function ModesEditor({ value, onChange, user, group, slug }) {
  const list = Array.isArray(value) ? value : [];
  const set = (i, k, v) => { const next = list.map((m) => ({ ...m })); next[i][k] = v; onChange(next); };
  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {list.map((m, i) => (
        <div key={i} className="glass-panel" style={{ padding: '12px', display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="input-field" style={{ maxWidth: '200px' }} value={m.name || ''} placeholder="View name" onChange={(e) => set(i, 'name', e.target.value)} />
            <input className="input-field" style={{ flex: 1, minWidth: '200px' }} value={m.image || ''} placeholder="Picture URL" onChange={(e) => set(i, 'image', e.target.value)} />
            <Upload user={user} kind="image" group={group} slug={slug} onDone={(url) => set(i, 'image', url)} />
            <button type="button" className="btn btn-ghost" onClick={() => onChange(list.filter((_, k) => k !== i))} aria-label="Remove">×</button>
          </div>
          <input className="input-field" value={m.text || ''} placeholder="One line about this view" onChange={(e) => set(i, 'text', e.target.value)} />
          <Preview type="image" url={m.image} />
        </div>
      ))}
      <div><button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={() => onChange([...list, { name: '', image: '', text: '' }])}>Add a view</button></div>
    </div>
  );
}

function Field({ f, value, onChange, user, kind, slug, locked, onUploaded, note }) {
  const common = { id: `cat-${f.key}` };
  const v = value ?? (f.type === 'bool' ? Boolean(f.default) : f.type === 'lines' || f.type === 'pairs' || f.type === 'sections' || f.type === 'modes' ? [] : '');
  let input;
  switch (f.type) {
    case 'slug': input = <input {...common} className="input-field" value={v} disabled={locked} placeholder="e.g. torna" onChange={(e) => onChange(e.target.value.toLowerCase())} />; break;
    case 'text': case 'path': case 'datetime': input = <input {...common} className="input-field" value={v} onChange={(e) => onChange(e.target.value)} />; break;
    case 'url': input = (
      <div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input {...common} className="input-field" style={{ flex: 1, minWidth: '240px' }} value={v} placeholder={f.upload ? 'Upload, or paste a URL / site path' : 'https://…'} onChange={(e) => onChange(e.target.value)} />
          {f.upload && <Upload user={user} kind={f.upload} group={kind} slug={slug} onDone={(url, out, file) => { onChange(url); if (onUploaded) onUploaded(file, url); }} />}
        </div>
        {f.upload && <Preview type={f.upload} url={v} />}
      </div>
    ); break;
    case 'para': input = <textarea {...common} className="input-field" rows={f.max > 1000 ? 7 : 4} value={v} onChange={(e) => onChange(e.target.value)} />; break;
    case 'money': case 'int': input = <input {...common} className="input-field" style={{ maxWidth: '180px' }} type="number" step={f.type === 'money' ? '0.01' : '1'} value={v ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />; break;
    case 'date': input = <input {...common} className="input-field" style={{ maxWidth: '220px' }} type="date" value={v} onChange={(e) => onChange(e.target.value)} />; break;
    case 'bool': input = (
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
        <input {...common} type="checkbox" checked={Boolean(v)} onChange={(e) => onChange(e.target.checked)} /> <span>{v ? 'Yes' : 'No'}</span>
      </label>
    ); break;
    case 'enum': input = (
      <select {...common} className="input-field" style={{ maxWidth: '320px' }} value={v} onChange={(e) => onChange(e.target.value)}>
        {f.options.map(([o, name]) => <option key={o} value={o}>{name}</option>)}
      </select>
    ); break;
    case 'size': input = <input {...common} className="input-field" style={{ maxWidth: '220px' }} value={Array.isArray(v) ? v.join(',') : v} placeholder="1600,602" onChange={(e) => onChange(e.target.value)} />; break;
    case 'lines': input = <ListEditor value={v} onChange={onChange} placeholder="One per line" />; break;
    case 'pairs': input = <PairsEditor value={v} onChange={onChange} />; break;
    case 'sections': input = <SectionsEditor value={v} onChange={onChange} />; break;
    case 'modes': input = <ModesEditor value={v} onChange={onChange} user={user} group={kind} slug={slug} />; break;
    default: input = null;
  }
  return (
    <div style={row}>
      <label htmlFor={common.id} style={label}>{f.label}{f.required ? ' *' : ''}</label>
      {input}
      {f.help && <p style={help}>{f.help}</p>}
      {note && <p role="status" style={{ ...help, color: 'var(--color-accent)' }}>{note}</p>}
    </div>
  );
}

// The live news frame as the homepage draws it (same classes as NewsFeed.jsx), so the words and the picture are judged
// on the real layout before they go live.
function NewsPreview({ doc }) {
  const bare = doc.bare === 'bare' ? true : doc.bare === 'flat' ? 'flat' : false;
  return (
    <section className="news-feed" aria-label="Preview" style={{ marginTop: '8px' }}>
      <article className={`news-frame is-seen${bare ? '' : ''}`}>
        <div className="news-copy">
          <p className="news-kicker">{doc.kicker || 'Kicker'}</p>
          {doc.dateLabel && <p className="news-date">{doc.dateLabel}</p>}
          <h2 className="news-title">{doc.title || 'Title'}</h2>
          <p className="news-line">{doc.line || 'Line'}</p>
          {doc.to && <span className="btn btn-primary news-cta">{doc.cta || 'Open'} →</span>}
        </div>
        <div className={`news-window${bare ? ' is-bare' : ''}${bare === 'flat' ? ' is-flat' : ''}`}>
          {doc.image ? <img src={doc.image} alt={doc.alt || ''} /> : <div style={{ aspectRatio: '16 / 9', display: 'grid', placeItems: 'center', color: 'var(--color-text-muted)' }}>No picture yet</div>}
        </div>
      </article>
    </section>
  );
}

export default function CatalogEditor({ user, kind, initial, isNew, onSave, onCancel, onDelete, busy }) {
  const [doc, setDoc] = useState(() => ({ ...(initial || {}) }));
  const [errors, setErrors] = useState([]);
  const [peaksNote, setPeaksNote] = useState('');
  const fields = FIELDS[kind];
  const set = (key, value) => setDoc((d) => ({ ...d, [key]: value }));
  // A sample pack's preview upload also writes the waveform file the store card and the pack page draw (peaks JSON).
  const afterSnippet = async (file) => {
    if (kind !== 'samplePacks' || !file) return;
    setPeaksNote('Reading the waveform…');
    try {
      const peaks = await peaksFromFile(file);
      const blob = new File([JSON.stringify(peaks)], 'peaks.json', { type: 'application/json' });
      const out = await uploadMedia(user, { kind: 'json', file: blob, group: kind, slug: doc.id });
      set('peaks', out.url);
      setPeaksNote(`Waveform written: ${peaks.peaks.length} points over ${peaks.seconds} s.`);
    } catch (err) { setPeaksNote(`Waveform not written (${err.message}); run node scripts/pack-peaks.js on the mp3 and paste the URL into Preview waveform.`); }
  };
  const submit = (e) => {
    e.preventDefault();
    const { doc: clean, errors: errs } = cleanDoc(kind, doc);
    setErrors(errs);
    if (errs.length) return;
    onSave(clean);
  };
  return (
    <form onSubmit={submit} className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <h3 style={{ margin: 0 }}>{isNew ? 'New item' : `Edit ${doc.id}`}</h3>
        <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>* required · saved items show on the site within a minute</span>
      </div>
      {fields.map((f) => <Field key={f.key} f={f} value={doc[f.key]} onChange={(v) => set(f.key, v)} user={user} kind={kind} slug={doc.id} locked={!isNew} onUploaded={f.key === 'snippet' ? afterSnippet : null} note={f.key === 'snippet' ? peaksNote : ''} />)}
      {kind === 'news' && <NewsPreview doc={doc} />}
      {errors.length > 0 && (
        <ul style={{ color: 'var(--color-danger)', fontSize: '0.88rem', margin: '12px 0', paddingLeft: '18px' }}>
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '18px' }}>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : isNew ? 'Create' : 'Save'}</button>
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
        {!isNew && onDelete && <button type="button" className="btn btn-outline btn-danger" style={{ marginLeft: 'auto' }} disabled={busy} onClick={() => { if (window.confirm(`Delete ${doc.id} from the live catalogue? A static item with this id comes back as it is in the code.`)) onDelete(doc.id); }}>Delete</button>}
      </div>
    </form>
  );
}

