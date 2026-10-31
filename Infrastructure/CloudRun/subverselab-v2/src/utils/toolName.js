// Tool names drop the old "Subverse " prefix (owner 2026-10-15): "Subverse Splitter" is shown as "Splitter".
// The Firestore products and articles still carry the prefixed names, so the app and the prerender both pass
// what they read through here. Only "Subverse " followed by a capital is touched: slugs (subverse-mix-check),
// URLs and "SubverseLab" stay as they are.
const PREFIX = /\bSubverse (?=[A-Z])/g;

export function stripToolPrefix(value) {
  if (typeof value === 'string') return value.replace(PREFIX, '');
  if (Array.isArray(value)) return value.map(stripToolPrefix);
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, stripToolPrefix(v)]));
  }
  return value;
}
