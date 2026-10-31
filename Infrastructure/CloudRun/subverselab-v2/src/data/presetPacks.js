// Preset packs shown on /preset-packs. Real packs only; no kit/set/preset counts in public copy (owner 2026-10-16).
// Source of the facts: 01_AI_Tools/subverselab-ru8/RELEASE_ASSETS.md and 03_Presets/RU-8 Drum Pack/README.txt.
// Owner 16 Oct: PAID, no free preset packs (not free with RU-8 either). Changed 17 Oct (owner): the basic Effect Racks go out as
// free packs of five for members (free: true -> sign in and download, no Lemon Squeezy; api/entitlements.js MEMBER_PACK_SLUGS);
// the RU-8 Drum Pack is paid ($10). Price and checkout: src/data/samplePackPrices.js
// (PACK_PRICES / PACK_CHECKOUT under the id; null = "Available soon"). Server: api/entitlements.js PRESET_PACK_LISTED; the zip is
// published as `publish_download.sh ru8-drum-pack zip RU-8_Drum_Pack.zip 1.0.0` (the file name may not contain spaces).

import { RU8_ON_SALE } from './plugins.js';
import { byLatestRelease } from './productDates.js';

// Newest release first (root CLAUDE.md "Store order"; src/data/productDates.js); equal dates keep the order written here.
export const PRESET_PACK_LIST = byLatestRelease([
  {
    id: 'ru8-drum-pack',
    cover: '/presets/ru8-drum-pack/cover.jpg',   // 600x600 store card: Blender scene, the Drum Selector as two Live windows, no props (owner 17 Oct)
    name: 'RU-8 Drum Pack',
    kind: 'Ableton Live Drum Racks',
    image: '/presets/ru8-drum-pack/card.jpg',   // the Drum Selector as Live shows it (owner 17 Oct)
    imageAlt: 'The RU-8 Drum Selector rack in Ableton Live: kit list, eight macros and the pads',
    imageSize: [964, 672],
    previewAudio: '/presets/ru8-drum-pack/preview.m4a',   // four kits from the pack playing its own grooves
    summary:
      'The sound of RU-8, the SubverseLab drum machine, inside Ableton Live. A Drum Rack for every kit, one Drum Selector rack to switch between them on eight named macros, and RU-8’s grooves as MIDI clips that play the racks as they are. Load a rack, drop a groove, play.',
    inside: [
      'A Drum Rack for each RU-8 kit: its sounds on the pads, ready to play.',
      'The RU-8 Drum Selector: one rack that switches between the kits, with eight named macros (Kit, Tune, Decay, Space, Echo, Color, Glue, Volume) and its saturation, glue, reverb and delay built in.',
      'The samples the racks play, kept in the pack so the racks find them.',
      'RU-8’s rhythms as MIDI clips (section A, section B and the full arrangement), written to the pad map so they play the racks as they are.',
    ],
    requirements: ['Ableton Live 12 Standard or Suite (the racks use Glue; Intro is not supported)'],
    install: 'Unzip, drag the folder into Places in Live’s browser, load a rack, drop a groove on the same track.',
    download: 'One zip (Ableton Live Pack folder); it downloads from your Account page after purchase.',
    room: RU8_ON_SALE ? { label: 'About RU-8', to: '/plugins/ru8' } : null,   // RU-8 is not on the site until it is on sale
  },
  {
    // Free for members (owner 17 Oct). Zip: 03_Presets/SubverseLab_Drum_Racks.zip -> `publish_download.sh racks-drums zip SubverseLab_Drum_Racks.zip 1.0.0`.
    id: 'racks-drums',
    cover: '/presets/racks-drums/cover.jpg',   // 600x600 store card: Blender scene, the racks as Live windows on a cascade, no props (owner 17 Oct)
    free: true,
    name: 'Drum Racks',
    kind: 'Ableton Live Audio Effect Racks',
    image: '/presets/racks-drums/cover.jpg',
    imageAlt: 'Drum Racks: the five racks as Ableton Live windows',
    imageSize: [600, 600],
    summary: 'Racks that make drums hit: punch and click for the kick, a short kick for back-to-back patterns, crack and a gated room for the snare, air for the hats. Built from Live’s own devices; each rack does one job, loads ready to use and has eight named macros.',
    inside: [
      'Kick Punch: weight and click for a kick, with Drum Buss transients and boom and a light glue',
      'Kick Short: shortens a kick’s tail with a gate so kicks can sit back to back, then shapes and drives it',
      'Snare Crack: body and crack for a snare, a compressor for snap, light saturation and air',
      'Snare Room: a short room behind the snare, gated so it stops with the hit',
      'Hat Air: cleans the low end out of hats, adds shine, slow stereo movement and a little drive',
    ],
    requirements: ['Ableton Live 12 Standard or Suite (Live’s own devices only: no Max for Live, no plug-ins; Intro is not supported)'],
    install: 'Unzip, drag the folder into Places in Live’s browser, drop a rack on a track, a group or the master.',
    download: 'One zip, free with a SubverseLab account.',
    room: null,
  },
  {
    // Free for members (owner 17 Oct). Zip: 03_Presets/SubverseLab_Bass_Racks.zip -> `publish_download.sh racks-bass zip SubverseLab_Bass_Racks.zip 1.0.0`.
    id: 'racks-bass',
    cover: '/presets/racks-bass/cover.jpg',   // 600x600 store card: Blender scene, the racks as Live windows on a cascade, no props (owner 17 Oct)
    free: true,
    name: 'Bass Racks',
    kind: 'Ableton Live Audio Effect Racks',
    image: '/presets/racks-bass/cover.jpg',
    imageAlt: 'Bass Racks: the five racks as Ableton Live windows',
    imageSize: [600, 600],
    summary: 'Weight and control for the low end: grit for the 808, a clean sub, bite for small speakers, a tempo-synced pump and width with the lows kept mono. Built from Live’s own devices; each rack does one job, loads ready to use and has eight named macros.',
    inside: [
      '808 Grit: saturation for 808s and bass, mid bite, glue, and the low end kept mono',
      'Sub Clean: a clean, controlled sub: band-limited, compressed, mono',
      'Bass Bite: parallel overdrive so a bass is heard on small speakers, with EQ and glue',
      'Bass Pump: a tempo-synced volume pump (no sidechain routing needed)',
      'Mid-Side Width: separate EQ for the middle and the sides, width, and mono lows',
    ],
    requirements: ['Ableton Live 12 Standard or Suite (Live’s own devices only: no Max for Live, no plug-ins; Intro is not supported)'],
    install: 'Unzip, drag the folder into Places in Live’s browser, drop a rack on a track, a group or the master.',
    download: 'One zip, free with a SubverseLab account.',
    room: null,
  },
  {
    // Free for members (owner 17 Oct). Zip: 03_Presets/SubverseLab_Vocal_Racks.zip -> `publish_download.sh racks-vocals zip SubverseLab_Vocal_Racks.zip 1.0.0`.
    id: 'racks-vocals',
    cover: '/presets/racks-vocals/cover.jpg',   // 600x600 store card: Blender scene, the racks as Live windows on a cascade, no props (owner 17 Oct)
    free: true,
    name: 'Vocal Racks',
    kind: 'Ableton Live Audio Effect Racks',
    image: '/presets/racks-vocals/cover.jpg',
    imageAlt: 'Vocal Racks: the five racks as Ableton Live windows',
    imageSize: [600, 600],
    summary: 'Vocal chains ready to drop on a track: a lead chain, air and presence, a wide double, a delay throw and a radio voice. Built from Live’s own devices; each rack does one job, loads ready to use and has eight named macros.',
    inside: [
      'Vocal Clean Lead: a lead vocal chain: EQ, compressor, de-esser and glue',
      'Vocal Air: air and presence, tube warmth and a small room',
      'Vocal Double: a wide double from chorus and two short delays',
      'Vocal Throw: a synced, filtered delay throw into a long space',
      'Vocal Radio: band-limited, driven, mono: a radio or phone voice',
    ],
    requirements: ['Ableton Live 12 Standard or Suite (Live’s own devices only: no Max for Live, no plug-ins; Intro is not supported)'],
    install: 'Unzip, drag the folder into Places in Live’s browser, drop a rack on a track, a group or the master.',
    download: 'One zip, free with a SubverseLab account.',
    room: null,
  },
  {
    // Free for members (owner 17 Oct). Zip: 03_Presets/SubverseLab_Instrument_Racks.zip -> `publish_download.sh racks-instruments zip SubverseLab_Instrument_Racks.zip 1.0.0`.
    id: 'racks-instruments',
    cover: '/presets/racks-instruments/cover.jpg',   // 600x600 store card: Blender scene, the racks as Live windows on a cascade, no props (owner 17 Oct)
    free: true,
    name: 'Instrument Racks',
    kind: 'Ableton Live Audio Effect Racks',
    image: '/presets/racks-instruments/cover.jpg',
    imageAlt: 'Instrument Racks: the five racks as Ableton Live windows',
    imageSize: [600, 600],
    summary: 'Character for your instruments: warm keys, wide pads, a lead brought to the front, echoing plucks and lo-fi dust. Built from Live’s own devices; each rack does one job, loads ready to use and has eight named macros.',
    inside: [
      'Keys Warmth: tube warmth, ensemble chorus and glue for keys',
      'Pad Wide Space: ensemble width and a large, damped space for pads',
      'Lead Forward: brings a lead to the front: presence, drive, compression and a dotted delay',
      'Pluck Echo Room: synced echoes and a room for plucks and short notes',
      'Sample Dust: vinyl crackle and wear, lower bit depth and sample rate, and a filter',
    ],
    requirements: ['Ableton Live 12 Standard or Suite (Live’s own devices only: no Max for Live, no plug-ins; Intro is not supported)'],
    install: 'Unzip, drag the folder into Places in Live’s browser, drop a rack on a track, a group or the master.',
    download: 'One zip, free with a SubverseLab account.',
    room: null,
  },
  {
    // Free for members (owner 17 Oct). Zip: 03_Presets/SubverseLab_Bus_Master_Racks.zip -> `publish_download.sh racks-bus zip SubverseLab_Bus_Master_Racks.zip 1.0.0`.
    id: 'racks-bus',
    cover: '/presets/racks-bus/cover.jpg',   // 600x600 store card: Blender scene, the racks as Live windows on a cascade, no props (owner 17 Oct)
    free: true,
    name: 'Bus & Master Racks',
    kind: 'Ableton Live Audio Effect Racks',
    image: '/presets/racks-bus/cover.jpg',
    imageAlt: 'Bus and Master Racks: the five racks as Ableton Live windows',
    imageSize: [600, 600],
    summary: 'The glue at the end of the chain: drum bus glue and smash, mix bus glue, a tape bus and a master safety chain. Built from Live’s own devices; each rack does one job, loads ready to use and has eight named macros.',
    inside: [
      'Drum Bus Glue: bus compression for a whole kit, with tone, transients, drive and boom',
      'Drum Bus Smash: parallel heavy compression and drive blended under the dry kit',
      'Mix Bus Glue: gentle bus compression with tone and width for a group or the mix',
      'Master Safe: a safety chain for the master: low cut, tilt, glue and a limiter at -1 dBFS',
      'Tape Bus: soft saturation, a rounded top, slow movement and optional crackle',
    ],
    requirements: ['Ableton Live 12 Standard or Suite (Live’s own devices only: no Max for Live, no plug-ins; Intro is not supported)'],
    install: 'Unzip, drag the folder into Places in Live’s browser, drop a rack on a track, a group or the master.',
    download: 'One zip, free with a SubverseLab account.',
    room: null,
  },
  {
    // Free for members (owner 17 Oct). Zip: 03_Presets/SubverseLab_FX_Racks.zip -> `publish_download.sh racks-fx zip SubverseLab_FX_Racks.zip 1.0.0`.
    id: 'racks-fx',
    cover: '/presets/racks-fx/cover.jpg',   // 600x600 store card: Blender scene, the racks as Live windows on a cascade, no props (owner 17 Oct)
    free: true,
    name: 'FX Racks',
    kind: 'Ableton Live Audio Effect Racks',
    image: '/presets/racks-fx/cover.jpg',
    imageAlt: 'FX Racks: the five racks as Ableton Live windows',
    imageSize: [600, 600],
    summary: 'Moments for your arrangement: space for percussion, a filter riser for builds, a stutter, grain shimmer and a metallic ring. Built from Live’s own devices; each rack does one job, loads ready to use and has eight named macros.',
    inside: [
      'Perc Space: synced delay and a room for percussion',
      'Filter Riser: a filter sweep into a space for builds; transparent with Sweep at zero',
      'Stutter: beat repeats on demand; nothing happens until Repeat is turned up',
      'Grain Shimmer: pitched grain delay into a long space',
      'Metal Ring: tuned resonators and a resonant body for metallic, ringing tones',
    ],
    requirements: ['Ableton Live 12 Standard or Suite (Live’s own devices only: no Max for Live, no plug-ins; Intro is not supported)'],
    install: 'Unzip, drag the folder into Places in Live’s browser, drop a rack on a track, a group or the master.',
    download: 'One zip, free with a SubverseLab account.',
    room: null,
  },
], (p) => p.id);

// Factory presets that ship inside the plug-ins themselves (a preset bank exists in each plug-in's source).
// Described as included with the plug-in, never as separate packs.
export const INCLUDED_PRESETS = [
  { name: 'HAVA', to: '/plugins/hava' },
  { name: 'KORO', to: '/plugins/koro' },
  { name: 'YANKI', to: '/plugins/yanki' },
  { name: 'KIYMA', to: '/plugins/kiyma' },
];
