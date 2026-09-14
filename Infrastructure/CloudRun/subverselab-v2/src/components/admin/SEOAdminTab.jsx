import React, { useState, useEffect } from 'react';
import { getSEOArticles, publishArticle, unpublishArticle, deleteArticle, updateArticle } from '../../services/seoService';

const STATUS_COLORS = {
  published: { bg: 'rgba(42,157,143,0.12)', color: 'var(--color-accent)', border: 'rgba(42,157,143,0.35)' },
  draft:     { bg: 'rgba(197,160,89,0.12)', color: 'var(--color-primary)', border: 'rgba(197,160,89,0.35)' },
};

const TYPE_LABELS = { faq: 'FAQ', blog: 'Guide' };

/* ────────────────────────────────────────────────────────────
   Inline Edit Modal
   ──────────────────────────────────────────────────────────── */
function EditModal({ article, onSave, onClose }) {
  const [form, setForm] = useState({
    title: article.title,
    question: article.question,
    answer: article.answer,
    body: article.body,
    keywords: Array.isArray(article.keywords) ? article.keywords.join(', ') : '',
  });
  const [saving, setSaving] = useState(false);

  const handle = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        ...form,
        keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean),
      });
      onClose();
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="modal-close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '24px' }}>Edit Article</h3>

        {[
          { label: 'Title', field: 'title', type: 'input' },
          { label: 'Question', field: 'question', type: 'input' },
          { label: 'Short Answer (shown in FAQ/cards)', field: 'answer', type: 'textarea', rows: 3 },
          { label: 'Full Body (markdown)', field: 'body', type: 'textarea', rows: 12 },
          { label: 'Keywords (comma separated)', field: 'keywords', type: 'input' },
        ].map(({ label, field, type, rows }) => (
          <div key={field} className="input-group">
            <label>{label}</label>
            {type === 'input'
              ? <input className="input-field" value={form[field]} onChange={handle(field)} />
              : <textarea className="input-field" rows={rows} value={form[field]} onChange={handle(field)} style={{ fontFamily: 'monospace', fontSize: '0.85rem', resize: 'vertical' }} />
            }
          </div>
        ))}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   SEO Admin Tab
   ──────────────────────────────────────────────────────────── */
