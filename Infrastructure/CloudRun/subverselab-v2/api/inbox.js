// The account inbox: messages from the platform to one signed-in user.
//
//   inbox/{uid}/messages/{id}  {title, body, link, kind, createdAt (ISO), read}
//
// Only server.js (Admin SDK) writes here: the welcome message, the "your order is ready" message from the
// Lemon Squeezy webhook, and the read flag. firestore.rules lets a user read their own messages and nothing
// else, so no client can invent a message. Plain logic over a Firestore-shaped `db`.
// Every message has a fixed id, so writing it twice (a retried webhook, a second status call) keeps one.

export const INBOX_LIMIT = 50;
const MAX_IDS = 50;

const okUid = (uid) => typeof uid === 'string' && uid.length > 0 && uid.length <= 200 && !uid.includes('/');
const okId = (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(id);
const messages = (db, uid) => db.collection('inbox').doc(uid).collection('messages');

const clip = (value, max) => String(value ?? '').slice(0, max);
// Links stay on this site: a path starting with one slash.
const safeLink = (link) => (typeof link === 'string' && /^\/(?!\/)[^\s]*$/.test(link) ? link.slice(0, 200) : '');

// Writes the message unless one with this id already exists. 'created' | 'exists' | 'ignored'.
export async function addMessage(db, uid, id, { title, body = '', link = '', kind = 'info' }, now = () => new Date().toISOString()) {
  if (!okUid(uid) || !okId(id) || !title) return 'ignored';
  const ref = messages(db, uid).doc(id);
  if ((await ref.get()).exists) return 'exists';
  await ref.set({ title: clip(title, 120), body: clip(body, 900), link: safeLink(link), kind: clip(kind, 24), createdAt: now(), read: false });
  return 'created';
}

// {messages:[{id, ...}] newest first (at most INBOX_LIMIT), unread: how many of them are unread}
export async function listMessages(db, uid) {
  if (!okUid(uid)) return { messages: [], unread: 0 };
  const snap = await messages(db, uid).orderBy('createdAt', 'desc').limit(INBOX_LIMIT).get();
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { messages: list, unread: list.filter((m) => !m.read).length };
}

// Marks the given ids (or every message) as read. Returns how many changed.
export async function markRead(db, uid, { ids, all } = {}) {
  if (!okUid(uid)) return 0;
  let changed = 0;
  if (all === true) {
    const snap = await messages(db, uid).orderBy('createdAt', 'desc').limit(INBOX_LIMIT).get();
    for (const d of snap.docs) {
      if (d.data().read !== true) { await d.ref.set({ read: true }, { merge: true }); changed += 1; }
    }
    return changed;
  }
  for (const id of (Array.isArray(ids) ? ids : []).filter(okId).slice(0, MAX_IDS)) {
    const ref = messages(db, uid).doc(id);
    const snap = await ref.get();
    if (snap.exists && snap.data().read !== true) { await ref.set({ read: true }, { merge: true }); changed += 1; }
  }
  return changed;
}

export const welcomeMessage = {
  title: 'Welcome to SubverseLab',
  body: [
    'Your downloads, licence keys and tool credits live on the Account page.',
    'Free plugins: get them on their page, they appear here right after.',
    'Messages about your orders arrive in this inbox.',
  ].join('\n'),
  link: '/account',
  kind: 'welcome',
};

const orderDay = (iso) => (Number.isNaN(Date.parse(iso || '')) ? '' : new Date(Date.parse(iso)).toISOString().slice(0, 10));

// The message for a paid order. `slug` is a plugin slug, 'family', 'bundle' (the old KUBBE + KASET pair) or null.
// `orderNumber`, `created` (ISO) and `free` ($0 order) fill the first line; the rest is the same for every order.
// Packs (sample packs, preset packs) and the launch sweep: a zip, no licence key, no plug-in install.
const PACK_MESSAGE_SLUGS = ['brickyard', 'kerbstone', 'stepwell', 'lampglass', 'slagworks', 'squall', 'ru8-drum-pack'];
const PACK_TITLES = { 'ru8-drum-pack': 'RU-8 Drum Pack' };
const packTitle = (slug) => PACK_TITLES[slug] || `${slug[0].toUpperCase()}${slug.slice(1)} sample pack`;
export function orderMessage(slug, { orderNumber = null, created = null, free = false } = {}) {
  if (slug === 'sweep' || slug === 'preset-sweep' || PACK_MESSAGE_SLUGS.includes(slug)) {
    const day = orderDay(created);
    const head = [orderNumber != null && orderNumber !== '' ? `Order #${orderNumber}` : 'Your order', day].filter(Boolean).join(', ');
    return {
      title: slug === 'sweep' ? 'Your sample packs are ready (Sweep the store)' : slug === 'preset-sweep' ? 'Your preset packs are ready' : `Your ${packTitle(slug)} is ready`,
      body: [
        `${head}.`,
        slug === 'sweep' || slug === 'preset-sweep' ? 'Download: Account \u2192 Packs \u2192 each pack \u2192 Download (zip).' : 'Download: Account \u2192 Packs \u2192 Download (zip).',
        'Unzip it and drag the folder into your DAW\u2019s browser; README.txt inside explains the folders.',
        'Stuck? Reply to your receipt e-mail or use \u201cReport a problem\u201d on the Account page.',
      ].join('\n'),
      link: '/account#packs',
      kind: 'order',
    };
  }
  const family = slug === 'family';
  const bundle = slug === 'bundle';
  const plugin = slug && /^[a-z0-9-]{2,24}$/.test(slug) && !family && !bundle ? slug : null;
  const title = family ? 'Your SubverseLab plugin family is ready'  // no product count in copy (owner 2026-10-17)
    : bundle ? 'Your KUBBE + KASET bundle is ready'
    : plugin ? `Your ${plugin === 'ru8' ? 'RU-8' : plugin === 'jingfang' ? 'JING FANG' : plugin.toUpperCase()} is ready` : 'Your order is ready';
  const day = orderDay(created);
  const head = [orderNumber != null && orderNumber !== '' ? `Order #${orderNumber}` : 'Your order', day].filter(Boolean).join(', ');
  const download = plugin ? `Download: Account \u2192 ${plugin === 'ru8' ? 'RU-8' : plugin === 'jingfang' ? 'JING FANG' : plugin.toUpperCase()} \u2192 Download for macOS / Windows.`
    : family || bundle ? 'Download: Account \u2192 each plugin \u2192 Download.'
    : 'Download: Account \u2192 your plugin \u2192 Download.';
  const body = [
    `${head}.${free ? ' Free' : ''}`,
    download,
    ...(free ? [] : ['Your licence key is on the same card (Account \u2192 Licence keys).']),
    'After installing, rescan plug-ins in your DAW: VST3 in /Library/Audio/Plug-Ins/VST3 (macOS) or C:\\Program Files\\Common Files\\VST3 (Windows); AU in /Library/Audio/Plug-Ins/Components.',
    'Stuck? Reply to your receipt e-mail or use \u201cReport a problem\u201d on the Account page.',
  ].join('\n');
  return { title, body, link: plugin ? `/account#${plugin}` : '/account', kind: 'order' };
}
