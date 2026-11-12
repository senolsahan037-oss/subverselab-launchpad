// Writes the live items' commercial facts into the data objects the buttons and the store order read: PRICES, CHECKOUT,
// LAUNCH_PRICES / LAUNCH_ENDS, MUSEHUB and the plug-in index (src/data/plugins.js), PACK_PRICES / PACK_CHECKOUT
// (samplePackPrices.js) and PRODUCT_DATES (productDates.js). Only fields the panel filled in; a hand-written value stays
// unless the live item sets one, and a hidden live item changes nothing.
import { liveAt } from '../../api/catalogSchema.js';
import { PRODUCT_DATES } from '../data/productDates.js';
import { PACK_PRICES, PACK_CHECKOUT } from '../data/samplePackPrices.js';
import { PRICES, CHECKOUT, LAUNCH_PRICES, LAUNCH_ENDS, MUSEHUB, CATALOG_PLUGIN_INDEX } from '../data/plugins.js';
import { pluginFromDoc } from './shapes.js';

export function applyCatalogData(cat, now = Date.now()) {
  for (const d of (cat.samplePacks || []).concat(cat.presetPacks || [])) {
    if (!liveAt(d, now)) continue;
    if (d.price != null) PACK_PRICES[d.id] = d.price;
    if (d.checkout) PACK_CHECKOUT[d.id] = d.checkout;
    if (d.released || d.updated) PRODUCT_DATES[d.id] = { released: d.released || d.updated, updated: d.updated || d.released };
  }
  for (const d of cat.plugins || []) {
    if (!liveAt(d, now)) continue;
    if (d.price != null) PRICES[d.id] = d.price;
    if (d.checkout) CHECKOUT[d.id] = d.checkout;
    if (d.launchPrice != null && d.launchEnds) { LAUNCH_PRICES[d.id] = d.launchPrice; LAUNCH_ENDS[d.id] = d.launchEnds; }
    if (d.released || d.updated) PRODUCT_DATES[d.id] = { released: d.released || d.updated, updated: d.updated || d.released };
    if (d.musehub) MUSEHUB[d.id] = d.musehub;
    if (!d.edits) CATALOG_PLUGIN_INDEX[d.id] = pluginFromDoc(d);
  }
}
