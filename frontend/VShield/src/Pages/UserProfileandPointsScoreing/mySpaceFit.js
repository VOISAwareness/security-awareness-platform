/**
 * mySpaceFit: how much bigger My Space is drawn on a given screen.
 *
 * Its first screen is drawn as on a 14-inch laptop with the taskbar showing:
 * FIRST_SCREEN_HEIGHT CSS px tall. Extra height (the taskbar hidden, a bigger
 * screen, a monitor) makes the whole page bigger by the same factor instead
 * of stretching its rows; the width keeps that in check (never narrower than
 * MIN_LAYOUT_WIDTH CSS px), and it grows at most MAX_GROWTH. Pure.
 */
export const FIRST_SCREEN_HEIGHT = 628;
export const MIN_LAYOUT_WIDTH = 1150;
export const MAX_GROWTH = 1.6;

/** The growth for a visible area of height x width CSS px (measured at growth 1). */
export function mySpaceGrowth(availableHeight, availableWidth) {
  if (!(availableHeight > 0) || !(availableWidth > 0)) return 1;
  const g = Math.min(availableHeight / FIRST_SCREEN_HEIGHT, availableWidth / MIN_LAYOUT_WIDTH, MAX_GROWTH);
  return Math.max(1, Math.round(g * 1000) / 1000);
}
