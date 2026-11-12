// Builds api/redeemCodes.json (the store codes /api/redeem accepts, api/redeem.js) from the stores' CSV files in
// 01_AI_Tools/instagram_2026-10/launch_desk (read only). The output holds no plain code: each key is
// HMAC-SHA256(pepper, normalised code). The pepper is REDEEM_CODE_PEPPER from the environment, else
// ~/.config/subverselab/redeem_code_pepper (600); `--init-pepper` creates that file when it is missing. The same value must be
// in Secret Manager and mounted as REDEEM_CODE_PEPPER on subverselab-api, or the API answers 503 for every code.
//
//   node scripts/build-redeem-codes.js [--init-pepper] [--check]
//     --check   build in memory and compare with the committed file; exit 1 when they differ (nothing written)
//
// A new store list: add one row to SOURCES (file, store, batch, window) and run this again. Product names in the CSVs map to
// site slugs through PRODUCT_BY_NAME; an unknown name stops the build. Identical codes in several files are kept once and
// reported; the same code with different terms (product, uses, dates) stops the build.
import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { normaliseCode, codeShapeOk, codeHash, pepperCheck, REDEEM_PRODUCTS } from '../api/redeem.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const DESK = resolve(root, '../../../01_AI_Tools/instagram_2026-10/launch_desk');
const OUT = resolve(root, 'api/redeemCodes.json');
const PEPPER_FILE = join(homedir(), '.config/subverselab/redeem_code_pepper');

export const PRODUCT_BY_NAME = { 'JING FANG': 'jingfang', ELEK: 'elek', 'SubverseLab Plugin Family': 'family', TABAN: 'taban', ALEV: 'alev', KIYMA: 'kiyma' };
// Windows are Istanbul days, inclusive: validFrom = 00:00 of the first day, validTo = 00:00 of the day after the last (exclusive).
const ist = (day) => new Date(`${day}T00:00:00+03:00`).toISOString();
const APD_JF = { validFrom: ist('2027-01-26'), validTo: ist('2027-02-12') };   // 26 Jan .. 11 Feb 2027
const APD_FM = { validFrom: ist('2027-02-09'), validTo: ist('2027-02-26') };   // 9 Feb .. 25 Feb 2027

export const SOURCES = [
  { file: 'apd_codes_2027/jingfang_codes.csv', store: 'APD', batch: 'apd-jingfang-2027-01', ...APD_JF },
  { file: 'apd_codes_2027/family_codes.csv', store: 'APD', batch: 'apd-family-2027-02', ...APD_FM },
  { file: 'loot_audio_2026-11/codes/SubverseLab_jingfang_codes_for_Loot.csv', store: 'Loot Audio', batch: 'loot-jingfang-001-050' },
  { file: 'loot_audio_2026-11/codes/SubverseLab_jingfang_codes_for_Loot_batch2.csv', store: 'Loot Audio', batch: 'loot-jingfang-051-550' },
  { file: 'loot_audio_2026-11/codes/SubverseLab_JINGFANG_codes_for_Loot_500.csv', store: 'Loot Audio', batch: 'loot-jingfang-051-550' },
  { file: 'loot_audio_2026-11/codes/SubverseLab_elek_codes_for_Loot.csv', store: 'Loot Audio', batch: 'loot-elek-001-050' },
  { file: 'loot_audio_2026-11/codes/SubverseLab_family_codes_for_Loot.csv', store: 'Loot Audio', batch: 'loot-family-001-050' },
  { file: 'loot_audio_2026-11/codes/SubverseLab_TEAM_test_codes_for_Loot.csv', store: 'Loot Audio', batch: 'loot-team' },
  // Free gifts with purchase (owner 12 Nov 2026): 500 each, single use, no expiry; three team codes, 3 uses each.
  { file: 'loot_audio_2026-11/codes/SubverseLab_taban_codes_for_Loot.csv', store: 'Loot Audio', batch: 'loot-taban-001-500' },
  { file: 'loot_audio_2026-11/codes/SubverseLab_alev_codes_for_Loot.csv', store: 'Loot Audio', batch: 'loot-alev-001-500' },
  { file: 'loot_audio_2026-11/codes/SubverseLab_kiyma_codes_for_Loot.csv', store: 'Loot Audio', batch: 'loot-kiyma-001-500' },
  { file: 'loot_audio_2026-11/codes/SubverseLab_free_TEAM_test_codes_for_Loot.csv', store: 'Loot Audio', batch: 'loot-team-free' },
];
// Codes that exist only in the launch desk notes (APD_AILE_2026-11-05.md; the Rekkerd code from the owner, 7 Nov 2026).
export const EXTRA = [
  { code: 'APDTEAMJFLKAYV4', product: 'jingfang', store: 'APD', batch: 'apd-team', maxUses: 3 },
  { code: 'APDTEAMFMQ6AGZ4', product: 'family', store: 'APD', batch: 'apd-team', maxUses: 3 },
  { code: 'RKRDFAM8W3P', product: 'family', store: 'Rekkerd', batch: 'rekkerd', maxUses: 1 },
];
// Copies that must hold exactly the same codes as a source above (checked, not added twice).
export const COPIES = [
  ['apd_codes_2027/for_yemi/SubverseLab_JING_FANG_APD/JING_FANG_codes_APD_500.csv', 'apd_codes_2027/jingfang_codes.csv'],
  ['apd_codes_2027/for_yemi/SubverseLab_Plugin_Family_APD/Plugin_Family_codes_APD_500.csv', 'apd_codes_2027/family_codes.csv'],
  ['apd_codes_2027/jingfang_codes_for_yemi.txt', 'apd_codes_2027/jingfang_codes.csv'],
];

function parseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const split = (l) => l.split(',').map((c) => c.trim().replace(/^"(.*)"$/, '$1'));
  const head = split(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [head[i], v])));
}
// Rows of {code, product, maxUses} from a CSV (columns differ between files: code and product always, uses sometimes) or a
// plain list (.txt, one code a line: product unknown, used only for the copy checks).
export function readRows(path) {
  const text = readFileSync(path, 'utf8');
  if (path.endsWith('.txt')) return text.split(/\r?\n/).map(normaliseCode).filter(Boolean).map((code) => ({ code }));
  return parseCsv(text).map((r) => {
    const product = PRODUCT_BY_NAME[r.product];
    if (!product) throw new Error(`${path}: unknown product "${r.product}"`);
    return { code: normaliseCode(r.code), product, maxUses: r.uses ? Number(r.uses) : 1 };
  });
}

export function buildTable({ desk = DESK, pepper }) {
  const byCode = new Map();
  const report = { files: [], duplicates: [], copies: [] };
  const add = (row, src) => {
    if (!codeShapeOk(row.code)) throw new Error(`${src.file || 'extra'}: malformed code (length ${row.code.length})`);
    if (!(row.product in REDEEM_PRODUCTS)) throw new Error(`${src.file || 'extra'}: product ${row.product} cannot be redeemed`);
    if (!Number.isInteger(row.maxUses) || row.maxUses < 1) throw new Error(`${src.file || 'extra'}: bad uses ${row.maxUses}`);
    const entry = { product: row.product, store: src.store, batch: src.batch, ...(src.validFrom ? { validFrom: src.validFrom } : {}), ...(src.validTo ? { validTo: src.validTo } : {}), maxUses: row.maxUses };
    const old = byCode.get(row.code);
    if (old) {
      const same = ['product', 'validFrom', 'validTo', 'maxUses'].every((k) => old.entry[k] === entry[k]);
      if (!same) throw new Error(`a code in ${src.file || 'extra'} is also in ${old.file} with different terms`);
      report.duplicates.push({ file: src.file || 'extra', first: old.file });
      return false;
    }
    byCode.set(row.code, { entry, file: src.file || 'extra' });
    return true;
  };
  for (const src of SOURCES) {
    const rows = readRows(join(desk, src.file));
    let added = 0;
    const seenHere = new Set();
    let dupInFile = 0;
    for (const row of rows) { if (seenHere.has(row.code)) dupInFile += 1; seenHere.add(row.code); if (add(row, src)) added += 1; }
    report.files.push({ file: src.file, rows: rows.length, distinctInFile: seenHere.size, dupInFile, added });
  }
  for (const x of EXTRA) add({ code: normaliseCode(x.code), product: x.product, maxUses: x.maxUses }, { store: x.store, batch: x.batch });
  for (const [copy, of] of COPIES) {
    const a = new Set(readRows(join(desk, copy)).map((r) => r.code));
    const b = new Set(readRows(join(desk, of)).map((r) => r.code));
    const identical = a.size === b.size && [...a].every((c) => b.has(c));
    report.copies.push({ copy, of, identical, size: a.size });
    if (!identical) throw new Error(`${copy} is not the same code list as ${of}`);
  }
  const codes = {};
  const counts = {};
  for (const [code, { entry }] of [...byCode.entries()].sort(([, a], [, b]) => (a.entry.batch < b.entry.batch ? -1 : 1))) {
    codes[codeHash(code, pepper)] = entry;
    const k = `${entry.store} / ${entry.product}`;
    counts[k] = (counts[k] || 0) + 1;
  }
  // Sorted by hash so the file does not reveal which code came from which line.
  const sorted = Object.fromEntries(Object.keys(codes).sort().map((h) => [h, codes[h]]));
  return {
    table: {
      about: 'Store codes for POST /api/redeem. Keys are HMAC-SHA256(REDEEM_CODE_PEPPER, normalised code), hex. No plain codes. Built by scripts/build-redeem-codes.js.',
      pepperCheck: pepperCheck(pepper),
      counts,
      codes: sorted,
    },
    report,
    total: byCode.size,
  };
}

