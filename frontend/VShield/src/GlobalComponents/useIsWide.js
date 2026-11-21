import { useEffect, useState } from 'react';

// Wide enough for the docked sidebar (and the fixed-height desktop layouts).
// Below this the sidebar is a slide-in menu and pages scroll as a whole.
export const WIDE_QUERY = '(min-width: 1024px)';

const matches = (query) =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : true;

/** True while the window is at least 1024 px wide; follows resizes and rotation. */
export default function useIsWide(query = WIDE_QUERY) {
  const [wide, setWide] = useState(() => matches(query));
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const list = window.matchMedia(query);
    const update = () => setWide(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return wide;
}
