import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageMeta from './PageMeta';
import DownloadButtons from './DownloadButtons';
import { SITE_URL } from '../data/siteMeta';

/*  A plugin's owner's manual as a page — /plugins/kubbe/manual,
 *  /plugins/kaset/manual. Driven by src/data/pluginManuals.js, which
 *  prerender.js reads too. The PDF stays linked for printing.
 */

// `code` and **bold** — the only inline markup the manual data uses.
function Inline({ text }) {
  const parts = String(text).split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function Block({ block }) {
  if (block.h3) return <h3>{block.h3}</h3>;
  if (block.p) return <p><Inline text={block.p} /></p>;
  if (block.note) return <p className="manual-note"><Inline text={block.note} /></p>;
  if (block.list) return <ul>{block.list.map((t) => <li key={t}><Inline text={t} /></li>)}</ul>;
  if (block.steps) return <ol className="manual-steps">{block.steps.map((t) => <li key={t}><Inline text={t} /></li>)}</ol>;
  if (block.table) {
    return (
      <div className="manual-table-wrap">
        <table className="manual-table">
          <thead><tr>{block.table.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
          <tbody>
            {block.table.rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, i) => (i === 0
                  ? <th key={i} scope="row"><Inline text={cell} /></th>
                  : <td key={i}><Inline text={cell} /></td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.recipes) {
    return (
      <div className="manual-recipes">
        {block.recipes.map((r) => (
          <div key={r.name} className="manual-recipe">
            <h3>{r.name}</h3>
            <p className="manual-recipe-settings">{r.settings}</p>
            <p>{r.text}</p>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function PluginManualPage({ manual }) {
  const { plugin } = manual;
  const { hash } = useLocation();
  const [w, h] = manual.imageSize;

  // A link such as /plugins/kaset/manual#download arrives through the router,
  // which does not scroll to the fragment by itself.
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, [hash]);

  return (
    <div className="plugin-page">
      <PageMeta title={manual.title} description={manual.description} path={manual.path}
                image={`${SITE_URL}${plugin.og}`} />

      <section className="plugin-hero manual-hero">
        <div className="container plugin-hero-inner">
          <Link to={plugin.path} className="plugin-back">← {plugin.name}</Link>
          <p className="plugin-kicker">SubverseLab · Owner’s manual</p>
          <h1 className="plugin-title">{plugin.displayName}</h1>
          <p className="plugin-tagline">{manual.subtitle}</p>
          <div className="plugin-cta-row">
            <a href={manual.pdf} target="_blank" rel="noopener noreferrer" className="btn plugin-btn">
              Manual as PDF
            </a>
            <Link to={plugin.path} className="plugin-cta-note">About {plugin.name}, price and launch code →</Link>
          </div>
          <figure className="plugin-panel">
            <img src={manual.image} alt={manual.imageAlt} width={w} height={h} />
          </figure>
        </div>
      </section>

      <div className="container manual-body">
        <nav className="manual-toc" aria-label="Contents">
          <strong>Contents</strong>
          <ol>
            {manual.sections.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.heading}</a></li>)}
          </ol>
        </nav>

        {manual.sections.map((s, i) => (
          <section key={s.id} id={s.id} className="plugin-section manual-section">
            <h2><span className="manual-num">{i + 1}</span>{s.heading}</h2>
            {s.blocks.map((b, j) => <Block key={j} block={b} />)}
            {s.id === 'installation' && (
              <DownloadButtons slug={plugin.slug} className="plugin-buy-row" />
            )}
          </section>
        ))}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
          <a href={manual.pdf} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
            {plugin.name} manual (PDF)
          </a>
          <Link to={plugin.path} className="btn btn-outline">Back to {plugin.name}</Link>
          <Link to="/help" className="btn btn-outline">Help</Link>
        </div>
      </div>
    </div>
  );
}
