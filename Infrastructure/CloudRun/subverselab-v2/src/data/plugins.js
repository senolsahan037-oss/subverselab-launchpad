// Audio plugins: things a visitor installs in their own DAW.
//
// Shared by the React pages and scripts/prerender.js (plain Node, no bundler),
// the same pattern as siteMeta.js and faqContent.js, so the crawler and the
// visitor read the same words.
//
// These are pages, not synced products (Rules/02 §"Not everything published is
// a product"): nothing here is written to `products/` and the files are not
// served from this site. The sale and the licence key come from Lemon Squeezy,
// the installers from a public bucket (see DOWNLOADS_MANIFEST); the site links
// to the checkout and the files and, for a signed-in buyer, mirrors what the
// Lemon Squeezy webhook recorded (server.js → Firestore `plugin_licenses`).
//
// Every statement below is taken from the plugins' own repositories
// (01_AI_Tools/subverselab-reverb, 01_AI_Tools/subverselab-kaset) or from the
// launch announcement. Nothing is counted here: the only number of launch
// licences the site ever shows comes live from GET /api/launch/codes, which
// reads the one Firestore counter every claim increments (server.js →
// launchLicence.js) — and when that cannot be read, the page shows no number.

// Instagram's own short link that opens a direct message to the account.
export const INSTAGRAM_DM = 'https://ig.me/m/subverse_lab';
export const INSTAGRAM_HANDLE = '@subverse_lab';

// 2026-10-01 00:00 in Istanbul (UTC+3, no daylight saving).
export const RELEASE_AT = '2026-09-30T21:00:00Z';
export const RELEASE_LABEL = 'October 1';

// Lemon Squeezy checkout links. Empty until the products are created in Lemon
// Squeezy; while a link is empty its buy button renders disabled and says
// "After the first 1,000". Paste the checkout URL here — nothing else changes.
export const CHECKOUT = {
  // Lemon Squeezy store SubverseLab (#486764), products created 1 Oct 2026:
  // KUBBE 1402269, KASET 1402277, KUBBE + KASET Bundle 1402289.
  kubbe: 'https://subverselab.lemonsqueezy.com/checkout/buy/89095abf-a0cf-4fab-9eba-c6b9b9c89ebe',
  kaset: 'https://subverselab.lemonsqueezy.com/checkout/buy/5c61153e-4fe6-48d4-899c-4bdbd97ac9d2',
  bundle: 'https://subverselab.lemonsqueezy.com/checkout/buy/0a6fadc4-88fb-4dd4-a5af-8e163c79c82c',
  // Launch 2 bundle (KORO + YANKI + HAVA + MIHENK, $20). Empty: the button
  // renders disabled until the Lemon Squeezy product exists.
  bundle4: '',
};

// Installers are not in this repository and not in this constant. They live
// in the public bucket gs://subverselab-downloads, and this manifest says
// which files exist; the server reads the private bucket and serves names,
// sizes and versions (never URLs), so a download button turns on as soon as a
// build is published with tools/publish_download.sh — no site redeploy.
// Shape: { kubbe: { version, files: { mac: {name,size,version}, win } } }.
// A plugin with no entry keeps its buttons disabled ("Available October 1").
export const DOWNLOADS_MANIFEST = '/api/download/manifest';

// One zip for editors: screenshots, YouTube demo links, logos, FACT_SHEET.txt.
// Built from 01_AI_Tools/instagram_2026-10/launch_desk/press_kit/.
export const PRESS_KIT = '/press/SubverseLab_KUBBE_KASET_press_kit.zip';

export const DOWNLOAD_PLATFORMS = [
  ['mac', 'macOS'],
  ['win', 'Windows'],
];

// US dollars.
// Launch 2 (KORO, YANKI, HAVA, MIHENK) is sold as one $20 bundle; single
// prices for those four are not set yet, so none are shown.
export const PRICES = { kubbe: 9, kaset: 9, bundle: 15, bundle4: 20 };

export const FORMATS = 'VST3 and AU on macOS (Apple Silicon and Intel) · VST3 on Windows';

// Lemon Squeezy's own customer page: any buyer can sign in there with the
// e-mail used at checkout (magic link) and see every order, file and key.
// https://docs.lemonsqueezy.com/help/online-store/my-orders
export const LS_MY_ORDERS = 'https://app.lemonsqueezy.com/my-orders';

