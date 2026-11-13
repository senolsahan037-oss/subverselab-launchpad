// Live edit (owner 12 Nov 2026: "deploy gerektirmeyen live edit modu ... ürün odalarını düzenlemek artık deploy
// gerektirmemeli"). A signed-in admin opens a product room, presses "Edit this room", changes the words and pictures
// where they stand on the page and presses Save. The change is written as the room's live catalogue item
// (catalog_plugins/<slug>, `edits: true`; docs/CATALOG.md) through the same admin route the /admin panel uses, so it is on
// the site within a minute with no build and no deploy. Nothing here runs for a visitor: the edit bar and the editable
// fields exist only while an admin account is signed in, and the API checks the admin again on every save.
//
// What a room edit can change is what the catalogue's plug-in item holds (api/catalogSchema.js FIELDS.plugins): tagline,
// intro, formats line, controls note, sections, controls, the panel views (name, picture, line). The code's own room in
// src/data/plugins.js stays the baseline: a field nobody edited keeps the code's value.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { catalogGet, catalogPost, uploadMedia } from '../components/admin/catalogApi';
import { refreshCatalog } from '../catalog/catalog';
import { overlayPlugin } from '../catalog/shapes';

// The same two accounts App.jsx opens /admin for; the API (ADMIN_EMAILS) is what actually decides.
const ADMIN_EMAILS = ['info@subverselab.com', 'senolsahan037@gmail.com'];

// The signed-in admin, or null. One listener for every room.
export function useAdminUser() {
  const [user, setUser] = useState(null);
  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u && u.emailVerified && ADMIN_EMAILS.includes(u.email) ? u : null)), []);
  return user;
}

// The room's lists in the shape the catalogue stores them.
const sectionsOf = (p) => (p.sections || []).map((s) => ({ heading: s.heading, text: s.text }));
const controlsOf = (p) => (p.controls || []).map(([name, what]) => [name, what]);
const modesOf = (p) => (p.modes || []).map((m) => ({ key: m.key, name: m.name, image: m.image, text: m.text || '' }));

/**
 * The edit session of one room.
 * @param {object} base   the room from src/data/plugins.js
 * @param {object} shown  that room with the published live item laid over it (what visitors see)
 * @returns {{ plugin: object, edit: object|null }} the room to draw, and the edit handle (null for visitors)
 */
export function useRoomEdit(base, shown) {
  const user = useAdminUser();
  const [on, setOn] = useState(false);
  const [doc, setDoc] = useState(null);        // the stored live item (admin view), {} when the room has none yet
  const [draft, setDraft] = useState({});      // only the fields changed in this session
  const [state, setState] = useState({ busy: false, error: '', note: '' });
  const dirty = Object.keys(draft).length > 0;

  // Leaving the page with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const plugin = useMemo(() => (on && dirty ? overlayPlugin(shown, draft) : shown), [on, dirty, shown, draft]);
  const pluginRef = useRef(plugin);
  pluginRef.current = plugin;

  const start = useCallback(async () => {
    setState({ busy: true, error: '', note: '' });
    try {
      // The admin view, fresh: hidden items too, and every field (a save replaces the whole item).
      const cat = await catalogGet(user, '/api/admin/catalog?fresh=1');
      setDoc((cat.plugins || []).find((d) => d.id === base.slug) || {});
      setDraft({});
      setOn(true);
      setState({ busy: false, error: '', note: '' });
    } catch (err) { setState({ busy: false, error: `Could not open the editor: ${err.message}`, note: '' }); }
  }, [user, base.slug]);

  const set = useCallback((field, value) => {
    setDraft((d) => ({ ...d, [field]: value }));
    setState((s) => ({ ...s, error: '', note: '' }));
  }, []);

  const edit = useMemo(() => {
    if (!user) return null;
    const p = () => pluginRef.current;
    return {
      on, dirty, ...state, count: Object.keys(draft).length, hasLive: Boolean(doc && doc.id),
      start,
      text: (field, value) => set(field, value),
      section: (i, key, value) => set('sections', sectionsOf(p()).map((s, n) => (n === i ? { ...s, [key]: value } : s))),
      addSection: () => set('sections', [...sectionsOf(p()), { heading: 'New section', text: 'Write this section.' }]),
      removeSection: (i) => set('sections', sectionsOf(p()).filter((_, n) => n !== i)),
      control: (i, col, value) => set('controls', controlsOf(p()).map((c, n) => (n === i ? (col === 0 ? [value, c[1]] : [c[0], value]) : c))),
      addControl: () => set('controls', [...controlsOf(p()), ['NEW', 'What it does.']]),
      removeControl: (i) => set('controls', controlsOf(p()).filter((_, n) => n !== i)),
      mode: (i, key, value) => set('modes', modesOf(p()).map((m, n) => (n === i ? { ...m, [key]: value } : m))),
      // A new picture for one panel view: uploaded to the catalogue's media bucket, the view then points at its URL.
      async picture(i, file) {
        setState({ busy: true, error: '', note: 'Uploading the picture…' });
        try {
          const out = await uploadMedia(user, { kind: 'image', file, group: 'plugins', slug: base.slug });
          set('modes', modesOf(p()).map((m, n) => (n === i ? { ...m, image: out.url } : m)));
          setState({ busy: false, error: '', note: 'Picture uploaded. Save to publish it.' });
        } catch (err) { setState({ busy: false, error: `The picture did not upload: ${err.message}`, note: '' }); }
      },
      discard() { setDraft({}); setState({ busy: false, error: '', note: '' }); },
      close() { setDraft({}); setOn(false); setState({ busy: false, error: '', note: '' }); },
      async save() {
        setState({ busy: true, error: '', note: 'Saving…' });
        try {
          // The stored item with this session's fields over it; `edits` marks it as an edit of a room that is in the code.
          const body = { published: true, ...(doc || {}), ...draft, id: base.slug, edits: true };
          const out = await catalogPost(user, '/api/admin/catalog/plugins', body);
          setDoc(out.doc || body);
          setDraft({});
          await refreshCatalog();
          setState({ busy: false, error: '', note: 'Saved. It is on the site now; other visitors see it within a minute.' });
        } catch (err) {
          setState({ busy: false, error: `Not saved: ${(err.errors || [err.message]).join('; ')}`, note: '' });
        }
      },
    };
  }, [user, on, dirty, state, draft, doc, start, set, base.slug]);

  return { plugin, edit };
}

