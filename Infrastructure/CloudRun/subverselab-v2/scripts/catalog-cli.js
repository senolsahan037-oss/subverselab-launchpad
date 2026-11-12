#!/usr/bin/env node
// The live catalogue from a terminal, for agents and scripts (owner 2026-10-31: "agentlar dahi bu paneli kullanmalı").
// Everything /admin → Catalogue does, through the same API routes, with an admin agent key made in /admin → Catalogue → Agents.
//
//   SVL_AGENT_KEY=svla_…  node scripts/catalog-cli.js <command> …          (live: https://subverselab.com)
//   SVL_API=http://127.0.0.1:8790 SVL_AGENT_KEY=dev-preview node scripts/catalog-cli.js …   (local API started with SVL_DEV_ADMIN=1)
//
//   schema                                  the kinds and their fields (what a valid item needs)
//   list <kind>                             news | plugins | samplePacks | presetPacks | publishers   (live items, all of them)
//   get <kind> <id>
//   save <kind> <item.json | ->             create or replace one item (the JSON is the item; "id" is the slug / key)
//   set <kind> <id> key=value …             change fields of an existing item (value JSON when it parses, else text)
//   hide <kind> <id> | show <kind> <id>     published off / on
//   delete <kind> <id>
//   media <image|audio|pdf|json> <kind> <slug> <file>     upload a picture / preview / manual / peaks → prints the URL
//   peaks <snippet.mp3> <slug>              write the waveform file for a sample pack preview and print its URL (needs ffmpeg)
//   file <slug> <version> <mac|win|zip> <file>            publish a sold installer or pack zip (manifest + downloads bucket)
//   unfile <slug> [platform]                take a file out of the manifest
//   manifest                                the download manifest
//   testers list | testers invite <email> <os> <agreementVersion> <acceptedAtISO> [daws=a,b] [production=…] | testers decide <email> <approve|decline|end|revoke> [agreementVersion acceptedAtISO]
//
// Rules the panel enforces, the CLI too: the API validates every item against api/catalogSchema.js and answers the problems by
// name; price floors and public-copy rules (root CLAUDE.md) are yours to keep. docs/CATALOG.md and docs/PACK_DELIVERY.md say what a
// new product needs before it is on sale.
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { homedir } from 'node:os';

const API = (process.env.SVL_API || 'https://subverselab.com').replace(/\/$/, '');
// The key comes from SVL_AGENT_KEY, else from ~/.config/subverselab/agent_key (one line, chmod 600), so a desktop session needs no export.
const keyFromFile = () => { try { return readFileSync(join(homedir(), '.config', 'subverselab', 'agent_key'), 'utf8').trim(); } catch { return ''; } };
const KEY = process.env.SVL_AGENT_KEY || keyFromFile();
const [, , cmd, ...args] = process.argv;

