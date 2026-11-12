import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCatalog } from '../catalog/catalog';
import { searchSite, isPrivateQuery } from '../search/siteSearch';

// The navbar's search (owner 6 Nov 2026): one box for plugin and pack names, tools, questions, a licence key or an order
// number. Results open under the box as you type; Enter opens the highlighted one, or /search with every result.
// A licence key or an e-mail address never goes into a URL (so never into analytics page views either).
export const searchPath = (q) => (isPrivateQuery(q) ? '/search' : `/search?q=${encodeURIComponent(q.trim())}`);

export default function SiteSearch({ value = '', onChange }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const cat = useCatalog();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);
  const listId = useId();

  const result = useMemo(() => searchSite(value, cat, { perGroup: 3 }), [value, cat]);
  const flat = useMemo(() => result.groups.flatMap((g) => g.items), [result]);

  useEffect(() => { setActive(-1); }, [value]);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const away = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, []);

  const go = (to) => { setOpen(false); navigate(to); };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(flat.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(-1, i - 1)); }
    else if (e.key === 'Escape') { setOpen(false); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && flat[active]) go(flat[active].to);
      else if (result.special && flat[0]) go(flat[0].to);
      else if (value.trim()) go(searchPath(value));
    }
  };

  let n = -1;
  const showPanel = open && value.trim().length > 0;
  return (
    <div className="navbar-search site-search" ref={boxRef}>
      <label htmlFor="site-search" className="sr-only">Search SubverseLab</label>
      <input
        id="site-search"
        type="search"
        value={value}
        placeholder="Search plugins, packs, or ask a question"
        autoComplete="off"
        spellCheck="false"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onFocus={() => setOpen(true)}
        onChange={(e) => { onChange?.(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
      />
      <svg className="site-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      {showPanel && (
        <div className="site-search-panel" id={listId} role="listbox" aria-label="Search results">
          {result.total === 0 ? (
            <div className="site-search-empty">
              Nothing found for “{value.trim()}”. Try a product name, or <button type="button" className="link-button" onClick={() => go('/help')}>read Help</button>.
            </div>
          ) : result.groups.map((g) => (
            <div key={g.id} className="site-search-group">
              <div className="site-search-group-title">{g.title}</div>
              {g.items.map((it) => {
                n += 1;
                const i = n;
                return (
                  <div key={it.to + it.title} id={`${listId}-${i}`} role="option" aria-selected={active === i}
                       className={`site-search-item${active === i ? ' is-active' : ''}${it.answer ? ' is-answer' : ''}`}
                       onPointerEnter={() => setActive(i)} onPointerDown={(e) => { e.preventDefault(); go(it.to); }}>
                    <span className="site-search-item-title">{it.title}</span>
                    {it.answer ? <span className="site-search-item-answer">{it.answer}</span>
                      : it.sub ? <span className="site-search-item-sub">{it.sub}</span> : null}
                  </div>
                );
              })}
            </div>
          ))}
          {!result.special && result.total > 0 && (
            <button type="button" className="site-search-all" onPointerDown={(e) => { e.preventDefault(); go(searchPath(value)); }}>
              All results for “{value.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
