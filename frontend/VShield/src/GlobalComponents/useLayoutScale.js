import { useEffect, useState } from 'react';

// The app is drawn at 0.9 on a 1366 x 768 window (a 1080p laptop at about
// 140% scaling). On bigger windows -- the same laptop at 125%, or a 32-inch
// monitor -- it grows with the window, up to 1.5 times, so it looks the same
// at any display scaling and fills large screens instead of spreading out.
// The smaller of the two ratios is used, so a wide but short window (or a tall,
// narrow one) is never over-scaled. Phones and small windows stay at 0.9.
export const BASE_LAYOUT_SCALE = 0.9;
export const DESIGN_WIDTH = 1366;
export const DESIGN_HEIGHT = 768;
export const MAX_GROWTH = 1.5;

/** The whole-app zoom for a window of w x h CSS pixels. */
export function layoutScaleFor(w, h) {
  const growth = Math.min(MAX_GROWTH, Math.max(1, Math.min(w / DESIGN_WIDTH, h / DESIGN_HEIGHT)));
  return Math.round(BASE_LAYOUT_SCALE * growth * 1000) / 1000;
}

const current = () =>
  typeof window === 'undefined' ? BASE_LAYOUT_SCALE : layoutScaleFor(window.innerWidth, window.innerHeight);

/** The whole-app zoom, kept up to date as the window is resized or the display scaling changes. */
export default function useLayoutScale() {
  const [scale, setScale] = useState(current);
  useEffect(() => {
    const update = () => setScale(current());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return scale;
}
