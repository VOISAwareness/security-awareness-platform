/**
 * The badge pictures, by level id (see services/levels.js).
 *
 * Every badge sits on the same 1024 x 1280 canvas (4:5), bottoms aligned, on
 * a transparent background, so badges line up and work on light and dark
 * screens alike. Each comes at four widths; `srcSet` lets the browser fetch
 * only the one the screen needs (a leaderboard row takes a few KB, the big
 * profile badge the sharp large copy).
 *
 * Made from the clay renders in "Point system and badges": cut out of the
 * deck, upscaled 4x with Real-ESRGAN, background and baked shadow removed.
 * When the original renders arrive, replace the files under the same names.
 */
const files = import.meta.glob('../assets/badges/*.webp', { eager: true, import: 'default' });

export const BADGE_WIDTHS = [128, 256, 512, 1024];
/** Height / width of every badge picture. */
export const BADGE_RATIO = 1280 / 1024;

const urls = {};
Object.entries(files).forEach(([path, url]) => {
  const m = /\/([A-Z0-9]+)-(\d+)\.webp$/.exec(path);
  if (m) (urls[m[1]] ||= {})[Number(m[2])] = url;
});

/** The picture for a level id at the smallest width >= `width` (CSS px x DPR). */
export function badgeSrc(id, width = 512) {
  const set = urls[id];
  if (!set) return null;
  const w = BADGE_WIDTHS.find((x) => x >= width) || BADGE_WIDTHS.at(-1);
  return set[w] || null;
}

/** "url 128w, url 256w, ..." for an <img srcSet>. */
export function badgeSrcSet(id) {
  const set = urls[id];
  if (!set) return undefined;
  return BADGE_WIDTHS.filter((w) => set[w]).map((w) => `${set[w]} ${w}w`).join(', ');
}
