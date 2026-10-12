/**
 * useScenarioDraft — save/resume for the "Create new scenario" wizard.
 *
 * The wizard keeps its whole form in React state, so leaving the page (or the
 * browser discarding the tab) used to lose everything before Publish. Each
 * scenario being written is saved as its own draft, per user, in this browser
 * (scenarioDraftList.js):
 *  - writes are debounced (the rich-text editors change formData on every
 *    keystroke) and flushed when the page unmounts, is hidden or is unloaded;
 *  - coming back, the scenario in progress is offered back ("Continue your
 *    scenario?"), and nothing is written until the author decides, so the
 *    blank form can never overwrite it;
 *  - "Start new" (or closing that dialog) leaves that draft as it is
 *    (Scenarios → Drafts) and starts a new one, like campaigns;
 *  - the question is asked about each draft once (resumePrompt.js): either
 *    answer counts, and only work saved after it asks again. So a draft opened
 *    and left untouched is not written again (its savedAt stays the same);
 *  - after a successful publish the draft is removed and saving stops.
 *
 * Which draft the editor opens on is decided before its first render by
 * scenarioEditorOpening() (an explicit ?draft=<id> opens that one directly), so
 * the form can start from it.
 *
 * Only the author's own new scenario is stored here; templates are never written.
 * The pure rules (what is stripped, what counts as work) live in scenarioDraft.js.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { currentActor } from './identity.js';
import { markAsked, scenarioDraftVersion } from './resumePrompt.js';
import { buildDraft, draftSummary, fromDraft, isMeaningfulDraft, sameDraftContent } from './scenarioDraft.js';
import {
  getScenarioDraft,
  removeScenarioDraft,
  saveScenarioDraft,
  setActiveScenarioDraftId,
} from './scenarioDraftList.js';

const SAVE_DEBOUNCE_MS = 400;

/**
 * @param formData  the wizard's form state
 * @param activeTab the wizard's current step (0-3)
 * @param defaults  pre-filled values that are not the author's work
 * @param opening   scenarioEditorOpening()'s result, computed once by the page
 * @returns draftId    the draft this editor saves to
 *          offer      summary of the scenario in progress awaiting Continue / Start new, or null
 *          resume()   accept the offer; returns { formData, activeTab } to apply
 *          startNew() keep that draft (Scenarios → Drafts) and carry on with a new one
 *                     (also what closing the dialog does)
 *          clear()    remove this draft and stop saving (after a successful publish)
 *          saveFailed true when the browser refused the last save (storage full)
 */
export function useScenarioDraft({ formData, activeTab, defaults, opening }) {
  // Resolved once: signing out unmounts this page, and the final flush must
  // still land under the person who did the work.
  const [actor] = useState(() => currentActor());
  const [draftId, setDraftId] = useState(opening.id);
  const [offer, setOffer] = useState(opening.offer); // { id, draft } | null
  const [saveFailed, setSaveFailed] = useState(false);

  // The draft written to, the latest unsaved state, the debounce timer, and
  // the after-publish stop.
  const idRef = useRef(opening.id);
  const pendingRef = useRef(null);
  const timerRef = useRef(null);
  const stoppedRef = useRef(false);
  // Read through a ref so an inline `defaults` object can't re-create flush
  // (and so re-run the flush-on-unmount effect) on every render.
  const defaultsRef = useRef(defaults);
  useEffect(() => {
    defaultsRef.current = defaults;
  }, [defaults]);

  // A draft opened directly (from Scenarios → Drafts) is now the one in progress.
  useEffect(() => {
    if (opening.resume) setActiveScenarioDraftId(opening.id, actor);
  }, [opening, actor]);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending || stoppedRef.current) return;

    const draft = buildDraft(pending.formData, pending.activeTab);
    if (isMeaningfulDraft(draft, defaultsRef.current)) {
      // Nothing changed since it was saved (a draft just opened): writing it
      // again would only move its savedAt, and with it bring back "Continue
      // your scenario?" for work that is not new.
      if (sameDraftContent(draft, getScenarioDraft(idRef.current, actor))) {
        setSaveFailed(false);
        return;
      }
      const saved = saveScenarioDraft(idRef.current, draft, actor);
      if (saved) setActiveScenarioDraftId(idRef.current, actor);
      setSaveFailed(!saved);
    } else {
      // A form emptied back to blank leaves nothing worth keeping.
      removeScenarioDraft(idRef.current, actor);
      setSaveFailed(false);
    }
  }, [actor]);

  // Autosave, paused while the scenario in progress is on offer.
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

  // Either answer means the author was asked about this draft, as it is now.
  const answered = useCallback(() => {
    if (offer) markAsked('scenario', offer.id, scenarioDraftVersion(offer.draft), actor);
  }, [offer, actor]);

  const resume = useCallback(() => {
    if (!offer) return null;
    answered();
    idRef.current = offer.id;
    setDraftId(offer.id);
    setActiveScenarioDraftId(offer.id, actor);
    setOffer(null);
    return fromDraft(offer.draft);
  }, [offer, actor, answered]);

  // The offered draft is left exactly as it is; this editor saves to its own
  // new draft from the first real edit.
  const startNew = useCallback(() => {
    answered();
    setActiveScenarioDraftId('', actor);
    setOffer(null);
  }, [actor, answered]);

  const clear = useCallback(() => {
    stoppedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
    removeScenarioDraft(idRef.current, actor);
    setOffer(null);
  }, [actor]);

  return {
    draftId,
    offer: offer ? draftSummary(offer.draft) : null,
    resume,
    startNew,
    clear,
    saveFailed,
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
