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
// "Opens October 1". Paste the checkout URL here — nothing else changes.
export const CHECKOUT = {
  kubbe: '',
  kaset: '',
  bundle: '',
};

// Installers are not in this repository and not in this constant. They live
// in the public bucket gs://subverselab-downloads, and this manifest says
// which files exist; src/hooks/useDownloads.js reads it in the browser, so a
// download button turns on as soon as a build is published with
// 01_AI_Tools/subverselab-plugin-common/tools/publish_download.sh — no site
// redeploy. Shape: { kubbe: { version, files: { mac: {url,size,name}, win } } }.
// A plugin with no entry keeps its buttons disabled ("Available October 1").
export const DOWNLOADS_MANIFEST =
  'https://storage.googleapis.com/subverselab-downloads/plugins/manifest.json';

export const DOWNLOAD_PLATFORMS = [
  ['mac', 'macOS'],
  ['win', 'Windows'],
];

// US dollars.
export const PRICES = { kubbe: 9, kaset: 9, bundle: 15 };

export const FORMATS = 'VST3 and AU on macOS (Apple Silicon and Intel) · VST3 on Windows';

// Lemon Squeezy's own customer page: any buyer can sign in there with the
// e-mail used at checkout (magic link) and see every order, file and key.
// https://docs.lemonsqueezy.com/help/online-store/my-orders
export const LS_MY_ORDERS = 'https://app.lemonsqueezy.com/my-orders';

export const LICENCE_FACTS = {
  noDemo:
    'There is no demo or trial version. A licence comes from a purchase or from a free launch licence. Without one, the plugin shows an activation card and passes audio through untouched.',
  oneComputer:
    'A purchased key activates on one computer; a free launch licence on up to three. To move a key, open the plugin on the old computer and choose “Release this computer”, then paste the key on the new one.',
  launch:
    'A free launch licence is one key for both Kubbe and Kaset. It activates on up to three computers.',
};

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
    'Two SubverseLab plugins out October 1: Kubbe (reverb) and Kaset (cassette colour). $9 each or $15 for both. The first 1,000 people who sign in on subverselab.com/launch get a free licence for both plugins.',
  codesTotal: 1000,
  activationLimit: 3,
  offer: 'Free licence for the first 1,000 people — both plugins',
  askHow: 'Sign in on subverselab.com/launch and claim it',
  // Instagram DMs are answered with a link to /launch, so every licence goes
  // through the one counter on this page.
  instagram: 'Found us on Instagram? Send “KUBBE” or “KASET” to @subverse_lab and the reply is a link to this page — every free licence is claimed here.',
  steps: [
    ['Sign in', 'Sign in on this page with Google or with an e-mail address. An e-mail sign-up has to be verified first — the link arrives by e-mail.'],
    ['Claim', 'Press “Claim my licence”. You get one key that unlocks both Kubbe and Kaset, on up to three computers. One per person, while the 1,000 last.'],
    ['Download', 'Download Kubbe and Kaset for macOS or Windows from this page and install them.'],
    ['Paste the key in the plugin', 'Open the plugin in your DAW, paste the key into its activation card and press Activate.'],
  ],
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

export const PLUGINS = [KUBBE, KASET];

export const pluginBySlug = (slug) => PLUGINS.find((p) => p.slug === slug);
