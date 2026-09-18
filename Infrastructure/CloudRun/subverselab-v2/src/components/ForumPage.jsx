import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import PageMeta from './PageMeta';
import { FORUM_SEED_TOPICS } from '../data/forumSeed';

const topicsRef = collection(db, 'forum_topics');
const EMPTY_FORM = { title: '', body: '', category: 'General question' };
const DRAFT_KEY = 'subverselab:forum-topic-draft';

function formatDate(value) {
  if (!value) return 'just now';
  const date = value.toDate ? value.toDate() : new Date(value);
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function LoginHint({ onLoginClick }) {
  return <p className="forum-muted"><button type="button" className="link-button" onClick={onLoginClick}>Sign in</button> to post.</p>;
}

function mergeTopics(remoteTopics) {
  const remoteIds = new Set(remoteTopics.map((topic) => topic.id));
  return [...remoteTopics, ...FORUM_SEED_TOPICS.filter((topic) => !remoteIds.has(topic.id))];
}

export default function ForumPage({ user, onLoginClick }) {
  const { topicId } = useParams();
  const [topics, setTopics] = useState([]);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(DRAFT_KEY));
      return saved?.title || saved?.body ? { ...EMPTY_FORM, ...saved } : EMPTY_FORM;
    } catch {
      return EMPTY_FORM;
    }
  });
  const [reply, setReply] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState('all');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [lastEdit, setLastEdit] = useState(null);

  const loadTopics = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const snapshot = await getDocs(query(topicsRef, orderBy('createdAt', 'desc')));
      const remoteTopics = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      setTopics(mergeTopics(remoteTopics));
    } catch (error) {
      console.error('[Forum] Could not load topics:', error);
      setTopics(FORUM_SEED_TOPICS);
      setLoadError('New community topics could not be loaded. Official answers are still available below.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTopics(); }, []);
  useEffect(() => {
    if (form.title || form.body) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    else window.localStorage.removeItem(DRAFT_KEY);
  }, [form]);

  useEffect(() => {
    if (!topicId || topicId.startsWith('seed-topic-')) return undefined;
    let active = true;
    getDocs(query(collection(db, 'forum_topics', topicId, 'replies'), orderBy('createdAt', 'asc')))
      .then((snapshot) => { if (active) setReplies(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))); })
      .catch((error) => {
        console.error('[Forum] Could not load replies:', error);
        if (active) setNotice('Replies could not be loaded. Please retry.');
      });
    return () => { active = false; };
  }, [topicId]);

  const createTopic = async (event) => {
    event.preventDefault();
    if (!user) return onLoginClick();
    if (!form.title.trim() || !form.body.trim()) return setNotice('A title and a message are both required.');
    setSubmitting(true);
    setNotice('');
    try {
      await addDoc(topicsRef, {
        ...form, title: form.title.trim(), body: form.body.trim(), authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || 'Member',
        createdAt: serverTimestamp(),
      });
      setForm(EMPTY_FORM);
      window.localStorage.removeItem(DRAFT_KEY);
      setNotice('Your question is live.');
      await loadTopics();
    } catch (error) {
      console.error('[Forum] Could not publish topic:', error);
      setNotice('Your question was not published. Your draft is still saved in this browser.');
    } finally {
      setSubmitting(false);
    }
  };

  const createReply = async (event) => {
    event.preventDefault();
    if (!user) return onLoginClick();
    if (!reply.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'forum_topics', topicId, 'replies'), {
        body: reply.trim(), authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || 'Member', createdAt: serverTimestamp(),
      });
      setReply('');
      const snapshot = await getDocs(query(collection(db, 'forum_topics', topicId, 'replies'), orderBy('createdAt', 'asc')));
      setReplies(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    } catch (error) {
      console.error('[Forum] Could not publish reply:', error);
      setNotice('Your answer was not published. The text is still here so you can retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const topic = topics.find((item) => item.id === topicId);
  const isOwner = Boolean(user && topic && !topic.id.startsWith('seed-topic-') && topic.authorId === user.uid);

  useEffect(() => {
    if (topicId?.startsWith('seed-topic-') && topic) setReplies(topic.replies || []);
  }, [topicId, topic]);

  const startEditing = () => {
    setEditForm({ title: topic.title, body: topic.body, category: topic.category });
    setEditing(true);
    setNotice('');
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!isOwner || !editForm.title.trim() || !editForm.body.trim()) return;
    const previous = { title: topic.title, body: topic.body, category: topic.category };
    const next = { title: editForm.title.trim(), body: editForm.body.trim(), category: editForm.category };
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'forum_topics', topic.id), { ...next, updatedAt: serverTimestamp() });
      setTopics((items) => items.map((item) => item.id === topic.id ? { ...item, ...next } : item));
      setLastEdit(previous);
      setEditing(false);
      setNotice('Changes saved.');
    } catch (error) {
      console.error('[Forum] Could not edit topic:', error);
      setNotice('Changes were not saved. Your edited text is still here.');
    } finally {
      setSubmitting(false);
    }
  };

  const undoEdit = async () => {
    if (!isOwner || !lastEdit) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'forum_topics', topic.id), { ...lastEdit, updatedAt: serverTimestamp() });
      setTopics((items) => items.map((item) => item.id === topic.id ? { ...item, ...lastEdit } : item));
      setLastEdit(null);
      setNotice('The last edit was undone.');
    } catch (error) {
      console.error('[Forum] Could not undo edit:', error);
      setNotice('The edit could not be undone. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const visibleTopics = useMemo(() => (
    view === 'mine' && user ? topics.filter((item) => item.authorId === user.uid) : topics
  ), [topics, user, view]);

  if (topicId) {
    return (
      <div className="container forum-page">
        <PageMeta title={topic?.title || 'Forum topic'} description="A topic in the SubverseLab forum" path={`/forum/${topicId}`} />
        <Link to="/forum" className="forum-back">← General forum</Link>
        {loading ? <p>Loading topic…</p> : topic ? <>
          {editing ? (
            <form onSubmit={saveEdit} className="forum-form forum-edit-form">
              <input value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} aria-label="Topic title" />
              <select value={editForm.category} onChange={(event) => setEditForm({ ...editForm, category: event.target.value })} aria-label="Topic category"><option>General question</option><option>Music production</option><option>Tool support</option><option>Feedback</option></select>
              <textarea value={editForm.body} onChange={(event) => setEditForm({ ...editForm, body: event.target.value })} aria-label="Topic message" />
              <div className="forum-actions"><button className="btn btn-primary" disabled={submitting}>Save changes</button><button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button></div>
            </form>
          ) : <>
            <span className="forum-category">{topic.category}</span><h1>{topic.title}</h1>
            <p className="forum-meta">{topic.authorName} · {formatDate(topic.createdAt)}{topic.updatedAt ? ' · edited' : ''}</p>
            <article className="forum-post">{topic.body}</article>
            {isOwner && <div className="forum-actions"><button type="button" className="btn btn-outline" onClick={startEditing}>Edit question</button>{lastEdit && <button type="button" className="link-button" onClick={undoEdit} disabled={submitting}>Undo last edit</button>}</div>}
          </>}
          {notice && <p className="forum-notice" role="status">{notice}</p>}
          <h2>Answers</h2>
          {replies.length ? replies.map((item) => <article className="forum-post" key={item.id}><p>{item.body}</p><p className="forum-meta">{item.authorName} · {formatDate(item.createdAt)}</p></article>) : <p className="forum-muted">No answers yet.</p>}
          <form onSubmit={createReply} className="forum-form"><textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder={user ? 'Write an answer…' : 'Sign in to answer'} />{user ? <button className="btn btn-primary" disabled={submitting}>Post answer</button> : <LoginHint onLoginClick={onLoginClick} />}</form>
        </> : <><p>That topic could not be found.</p><button className="btn btn-outline" onClick={loadTopics}>Retry</button></>}
      </div>
    );
  }

  return (
    <div className="container forum-page">
      <PageMeta title="SubverseLab Forum" description="Ask questions, share production knowledge, and get support for SubverseLab tools." path="/forum" />
      <div className="forum-heading"><span className="forum-category">COMMUNITY Q&amp;A</span><h1>SubverseLab Forum</h1><p>Ask a clear question, share what you tried, and add an answer when you know one.</p></div>
      <div className="forum-tabs" aria-label="Forum views"><button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>General forum</button>{user && <button className={view === 'mine' ? 'active' : ''} onClick={() => setView('mine')}>My topics</button>}</div>
      {loadError && <div className="forum-error" role="alert">{loadError} <button className="link-button" onClick={loadTopics}>Retry</button></div>}
      <div className="forum-layout">
        <section><h2>{view === 'mine' ? 'My topics' : 'Latest questions'}</h2>{loading ? <p>Loading topics…</p> : visibleTopics.length ? visibleTopics.map((item) => <Link className="forum-topic" to={`/forum/${item.id}`} key={item.id}><div><span className="forum-category">{item.category}</span><h3>{item.title}</h3><p>{item.authorName} · {formatDate(item.createdAt)}</p></div><strong>View →</strong></Link>) : <p>{view === 'mine' ? 'You have not posted a topic yet.' : 'No topics yet — start the first one.'}</p>}</section>
        <section className="forum-card"><h2>Ask a question</h2><form onSubmit={createTopic} className="forum-form"><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="What do you need help with?" /><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>General question</option><option>Music production</option><option>Tool support</option><option>Feedback</option></select><textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="Describe what you expected, what happened, and what you already tried." />{user ? <button className="btn btn-primary" disabled={submitting}>{submitting ? 'Publishing…' : 'Publish question'}</button> : <LoginHint onLoginClick={onLoginClick} />}{(form.title || form.body) && <small className="forum-muted">Draft saved automatically in this browser.</small>}{notice && <small role="status">{notice}</small>}</form></section>
      </div>
    </div>
  );
}
