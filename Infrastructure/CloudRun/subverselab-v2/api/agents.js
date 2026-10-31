// Admin agent keys (owner 2026-10-31: "agentlar dahi bu paneli kullanmalı"): a key an admin makes in /admin → Catalogue →
// Agents, shown once, that lets a Claude agent (or a script) use the catalogue and tester admin routes without a Google
// sign-in. Stored as catalog_agents/{sha256(key)} {label, createdBy, createdAt, lastUsedAt, revokedAt}; only the hash is
// kept, so a lost key is replaced, never recovered. A key does everything the admin routes allow except making or revoking
// keys (humans only). Revoke closes it at once.
import { createHash, randomBytes } from 'node:crypto';

export const AGENT_PREFIX = 'svla_';
export const COLLECTION = 'catalog_agents';
export const hashAgentKey = (key) => createHash('sha256').update(String(key)).digest('hex');
export const isAgentKey = (token) => typeof token === 'string' && token.startsWith(AGENT_PREFIX) && token.length >= 20;
export const newAgentKey = () => `${AGENT_PREFIX}${randomBytes(24).toString('base64url')}`;
const LABEL_RE = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,59}$/;

export function createAgentStore(db, now = () => new Date()) {
  const col = () => db.collection(COLLECTION);
  return {
    // The agent a key belongs to, or null when the key is unknown or revoked. Touches lastUsedAt (not awaited).
    async find(token) {
      if (!isAgentKey(token)) return null;
      const id = hashAgentKey(token);
      const snap = await col().doc(id).get();
      if (!snap.exists) return null;
      const d = snap.data();
      if (d.revokedAt) return null;
      col().doc(id).set({ lastUsedAt: now().toISOString() }, { merge: true }).catch(() => {});
      return { id, label: d.label, createdBy: d.createdBy || null, createdAt: d.createdAt || null };
    },
    async create({ label, by }) {
      const clean = String(label || '').trim();
      if (!LABEL_RE.test(clean)) return { error: 'Label: 1-60 letters, digits, spaces, dots, dashes', status: 400 };
      const key = newAgentKey();
      const id = hashAgentKey(key);
      await col().doc(id).set({ label: clean, createdBy: by || null, createdAt: now().toISOString(), lastUsedAt: null, revokedAt: null });
      return { ok: true, id, label: clean, key };
    },
    async list() {
      const snap = await col().get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    },
    async revoke(id) {
      if (!/^[0-9a-f]{64}$/.test(String(id || ''))) return { error: 'bad id', status: 400 };
      const ref = col().doc(id);
      const snap = await ref.get();
      if (!snap.exists) return { error: 'No such key', status: 404 };
      await ref.set({ revokedAt: now().toISOString() }, { merge: true });
      return { ok: true, id };
    },
  };
}
