// /preset-packs: the Drum Pack card shows the rack as Live shows it, with one preview below (owner 17 Oct).
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { PRESET_PACK_LIST } = await import('../src/data/presetPacks.js');
let pass = 0, fail = 0;
for (const p of PRESET_PACK_LIST) {
  try {
    assert.ok(p.image && existsSync(resolve(root, 'public' + p.image)), `${p.id}: card image`);
    if (p.previewAudio) assert.ok(existsSync(resolve(root, 'public' + p.previewAudio)), `${p.id}: preview audio`);
    assert.ok(!p.inside.some((t) => /space and echo built into the rack/i.test(t)), `${p.id}: copy matches the racks`);
    pass++; console.log('PASS', p.id);
  } catch (e) { fail++; console.log('FAIL', e.message); }
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