// Plain text in, plain text out: no pasted markup, Enter ends the edit instead of adding a line.
const plainPaste = (e) => {
  e.preventDefault();
  const text = (e.clipboardData?.getData('text/plain') || '').replace(/\s*\n+\s*/g, ' ');
  document.execCommand('insertText', false, text);
};

/**
 * A piece of the page's text. For a visitor (or with the editor closed) it is the plain element; while editing it can be
 * typed into where it stands, and `onChange` gets the new text when the cursor leaves it.
 */
export function Editable({ edit, as: Tag = 'span', value, onChange, className, style, label, ...rest }) {
  if (!edit?.on) return <Tag className={className} style={style} {...rest}>{value}</Tag>;
  return (
    <Tag {...rest} className={`${className || ''} live-edit-field`.trim()} style={style}
      contentEditable={!edit.busy} suppressContentEditableWarning spellCheck role="textbox" aria-label={label || 'Edit text'}
      onPaste={plainPaste}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } if (e.key === 'Escape') { e.currentTarget.textContent = value ?? ''; e.currentTarget.blur(); } }}
      onBlur={(e) => { const next = e.currentTarget.textContent.replace(/\s+/g, ' ').trim();   /* textContent: innerText would return CSS-uppercased text */ if (next !== String(value ?? '')) onChange(next); }}>
      {value}
    </Tag>
  );
}

// "Replace picture" over a picture, shown only while editing.
export function PictureButton({ edit, onFile, label = 'Replace picture' }) {
  const input = useRef(null);
  if (!edit?.on) return null;
  return (
    <>
      <button type="button" className="live-edit-chip live-edit-picture" disabled={edit.busy} onClick={() => input.current?.click()}>{label}</button>
      <input ref={input} type="file" accept="image/webp,image/png,image/jpeg" hidden
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f); }} />
    </>
  );
}

// A small "+ Add" / "Remove" key inside the page, shown only while editing.
export function EditChip({ edit, onClick, children }) {
  if (!edit?.on) return null;
  return <button type="button" className="live-edit-chip" disabled={edit.busy} onClick={onClick}>{children}</button>;
}

// The bar at the foot of the window: only an admin ever sees it.
export function EditBar({ edit, name }) {
  if (!edit) return null;
  if (!edit.on) {
    return (
      <div className="live-edit-bar" role="region" aria-label="Live edit">
        <span className="live-edit-bar-text">{edit.error || `Admin: ${name}${edit.hasLive ? ' has live edits' : ''}`}</span>
        <button type="button" className="btn live-edit-btn" disabled={edit.busy} onClick={edit.start}>{edit.busy ? 'Opening…' : 'Edit this room'}</button>
      </div>
    );
  }
  return (
    <div className="live-edit-bar live-edit-bar-on" role="region" aria-label="Live edit">
      <span className={`live-edit-bar-text${edit.error ? ' live-edit-error' : ''}`} aria-live="polite">
        {edit.error || edit.note || (edit.dirty ? `Editing ${name}: ${edit.count} unsaved ${edit.count === 1 ? 'change' : 'changes'}` : `Editing ${name}: click any outlined text to change it`)}
      </span>
      <button type="button" className="btn live-edit-btn" disabled={edit.busy || !edit.dirty} onClick={edit.save}>Save, no deploy</button>
      <button type="button" className="btn btn-outline live-edit-btn" disabled={edit.busy || !edit.dirty} onClick={edit.discard}>Discard</button>
      <button type="button" className="btn btn-outline live-edit-btn" disabled={edit.busy}
        onClick={() => { if (!edit.dirty || window.confirm('Close the editor and drop the unsaved changes?')) edit.close(); }}>Done</button>
    </div>
  );
}