export const PLUGINS_INDEX = {
  title: 'Audio Plugins | SubverseLab',
  description:
    'SubverseLab audio plugins for your DAW: Kubbe, a reverb with three modes, and Kaset, cassette colour for the mix bus. VST3 and AU. Out October 1 — $9 each, $15 for both.',
  path: '/plugins',
};

export const LAUNCH = {
  path: '/launch',
  title: 'Kubbe and Kaset launch — October 1 | SubverseLab',
  description:
    'Two SubverseLab plugins out October 1: Kubbe (reverb) and Kaset (cassette colour). The first 1,000 verified producers can sign in on subverselab.com/launch and download both.',
  codesTotal: 1000,
  activationLimit: 3,
  offer: 'Free for the first 1,000 producers — both plugins',
  askHow: 'Sign in on subverselab.com/launch and download',
  // Instagram DMs are answered with a link to /launch, so every licence goes
  // through the one counter on this page.
  instagram: 'Instagram: DM “KUBBE” or “KASET” to @subverse_lab and we reply with this page.',
  steps: [
    ['Sign in', 'Sign in on this page with Google or with an e-mail address. An e-mail sign-up has to be verified first — the link arrives by e-mail.'],
    ['Download', 'Download Kubbe and Kaset for macOS or Windows from this page. One producer is counted once, while the 1,000 last.'],
    ['Open in your DAW', 'Install the plugin and open it in your DAW. No key or activation is needed.'],
  ],
};

export const LAUNCH2 = {
  path: '/launch2',
  title: 'KORO, YANKI, HAVA and MIHENK launch — October 5 | SubverseLab',
  description: 'The first 1,000 people get KORO, YANKI, HAVA and MIHENK together for $20 on October 5, 2026.',
  codesTotal: 1000,
  activationLimit: 3,
  offer: 'The first 1,000 people get all four for $20',
  askHow: 'Sign in on subverselab.com/launch2 and download',
  instagram: 'Instagram: DM “KORO”, “YANKI”, “HAVA” or “MIHENK” to @subverse_lab and we reply with this page.',
  steps: [['Sign in', 'Sign in on this page with Google or with an e-mail address.'], ['Download', 'Download KORO, YANKI, HAVA and MIHENK for macOS or Windows from this page.'], ['Install', 'Install the plugins or the MIHENK standalone app.'], ['Measure', 'Open the tools in your DAW or MIHENK and work from measured results.']],
};

// The 100 tester seats for the launch-2 plugins (TestersPage.jsx, /api/testers/*).
export const TESTERS = {
  path: '/testers',
  title: 'Test KORO, YANKI, HAVA and MIHENK — 100 tester seats | SubverseLab',
  description: '100 tester seats: producers on macOS and Windows, in any DAW, get KORO, YANKI, HAVA and MIHENK free and tell us what breaks.',
};