function readPepper(init) {
  if (process.env.REDEEM_CODE_PEPPER) return process.env.REDEEM_CODE_PEPPER;
  if (!existsSync(PEPPER_FILE)) {
    if (!init) throw new Error(`no pepper: set REDEEM_CODE_PEPPER or run with --init-pepper to create ${PEPPER_FILE}`);
    mkdirSync(dirname(PEPPER_FILE), { recursive: true });
    writeFileSync(PEPPER_FILE, randomBytes(32).toString('base64url'), { mode: 0o600 });
    chmodSync(PEPPER_FILE, 0o600);
    console.log(`created ${PEPPER_FILE} (600). Put the same value into Secret Manager for REDEEM_CODE_PEPPER; never print it.`);
  }
  return readFileSync(PEPPER_FILE, 'utf8').trim();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pepper = readPepper(process.argv.includes('--init-pepper'));
  const { table, report, total } = buildTable({ pepper });
  for (const f of report.files) console.log(`${f.file}: ${f.rows} rows, ${f.distinctInFile} distinct, ${f.dupInFile} repeated inside, ${f.added} new`);
  for (const c of report.copies) console.log(`copy ${c.copy}: identical to ${c.of} (${c.size})`);
  const dupByPair = {};
  for (const d of report.duplicates) dupByPair[`${d.file} <- already in ${d.first}`] = (dupByPair[`${d.file} <- already in ${d.first}`] || 0) + 1;
  for (const [k, n] of Object.entries(dupByPair)) console.log(`duplicates: ${n} in ${k}`);
  for (const [k, n] of Object.entries(table.counts)) console.log(`${k}: ${n}`);
  console.log(`total distinct codes: ${total}`);
  const text = `${JSON.stringify(table, null, 1)}\n`;
  if (process.argv.includes('--check')) {
    const same = existsSync(OUT) && readFileSync(OUT, 'utf8') === text;
    console.log(same ? 'api/redeemCodes.json is up to date' : 'api/redeemCodes.json differs from the CSVs');
    process.exitCode = same ? 0 : 1;
  } else {
    writeFileSync(OUT, text);
    console.log(`wrote ${OUT}`);
  }
}