export default function SEOAdminTab({ packs = [] }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');
  const [editArticle, setEditArticle] = useState(null);
  const [notification, setNotification] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadArticles = async () => {
    setLoading(true);
    try { setArticles(await getSEOArticles()); }
    catch (err) { notify('Failed to load articles: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadArticles(); }, []);

  const setAction = (id, val) => setActionLoading(p => ({ ...p, [id]: val }));

  const handlePublish = async (id) => {
    setAction(id, 'publishing');
    try { await publishArticle(id); setArticles(a => a.map(x => x.id === id ? { ...x, status: 'published' } : x)); notify('Published ✓'); }
    catch (err) { notify('Publish failed: ' + err.message, 'error'); }
    finally { setAction(id, null); }
  };

  const handleUnpublish = async (id) => {
    setAction(id, 'unpublishing');
    try { await unpublishArticle(id); setArticles(a => a.map(x => x.id === id ? { ...x, status: 'draft' } : x)); notify('Moved to draft ✓'); }
    catch (err) { notify('Failed: ' + err.message, 'error'); }
    finally { setAction(id, null); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this article permanently?')) return;
    setAction(id, 'deleting');
    try { await deleteArticle(id); setArticles(a => a.filter(x => x.id !== id)); notify('Deleted ✓'); }
    catch (err) { notify('Delete failed: ' + err.message, 'error'); }
    finally { setAction(id, null); }
  };

  const handleSaveEdit = async (updates) => {
    await updateArticle(editArticle.id, updates);
    setArticles(a => a.map(x => x.id === editArticle.id ? { ...x, ...updates } : x));
    notify('Saved');
  };

  /* Filters */
  const filtered = articles.filter(a => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterProduct !== 'all' && a.relatedProductId !== filterProduct) return false;
    return true;
  });

  const draftCount = articles.filter(a => a.status === 'draft').length;
  const publishedCount = articles.filter(a => a.status === 'published').length;

  return (
    <div>
      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed', top: '80px', right: '24px', zIndex: 999,
          padding: '14px 20px', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', fontWeight: '600',
          background: notification.type === 'error' ? 'rgba(192,57,43,0.15)' : 'rgba(42,157,143,0.15)',
          border: `1px solid ${notification.type === 'error' ? 'rgba(192,57,43,0.4)' : 'rgba(42,157,143,0.4)'}`,
          color: notification.type === 'error' ? '#e74c3c' : 'var(--color-accent)',
          animation: 'fadeIn 0.3s ease',
        }}>
          {notification.msg}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Articles', value: articles.length, color: 'var(--color-text)' },
          { label: 'Published', value: publishedCount, color: 'var(--color-accent)' },
          { label: 'Drafts', value: draftCount, color: 'var(--color-primary)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Stats row */}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { label: 'All', val: 'all', key: 'status', setter: setFilterStatus, current: filterStatus },
          { label: 'Published', val: 'published', key: 'status', setter: setFilterStatus, current: filterStatus },
          { label: 'Draft', val: 'draft', key: 'status', setter: setFilterStatus, current: filterStatus },
        ].map(f => (
          <button key={f.val} className={`filter-btn ${f.current === f.val ? 'active' : ''}`} onClick={() => f.setter(f.val)}>{f.label}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          <select className="input-field" style={{ padding: '6px 12px', fontSize: '0.85rem' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="faq">FAQ</option>
            <option value="blog">Blog</option>
          </select>
          <select className="input-field" style={{ padding: '6px 12px', fontSize: '0.85rem' }} value={filterProduct} onChange={e => setFilterProduct(e.target.value)}>
            <option value="all">All Products</option>
            {packs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
      </div>

      {/* Articles table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)' }}>Loading articles...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          
          <p style={{ color: 'var(--color-text-muted)' }}>No articles found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(article => {
            const s = STATUS_COLORS[article.status] || STATUS_COLORS.draft;
            const busy = actionLoading[article.id];

            return (
              <div key={article.id} className="glass-panel" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {/* Type icon */}
                <span style={{ fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)', flexShrink: 0 }}>{TYPE_LABELS[article.type] || ''}</span>

                {/* Title */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--color-text)', marginBottom: '4px' }}>
                    {article.title?.slice(0, 70)}{article.title?.length > 70 ? '...' : ''}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    {article.relatedProductTitle || article.relatedProductId} · {article.category}
                  </div>
                </div>

                {/* Status badge */}
                <span style={{
                  padding: '4px 12px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '800',
                  textTransform: 'uppercase', letterSpacing: '0.8px',
                  background: s.bg, color: s.color, border: `1px solid ${s.border}`, flexShrink: 0,
                }}>
                  {article.status}
                </span>

                {/* Slug */}
                <a
                  href={`/learn/${article.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', textDecoration: 'none', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={`/learn/${article.slug}`}
                >
                  /learn/{article.slug}
                </a>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={() => setEditArticle(article)}>Edit</button>
                  {article.status === 'draft'
                    ? <button className="btn btn-teal" style={{ padding: '6px 14px', fontSize: '0.78rem' }} disabled={!!busy} onClick={() => handlePublish(article.id)}>{busy === 'publishing' ? '...' : 'Publish'}</button>
                    : <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.78rem' }} disabled={!!busy} onClick={() => handleUnpublish(article.id)}>{busy === 'unpublishing' ? '...' : 'Unpublish'}</button>
                  }
                  <button
                    style={{ padding: '6px 10px', background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.3)', color: '#e74c3c', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600' }}
                    disabled={!!busy}
                    onClick={() => handleDelete(article.id)}
                  >
                    {busy === 'deleting' ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editArticle && (
        <EditModal
          article={editArticle}
          onSave={handleSaveEdit}
          onClose={() => setEditArticle(null)}
        />
      )}
    </div>
  );
}