export const KUBBE = {
  slug: 'kubbe',
  name: 'Kubbe',
  displayName: 'KUBBE',
  kind: 'Reverb',
  path: '/plugins/kubbe',
  model: 'KB-79',
  tagline: 'A reverb in three modes',
  title: 'Kubbe — a reverb in three modes | SubverseLab',
  description:
    'Kubbe is an algorithmic reverb with three modes — Hammam, Cistern and Valley — and a decay display that is measured, not nominal. VST3 and AU for macOS, VST3 for Windows. Out October 1, $9.',
  og: '/plugins/kubbe/og.jpg',
  cardImage: '/plugins/kubbe/panel-hammam.jpg',
  imageSize: [1600, 629],
  manual: '/plugins/kubbe/Kubbe_Manual.pdf',
  manualPage: '/plugins/kubbe/manual',
  // Demo clips live on YouTube (unlisted Shorts, the launch reels without
  // their closing Instagram-DM card); `youtube` is the video id. An empty id
  // hides that clip.
  demos: [
    { youtube: 'MAYXHzhLTMk', caption: 'Dry, then Hammam, Cistern and Valley on the same phrase. Headphones on.' },
  ],
  intro:
    '“Kubbe” is Turkish for dome. Instead of the usual list of algorithms, Kubbe has three modes, each an algorithmic reverb inspired by a kind of space, on the face of a 1979 rack unit as it looked the day it left the factory. Nothing in it is recorded or measured from a real place: there are no impulse responses.',
  modesLabel: 'Modes',
  defaultMode: 'cistern',
  modes: [
    {
      key: 'hammam',
      name: 'Hammam',
      image: '/plugins/kubbe/panel-hammam.jpg',
      text: 'Inspired by a marble dome. Dense, bright first reflections, a flutter between parallel walls, a ring in the low mids.',
    },
    {
      key: 'cistern',
      name: 'Cistern',
      image: '/plugins/kubbe/panel-cistern.jpg',
      text: 'Inspired by an underground cistern. The column slaps arrive late and sparse, and the tail is long, dark and moves slowly like water.',
    },
    {
      key: 'valley',
      name: 'Valley',
      image: '/plugins/kubbe/panel-valley.jpg',
      text: 'Inspired by open air. The far slopes answer one by one, each answer darker and more blurred. With Echo Sync they land on the beat grid.',
    },
  ],
  sections: [
    {
      heading: 'Measured, not nominal',
      text: 'The decay display runs the engine on an impulse every time a setting changes. It draws the energy per 20 ms and the Schroeder curve, and prints the T60 it measures — at the default settings about 2.4 s in Hammam and about 6.6 s in Cistern. The Decay knob is scaled from that measurement.',
    },
  ],
  controls: [
    ['Mix', 'Dry to wet.'],
    ['Decay', 'Shown in measured seconds.'],
    ['Pre-delay', 'In milliseconds, or synced from 1/64 to 1/4.'],
    ['Distance', 'Near puts the early reflections up front; far is the room, darker.'],
    ['Low Cut · High Cut', 'Shape the wet signal only.'],
    ['Width', 'Stereo spread of the tail.'],
    ['Duck', 'The tail steps back while the source plays, by up to 24 dB. It ducks, it does not mute.'],
    ['Freeze', 'Holds the tail while you keep playing.'],
    ['Echo Sync', 'Valley only: the echoes land on 3/4, 5/4, 7/4, 5/2 or 7/2 beats.'],
  ],
  controlsNote: 'When you switch mode, the old tail rings out over 1.5 seconds instead of being cut.',
  notYet: [
    'Switching mode a second time while the previous tail is still fading cuts that older tail.',
  ],
};

export const KASET = {
  slug: 'kaset',
  name: 'Kaset',
  displayName: 'KASET',
  kind: 'Tape colour',
  path: '/plugins/kaset',
  model: 'KS-83',
  tagline: 'Cassette colour for the mix bus',
  title: 'Kaset — cassette colour for the mix bus | SubverseLab',
  description:
    'Kaset is a cassette tape colour plugin for the mix bus: pick a generation from Master to 4th Dub and a tape type, and every copy loses top end and gains hiss, wow and saturation. VST3 and AU for macOS, VST3 for Windows. Out October 1, $9.',
  og: '/plugins/kaset/og.jpg',
  cardImage: '/plugins/kaset/panel.jpg',
  imageSize: [964, 568],
  manual: '/plugins/kaset/Kaset_Manual.pdf',
  manualPage: '/plugins/kaset/manual',
  demos: [
    { youtube: 's_Cqb6sOp74', caption: 'One song, four generations: dry, 1st, 2nd and 4th dub.' },
    { youtube: '3Q_u4MX1rL8', caption: 'One pass, three tapes: Normal, Chrome and Metal.' },
  ],
  intro:
    '“Kaset” is Turkish for cassette. The panel is a high-speed dubbing deck: a record deck, a playback deck and a dial that says how many copies away from the master you are.',
  modesLabel: 'Generation',
  defaultMode: '2nddub',
  modes: [
    {
      key: 'master',
      name: 'Master',
      image: '/plugins/kaset/panel-master.jpg',
      text: 'One pass onto tape. The top end reaches to about 10 kHz.',
    },
    {
      key: '2nddub',
      name: '2nd Dub',
      image: '/plugins/kaset/panel-2nddub.jpg',
      text: 'A copy of a copy. Each dub is another pass through the tape model, so there is less top end and more hiss, wow and saturation than on the master.',
    },
    {
      key: '4thdub',
      name: '4th Dub',
      image: '/plugins/kaset/panel-4thdub.jpg',
      text: 'Four copies down. The top end has fallen to about 4.4 kHz, and hiss, wow and saturation have built with every copy.',
    },
  ],
  sections: [
    {
      heading: 'Generations',
      text: 'The Generation selector runs Master, 1st, 2nd, 3rd and 4th Dub. Each dub is another pass through the tape model: the top end falls from about 10 kHz on the master to about 4.4 kHz on the 4th dub, and hiss, wow and saturation build with every copy. Auto Gain keeps the loudness level as you move between generations, so a darker copy does not simply sound quieter.',
    },
    {
      heading: 'Tape and bypass',
      text: 'The Tape selector chooses Normal, Chrome or Metal. The TAPE / BYPASS key compares against the untouched signal: bypass is latency-aligned and bit-exact. The plugin reports a fixed latency of 15 ms, which your DAW compensates.',
    },
  ],
  controls: [
    ['Generation', 'Master, 1st, 2nd, 3rd or 4th Dub.'],
    ['Tape', 'Normal, Chrome or Metal.'],
    ['Input', 'Level into the tape.'],
    ['Saturation', 'How hard the tape is driven.'],
    ['Wow · Flutter', 'Slow and fast speed movement of the tape.'],
    ['Hiss', 'Tape noise.'],
    ['Wear', 'How worn the tape is.'],
    ['Mix', 'Dry to wet.'],
    ['Output', 'Level out.'],
    ['Auto Gain', 'Keeps the loudness level across generations.'],
    ['TAPE / BYPASS', 'Bypass is latency-aligned and bit-exact.'],
  ],
  controlsNote: 'Latency is fixed at 15 ms.',
  notYet: [],
};

