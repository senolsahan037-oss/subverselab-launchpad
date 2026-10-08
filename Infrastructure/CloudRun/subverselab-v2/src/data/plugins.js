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
  // KUBBE 1402269, KASET 1402277 (the old $15 KUBBE + KASET bundle, 1402289, is
  // no longer offered anywhere on the site; orders already placed keep working
  // on the server: entitlements.js, LS_PRODUCT_SLUGS "...:bundle").
  kubbe: 'https://subverselab.lemonsqueezy.com/checkout/buy/89095abf-a0cf-4fab-9eba-c6b9b9c89ebe',
  kaset: 'https://subverselab.lemonsqueezy.com/checkout/buy/5c61153e-4fe6-48d4-899c-4bdbd97ac9d2',
  // The plugin family bundle (seven products, $19.99). TODO(owner): paste the
  // Lemon Squeezy checkout URL here. Empty = the button renders disabled
  // ("Available shortly") until the product exists.
  family: 'https://subverselab.lemonsqueezy.com/checkout/buy/7eb4adc0-a939-435f-9c9e-1b6df5e6c17c',
  // Single checkouts. TODO(owner): create one Lemon Squeezy product per plugin
  // (price = PRICES below, licence keys on, 2-year updates in the description),
  // paste each checkout URL here and add "<productId>:<slug>" to the Cloud Run
  // env LS_PRODUCT_SLUGS (see RELEASE_QUEUE.md). Empty = the Buy button renders
  // disabled as "Available shortly"; no page ever links to a missing checkout.
  koro: 'https://subverselab.lemonsqueezy.com/checkout/buy/6c76c84f-bef1-4a71-b15c-07bb06589e61',
  yanki: 'https://subverselab.lemonsqueezy.com/checkout/buy/b1449667-0384-4104-9297-7326d2352a90',
  hava: 'https://subverselab.lemonsqueezy.com/checkout/buy/bcddd3f5-b27a-42dc-b5ce-e4aa235a90e9',
  tutkal: 'https://subverselab.lemonsqueezy.com/checkout/buy/34b33342-0de7-439f-b5fd-4722687a947b',
  mihenk: 'https://subverselab.lemonsqueezy.com/checkout/buy/be1389b5-1087-4252-a1bc-640ba3167a2d',
  // Free plugins: a $0 Lemon Squeezy product (pricing "Lead magnet", licence keys off, no card asked).
  // TODO(owner): create the TABAN product, paste its checkout URL here and add "<productId>:taban" to
  // LS_PRODUCT_SLUGS. Empty = the "Get TABAN free" button renders disabled ("Available shortly").
  taban: '',
  // TODO(owner): the ALEV $0 product is 1419837 (draft); paste its checkout URL here, "1419837:alev" goes into LS_PRODUCT_SLUGS.
  alev: '',
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

// US dollars. Every plugin can be bought on its own at its price here, or as
// the family (owner decision 2026-10-05). The old $15 KUBBE + KASET bundle is gone.
export const PRICES = { kubbe: 9, kaset: 9, yanki: 9, hava: 12, koro: 15, mihenk: 49, tutkal: 12, family: 19.99 };
export const SOLD_SINGLY = ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk', 'tutkal'];
// Every purchase includes this many years of updates; the version the buyer has keeps working forever.
// No enforcement on downloads yet (RELEASE_QUEUE.md). server.js / entitlements.js use the same number.
export const UPDATE_YEARS = 2;
export const UPDATES_LINE = `Includes ${UPDATE_YEARS} years of updates; the version you have keeps working forever.`;

// The moment the family offer goes live: 2026-10-05 00:00 in Istanbul (UTC+3).
// ONE constant. Before it: Kubbe $9 and Kaset $9, no family block anywhere.
// From it: the family ($19.99, seven products) is shown next to the singles. React pages decide at
// render time in the browser (hooks/useFamilyLive.js); scripts/prerender.js
// writes the state at BUILD time, so the static HTML is only as new as the
// last build — rebuild and deploy after this moment to refresh it.
export const FAMILY_STARTS_AT = '2026-10-04T21:00:00Z';
export const isFamilyLive = (now = Date.now()) => now >= Date.parse(FAMILY_STARTS_AT);
const LIVE = isFamilyLive(); // state when this module was loaded (page load / build)

