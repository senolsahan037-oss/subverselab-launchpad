import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addDoc, collection, getDocs, orderBy, query, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import PageMeta from './PageMeta';
import { FORUM_SEED_TOPICS } from '../data/forumSeed';

const topicsRef = collection(db, 'forum_topics');

function formatDate(value) {
  if (!value) return 'just now';
  const date = value.toDate ? value.toDate() : new Date(value);
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function LoginHint({ onLoginClick }) {
  return <p style={{ color: 'var(--color-text-muted)' }}><button className="link-button" onClick={onLoginClick}>Sign in</button> to post.</p>;
}

export default function ForumPage({ user, onLoginClick }) {
  const { topicId } = useParams();
  const [topics, setTopics] = useState([]);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', body: '', category: 'General' });
  const [reply, setReply] = useState('');
  const [notice, setNotice] = useState('');

  const loadTopics = async () => {
    const snapshot = await getDocs(query(topicsRef, orderBy('createdAt', 'desc')));
    const remoteTopics = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    setTopics(remoteTopics.length ? remoteTopics : FORUM_SEED_TOPICS);
    setLoading(false);
  };

  useEffect(() => { loadTopics().catch(() => setLoading(false)); }, []);
  useEffect(() => {
    if (!topicId) return undefined;
    let active = true;
    getDocs(query(collection(db, 'forum_topics', topicId, 'replies'), orderBy('createdAt', 'asc')))
      .then((snapshot) => { if (active) setReplies(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))); })
      .catch(() => setReplies([]));
    return () => { active = false; };
  }, [topicId]);

  const createTopic = async (event) => {
    event.preventDefault();
    if (!user) return onLoginClick();
    if (!form.title.trim() || !form.body.trim()) return setNotice('A title and a message are both required.');
    await addDoc(topicsRef, { ...form, title: form.title.trim(), body: form.body.trim(), authorId: user.uid, authorName: user.displayName || user.email?.split('@')[0] || 'Member', createdAt: serverTimestamp(), replyCount: 0 });
    setForm({ title: '', body: '', category: 'General' });
    setNotice('Your topic is live.');
    await loadTopics();
  };

  const createReply = async (event) => {
    event.preventDefault();
    if (!user) return onLoginClick();
    if (!reply.trim()) return;
    await addDoc(collection(db, 'forum_topics', topicId, 'replies'), { body: reply.trim(), authorId: user.uid, authorName: user.displayName || user.email?.split('@')[0] || 'Member', createdAt: serverTimestamp() });
    setReply('');
    const snapshot = await getDocs(query(collection(db, 'forum_topics', topicId, 'replies'), orderBy('createdAt', 'asc')));
    setReplies(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  };

  const topic = topics.find((item) => item.id === topicId);
  useEffect(() => {
    if (topicId?.startsWith('seed-topic-') && topic) setReplies(topic.replies || []);
  }, [topicId, topic]);
  if (topicId) return <div className="container forum-page"><PageMeta title={topic?.title || 'Forum topic'} description="A topic in the SubverseLab forum" path={`/forum/${topicId}`} /><Link to="/forum" className="forum-back">← Forum</Link>{topic ? <><span className="forum-category">{topic.category}</span><h1>{topic.title}</h1><p className="forum-meta">{topic.authorName} · {formatDate(topic.createdAt)}</p><article className="forum-post">{topic.body}</article><h2>Replies</h2>{replies.map((item) => <article className="forum-post" key={item.id}><p>{item.body}</p><p className="forum-meta">{item.authorName} · {formatDate(item.createdAt)}</p></article>)}<form onSubmit={createReply} className="forum-form"><textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={user ? 'Write your reply…' : 'Sign in to reply'} />{user ? <button className="btn btn-primary">Reply</button> : <LoginHint onLoginClick={onLoginClick} />}</form></> : <p>That topic could not be found.</p>}</div>;

  return <div className="container forum-page"><PageMeta title="SubverseLab Forum" description="The SubverseLab community forum" path="/forum" /><div className="forum-heading"><div><span className="forum-category">COMMUNITY</span><h1>SubverseLab Forum</h1><p>Share how you work, ask what is not obvious, and say when something is broken.</p></div></div><div className="forum-layout"><section><h2>Latest topics</h2>{loading ? <p>Loading topics…</p> : topics.length ? topics.map((item) => <Link className="forum-topic" to={`/forum/${item.id}`} key={item.id}><div><span className="forum-category">{item.category}</span><h3>{item.title}</h3><p>{item.authorName} · {formatDate(item.createdAt)}</p></div><strong>{item.replyCount || 0}</strong></Link>) : <p>No topics yet — start the first one.</p>}</section><section className="forum-card"><h2>Start a topic</h2><form onSubmit={createTopic} className="forum-form"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Topic title" /><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>General</option><option>Music production</option><option>Product support</option><option>Feedback</option></select><textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Your message" />{user ? <button className="btn btn-primary">Publish topic</button> : <LoginHint onLoginClick={onLoginClick} />}{notice && <small>{notice}</small>}</form></section></div></div>;
}
