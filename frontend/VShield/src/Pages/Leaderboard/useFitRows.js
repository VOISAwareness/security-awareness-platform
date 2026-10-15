import { useEffect, useState } from 'react';

/**
 * How many rows of `rowH` px fit an element, kept up to date as it resizes,
 * so a list shows a full page and never scrolls inside. Returns a callback
 * ref (so an element that mounts later is measured too) and the row count.
 */
export function useFitRows(rowH, min = 3) {
  const [el, setEl] = useState(null);
  const [rows, setRows] = useState(8);
  useEffect(() => {
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setRows(Math.max(min, Math.floor(el.clientHeight / rowH))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el, rowH, min]);
  return [setEl, rows];
}
