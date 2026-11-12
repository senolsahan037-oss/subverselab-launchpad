#!/usr/bin/env node
// Affiliate partners in Firestore partners/{id} (api/partners.js). Needs Google credentials for the site's Firebase project
// (application-default); the owner runs it. Every partner also needs its public line in src/data/partners.js (aff code,
// reader discount code, the products that code applies to in Lemon Squeezy), so the site's checkout links carry it.
//
//   node scripts/partner-cli.js add --id rekkerd --name "Rekkerd.org" --aff qbnJo --code REKKERD10 --pct 30 [--ls-affiliate-id 123]
//        creates the partner and prints its report link ONCE (only the token's sha256 is stored; a lost link is replaced
//        with rotate-token, never recovered). Refuses an id that exists.
//   node scripts/partner-cli.js rotate-token --id rekkerd     a new report link; the old one stops working at once
//   node scripts/partner-cli.js set --id rekkerd [--name …] [--aff …] [--code …] [--pct …] [--ls-affiliate-id …] [--active true|false]
//        --ls-affiliate-id: Lemon Squeezy's numeric affiliate id; an order whose affiliate_id matches is a link sale even
//        without the site's checkout[custom][aff]
//   node scripts/partner-cli.js list                          partners (no token hashes) and their sales count
import { pathToFileURL } from 'node:url';
import { PARTNERS, PARTNER_SALES, hashReportToken, newReportToken } from '../api/partners.js';

const SITE = 'https://subverselab.com';
const ID_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;
const AFF_RE = /^[A-Za-z0-9]{3,32}$/;
const CODE_RE = /^[A-Za-z0-9_-]{0,40}$/;

export function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].startsWith('--')) { opts[rest[i].slice(2)] = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : 'true'; }
  }
  return { cmd, opts };
}

function fields(opts, { requireAll }) {
  const out = {};
  const problems = [];
  if (opts.name !== undefined || requireAll) { if (!String(opts.name || '').trim()) problems.push('--name is required'); else out.name = String(opts.name).trim(); }
  if (opts.aff !== undefined || requireAll) { if (!AFF_RE.test(String(opts.aff || ''))) problems.push('--aff: the Lemon Squeezy affiliate code, 3-32 letters/digits'); else out.aff = opts.aff; }
  if (opts.code !== undefined) { if (!CODE_RE.test(String(opts.code))) problems.push('--code: letters, digits, _ or -'); else out.discountCode = String(opts.code).toUpperCase(); }
  else if (requireAll) out.discountCode = '';
  if (opts.pct !== undefined || requireAll) {
    const pct = Number(opts.pct);
    if (!(pct >= 0 && pct <= 100)) problems.push('--pct: commission percent, 0-100'); else out.commissionPct = pct;
  }
  if (opts['ls-affiliate-id'] !== undefined) {
    if (!/^[0-9]{1,20}$/.test(String(opts['ls-affiliate-id']))) problems.push('--ls-affiliate-id: the numeric affiliate id from Lemon Squeezy → Affiliates');
    else out.lsAffiliateId = String(opts['ls-affiliate-id']);
  }
  if (opts.active !== undefined) out.active = opts.active !== 'false';
  else if (requireAll) out.active = true;
  return { out, problems };
}

// db: Firestore-shaped. Returns lines to print.
export async function run(db, argv, { now = () => new Date() } = {}) {
  const { cmd, opts } = parseArgs(argv);
  const col = db.collection(PARTNERS);
  const reportLink = (token) => `${SITE}/partners/report#${token}`;
  if (cmd === 'add') {
    if (!ID_RE.test(String(opts.id || ''))) throw new Error('--id: lower-case letters, digits and -, e.g. rekkerd');
    const { out, problems } = fields(opts, { requireAll: true });
    if (problems.length) throw new Error(problems.join('\n'));
    if ((await col.doc(opts.id).get()).exists) throw new Error(`partner ${opts.id} exists; use set or rotate-token`);
    const all = await col.get();
    if (all.docs.some((d) => d.data().aff === out.aff)) throw new Error(`aff ${out.aff} already belongs to another partner`);
    const token = newReportToken();
    await col.doc(opts.id).set({ ...out, reportTokenHash: hashReportToken(token), createdAt: now().toISOString(), tokenRotatedAt: now().toISOString() });
    return [`added ${opts.id}: ${out.name}, aff ${out.aff}, code ${out.discountCode || '-'}, ${out.commissionPct}%`,
      'Report link (shown once, send it to the partner privately):', reportLink(token)];
  }
  if (cmd === 'rotate-token') {
    const ref = col.doc(String(opts.id || ''));
    if (!opts.id || !(await ref.get()).exists) throw new Error(`no partner ${opts.id || '(missing --id)'}`);
    const token = newReportToken();
    await ref.set({ reportTokenHash: hashReportToken(token), tokenRotatedAt: now().toISOString() }, { merge: true });
    return [`new report link for ${opts.id} (the old one no longer works; shown once):`, reportLink(token)];
  }
  if (cmd === 'set') {
    const ref = col.doc(String(opts.id || ''));
    if (!opts.id || !(await ref.get()).exists) throw new Error(`no partner ${opts.id || '(missing --id)'}`);
    const { out, problems } = fields(opts, { requireAll: false });
    if (problems.length) throw new Error(problems.join('\n'));
    if (!Object.keys(out).length) throw new Error('nothing to set');
    await ref.set(out, { merge: true });
    return [`updated ${opts.id}: ${Object.keys(out).join(', ')}`];
  }
  if (cmd === 'list') {
    const snap = await col.get();
    const lines = [];
    for (const d of snap.docs) {
      const p = d.data();
      const sales = await db.collection(PARTNER_SALES).where('partnerId', '==', d.id).get();
      lines.push(`${d.id}  ${p.name}  aff=${p.aff}  lsAffiliateId=${p.lsAffiliateId || '-'}  code=${p.discountCode || '-'}  ${p.commissionPct}%  ${p.active === false ? 'INACTIVE' : 'active'}  sales=${sales.docs.length}  token rotated ${p.tokenRotatedAt || '?'}`);
    }
    return lines.length ? lines : ['no partners'];
  }
  throw new Error('usage: add | rotate-token | set | list (see the header of scripts/partner-cli.js)');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  if (!argv.length || argv[0] === 'help' || argv[0] === '--help') {
    const { readFileSync } = await import('node:fs');
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
    process.exit(0);
  }
  const { initializeApp, applicationDefault, getApps } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  if (!getApps().length) initializeApp({ credential: applicationDefault(), projectId: process.env.GOOGLE_CLOUD_PROJECT || 'project-62238635-aae4-41f4-880' });
  try {
    for (const line of await run(getFirestore(), argv)) console.log(line);
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
