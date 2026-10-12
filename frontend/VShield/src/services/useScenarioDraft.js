/**
 * useScenarioDraft — save/resume for the "Create new scenario" wizard.
 *
 * The wizard keeps its whole form in React state, so leaving the page (or the
 * browser discarding the tab) used to lose everything before Publish. This keeps
 * the serialisable part of that form, plus the current step, in localStorage
 * under a per-user key (`voisshield_scenario_draft:<email>`):
 *  - writes are debounced (the rich-text editors change formData on every
 *    keystroke) and flushed when the page unmounts, is hidden or is unloaded;
 *  - a saved draft is offered back on the next visit, and nothing is written
 *    until the author decides, so the blank form can never overwrite it;
 *  - after a successful publish the draft is removed and saving stops.
 *
 * Only the author's own new scenario is stored here; templates are never written.
 * The pure rules (what is stripped, what counts as work) live in scenarioDraft.js.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { readJSON, removeKey, scopedKey, writeJSON } from './draftStore.js';
import {
  SCENARIO_DRAFT_KEY,
  buildDraft,
  draftSummary,
  fromDraft,
  isMeaningfulDraft,
  parseDraft,
} from './scenarioDraft.js';

const SAVE_DEBOUNCE_MS = 400;

function readSavedDraft(key, defaults) {
  const saved = parseDraft(readJSON(key));
  return saved && isMeaningfulDraft(saved, defaults) ? saved : null;
}

/**
 * @param formData  the wizard's form state
 * @param activeTab the wizard's current step (0-3)
 * @param defaults  pre-filled values that are not the author's work
 * @returns offer      summary of a saved draft awaiting Continue / Start new, or null
 *          resume()   accept the offer; returns { formData, activeTab } to apply
 *          startNew() discard the saved draft and keep the blank form
 *          clear()    remove the draft and stop saving (after a successful publish)
 */
export function useScenarioDraft({ formData, activeTab, defaults }) {
  // Resolved once: signing out unmounts this page, and the final flush must
  // still land under the person who did the work.
  const [key] = useState(() => scopedKey(SCENARIO_DRAFT_KEY));
  const [offer, setOffer] = useState(() => readSavedDraft(key, defaults));

  // The latest unsaved state, the debounce timer, and the after-publish stop.
  const pendingRef = useRef(null);
  const timerRef = useRef(null);
  const stoppedRef = useRef(false);
  // Read through a ref so an inline `defaults` object can't re-create flush
  // (and so re-run the flush-on-unmount effect) on every render.
  const defaultsRef = useRef(defaults);
  useEffect(() => {
    defaultsRef.current = defaults;
  }, [defaults]);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending || stoppedRef.current) return;

    const draft = buildDraft(pending.formData, pending.activeTab);
    // A form emptied back to blank leaves nothing worth offering next time.
    if (isMeaningfulDraft(draft, defaultsRef.current)) writeJSON(key, draft);
    else removeKey(key);
  }, [key]);

  // Autosave, paused while a saved draft is on offer.
  useEffect(() => {
    if (offer || stoppedRef.current) return;
    pendingRef.current = { formData, activeTab };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
  }, [formData, activeTab, offer, flush]);

  // Never drop the last few keystrokes: flush on unmount, on pagehide, and when
  // the tab is hidden (a discarded background tab gets no later event).
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
  }, [flush]);

  const resume = useCallback(() => {
    setOffer(null);
    return offer ? fromDraft(offer) : null;
  }, [offer]);

  const startNew = useCallback(() => {
    removeKey(key);
    setOffer(null);
  }, [key]);

  const clear = useCallback(() => {
    stoppedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
    removeKey(key);
    setOffer(null);
  }, [key]);

  return {
    offer: offer ? draftSummary(offer) : null,
    resume,
    startNew,
    clear,
  };
}

/**
 * A small JPEG data URL of a chosen cover, so a resumed draft can still show it
 * (the File itself cannot be saved, and a blob: URL dies with the page). Steps
 * down in size until it fits `maxChars`; resolves '' if it cannot.
 */
export async function makeCoverThumbnail(file, { maxChars = 200 * 1024 } = {}) {
  if (!file || typeof document === 'undefined' || typeof URL === 'undefined') return '';
  let url = '';
  try {
    url = URL.createObjectURL(file);
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });
    const longest = Math.max(img.naturalWidth, img.naturalHeight) || 1;
    for (const [edge, quality] of [[480, 0.82], [320, 0.72], [200, 0.6]]) {
      const scale = Math.min(1, edge / longest);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';
      // JPEG has no alpha: paint white first so transparent PNGs don't turn black.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= maxChars) return dataUrl;
    }
    return '';
  } catch {
    return '';
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}