// The SubverseLab plugin family: one bundle of seven products (TUTKAL, the
// bus compressor, joined it on 2026-10-05). The offer runs on a person
// counter (the first 1,000 people, the launch2 counter; server.js LAUNCH2_CAP
// still refuses seat 1,001) AND a time limit, whichever comes first.
export const FAMILY_SLUGS = ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk', 'tutkal'];
export const FAMILY_PRICE = PRICES.family;
export const FAMILY_SINGLES_TOTAL = FAMILY_SLUGS.reduce((sum, slug) => sum + PRICES[slug], 0);
// The end date of the family offer, an ISO date 'YYYY-MM-DD' (owner decision
// 2026-10-05, date moved 2026-10-05 night: $19.99 until 1 November 2026). Shown in plain words; the server
// does not enforce the date. Empty = no date is shown.
export const FAMILY_OFFER_ENDS_AT = '2026-11-01';
// The server still stops at this many paid family seats (server.js LAUNCH2_CAP),
// so the copy says so. If the offer becomes date-only: raise LAUNCH2_CAP there AND set this to 0.
export const FAMILY_PERSON_CAP = 0;   // owner 2026-10-05: no 1,000-person cap; the launch price ends 1 November 2026
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function familyOfferEndLabel() {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(FAMILY_OFFER_ENDS_AT);
  if (!m || +m[2] < 1 || +m[2] > 12) return '';
  return `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`;
}
// 'YYYY-MM-DD' -> '1 November 2026' ('' when it is not a date).
export function formatDay(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m || +m[2] < 1 || +m[2] > 12) return '';
  return `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`;
}
// "$19.99 until 1 November 2026"
export const FAMILY_UNTIL = familyOfferEndLabel() ? `$${FAMILY_PRICE} until ${familyOfferEndLabel()}` : `$${FAMILY_PRICE}`;
// "$103 together → $19.99"
export const FAMILY_REGULAR_PRICE = FAMILY_SINGLES_TOTAL;   // the family's normal price = the seven single prices added up
export const FAMILY_VALUE_LINE = `Regular price $${FAMILY_REGULAR_PRICE}, launch price $${FAMILY_PRICE}`;
// "$19.99 until 1 November 2026, or for the first 1,000 people if that comes first"
export const FAMILY_OFFER_TERMS = FAMILY_PERSON_CAP
  ? `${FAMILY_UNTIL}, or for the first ${FAMILY_PERSON_CAP.toLocaleString('en-US')} people if that comes first`
  : FAMILY_UNTIL;
export const FAMILY_NAME = 'SubverseLab plugin family';
// Nothing is "coming later" any more (the compressor is TUTKAL, in the family). Kept as an empty
// string so callers that still print it add nothing.
export const FAMILY_LATER = '';
// Family visual (16:9, 1920x1080): the family block's image and the og image of /launch2.
export const FAMILY_IMAGE = '/plugins/family_7_16x9.png';
export const FAMILY_IMAGE_SIZE = [1920, 1080];
// Large web-size (<= 1400 px wide, webp) panel images for the homepage showcase: [src, width, height].
export const HERO_IMG = {
  family: ['/plugins/family_7_hero.webp', 1400, 788], kubbe: ['/plugins/kubbe/hero.webp', 1400, 551],
  kaset: ['/plugins/kaset/hero.webp', 964, 569], koro: ['/plugins/koro/hero.webp', 1400, 560],
  yanki: ['/plugins/yanki/hero.webp', 1400, 788], hava: ['/plugins/hava/hero.webp', 1400, 560],
  tutkal: ['/plugins/tutkal/hero.webp', 1400, 560], mihenk: ['/plugins/mihenk/hero.webp', 1400, 842],
  taban: ['/plugins/taban/hero.webp', 1400, 921],
  alev: ['/plugins/alev/hero.webp', 1400, 1283],
};
// Showcase order on the homepage (the family slide comes first).
export const SHOWCASE_SLUGS = ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'tutkal', 'mihenk'];
// Web-size (800 px wide, webp) copies of each product's panel, used as the card background in the Price grid.
export const CARD_BG = {
  kubbe: '/plugins/kubbe/card-bg.webp', kaset: '/plugins/kaset/card-bg.webp', koro: '/plugins/koro/card-bg.webp',
  yanki: '/plugins/yanki/card-bg.webp', hava: '/plugins/hava/card-bg.webp', mihenk: '/plugins/mihenk/card-bg.webp',
  tutkal: '/plugins/tutkal/card-bg.webp', family: '/plugins/family_7_card-bg.webp',
};

