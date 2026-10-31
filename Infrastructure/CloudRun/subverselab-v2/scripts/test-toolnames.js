// Tool names without the "Subverse " prefix (owner 2026-10-15). Run after `npm run build`.
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { stripToolPrefix } from '../src/utils/toolName.js';
import { FREE_TOOLS } from '../src/data/tools.js';

let pass = 0, fail = 0;
const check = (ok, label) => { if (ok) pass++; else { fail++; console.log('FAIL', label); } };

check(stripToolPrefix('Subverse Splitter Guide') === 'Splitter Guide', 'strips a title');
check(stripToolPrefix('Open Subverse Mix Check') === 'Open Mix Check', 'strips inside a sentence');
check(stripToolPrefix('subverse-mix-check') === 'subverse-mix-check', 'keeps slugs');
check(stripToolPrefix('SubverseLab tools') === 'SubverseLab tools', 'keeps SubverseLab');
check(stripToolPrefix('https://x.subverselab.com/Subverse') === 'https://x.subverselab.com/Subverse', 'keeps URLs');
const nested = stripToolPrefix({ title: 'Subverse Visualizer', actions: [{ label: 'Open Subverse Visualizer' }], n: 3, at: new Date(0) });
check(nested.title === 'Visualizer' && nested.actions[0].label === 'Open Visualizer' && nested.n === 3 && nested.at instanceof Date, 'walks objects, keeps non-plain values');
check(FREE_TOOLS.every(([, name]) => !/^Subverse /.test(name)), 'FREE_TOOLS names');

const dist = join(process.cwd(), 'dist');
if (existsSync(dist)) {
  const hits = [];
  const walk = (dir) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) { if (f !== 'social') walk(p); }
      else if (/\.(html|txt)$/.test(f) && /\bSubverse (?=[A-Z])/.test(readFileSync(p, 'utf8'))) hits.push(p.slice(dist.length + 1));
    }
  };
  walk(dist);
  check(hits.length === 0, `built pages without the prefix (${hits.slice(0, 5).join(', ')})`);
} else console.log('skip: no dist/');

console.log(`test-toolnames: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
