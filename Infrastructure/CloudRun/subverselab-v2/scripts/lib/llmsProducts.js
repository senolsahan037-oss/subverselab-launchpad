// The products half of llms.txt / llms-full.txt: plug-ins, apps, sample packs, preset packs and Loom.
// Every line is built from the same data the pages render (src/data/*), so an agent reading these files
// is told what a visitor sees, and a change to a product, price or pack reaches both at the next build.
// No product counts (owner 17 Oct): lists come from the data, sentences never say how many.
import {
  FAMILY_PLUGINS, LINE2_PLUGINS, PRICES, SOLD_SINGLY, FAMILY_NAME, FAMILY_PRICE,
  FAMILY_SINGLES_TOTAL, FAMILY_LIST_PRICE, familyOfferEndLabel, isFamilyOfferOver, priceText, trustLineFor, TRUST_LINE_FREE,
  UPDATES_LINE, line2AvailableLine, STORE_PLUGINS,
} from '../../src/data/plugins.js';
import { visiblePacks, packPath, contentsLine, formatLine } from '../../src/data/packFacts.js';
import { packOffer, priceLabel } from '../../src/data/samplePackPrices.js';
import { PRESET_PACK_LIST } from '../../src/data/presetPacks.js';

const SITE_URL = 'https://subverselab.com';
const url = (path) => `${SITE_URL}${path}`;
const names = (list) => list.map((p) => p.displayName).join(', ');

// The family line while the offer ran; since FAMILY_RETIRED (owner 2026-10-28) it is not printed at all.
function familyLine() {
  if (isFamilyOfferOver()) return '';
  const end = familyOfferEndLabel();
  return `- [${FAMILY_NAME}](${url('/launch2')}): ${names(FAMILY_PLUGINS)} together, $${FAMILY_PRICE} (list price $${FAMILY_LIST_PRICE})${end ? ` until ${end}` : ''} (the single prices add up to $${FAMILY_SINGLES_TOTAL}). Each is also sold on its own.\n`;
}

function priceFor(p) {
  if (p.free) return 'Free (a $0 checkout that asks for an e-mail address, no card)';
  if (LINE2_PLUGINS.includes(p)) return line2AvailableLine(p);
  if (SOLD_SINGLY.includes(p.slug)) return isFamilyOfferOver() ? priceText(p.slug) : `${priceText(p.slug)} on its own, or in the ${FAMILY_NAME}`;
  return PRICES[p.slug] != null ? priceText(p.slug) : '';
}

const productLine = (p) => `- [${p.displayName}](${url(p.path)}): ${p.kind}. ${p.description} Price: ${priceFor(p)}.`;

export function llmsProductIndex() {
  const packs = visiblePacks();
  const packLines = packs.map((p) => {
    const offer = packOffer(p);
    return `- [${p.fullName}](${url(packPath(p))}): ${p.kindLine}. ${contentsLine(p)}, ${formatLine(p)}.${offer.buyable ? ` Price: ${priceLabel(offer.price)}.` : ' Not on sale at the moment.'}`;
  });
  const presetLines = PRESET_PACK_LIST.map((p) => {
    const offer = packOffer(p.id);
    const price = p.free ? 'Free with a SubverseLab account.' : offer.buyable ? `Price: ${priceLabel(offer.price)}.` : 'Not on sale at the moment.';
    return `- ${p.name} (${p.kind}): ${p.summary} ${price}`;
  });
  return `## Plug-ins and apps

Plug-ins for macOS and Windows (VST3 and AU on macOS, VST3 on Windows; some are also standalone apps). Bought through Lemon Squeezy; the download appears on the buyer's Account page at ${url('/account')}. Paid plug-ins: ${UPDATES_LINE}

${familyLine()}${STORE_PLUGINS.map(productLine).join('\n')}

## Sample packs

Made from scratch and measured file by file; royalty-free in your own music. Catalogue: ${url('/sample-packs')}

${packLines.join('\n')}

## Preset packs

For Ableton Live. Catalogue: ${url('/preset-packs')}

${presetLines.join('\n')}

## Loom

- [Loom](${url('/loom')}): a free, open-source local MCP server for Ableton Live. It reads your own projects and library, answers with counts instead of guesses, and writes MIDI, device chains, automation and markers into a running Live session, reading every write back.
`;
}

// Long form: one section per product, from the same fields its page renders.
export function llmsProductSections() {
  const plugins = STORE_PLUGINS;   // newest release first (src/data/productDates.js)
  return plugins.map((p) => {
    const parts = [
      `# ${p.displayName} — ${p.kind}`,
      `Source: ${url(p.path)}`,
      '',
      p.description,
      p.intro || '',
      `Price: ${priceFor(p)}.`,
      `Formats: ${p.free ? TRUST_LINE_FREE : trustLineFor(p.slug)}.`,
      ...(p.sections || []).map((s) => `\n## ${s.heading}\n${s.text}`),
    ];
    if (p.controls?.length) parts.push(`\n## Controls\n${p.controls.map(([k, v]) => `- ${k}: ${v}`).join('\n')}${p.controlsNote ? `\n${p.controlsNote}` : ''}`);
    return parts.filter((x) => x !== null).join('\n');
  }).join('\n\n---\n\n');
}