// Launch 2 — October 5. The four products share one launch (launchId
// 'launch2': own counter, own claims, see server.js) and one $20 bundle.
// 2026-10-05 00:00 in Istanbul (UTC+3).
export const RELEASE2_AT = '2026-10-04T21:00:00Z';
export const RELEASE2_LABEL = 'October 5';

const LAUNCH2_COMMON = {
  launchId: 'launch2',
  releaseLabel: RELEASE2_LABEL,
  releaseAt: RELEASE2_AT,
  bundleSlug: 'bundle4',
  titleSuffix: ' | SubverseLab',
  formats: FORMATS,
  modesLabel: 'Moods',
  // No manual page or PDF yet for these four; pages hide the manual block
  // while these are null.
  manual: null,
  manualPage: null,
  demos: [],
  notYet: [],
};

export const KORO = {
  ...LAUNCH2_COMMON,
  slug: 'koro', name: 'Koro', displayName: 'KORO', kind: 'Vocal doubler + harmonizer', path: '/plugins/koro', model: 'KR-77',
  tagline: 'Drop it on the vocal. Auto key. Never a wrong note.',
  title: 'Koro — vocal doubler and harmonizer | SubverseLab',
  description: 'KORO is a vocal doubler and scale-aware harmonizer. It detects the key live while the singer sings, keeps to safe intervals until it is sure, and never plays a wrong note.',
  og: '/plugins/koro/koro_A2_hero_4x5.png', cardImage: '/plugins/koro/koro_A2_front_label7seg.png', imageSize: [1600, 640],
  intro: 'KORO listens while the singer sings. It detects the key and scale continuously, and until it is confident it keeps the harmony on fifths and octaves, which are consonant in every mode. Thirds only appear once the key is sure. You never pick a scale, so the harmony cannot be wrong.',
  defaultMode: 'tight',
  modes: [
    { key: 'tight', name: 'Tight Double', image: '/plugins/koro/koro_A2_front_label7seg.png', text: 'A close vocal double. Doubling alone needs no key.' },
  ],
  sections: [
    { heading: 'Three steps', text: 'Drop it on a vocal. Let the key read-out settle while the singer sings, or press LOCK once you like the key. Pick a mood. That is the whole workflow.' },
    { heading: 'Moods', text: 'Tight Double, Arabesk Choir, Backing Stack, Third, Fifth and Choir.' },
  ],
  controls: [
    ['DOUBLE', 'Amount of doubling. At zero the double is off.'],
    ['HARMONY', 'Amount of scale-aware harmony.'],
    ['COLOR', 'One knob that morphs the interval set: low third, high third, fifth, octave. The detected scale picks the exact notes.'],
    ['WIDTH', 'Stereo spread of the double.'],
    ['TONE', 'Brightness of the added voices.'],
    ['OUTPUT', 'Output level.'],
    ['AUTO / LOCK', 'The key is detected continuously and shown. LOCK freezes it.'],
    ['BYPASS', 'Host bypass.'],
    ['REAR', 'Per-voice level and pan, glide, timing, mono safe, manual key and scale.'],
  ],
  controlsNote: 'Latency is 54 ms at 44.1 kHz while harmony is on, 0 ms with harmony off, and is reported to the host.',
};

