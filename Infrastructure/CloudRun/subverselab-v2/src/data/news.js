// Homepage news strip (owner 2026-10-26: "ilk kısım artık kendi haber sayfamız, ui frame kaydırma efekti ile").
// Each item is one frame: the real panel of the product, a kicker, a headline and one line. `show`, `title` and `line` may
// be functions of the date, decided in the visitor's browser (the JING FANG price leaves its frame when the launch price ends).
// Order is the owner's: BOE-B date, TORNA out now (28 Oct), thanks for the family offer (28 Oct), JING FANG launch price, the tester programme (the "SEDA joins the family" frame was
// removed on 2026-10-27: the family stays as sold).
// No product counts and no "coming soon" in the copy (CLAUDE.md); BOE-B may tell its dedication (owner 2026-10-24).
import { media } from '../utils/endpoints.js';
import { byLatestRelease } from './productDates.js';
import { FAMILY_ONLY_PLUGINS, FAMILY_PLUGINS, FAMILY_SINGLES_TOTAL, FAMILY_STACK_IMG, LAUNCH_PRICES, OFFERS, PRICES, formatDay, launchEndLabel, launchPriceActive, offerActive, currentPrice } from './plugins.js';

export const NEWS = [
  {
    // Owner 7 Nov: the free days are internal ("bunlar iç bilgi hiç bir yerde geçmemeli"; announcing them stops sales before
    // them, as Loot Audio's Glyn said). The item appears only WHILE the offer runs (OFFERS.jingfang) and names no start date;
    // before it nothing on the site says that JING FANG will be free. While it runs it replaces the JING FANG frame below.
    key: 'jingfang-bf',
    kicker: 'JING FANG · Black Friday',
    date: 'Black Friday',
    show: (now) => offerActive('jingfang', now),
    title: 'Black Friday: JING FANG is free.',
    line: `The whole microtonal synthesizer is free instead of $${PRICES.jingfang}: the current release, the full instrument, yours to keep.`,
    image: media('/news/jf-device.webp'),
    alt: 'JING FANG as a hardware synthesizer on a studio desk, two red dragons coiled around its sides',
    to: '/plugins/jingfang',
    cta: 'See JING FANG',
  },
  {
    key: 'boeb',
    kicker: 'BOE-B · free vocal plugin',
    date: '19 November',
    title: 'Dedicated to Boe B (1970–2000), a pioneer of rap in Turkish.',
    // Owner 28 Oct: the news read cold ("hiç bir pazarlama hiç bir cilalama yok"); every line now sells, and stays true.
    line: 'Play it eight seconds of your song and it tells you why the vocal sounds dull: the level, words that drop, missing presence, mud or no air. Then it lifts the voice where it needs it, in one move. A free plugin, and a thank-you to the voice that started it all.',
    // Owner 30 Oct, picked "2": BOE-B as a red floor unit with the mic plugged in, a rapper in a small studio (Flow, from the real
    // panel; docs/marketing/pedal_2026-10-30 in subverselab-boeb, the model's old hyphenated mark painted out). News only.
    image: media('/news/boeb-pedal.webp'),
    alt: 'BOE-B as a red hardware unit on a studio floor, a rapper recording into a microphone plugged into it',
    tone: 'boeb',
  },
  {
    // Owner 28 Oct: TORNA right under BOE-B, "Out now" (it goes live with the 1 Nov deploy).
    key: 'torna',
    kicker: 'TORNA · graphic equalizer · out now',
    title: 'The hi-fi graphic equalizer, back on your desk.',
    line: `Twelve sliders for each channel, modelled part by part from a 1983 service schematic, with a spectrum analyzer glowing in the middle and the original's NOR/REV switch. Shape a master, bring a vocal forward, give drums their weight, by eye and by ear. Presets to start from, your own to save. $${PRICES.torna}, standalone app, VST3 and AU.`,
    // Owner 30 Oct: "tornanın kutulu görselini koy". The family's box mockup (subverselab-kaset/tools/mockups.py render_box),
    // made that day from the panel without its footer, on a clear ground: subverselab-analog-eq/docs/marketing/torna_box_left_clear.png.
    image: media('/news/torna-box.webp'),
    bare: true,   // owner 30 Oct: "siyah arkaplanı kaldır sadece kutuyu görelim": the box alone, no window frame round it
    alt: 'TORNA in its box: the panel on a cream box front, model TR-83 on the side',
    to: '/plugins/torna',
    cta: 'See TORNA',
  },
  {
    // Owner 3 Nov: the family is back, at the MuseHub price. This replaces the 28 Oct "thank you, the offer has ended" frame
    // (its line said every plugin is sold on its own from here on, no longer true). The offer itself lives on /plugins#family.
    key: 'family',
    kicker: 'Back by popular demand · the plugin family',
    title: 'You asked for it: the SubverseLab plugin family is back.',
    line: `When the launch offer closed, the messages did not stop, so we put the whole family back in one box. ${byLatestRelease(FAMILY_PLUGINS, (p) => p.slug).map((p) => p.displayName).join(', ').replace(/, ([^,]*)$/, ' and $1')}: reverb, tape colour, vocal doubling, echo, air, bus glue and mastering, for $${PRICES.family} instead of $${FAMILY_SINGLES_TOTAL} one by one. One checkout, and every one of them opens on your account for macOS and Windows.`,
    image: FAMILY_STACK_IMG[0],
    alt: 'The SubverseLab family in their cream boxes, stacked on a dark green floor',
    to: '/plugins#family',
    cta: 'Get the family',
  },
  {
    // Owner 30 Oct: the launch-price and GENERATE frames are one JING FANG item. While the launch price runs it leads the
    // title and closes the line; afterwards the item stays, without the price.
    key: 'jingfang',
    show: (now) => !offerActive('jingfang', now),   // during Black Friday the first frame says it
    kicker: 'JING FANG · microtonal synthesizer',
    title: (now) => (offerActive('jingfang', now)
      ? `${OFFERS.jingfang.label}: free instead of $${PRICES.jingfang}.`
      : launchPriceActive('jingfang', now)
        ? `$${currentPrice('jingfang', now)} instead of $${PRICES.jingfang}.`
        : 'Play between the keys, and let it write the first idea.'),
    line: (now) => `A synthesizer that plays between the keys. Three keyboard rows on a 53-step grid put the notes of maqam and other non-Western melodies exactly where they belong, and it can learn a tuning from a recording. Stuck on a blank pattern? GENERATE writes a melody, a bass line, chords, an arp rhythm or a beat straight onto the piano roll, where you shape every note; not quite it, mutate it and keep what works.${offerActive('jingfang', now) ? ` Free until ${launchEndLabel('jingfang', now)}: the current release, the full instrument, yours to keep.` : launchEndLabel('jingfang', now) ? ` Launch price until ${launchEndLabel('jingfang', now)}.` : ''}`,
    // Owner 30 Oct: the device picture (Flow, from the real panel; branding/out/device_2026-10-30/jf_device_3.jpg). News
    // only: its small lettering is redrawn by the model, so store and room keep the real panel.
    image: media('/news/jf-device.webp'),
    alt: 'JING FANG as a hardware synthesizer on a studio desk, two red dragons coiled around its sides',
    to: '/plugins/jingfang',
    cta: 'See JING FANG',
  },
  {
    key: 'testers',
    kicker: 'Tester programme',
    title: 'Test our plugins, keep them free.',
    line: 'Every released SubverseLab plugin is yours, free, for as long as you test with us, and every report you send shapes what we build next. We pick testers so that every operating system and DAW is covered, and a person reads every application.',
    // Owner 30 Oct: a tester's studio with nobody's name in it, an empty chair, in the brand palette: bottle-green walls, cream,
    // brass (Flow, from the real TUTKAL panel; launch_desk/testers/studio_2026-10-30/brand_1.jpg). No tester is named.
    image: media('/news/testers-studio.webp'),
    alt: 'A tidy home studio with green walls and a brass lamp, an empty cream chair at the desk and TUTKAL open on the screen',
    to: '/testers',
    cta: 'Apply for a seat',
  },
  // Owner 28 Oct: more news (all but sample and preset packs, which get the side shelf instead).
  {
    key: 'elek',
    kicker: 'ELEK · stem separation app',
    title: 'Pull any song apart, right on your own computer.',
    line: 'Drop in a track and ELEK splits it into stems, takes the vocal out, and tells you its key and tempo. Nothing is uploaded anywhere: it runs on your machine, so you can remix, sample and practise with any record you own.',
    // Owner 30 Oct: a drawing of the split instead of the panel, on the page's own ground: one song on the left branching into
    // vocals, drums, bass and other (HT-Demucs' four stems). Gold and teal tokens read on cream and on dark green alike.
    // Drawn by script: 01_AI_Tools/subverselab-studio/marketing/elek/elek_stems.png.
    image: media('/news/elek-stems.webp'),
    bare: 'flat',   // a flat drawing: no window and no drop shadow
    alt: 'One song waveform branching into four stems: vocals, drums, bass and other',
    to: '/plugins/elek',
    cta: 'See ELEK',
  },
  {
    key: 'free-plugins',
    kicker: 'Free plugins',
    title: 'Start for free, keep them forever.',
    line: 'TABAN is a limiter that sets a floor instead of a ceiling. ALEV puts three rings of heat on any sound. KIYMA minces your last phrase in time with your song. Free downloads, no card, no licence key to type.',
    // Owner 30 Oct: "arkaplanı kaldıralım, plugin zemine otursun": ALEV cut out of its flat green ground; the old hyphenated
    // lockup on the bezel is replaced by the current one, bent along the bezel (01_AI_Tools/subverselab-kor/alev_cutout.png).
    image: media('/news/free-alev-cut.webp'),
    bare: true,
    alt: 'ALEV front panel: three glowing saturation rings',
    to: '/plugins',
    cta: 'Get the free plugins',
  },
  {
    key: 'manuals',
    kicker: 'Manuals · now online',
    title: 'Every manual, readable right here.',
    line: 'Each plugin now has its full manual as a web page as well as a PDF: what every control does, quick starts and where to use it. Open it beside your DAW and learn as you play.',
    // Owner 30 Oct: like the other frames, on the page's own ground: three real manual pages (JING FANG, KUBBE, TORNA, page 2 of
    // each PDF) fanned out with soft shadows (01_AI_Tools/subverselab-studio/marketing/manuals/manual_fan.png).
    image: media('/news/manuals-fan.webp'),
    bare: true,
    alt: 'Three SubverseLab manual pages fanned out: JING FANG, KUBBE and TORNA',
    to: '/plugins/torna/manual',
    cta: 'Read a manual',
  },
  {
    key: 'tool-credits',
    kicker: 'Browser tools · credits',
    title: 'Every plugin you buy also powers our browser tools.',
    line: 'Each dollar you spend adds 100 tool credits to your account. Check a mix, split a song or map an arrangement right in the browser: your daily free use comes first, and your credits pick up from there.',
    // Owner 30 Oct: a drawing instead of a tool screenshot: $1 becomes 100 credits that flow into Mix Check, Splitter and
    // Arrangement GPS (their own glyphs). Gold and teal only, so it reads in both themes
    // (01_AI_Tools/subverselab-studio/marketing/credits/tool_credits.png).
    image: media('/news/tool-credits-flow.webp'),
    bare: 'flat',
    alt: 'One dollar becomes 100 credits, which flow into Mix Check, Splitter and Arrangement GPS',
    to: '/tools',
    cta: 'Open the tools',
  },
];

// `show`, `title` and `line` may depend on the date (a launch price); they are resolved here, once per page view.
const at = (v, now) => (typeof v === 'function' ? v(now) : v);
export const liveNews = (now = Date.now()) => NEWS
  .filter((n) => (n.show ? n.show(now) : true))
  .map((n) => ({ ...n, title: at(n.title, now), line: at(n.line, now) }));