function die(msg, code = 1) { console.error(msg); process.exit(code); }
if (!cmd || cmd === 'help' || cmd === '--help') { console.log(readFileSync(new URL(import.meta.url)).toString().split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n')); process.exit(0); }
if (!KEY && cmd !== 'schema') die('Set SVL_AGENT_KEY or put the key in ~/.config/subverselab/agent_key (an agent key from /admin → Catalogue → Agents; "dev-preview" against a local API started with SVL_DEV_ADMIN=1).');

async function call(method, path, body, raw) {
  const headers = { Authorization: `Bearer ${KEY}` };
  if (body !== undefined && !raw) headers['Content-Type'] = 'application/json';
  if (raw) headers['Content-Type'] = raw;
  const r = await fetch(`${API}${path}`, { method, headers, body: body === undefined ? undefined : raw ? body : JSON.stringify(body) });
  const text = await r.text();
  let out; try { out = JSON.parse(text); } catch { out = { error: text.slice(0, 300) }; }
  if (!r.ok) die(`${method} ${path} → ${r.status}: ${out.error || text}${out.errors ? '\n - ' + out.errors.join('\n - ') : ''}`);
  return out;
}
const show = (x) => console.log(JSON.stringify(x, null, 2));
const KINDS = ['news', 'plugins', 'samplePacks', 'presetPacks', 'publishers'];
const kindArg = (k) => (KINDS.includes(k) ? k : die(`kind: one of ${KINDS.join(', ')}`));
const readJson = (f) => JSON.parse(f === '-' ? readFileSync(0, 'utf8') : readFileSync(f, 'utf8'));
const parseVal = (v) => { try { return JSON.parse(v); } catch { return v; } };
async function all() { return call('GET', '/api/admin/catalog?fresh=1'); }
async function one(kind, id) { const cat = await all(); const d = (cat[kind] || []).find((x) => x.id === id); if (!d) die(`${kind}/${id}: not in the live catalogue`); return d; }
async function upload(mediaKind, kind, slug, file) {
  const q = new URLSearchParams({ kind: mediaKind, filename: basename(file), group: kind, slug });
  return call('PUT', `/api/admin/catalog/media?${q}`, readFileSync(file), 'application/octet-stream');
}

const run = {
  async schema() { show(await fetch(`${API}/api/catalog/schema`).then((r) => r.json())); },
  async list([kind]) { const cat = await all(); show((cat[kindArg(kind)] || []).map((d) => ({ id: d.id, name: d.title || d.displayName || d.name, published: d.published !== false, updatedAt: d.updatedAt }))); },
  async get([kind, id]) { show(await one(kindArg(kind), id)); },
  async save([kind, file]) { show(await call('POST', `/api/admin/catalog/${kindArg(kind)}`, readJson(file || '-'))); },
  async set([kind, id, ...pairs]) {
    const d = await one(kindArg(kind), id);
    for (const p of pairs) { const i = p.indexOf('='); if (i < 1) die(`expected key=value, got ${p}`); d[p.slice(0, i)] = parseVal(p.slice(i + 1)); }
    show(await call('POST', `/api/admin/catalog/${kind}`, d));
  },
  async hide([kind, id]) { const d = await one(kindArg(kind), id); show(await call('POST', `/api/admin/catalog/${kind}`, { ...d, published: false })); },
  async show([kind, id]) { const d = await one(kindArg(kind), id); show(await call('POST', `/api/admin/catalog/${kind}`, { ...d, published: true })); },
  async delete([kind, id]) { show(await call('POST', `/api/admin/catalog/${kindArg(kind)}/delete`, { id })); },
  async media([mediaKind, kind, slug, file]) { if (!file) die('media <image|audio|pdf|json> <kind> <slug> <file>'); const out = await upload(mediaKind, kindArg(kind), slug, file); console.log(out.url); },
  async peaks([mp3, slug]) {
    if (!mp3 || !slug) die('peaks <snippet.mp3> <slug>');
    const { peaksOf } = await import('./pack-peaks.js');
    const json = JSON.stringify(peaksOf(mp3));
    const q = new URLSearchParams({ kind: 'json', filename: 'peaks.json', group: 'samplePacks', slug });
    const out = await call('PUT', `/api/admin/catalog/media?${q}`, json, 'application/json');
    console.log(out.url);
  },
  async file([slug, version, platform, file]) {
    if (!file) die('file <slug> <version> <mac|win|zip> <file>');
    const q = new URLSearchParams({ slug, version, filename: basename(file) });
    const put = await call('PUT', `/api/admin/catalog/file/direct?${q}`, readFileSync(file), 'application/octet-stream');
    show(await call('POST', '/api/admin/catalog/file/publish', { slug, platform, version, objectPath: put.objectPath }));
  },
  async unfile([slug, platform]) { show(await call('POST', '/api/admin/catalog/file/remove', { slug, platform })); },
  async manifest() { show((await all()).manifest); },
  async testers([sub, ...rest]) {
    if (sub === 'list') { const t = await call('GET', '/api/admin/testers'); show({ approved: t.approved, total: t.total, applications: t.applications.map((a) => ({ email: a.email, os: a.os, musehubEmail: a.musehubEmail || '', status: a.tester ? a.tester.status : a.status, at: a.at })) }); return; }
    if (sub === 'invite') {
      const [email, os, agreementVersion, acceptedAt, ...kv] = rest;
      if (!acceptedAt) die('testers invite <email> <os> <agreementVersion> <acceptedAtISO> [daws=a,b] [production=…]');
      const extra = Object.fromEntries(kv.map((p) => { const i = p.indexOf('='); return [p.slice(0, i), p.slice(i + 1)]; }));
      show(await call('POST', '/api/admin/testers/invite', { email, os, agreementVersion, acceptedAt, ...extra }));
      return;
    }
    if (sub === 'decide') { const [email, decision, agreementVersion, acceptedAt] = rest; show(await call('POST', '/api/admin/testers/decide', { email, decision, ...(agreementVersion ? { agreementVersion, acceptedAt } : {}) })); return; }
    die('testers list | invite | decide');
  },
};
if (!run[cmd]) die(`unknown command ${cmd}; run with help`);
run[cmd](args).catch((err) => die(err.message));
