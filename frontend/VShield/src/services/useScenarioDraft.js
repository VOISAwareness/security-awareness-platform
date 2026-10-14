/**
 * useScenarioDraft — save/resume for the "Create new scenario" wizard.
 *
 * The wizard keeps its whole form in React state, so leaving the page (or the
 * browser discarding the tab) used to lose everything before Publish. Each
 * scenario being written is saved as its own draft, per user, on the server
 * (scenarioDraftSync.js), so it follows the person to any browser or device:
 *  - every change is written to this browser first (scenarioDraftList.js),
 *    debounced (the rich-text editors change formData on every keystroke) and
 *    flushed when the page unmounts, is hidden or is unloaded, and sent to the
 *    server a few seconds later (scenarioDraftSender.js); the copy here goes
 *    once the server has confirmed that exact content, so offline or with the
 *    server unreachable nothing is lost, and it is sent later;
 *  - coming back, the scenario in progress is offered back ("Continue your
 *    scenario?"), and nothing is written until the author decides, so the
 *    blank form can never overwrite it;
 *  - "Start new" leaves that draft as it is (Scenarios → Drafts) and starts a
 *    new one, like campaigns;
 *  - closing that dialog (✕, Esc, a click outside) means "not now": the blank
 *    form is shown, nothing is filed or saved, and the question comes back at
 *    the author's first change, before anything new is written;
 *  - the question is asked about each draft once (resumePrompt.js): either
 *    answer counts, and only a change to the form asks again (moving between
 *    tabs does not). A draft opened and left untouched is not written again,
 *    so its savedAt stays the same too;
 *  - after a successful publish the draft is removed and saving stops;
 *  - an edit of a saved scenario (Scenarios → Edit) is saved the same way,
 *    recording what it edits (`edit`), from its first actual change;
 *  - should someone else's save of the same draft (another window, another
 *    device) reach the server first, both are kept: this work becomes a new
 *    draft, which the editor carries on with (conflictNotice says so).
 *
 * Which draft the editor opens on is decided before its first render, by
 * loadScenarioEditorOpening() / scenarioEditorOpening() (an explicit
 * ?draft=<id> opens that one directly), so the form can start from it.
 *
 * Only the author's own work is stored; nothing is written to a template or
 * to the scenario being edited until Save.
 * The pure rules (what is stripped, what counts as work) live in scenarioDraft.js.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { api as defaultApi } from './api.js';
import { currentActor } from './identity.js';
import { markAsked, markDeferred, scenarioContentVersion } from './resumePrompt.js';
import { buildDraft, draftSummary, fromDraft, isMeaningfulDraft, sameDraftContent } from './scenarioDraft.js';
import {
  dropSentScenarioDraft,
  getScenarioDraft,
  removeScenarioDraft,
  saveScenarioDraft,
  setActiveScenarioDraftId,
  setDraftBaseRev,
} from './scenarioDraftList.js';
import { createScenarioDraftSender } from './scenarioDraftSender.js';
import { CONFLICT_NOTICE } from './scenarioDraftSync.js';

const SAVE_DEBOUNCE_MS = 400;

/**
 * @param formData  the wizard's form state
 * @param activeTab the wizard's current step (0-3)
 * @param defaults  pre-filled values that are not the author's work
 * @param opening   loadScenarioEditorOpening()'s result, resolved once by the page
 * @param edit      for an edit, what it edits ({ scenarioId, mode, name, ownership,
 *                  baseline }, see scenarioDraft.js); null for a new scenario
 * @param api       the API client (a fake in tests)
 * @returns draftId    the draft this editor saves to
 *          offer      summary of the scenario in progress awaiting Continue / Start new, or null
 *          offerOnChange true when that question came back because the author
 *                     started on a new scenario after "not now"
 *          resume()   accept the offer; returns { formData, activeTab, edit? } to apply
 *          startNew() keep that draft (Scenarios → Drafts) and carry on with a new one
 *          notNow()   close the question without an answer (see above); after a
 *                     question asked at a first change, the page undoes that change
 *          canSave    true when the form holds work worth a draft
 *          saveAndPark() "Save as draft": save now and leave it under Drafts,
 *                     answered and no longer in progress; returns its summary,
 *                     or null when there was nothing to save
 *          clear()    remove this draft and stop saving (after a successful publish)
 *          saveFailed true when the last change is not saved: the browser refused
 *                     it (storage full) and the server does not have it either,
 *                     or the server refused it (too large)
 *          saveFailedMessage the server's reason, or '' (storage full)
 *          conflictNotice    set when this work was kept as a separate draft;
 *                     dismissConflictNotice() clears it
 */
