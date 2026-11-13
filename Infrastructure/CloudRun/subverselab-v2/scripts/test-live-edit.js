// Live edit of a product room (src/liveEdit/liveEdit.jsx): what the editor sends is a valid catalogue item, and the
// overlay draws it. Run: node scripts/test-live-edit.js
import assert from 'node:assert/strict';
import { cleanDoc } from '../api/catalogSchema.js';
import { overlayPlugin } from '../src/catalog/shapes.js';

let pass = 0;
const check = (ok, name) => { assert.ok(ok, name); pass += 1; };

// A room as src/data/plugins.js writes one (the fields the editor touches).
const room = {
  slug: 'torna', displayName: 'TORNA', name: 'TORNA', tagline: 'The hi-fi graphic EQ.', intro: 'Intro.', formats: '', controlsNote: '',
  defaultMode: 'front', imageSize: [1600, 628],
  modes: [
    { key: 'front', name: 'Front', image: '/plugins/torna/panel-default.webp', text: 'The front.' },
    { key: 'rear', name: 'Rear plate', image: '/plugins/torna/panel-rear.webp', text: 'The rear.' },
  ],
  sections: [{ heading: 'Twelve bands', text: 'Broad and overlapping.' }],
  controls: [['INPUT', 'Level before the equalizer.']],
  demos: [],
};

// What Save sends for a room with no live item yet: only the edited fields, id and `edits`.
const body = {
  published: true, id: 'torna', edits: true,
  tagline: 'A typed tagline, Mixed Case.',
  sections: [{ heading: 'Edited heading', text: 'Broad and overlapping.' }, { heading: 'New section', text: 'Write this section.' }],
  controls: [['INPUT', 'Level before the equalizer.'], ['NEW', 'What it does.']],
  modes: [
    { key: 'front', name: 'Front', image: 'https://firebasestorage.googleapis.com/v0/b/x/o/catalog%2Fplugins%2Ftorna%2Fnew.webp?alt=media&token=t', text: 'Edited view line' },
    { key: 'rear', name: 'Rear plate', image: '/plugins/torna/panel-rear.webp', text: 'The rear.' },
  ],
};
const { doc, errors } = cleanDoc('plugins', body);
check(errors.length === 0, `an edit with only the changed fields is a valid item (${errors.join('; ')})`);
check(doc.edits === true && doc.id === 'torna' && doc.published === true, 'it stays an edit of torna, published');
check(doc.tagline === 'A typed tagline, Mixed Case.', 'the tagline is kept as typed');
check(doc.modes.length === 2 && doc.modes[0].text === 'Edited view line', 'panel views are stored');

const shown = overlayPlugin(room, doc);
check(shown.tagline === 'A typed tagline, Mixed Case.', 'overlay: tagline');
check(shown.intro === 'Intro.', 'overlay: a field nobody edited keeps the code value');
check(shown.sections.length === 2 && shown.sections[0].heading === 'Edited heading', 'overlay: sections');
check(shown.controls.length === 2 && shown.controls[1][0] === 'NEW', 'overlay: controls');
check(shown.modes.length === 2 && shown.modes[0].key === 'front' && shown.modes[0].image.startsWith('https://') && shown.modes[0].text === 'Edited view line', 'overlay: a view takes the new picture and line and keeps its key');
check(shown.modes[1].image === '/plugins/torna/panel-rear.webp', 'overlay: an untouched view stays');
check(shown.defaultMode === 'front' && shown.imageSize[0] === 1600, 'overlay: the room keeps its default view and picture size');

// An edit item made before live edit (no views) leaves the room's views alone; a nameless view is refused by the API.
check(overlayPlugin(room, { id: 'torna', edits: true, modes: [] }).modes === room.modes, 'no views in the item: the room keeps its own');
check(cleanDoc('plugins', { ...body, modes: [{ name: '', image: '/x.webp', text: '' }] }).errors.length > 0, 'a view without a name is refused');
check(cleanDoc('plugins', { ...body, tagline: 'x'.repeat(301) }).errors.length > 0, 'a tagline over the limit is refused, by name');

console.log(`test-live-edit: ${pass} passed`);