export const YANKI = {
  ...LAUNCH2_COMMON,
  slug: 'yanki', name: 'Yanki', displayName: 'YANKI', kind: 'Tempo-synced tape echo', path: '/plugins/yanki', model: 'YK-74',
  tagline: 'A plain echo first. Moods swell into the loop.',
  title: 'Yanki — tempo-synced tape echo | SubverseLab',
  description: 'YANKI is a tempo-synced tape echo. It opens as a plain 1/8 echo at the host tempo; moods such as Dub Spiral and Worn Loop swell the repeats into a loop.',
  og: '/plugins/yanki/yanki_hero_4x5.png', cardImage: '/plugins/yanki/yanki_front_default.png', imageSize: [1600, 640],
  intro: 'Drop YANKI on a bus and it echoes in time: 1/8 at the host tempo, a few repeats that decay. Pick a mood when you want more. For Dub Spiral, Worn Loop and the others, turn FEEDBACK past HOLD and the loop swells up to the CAP you set.',
  defaultMode: 'echo',
  modes: [
    { key: 'echo', name: 'Echo', image: '/plugins/yanki/yanki_front_default.png', text: 'The opening state: one plain tempo-synced echo.' },
    { key: 'dub', name: 'Dub Spiral', image: '/plugins/yanki/yanki_front.png', text: 'Feedback past HOLD makes the loop swell, up to CAP.' },
  ],
  sections: [
    { heading: 'Moods', text: 'Echo, Slapback, Three Heads, Dub Spiral, Worn Loop, Yesilcam and Ters.' },
  ],
  controls: [
    ['TIME', 'A sync ring (1/16, 1/8, dotted 1/8, 1/4, 1/2) or FREE milliseconds.'],
    ['FEEDBACK', 'Repeat level, with a HOLD mark and a red SWELL range past it.'],
    ['CAP', 'Ceiling for a swelling loop: off, or -12 to +12 dB over the dry signal.'],
    ['TONE', 'Tone of the repeats.'],
    ['WEAR', 'Tape wear.'],
    ['MIX', 'Dry to wet.'],
    ['OUTPUT', 'Output level.'],
    ['END', 'What happens to the loop at the end: hold, cut or dump.'],
    ['FREEZE', 'Tap to latch, hold for momentary.'],
    ['REAR', 'Darken, rise curve, tempo lock, spread and fine time.'],
  ],
  controlsNote: 'Latency is 0 ms. The display shows the host BPM and the resolved echo time.',
};

export const HAVA = {
  ...LAUNCH2_COMMON,
  slug: 'hava', name: 'Hava', displayName: 'HAVA', kind: 'Top-end air + spring sheen', path: '/plugins/hava', model: 'HV-72',
  tagline: 'Air on top. A short spring sheen. Never a reverb.',
  title: 'Hava — top-end air and spring sheen | SubverseLab',
  description: 'HAVA adds a top-end air lift and a short spring sheen to a bus or the master. It is a colour box with a 0.12 s sheen tail, not a reverb.',
  og: '/plugins/hava/hava_hero_4x5.png', cardImage: '/plugins/hava/hava_front.png', imageSize: [1600, 640],
  intro: 'Drop HAVA on the bus, turn AIR, pick a mood. The sheen is a short spring-style colour layer (chirp, twang, sparkle) and the panel says so: sheen tail 0.12 s, not a reverb. There is no decay or size control anywhere.',
  defaultMode: 'air',
  modes: [
    { key: 'air', name: 'Air Full', image: '/plugins/hava/hava_front.png', text: 'It opens here: a clear top-end lift with the sheen kept short.' },
    { key: 'master', name: 'Master Air', image: '/plugins/hava/hava_front_master_air.png', text: 'Air with MASTER SAFE on, for the master bus.' },
  ],
  sections: [
    { heading: 'Moods', text: 'Air Light, Air Full, Air + Sheen, Sheen Only and Master Air.' },
  ],
  controls: [
    ['AIR', 'Top-end lift. The display shows the shelf target in dB at 11 kHz and the dB added above 8 kHz.'],
    ['SHEEN', 'Amount of the short spring colour.'],
    ['OUTPUT', 'Output level.'],
    ['MASTER SAFE', 'Mid-only processing, an auto-gain read-out and a -0.3 dBTP ceiling.'],
    ['REAR', 'Twang, tension, drip, and a low cut on the sheen send only.'],
    ['BYPASS', 'Host bypass.'],
  ],
  controlsNote: 'Latency is 80 samples with MASTER SAFE on. Sheen tail 0.12 s: a colour layer, not a reverb.',
};

