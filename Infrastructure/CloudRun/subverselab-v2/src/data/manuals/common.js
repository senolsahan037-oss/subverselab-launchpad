// Shared pieces of the owner's manuals as web pages (src/data/pluginManuals.js, one file per product in this folder).
// Plain ES module, read by PluginManualPage.jsx and by scripts/prerender.js under Node, like plugins.js.
//
// Text may use `code` and **bold**; both renderers understand only those two.
// Block types: { p }, { list }, { steps }, { table: { head, rows } }, { note }, { recipes: [{ name, settings, text }] }, { h3 }.

import {
  ACTIVATION_LINE, ACTIVATION_SHORT, ACTIVATION_NO_KEY, ACTIVATION_LINE_FREE, UPDATES_LINE, CHECKOUT, HERO_IMG, line2AvailableLine,
} from '../plugins.js';

// Installation, the same steps on every manual page. Options:
//   standalone     the macOS package also installs a Standalone application
//   winStandalone  the Windows zip also holds the standalone application
//   instrument     the plug-in is an instrument (VST3 / AU instrument)
//   macSteps / winSteps  replace the default steps when a product installs differently (taken from its own manual)
//   extra          blocks appended after the Windows steps (for example a note on first launch)
export const installation = (name, {
  standalone = false, winStandalone = false, instrument = false, macSteps = null, winSteps = null, extra = [],
} = {}) => {
  const kind = instrument ? 'instrument' : 'plug-in';
  const au = instrument ? 'an Audio Unit (AU) instrument' : 'an Audio Unit (AU)';
  const mac = `${name} installs as ${au} and a VST3 ${kind} on macOS (Apple Silicon and Intel)${standalone ? ', and also runs there as a Standalone application' : ''}.`;
  const win = winStandalone
    ? `On Windows (64-bit) it installs as a VST3 ${kind} and a standalone application.`
    : `On Windows (64-bit) it installs as a VST3 ${kind}.`;
  return [
    { p: `${mac} ${win}` },
    { h3: 'macOS' },
    {
      steps: macSteps || [
        'Run the installer package (`.pkg`) you downloaded. It is signed with a Developer ID and notarised by Apple, so macOS opens it without any extra step.',
        `Choose what to install: the VST3 ${kind} and the Audio Unit${standalone ? ' and the Standalone application' : ''}.`,
        'Restart your DAW, or make it rescan its plug-in list.',
      ],
    },
    { h3: 'Windows' },
    {
      steps: winSteps || [
        'If Windows blocks the downloaded files: right-click the zip, choose **Properties**, tick **Unblock**, then extract.',
        'Copy the `.vst3` folder to `C:\\Program Files\\Common Files\\VST3\\`.',
        'Rescan plug-ins in your DAW.',
      ],
    },
    ...extra,
  ];
};

// How a buyer gets the download, in the same words as the product's own page (PluginRoom.jsx buyText) and with the same
// licence sentence: the seven launch products keep their key on the Account page (not asked for), RU-8 / JING FANG / SEDA / ELEK
// have no key (noKey), the free plugins have nothing to activate.
export const gettingIt = (plugin) => {
  const name = plugin.displayName;
  const where = `subverselab.com${plugin.path}`;
  let p;
  if (plugin.free) {
    p = `${name} is free, forever. Get it on ${where}: sign in first so the order lands on your account; the checkout asks only for an e-mail address, no card. The download then appears on that page and on your Account page. ${ACTIVATION_LINE_FREE}`;
  } else if (plugin.launchId === 'line2' && !CHECKOUT[plugin.slug]) {
    p = `${line2AvailableLine(plugin)}. Once you have bought ${name}, the download appears on ${where} and on your Account page. ${UPDATES_LINE}`;
  } else if (plugin.launchId === 'solo' || plugin.launchId === 'line2') {
    p = `Buy ${name} on ${where} through Lemon Squeezy, then sign in with the e-mail you paid with: the download appears on that page and on your Account page. ${UPDATES_LINE} ${plugin.noKey ? ACTIVATION_NO_KEY : ACTIVATION_SHORT}`;
  } else {
    p = `Buy ${name} on ${where} through Lemon Squeezy, then sign in with the e-mail you paid with: the download appears on that page and on your Account page. ${UPDATES_LINE} ${ACTIVATION_LINE}`;
  }
  return [
    { p },
    {
      steps: [
        plugin.free ? 'Sign in on subverselab.com with the e-mail address you used at the checkout.' : 'Sign in on subverselab.com with the e-mail address you paid with.',
        `Open your Account page, or ${where}, and download the macOS package or the Windows zip.`,
        'Install it as described under Installation, then open it.',
      ],
    },
  ];
};

// The fields every manual shares, filled from the product in plugins.js. The page image is the product's large panel
// image already on the site (HERO_IMG): no new files.
export const manualBase = (plugin, { subtitle, title, description, imageAlt }) => {
  const [image, w, h] = HERO_IMG[plugin.slug];
  return {
    slug: plugin.slug,
    plugin,
    path: `${plugin.path}/manual`,
    title: title || `${plugin.displayName} manual — installation, controls and specifications | SubverseLab`,
    description,
    subtitle,
    image,
    imageSize: [w, h],
    imageAlt: imageAlt || `${plugin.displayName}’s front panel`,
    pdf: plugin.manual,
  };
};