export const FORMATS = 'VST3 and AU on macOS (Apple Silicon and Intel) · VST3 on Windows';

// Lemon Squeezy's own customer page: any buyer can sign in there with the
// e-mail used at checkout (magic link) and see every order, file and key.
// https://docs.lemonsqueezy.com/help/online-store/my-orders
export const LS_MY_ORDERS = 'https://app.lemonsqueezy.com/my-orders';

export const PLUGINS_INDEX = {
  title: 'Audio Plugins | SubverseLab',
  description:
    LIVE
      ? `SubverseLab audio plugins for your DAW: seven plugins, each on its own from $9, or the ${FAMILY_NAME} of seven for ${FAMILY_UNTIL}. VST3 and AU. Includes ${UPDATE_YEARS} years of updates.`
      : 'SubverseLab audio plugins for your DAW: Kubbe, a reverb with three modes, and Kaset, cassette colour for the mix bus. VST3 and AU. $9 each.',
  path: '/plugins',
};

export const LAUNCH = {
  path: '/launch',
  title: 'KUBBE and KASET — $9 each | SubverseLab',
  description: LIVE
    ? `Kubbe (reverb) and Kaset (cassette colour) are out. The free first 1,000 are claimed: $9 each, or the ${FAMILY_NAME} of seven for ${FAMILY_UNTIL}.`
    : 'Kubbe (reverb) and Kaset (cassette colour) are out. The free first 1,000 are claimed: $9 each.',
  codesTotal: 1000,
  activationLimit: 3,
  offer: 'Free for the first 1,000 producers — both plugins',
  askHow: 'Sign in on subverselab.com/launch and download',
  // Shown only while the free 1,000 last (LaunchPage hides it once they are gone).
  instagram: 'Instagram: DM “KUBBE” or “KASET” to @subverse_lab and we reply with this page.',
  steps: [
    ['Sign in', 'Sign in on this page with Google or with an e-mail address. An e-mail sign-up has to be verified first — the link arrives by e-mail.'],
    ['Download', 'Download Kubbe and Kaset for macOS or Windows from this page. One producer is counted once, while the 1,000 last.'],
    ['Open in your DAW', 'Install the plugin and open it in your DAW. No key or activation is needed.'],
  ],
};

// /launch2. Before FAMILY_STARTS_AT it is the announcement of the four new
// products (no price); from then on it is the plugin family offer.
export const LAUNCH2 = {
  path: '/launch2',
  title: LIVE
    ? `${FAMILY_NAME} — seven products, $${FAMILY_PRICE} | SubverseLab`
    : 'KORO, YANKI, HAVA and MIHENK — out October 5 | SubverseLab',
  description: LIVE
    ? `KUBBE, KASET, KORO, YANKI, HAVA, MIHENK and TUTKAL together (worth $${FAMILY_SINGLES_TOTAL}): ${FAMILY_OFFER_TERMS}. Every plugin is also sold on its own. ${UPDATES_LINE}`
    : 'KORO, YANKI, HAVA and MIHENK, four new SubverseLab products, are out October 5, 2026.',
  codesTotal: 1000,
  activationLimit: 3,
  offer: LIVE ? `The ${FAMILY_NAME}: seven products for $${FAMILY_PRICE}` : 'KORO, YANKI, HAVA and MIHENK',
  // The same two lines, for whichever state is current (used by React pages that switch at render time).
  offerNow: `The ${FAMILY_NAME}: seven products for $${FAMILY_PRICE}`,
  offerBefore: 'KORO, YANKI, HAVA and MIHENK',
  terms: FAMILY_OFFER_TERMS,
  askHow: 'Buy once, then sign in on subverselab.com/launch2 and download',
  steps: [
    ['Buy', 'Buy the plugin family once, or any plugin on its own, with Lemon Squeezy. Use the e-mail you sign in with here.'],
    ['Sign in', 'Sign in on this page with Google or with an e-mail address. An e-mail sign-up has to be verified first.'],
    ['Download', 'Download KUBBE, KASET, KORO, YANKI, HAVA, MIHENK and TUTKAL for macOS or Windows from this page. KORO, YANKI, HAVA, MIHENK and TUTKAL unlock when your purchase is confirmed.'],
    ['Install', 'Install the plugins or the MIHENK standalone app. No key or activation is needed.'],
  ],
};

