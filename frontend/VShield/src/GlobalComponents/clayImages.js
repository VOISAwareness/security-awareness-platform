/**
 * clayImages: one place for the app's clay-style pictures.
 *
 * Every image under src/assets/clay/ (any subfolder) is picked up at build
 * time and named by its file name without the extension: assets/clay/
 * icons/shield-check.webp is "shield-check". The level badges, which come at
 * four widths in assets/badges/, are reached as "badge:<level id>"
 * (badgeImages.js). See assets/clay/README.md for how to add one.
 */
import { badgeSrc, badgeSrcSet } from './badgeImages';

const files = import.meta.glob('../assets/clay/**/*.{webp,png}', { eager: true, import: 'default' });

const byName = {};
Object.entries(files).forEach(([path, url]) => {
  const name = path.split('/').pop().replace(/\.(webp|png)$/i, '').toLowerCase();
  byName[name] = url;
});

/** Every clay image name the app has (badges not listed). */
export const CLAY_NAMES = Object.freeze(Object.keys(byName).sort());

/**
 * { src, srcSet } for a name, or null when there is no such picture.
 * `width` is the size it is shown at (CSS px x device pixel ratio), used to
 * pick the badge width.
 */
export function claySource(name, width = 256) {
  if (typeof name !== 'string' || !name) return null;
  if (name.startsWith('badge:')) {
    const id = name.slice('badge:'.length);
    const src = badgeSrc(id, width);
    return src ? { src, srcSet: badgeSrcSet(id) } : null;
  }
  const src = byName[name.toLowerCase()];
  return src ? { src, srcSet: undefined } : null;
}