export const MIHENK = {
  ...LAUNCH2_COMMON,
  slug: 'mihenk', name: 'Mihenk', displayName: 'MIHENK', kind: 'Mastering app', path: '/plugins/mihenk', model: 'MH-86',
  tagline: 'Transparent mastering. It measures first, and says why.',
  title: 'Mihenk — measured mastering app | SubverseLab',
  description: 'MIHENK is a transparent mastering app and DAW plugin. It measures peaks, loudness, spectrum and phase, lists findings with a measured reason, and applies editable scenarios.',
  og: '/plugins/mihenk/mihenk_v10_auto.png', cardImage: '/plugins/mihenk/mihenk_v10_auto.png', imageSize: [2960, 1780],
  formats: 'Standalone app and VST3/AU on macOS · VST3 on Windows',
  intro: 'MIHENK measures, diagnoses and suggests a fix, and every suggestion comes with the measurement behind it. It is one product: the same engine runs as a standalone app and inside your DAW.',
  defaultMode: 'auto',
  modes: [
    { key: 'auto', name: 'Auto', image: '/plugins/mihenk/mihenk_v10_auto.png', text: 'Load a track: meters show its peak straight away, and the diagnosis lists what it found.' },
    { key: 'advanced', name: 'Advanced', image: '/plugins/mihenk/mihenk_v10_advanced.png', text: 'The full chain with live layered views.' },
  ],
  sections: [
    { heading: 'Diagnosis and scenarios', text: 'On load MIHENK lists findings with a severity and a measured reason, for example an input that arrives hotter than a mastering-ready level. Each finding maps to one of about twenty scenarios you can apply in one click, edit and save as your own.' },
    { heading: 'Personal profile', text: 'Off by default. When you switch it on, MIHENK learns your taste from your listening notes and can propose, and lock, the settings you keep choosing. It is local, explainable and resettable.' },
  ],
  controls: [
    ['METERS', 'Input and output peak and true-peak meters, full panel height, with peak hold.'],
    ['WAVE / SPECTRUM / LOUDNESS', 'Live during playback; the spectrum is drawn in layers, before and after each stage.'],
    ['DIAGNOSIS', 'Measured findings, each with an APPLY button.'],
    ['3-BAND', 'Multiband compressor with 4th-order Linkwitz-Riley crossovers, or the wide glue mode.'],
    ['AIR', 'High shelf at 10, 15, 20 or 40 kHz, static or dynamic.'],
    ['LOW TOOLS', 'Phase-safe low mono and a low-end tightener.'],
    ['LIMITER', 'True-peak limiter with lookahead.'],
    ['REAR', 'Command-line and JSON access for scripted workflows.'],
  ],
  controlsNote: 'Latency is reported to the host. Parameters are automatable and the state is saved with the DAW project.',
};

export const LAUNCH2_PLUGINS = [KORO, YANKI, HAVA, MIHENK];

// Launch 1 keeps its own list: PLUGINS is what /plugins, /launch, the account
// downloads and the manuals iterate over, and stays Kubbe and Kaset.
export const PLUGINS = [KUBBE, KASET];
export const ALL_PLUGINS = [...PLUGINS, ...LAUNCH2_PLUGINS];

export const pluginBySlug = (slug) => ALL_PLUGINS.find((p) => p.slug === slug);