export function useScenarioDraft({ formData, activeTab, defaults, opening, edit = null, api = defaultApi }) {
  // Resolved once: signing out unmounts this page, and the final flush must
  // still land under the person who did the work.
  const [actor] = useState(() => currentActor());
  const [draftId, setDraftId] = useState(opening.id);
  const [offer, setOffer] = useState(opening.offer); // { id, draft, rev, synced } | null
  // Put off with "not now": asked again at the first change ({ id, draft } | null).
  const [deferred, setDeferred] = useState(opening.deferred || null);
  const [offerOnChange, setOfferOnChange] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const [upToDate, setUpToDate] = useState(true);
  const [refusal, setRefusal] = useState('');
  const [conflictNotice, setConflictNotice] = useState('');

  // What the server gets, and when (scenarioDraftSender.js). Its id is the
  // draft written to: it changes when the work had to be kept as a new draft.
  const [sender] = useState(() =>
    createScenarioDraftSender({
      api,
      actor,
      id: opening.id,
      rev: opening.resume ? opening.rev || 0 : 0,
      server: opening.resume && opening.synced ? opening.resume : null,
      onSaved: ({ id, forkedFrom, upToDate: done }) => {
        setRefusal('');
        setUpToDate(done);
        if (forkedFrom) {
          setDraftId(id);
          setConflictNotice(CONFLICT_NOTICE);
        }
      },
      onFailed: ({ kind, error }) => {
        if (kind === 'tooLarge') setRefusal(error?.message || 'This draft is too large to save to your account.');
        // Kept in this browser; a refusal like this is a bug worth seeing.
        if (kind === 'rejected') console.warn('Scenario draft refused by the server:', error?.message || error);
      },
    })
  );

  // The latest unsaved state, the debounce timer, the step last saved, the
  // latest content worth keeping, and the after-publish / after-park stop.
  const pendingRef = useRef(null);
  const timerRef = useRef(null);
  const tabRef = useRef(activeTab);
  const latestRef = useRef(null);
  const stoppedRef = useRef(false);
  // Read through a ref so an inline `defaults` object can't re-create flush
  // (and so re-run the flush-on-unmount effect) on every render.
  const defaultsRef = useRef(defaults);
  useEffect(() => {
    defaultsRef.current = defaults;
  }, [defaults]);
  // Likewise the edit record, which only the flush reads.
  const editRef = useRef(edit);
  useEffect(() => {
    editRef.current = edit;
  }, [edit]);

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

    const id = sender.id;
    const draft = buildDraft(pending.formData, pending.activeTab, new Date(), editRef.current);
    if (!isMeaningfulDraft(draft, defaultsRef.current)) {
      // A form emptied back to blank leaves nothing worth keeping (nor, once
      // the editor is left like this, on the server).
      latestRef.current = null;
      removeScenarioDraft(id, actor);
      sender.emptied();
      setStorageFailed(false);
      return;
    }
    // Nothing changed since it was kept here (a draft just opened): writing it
    // again would only move its savedAt, and with it bring back "Continue
    // your scenario?" for work that is not new.
    const kept = getScenarioDraft(id, actor);
    const unchanged = Boolean(kept && sameDraftContent(draft, kept));
    const content = unchanged ? kept : draft;
    latestRef.current = content;
    if (sender.changed(content) === 'synced') {
      // Exactly what the server has: no copy needed here.
      if (kept) dropSentScenarioDraft(id, actor);
      setStorageFailed(false);
      setUpToDate(true);
      return;
    }
    setUpToDate(false);
    if (unchanged) {
      setStorageFailed(false);
      return;
    }
    const saved = saveScenarioDraft(id, draft, actor);
    if (saved) {
      setDraftBaseRev(id, sender.baseRev, actor);
      setActiveScenarioDraftId(id, actor);
    }
    setStorageFailed(!saved);
  }, [actor, sender]);

  // Autosave, paused while the scenario in progress is on offer. While it is
  // put off, nothing is saved: the first real change brings the question back.
  // A step change is saved, and sent, at once.
  useEffect(() => {
    if (offer || stoppedRef.current) return;
    if (deferred) {
      const draft = buildDraft(formData, activeTab, new Date(), editRef.current);
      if (isMeaningfulDraft(draft, defaultsRef.current)) {
        setOffer(deferred);
        setOfferOnChange(true);
      }
      return;
    }
    pendingRef.current = { formData, activeTab };
    if (timerRef.current) clearTimeout(timerRef.current);
    if (activeTab !== tabRef.current) {
      tabRef.current = activeTab;
      flush();
      sender.sendSoon();
      return;
    }
    timerRef.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
  }, [formData, activeTab, offer, deferred, flush, sender]);

  // Never drop the last few keystrokes: flush on unmount, on pagehide, and when
  // the tab is hidden (a discarded background tab gets no later event). Leaving
  // the editor sends what waits; a closing page tries too, if it is small.
  useEffect(() => {
    const onPageHide = () => {
      flush();
      sender.pageHidden();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
      sender.leave();
    };
  }, [flush, sender]);

  // Either answer means the author was asked about this draft, as it is now.
  const answered = useCallback(() => {
    if (offer) markAsked('scenario', offer.id, scenarioContentVersion(offer.draft), actor);
  }, [offer, actor]);

  const resume = useCallback(() => {
    if (!offer) return null;
    answered();
    sender.switchTo({ id: offer.id, rev: offer.rev || 0, server: offer.synced ? offer.draft : null });
    setDraftId(offer.id);
    setActiveScenarioDraftId(offer.id, actor);
    setOffer(null);
    setDeferred(null);
    setOfferOnChange(false);
    return fromDraft(offer.draft);
  }, [offer, actor, answered, sender]);

  // The offered draft is left exactly as it is; this editor saves to its own
  // new draft from the first real edit.
  const startNew = useCallback(() => {
    answered();
    setActiveScenarioDraftId('', actor);
    setOffer(null);
    setDeferred(null);
    setOfferOnChange(false);
  }, [actor, answered]);

  // "Save as draft": written now (and sent), then parked: asked about as it
  // is, no longer the scenario in progress, and nothing more is saved from
  // this editor. Not parked when the work would be in neither place.
  const saveAndPark = useCallback(() => {
    if (offer || stoppedRef.current) return null;
    pendingRef.current = { formData, activeTab };
    flush();
    const saved = latestRef.current;
    const id = sender.id;
    if (!saved || !(getScenarioDraft(id, actor) || sender.holds(saved))) return null;
    markAsked('scenario', id, scenarioContentVersion(saved), actor);
    setActiveScenarioDraftId('', actor);
    stoppedRef.current = true;
    sender.park();
    return { id, ...draftSummary(saved) };
  }, [offer, formData, activeTab, flush, actor, sender]);

  const canSave =
    !offer && isMeaningfulDraft(buildDraft(formData, activeTab, new Date(0), edit), defaults);

  // "Not now": still the scenario in progress, and still undecided.
  const notNow = useCallback(() => {
    if (!offer) return;
    markDeferred('scenario', offer.id, scenarioContentVersion(offer.draft), actor);
    setDeferred(offer);
    setOffer(null);
    setOfferOnChange(false);
  }, [offer, actor]);

  const clear = useCallback(() => {
    stoppedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
    sender.discard();
    setOffer(null);
  }, [sender]);

  const dismissConflictNotice = useCallback(() => setConflictNotice(''), []);

  return {
    draftId,
    offer: offer ? draftSummary(offer.draft) : null,
    offerOnChange,
    resume,
    startNew,
    notNow,
    canSave,
    saveAndPark,
    clear,
    saveFailed: Boolean(refusal) || (storageFailed && !upToDate),
    saveFailedMessage: refusal,
    conflictNotice,
    dismissConflictNotice,
  };
}

/**
 * A small JPEG data URL of a chosen cover, so a resumed draft (and its card
 * under Scenarios → Drafts) can still show it: the File itself cannot be
 * saved, and a blob: URL dies with the page. It is only the card's picture
 * and goes into every Drafts list from the server, so it is kept small (the
 * cover itself is uploaded to storage). Steps down in size until it fits
 * `maxChars`; resolves '' if it cannot.
 */
export async function makeCoverThumbnail(file, { maxChars = 24 * 1024 } = {}) {
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
    for (const [edge, quality] of [[320, 0.72], [240, 0.66], [160, 0.6]]) {
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