// The 100 tester seats for the launch-2 plugins (TestersPage.jsx, /api/testers/*).
export const TESTERS = {
  path: '/testers',
  title: 'Test KORO, YANKI, HAVA, MIHENK and TUTKAL — 100 tester seats | SubverseLab',
  description: '100 tester seats: producers on macOS and Windows, in any DAW, get KORO, YANKI, HAVA, MIHENK and TUTKAL free and tell us what breaks.',
};

export const KUBBE = {
  slug: 'kubbe',
  name: 'KUBBE',
  displayName: 'KUBBE',
  kind: 'Reverb',
  path: '/plugins/kubbe',
  model: 'KB-79',
  tagline: 'A reverb in three modes',
  title: 'KUBBE — a reverb in three modes | SubverseLab',
  description:
    'Kubbe is an algorithmic reverb with three modes — Hammam, Cistern and Valley — and a decay display that is measured, not nominal. VST3 and AU for macOS, VST3 for Windows. $9.',
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
  name: 'KASET',
  displayName: 'KASET',
  kind: 'Tape colour',
  path: '/plugins/kaset',
  model: 'KS-83',
  tagline: 'Cassette colour for the mix bus',
  title: 'KASET — cassette colour for the mix bus | SubverseLab',
  description:
    'Kaset is a cassette tape colour plugin for the mix bus: pick a generation from Master to 4th Dub and a tape type, and every copy loses top end and gains hiss, wow and saturation. VST3 and AU for macOS, VST3 for Windows. $9.',
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
// 'launch2': own counter, own claims, see server.js) and are sold in the
// plugin family bundle only.
// 2026-10-05 00:00 in Istanbul (UTC+3).
export const RELEASE2_AT = '2026-10-04T21:00:00Z';
export const RELEASE2_LABEL = 'October 5';

const LAUNCH2_COMMON = {
  launchId: 'launch2',
  releaseLabel: RELEASE2_LABEL,
  releaseAt: RELEASE2_AT,
  bundleSlug: 'family',
  titleSuffix: ' | SubverseLab',
  formats: FORMATS,
  modesLabel: 'Moods',
  // Each product sets its own `manual` (PDF only, like TUTKAL: there is no
  // hand-written manual page for them). Pages hide the manual block while
  // `manual` is null.
  manual: null,
  manualPage: null,
  demos: [],
  notYet: [],
};

export const KORO = {
  ...LAUNCH2_COMMON,
  slug: 'koro', name: 'KORO', displayName: 'KORO', kind: 'Vocal doubler + harmonizer', path: '/plugins/koro', model: 'KR-77',
  manual: '/plugins/koro/Koro_Manual.pdf',
  tagline: 'Drop it on the vocal. Auto key. Never a wrong note.',
  title: 'KORO — vocal doubler and harmonizer | SubverseLab',
  description: 'KORO is a vocal doubler and scale-aware harmonizer. It detects the key live while the singer sings, keeps to safe intervals until it is sure, and never plays a wrong note.',
  og: '/plugins/koro/koro_v2_card_4x5.png', cardImage: '/plugins/koro/koro_v2_front.png', imageSize: [1600, 640],
  intro: 'KORO listens while the singer sings. It detects the key and scale continuously, and until the key is sure it holds back any third and the voice stays on a plain unison double (or the fifth). Thirds only sound on notes where every likely key agrees. You never pick a scale, so the harmony cannot be wrong.',
  defaultMode: 'tight',
  modes: [
    { key: 'tight', name: 'Tight Double', image: '/plugins/koro/koro_v2_front.png', text: 'A close vocal double. Doubling alone needs no key.' },
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
  controlsNote: 'Latency is a fixed 54 ms at 44.1 kHz, with harmony on or off, and is reported to the host.',
};

export const YANKI = {
  ...LAUNCH2_COMMON,
  slug: 'yanki', name: 'YANKI', displayName: 'YANKI', kind: 'Tempo-synced tape echo', path: '/plugins/yanki', model: 'YK-74',
  manual: '/plugins/yanki/Yanki_Manual.pdf',
  tagline: 'A plain echo first. Moods swell into the loop.',
  title: 'YANKI — tempo-synced tape echo | SubverseLab',
  description: 'YANKI is a tempo-synced tape echo. It opens as a plain 1/8 echo at the host tempo; moods such as Dub Spiral and Worn Loop swell the repeats into a loop.',
  og: '/plugins/yanki/yanki_v2_hero_4x5.png', cardImage: '/plugins/yanki/yanki_v2_front.png', imageSize: [1600, 900],
  intro: 'Drop YANKI on a bus and it echoes in time: 1/8 at the host tempo, a few repeats that decay. Pick a mood when you want more. For Dub Spiral, Worn Loop and the others, turn FEEDBACK past HOLD and the loop swells up to the CAP you set.',
  defaultMode: 'echo',
  modes: [
    { key: 'echo', name: 'Echo', image: '/plugins/yanki/yanki_v2_slap.png', text: 'Each ring is a repeat: its size is the time, its brightness the level after feedback.' },
    { key: 'dub', name: 'Swell', image: '/plugins/yanki/yanki_v2_swell.png', text: 'Feedback past HOLD makes the loop swell, up to CAP.' },
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
  slug: 'hava', name: 'HAVA', displayName: 'HAVA', kind: 'Top-end air + spring sheen', path: '/plugins/hava', model: 'HV-72',
  manual: '/plugins/hava/Hava_Manual.pdf',
  tagline: 'Air on top. A short spring sheen. Never a reverb.',
  title: 'HAVA — top-end air and spring sheen | SubverseLab',
  description: 'HAVA adds a top-end air lift and a short spring sheen to a bus or the master. It is a colour box with a 0.12 s sheen tail, not a reverb.',
  og: '/plugins/hava/hava_v2_card_4x5.png', cardImage: '/plugins/hava/hava_v2_front.png', imageSize: [1600, 640],
  intro: 'Drop HAVA on the bus, turn AIR, pick a mood. The sheen is a short spring-style colour layer (chirp, twang, sparkle) and the panel says so: sheen tail 0.12 s, not a reverb. There is no decay or size control anywhere.',
  defaultMode: 'air',
  modes: [
    { key: 'air', name: 'Air Full', image: '/plugins/hava/hava_v2_front.png', text: 'It opens here: a clear top-end lift with the sheen kept short.' },
    { key: 'master', name: 'Master Air', image: '/plugins/hava/hava_v2_front_master_air.png', text: 'Air with MASTER SAFE on, for the master bus.' },
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
  slug: 'mihenk', name: 'MIHENK', displayName: 'MIHENK', kind: 'Mastering app', path: '/plugins/mihenk', model: 'MH-86',
  manual: '/plugins/mihenk/Mihenk_Manual.pdf',
  tagline: 'Transparent mastering. It measures first, and says why.',
  title: 'MIHENK — measured mastering app | SubverseLab',
  description: 'MIHENK is a transparent mastering app and DAW plugin. It measures peaks, loudness, spectrum and phase, lists findings with a measured reason, and applies editable scenarios.',
  og: '/plugins/mihenk/mihenk_v10_auto.png', cardImage: '/plugins/mihenk/mihenk_v10_auto.png', imageSize: [2960, 1780],
  formats: 'Standalone app and VST3/AU on macOS · Standalone app and VST3 on Windows',
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

export const TUTKAL = {
  ...LAUNCH2_COMMON,
  slug: 'tutkal', name: 'TUTKAL', displayName: 'TUTKAL', kind: 'Bus compressor', path: '/plugins/tutkal', model: 'TK-79',
  tagline: 'Bus glue · vocal levelling · sidechain pump',
  title: 'TUTKAL — bus glue, vocal levelling and sidechain pump | SubverseLab',
  description: 'TUTKAL is one compressor with three voicings: GLUE for the drum or mix bus, LA for vocals, PUMP for sidechain ducking in time with a kick. The name is Turkish for glue.',
  og: '/plugins/tutkal/tutkal_kart_4x5.png', cardImage: '/plugins/tutkal/front_glue.png', imageSize: [1600, 640],
  manual: '/plugins/tutkal/Tutkal_Manual.pdf',
  intro: 'TUTKAL means glue in Turkish: like a multi-purpose adhesive it is strongest at gluing, but made for different materials. One switch picks the voicing. GLUE holds a drum or mix bus together, LA levels a vocal without grabbing it, and PUMP ducks a pad or bass in time with the kick.',
  defaultMode: 'glue',
  modes: [
    { key: 'glue', name: 'GLUE', image: '/plugins/tutkal/front_glue.png', text: 'Drum and mix bus. A slow stage does the gluing and a fast stage lets the first milliseconds of a hit through, so the mix is held as one instead of grabbed on every hit. Ratio 1.5 to 20:1, attack 0.1 to 30 ms, release 0.1 to 1.2 s or AUTO.' },
    { key: 'la', name: 'LA', image: '/plugins/tutkal/front_la.png', text: 'Vocal leveller. Attack follows the level and release has two stages, so the vocal stays level and is never grabbed. PEAK REDUCTION sets the amount; COMPRESS is a soft 3:1, LIMIT a tighter 12:1.' },
    { key: 'pump', name: 'PUMP', image: '/plugins/tutkal/front_pump.png', text: 'Sidechain duck. It listens to a kick on the sidechain (or the track itself), attacks in under 1 ms and recovers in note values from 1/16 to 1/2 at the host tempo, in three shapes: exponential, linear or swell. DEPTH goes from 0 to 24 dB.' },
  ],
  modesLabel: 'Voicings',
  sections: [
    { heading: 'Three voicings, one switch', text: 'GLUE, LA and PUMP share one measured engine. Only the controls that work in the chosen voicing are shown on the panel.' },
    { heading: 'Quick start', text: 'On a drum bus: leave GLUE on, set THRESHOLD around -18 dB until the meter swings 2 to 4 dB, keep RELEASE on AUTO. On a vocal: switch to LA and raise PEAK REDUCTION to about half. On a pad: switch to PUMP, choose the kick as the sidechain in your DAW, turn EXT on and set NOTE and DEPTH.' },
  ],
  controls: [
    ['VOICING', 'GLUE, LA or PUMP.'],
    ['THRESHOLD', 'Level above which the compressor works (GLUE and PUMP), -40 to 0 dB.'],
    ['RATIO', 'GLUE: 1.5 to 20:1.'],
    ['ATTACK · RELEASE · AUTO', 'GLUE timing. AUTO release follows how long the passage was pressed.'],
    ['PEAK REDUCTION · COMPRESS / LIMIT', 'LA: how much to level, and the 3:1 or 12:1 character.'],
    ['DEPTH · NOTE · SHAPE · EXT', 'PUMP: how deep the duck goes, how long it takes to recover, the recovery shape, and the external sidechain key.'],
    ['MAKEUP / GAIN · MIX', 'Output gain, and dry to compressed blend.'],
    ['IN', 'Bypass. It is bit-exact and delayed by the latency, so the output never shifts in time.'],
    ['REAR', 'The back panel.'],
  ],
  controlsNote: 'Latency is 63 samples at every sample rate and is reported to the host. Undo and redo with Cmd+Z on macOS, Ctrl+Z on Windows. Mono sidechain input for PUMP.',
};

// The first four of the testers' products (TUTKAL joined them on 2026-10-05: TestersPage uses FAMILY_ONLY_PLUGINS).
export const LAUNCH2_PLUGINS = [KORO, YANKI, HAVA, MIHENK];
// Everything delivered through /launch2 (family and singles; testers get these five too): the four above plus TUTKAL.
export const FAMILY_ONLY_PLUGINS = [...LAUNCH2_PLUGINS, TUTKAL];

// Launch 1 keeps its own list: PLUGINS is what /plugins, /launch, the account
// downloads and the manuals iterate over, and stays Kubbe and Kaset.
export const PLUGINS = [KUBBE, KASET];
export const ALL_PLUGINS = [...PLUGINS, ...FAMILY_ONLY_PLUGINS];
// The seven products of the family bundle, in the order the pages list them.
export const FAMILY_PLUGINS = FAMILY_SLUGS.map((slug) => ALL_PLUGINS.find((p) => p.slug === slug));

// Free plugins, free forever and not part of the family. "Get it free" opens a $0 Lemon Squeezy checkout (an
// e-mail address, no card); that order is the entitlement (server.js / entitlements.js FREE_SLUGS, download
// ticket launchId 'free') and the download then appears on /account. FreePluginPage.jsx draws their pages.
export const TABAN = {
  slug: 'taban', name: 'TABAN', displayName: 'TABAN', kind: 'Reverse limiter', path: '/plugins/taban', model: 'TB-83',
  launchId: 'free', free: true, formats: FORMATS,
  tagline: 'A limiter sets a ceiling. TABAN sets a floor.',
  title: 'TABAN — a free reverse limiter: quiet parts never fall below the floor | SubverseLab',
  description: 'TABAN is a free reverse limiter: audio under the FLOOR is lifted to it, audio above it is left bit for bit. One fader, zero latency, never over the floor. VST3 and AU for macOS, VST3 for Windows.',
  og: '/plugins/taban/taban_card_4x5.png', cardImage: '/plugins/taban/front_lifting.png', imageSize: [1520, 1000],
  manual: '/plugins/taban/Taban_Manual.pdf', manualPage: null, demos: [], notYet: [],
  intro: '“Taban” is Turkish for floor. A limiter keeps audio from rising above a ceiling; TABAN keeps it from falling below a floor. Raise one fader and the quiet syllables, soft notes and fading tails of a track come up to the level you set, while everything louder passes through untouched.',
  modesLabel: 'On the panel',
  defaultMode: 'lifting',
  modes: [
    { key: 'lifting', name: 'Holding the floor', image: '/plugins/taban/front_lifting.png', text: 'A −36 dBFS tone with FLOOR at −18 dB: LIFT reads 18.0 dB and the OUT bar stops at the fader cap.' },
    { key: 'off', name: 'FLOOR at OFF', image: '/plugins/taban/front_default.png', text: 'How TABAN opens: FLOOR at OFF, nothing is changed.' },
    { key: 'bypassed', name: 'IN off', image: '/plugins/taban/front_bypassed.png', text: 'IN off: the output is the input, bit for bit. LIFT reads 0.0.' },
  ],
  sections: [
    { heading: 'Never over the floor', text: 'The lift is worked out from the level of the very sample it is applied to, so a loud sound arriving after a quiet one is never boosted on its way in: no output sample is louder than the input or the floor, whichever is higher. No lookahead, so no latency.' },
    { heading: 'Silence stays silence', text: 'TABAN lifts by at most 24 dB and lets go near silence: the lift fades out between −80 and −96 dBFS, so room tone, dither and the end of a reverb tail are not dragged up. A steady note gets a steady gain, so TABAN adds no distortion to it.' },
  ],
  controls: [
    ['FLOOR', 'OFF (−60) to 0 dBFS. Audio under it is lifted to it; audio above it is left alone. Linear in dB.'],
    ['OUTPUT', '−12 to +12 dB after the floor.'],
    ['IN', 'Off = bypassed, bit for bit, with a 10 ms crossfade.'],
    ['LIFT', 'Read-out of the lift right now, in dB, with a HOLDING THE FLOOR lamp.'],
    ['IN · OUT bars', 'Levels on the fader’s own scale: the OUT bar stops at the cap.'],
  ],
  controlsNote: 'Latency is 0 samples. Undo and redo with Cmd+Z on macOS, Ctrl+Z on Windows.',
};
export const ALEV = {
  slug: 'alev', name: 'ALEV', displayName: 'ALEV', kind: '3-band saturator', path: '/plugins/alev', model: 'AL-81',
  launchId: 'free', free: true, formats: FORMATS,
  tagline: 'Three rings of heat. One ember that shows it.',
  title: 'ALEV — a free three-band saturator with an ember that glows with the heat | SubverseLab',
  description: 'ALEV is a free three-band saturator: three steel rings heat the lows, mids and highs, and the ember in the centre glows with the saturation. Loudness-matched, 8x oversampled, clean at any heat. VST3 and AU for macOS, VST3 for Windows.',
  og: '/plugins/alev/alev_card_4x5.png', cardImage: '/plugins/alev/alev_default.png', imageSize: [960, 880],
  manual: '/plugins/alev/Alev_Manual.pdf', manualPage: null, demos: [], notYet: [],
  intro: '“Alev” is Turkish for flame. ALEV splits the sound at 200 Hz and 3 kHz and heats each part on its own: turn a steel ring and that band saturates, from a faint warmth to a dense, driven sound. The ember in the centre is the only light on the unit and shows the heat of all three bands, breathing with the music.',
  modesLabel: 'On the panel',
  defaultMode: 'default',
  modes: [
    { key: 'default', name: 'Default', image: '/plugins/alev/alev_default.png', text: 'How ALEV opens: LOW 30, MID 30, HIGH 20, DRY/WET at WET. A drum loop is playing: the ember shows the heat of each band.' },
    { key: 'hot', name: 'Hot', image: '/plugins/alev/alev_hot.png', text: 'LOW 90, MID 70, HIGH 100: all three zones of the ember burn.' },
    { key: 'gang', name: 'GANG', image: '/plugins/alev/alev_gang.png', text: 'GANG pressed: turning LOW moves all three rings together. The ember names the ring and its value.' },
  ],
  sections: [
    { heading: 'Heat, not loudness', text: 'Each ring is loudness-matched: turning one band from 0 to 100 changes the loudness of pink noise by less than 0.1 LU, so what you hear is the saturation, not a louder signal. The output never passes −1 dBTP.' },
    { heading: 'Clean at any heat', text: 'The saturation runs 8 times oversampled with antiderivative anti-aliasing: with HIGH at 100, a 10 kHz tone leaves no fold-back above −85 dBc. DRY/WET is phase-coherent, so blending in the dry signal never thins the sound.' },
    { heading: 'Rings that move together', text: 'Three pushers on the case set how the rings move. FREE: each on its own. LINK: the heat spreads to the neighbouring bands, each step 30 % behind (turn HIGH and MID follows, then LOW). GANG: all three turn together.' },
  ],
  controls: [
    ['LOW · MID · HIGH', 'Three steel rings, 0 to 100 % heat each, a full turn. HIGH is the inner ring, LOW the outer. Crossovers at 200 Hz and 3 kHz. Defaults 30 / 30 / 20.'],
    ['DRY/WET', 'The curved fader on the left of the bezel, 0 to 100 %. Default WET (100 %).'],
    ['FREE · LINK · GANG', 'The pushers on the right of the case: how the rings move together.'],
    ['Ember', 'The heat of the three bands: HIGH in the centre, MID around it, LOW at the edge. While a ring turns it shows the ring’s name and value.'],
  ],
  controlsNote: 'Latency 92 samples (1.9 ms at 48 kHz), reported to the host. Drag up or down; Shift for fine moves; double-click to reset.',
};
export const FREE_PLUGINS = [TABAN, ALEV];

export const pluginBySlug = (slug) => [...ALL_PLUGINS, ...FREE_PLUGINS].find((p) => p.slug === slug);
