/**
 * useCampaignDraft — one shared mechanism for the 6-step campaign wizard.
 *
 * The wizard's draft is a campaign row with status = DRAFT on the server. Only a
 * *pointer* to it (the campaignId) stays in localStorage, so the work follows the
 * user across browsers and devices. The pointer is scoped to the signed-in
 * person (see draftStore.js), so two people sharing a browser never resume each
 * other's campaign.
 *
 * Why a hook rather than per-screen fetches:
 *  - The rich-text editors call persistChanges on EVERY keystroke. Sending a PUT
 *    each time would hammer the API, so saves are debounced and coalesced.
 *  - Every screen reads the draft once at mount; this gives them one consistent
 *    loading story instead of six different ones.
 *
 * `useCampaignDraft({ step })` also records the step on the draft
 * (`wizardStep`, a plain field the campaigns-api PUT merges like any other), so
 * re-entering the wizard can offer to continue there.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from './api';
import { isEditable } from './campaignStatus';
import { isCreatedBy, isOwnDraft, toStep } from './campaignWizard';
import { readString, removeKey, scopedKey, writeString } from './draftStore';
import { currentActor } from './identity';

const POINTER_BASE = 'voisshield_active_campaign_id';
const LEGACY_DRAFT_KEY = 'voisshield_active_campaign_draft';
const SAVE_DEBOUNCE_MS = 800;

// Resolved on every call: whoever is signed in now, not at import time.
const pointerKey = () => scopedKey(POINTER_BASE);

// --- Saves shared by every hook instance ------------------------------------
//
// Each wizard step mounts its own useCampaignDraft, and moving between steps
// unmounts one while the next one loads. Two rules keep the next step from
// reading a draft that is missing what was just typed:
//  1. PUTs for one campaign go out one after another. campaigns-api merges a
//     PUT into what it reads, so two in flight at once can land out of order
//     and the older one wins.
//  2. A hook waits for that campaign's queued PUTs before it GETs the draft.
// A save that failed after its step unmounted is kept here too, and the next
// step to open that campaign re-applies it rather than losing the edit.
const saveQueues = new Map(); // campaignId -> promise settling after its last queued PUT
const unsavedPatches = new Map(); // campaignId -> fields an unmounted step could not save

function queueSave(id, patch) {
  const previous = saveQueues.get(id) || Promise.resolve();
  const save = previous.then(() => api.campaigns.update(id, patch));
  const settled = save.catch(() => {});
  saveQueues.set(id, settled);
  settled.then(() => {
    if (saveQueues.get(id) === settled) saveQueues.delete(id);
  });
  return save;
}

const savesSettled = (id) => saveQueues.get(id) || Promise.resolve();

function takeUnsaved(id) {
  const patch = unsavedPatches.get(id);
  unsavedPatches.delete(id);
  return patch || null;
}

export function getActiveCampaignId() {
  return readString(pointerKey());
}

export function setActiveCampaignId(id) {
  // Storage unavailable (private mode) is fine — the server still holds the draft.
  writeString(pointerKey(), id || '');
}

export function clearActiveCampaign() {
  setActiveCampaignId('');
  removeKey(LEGACY_DRAFT_KEY);
}

/**
 * One-time move from the old browser-wide pointer to the per-user one. The old
 * pointer is adopted only by the person recorded as the draft's creator; anyone
 * else just drops it (the draft itself stays in Campaigns -> Drafts). If the
 * draft cannot be read right now, the old pointer is left for the next try.
 */
async function adoptLegacyPointer() {
  const legacyId = readString(POINTER_BASE);
  if (!legacyId) return '';
  let item;
  try {
    item = await api.campaigns.get(legacyId);
  } catch (e) {
    if (e?.status !== 404) return '';
    item = null;
  }
  removeKey(POINTER_BASE);
  if (!item || !isCreatedBy(item, currentActor())) return '';
  setActiveCampaignId(legacyId);
  return legacyId;
}

/** A brand-new draft: who owns it, and the step it was started on. */
function newDraftFields(step) {
  return { createdBy: currentActor(), wizardStep: step || 1 };
}

/**
 * The draft a pointer refers to, or null when it cannot be opened here: deleted,
 * already submitted or sent, or someone else's campaign.
 */
async function openPointerDraft(id) {
  if (!id) return null;
  await savesSettled(id);
  const item = await api.campaigns.get(id).catch(() => null);
  if (!item) return null;
  // REJECTED counts as openable: the whole point of a rejection is that the
  // owner reworks it, and the backend allows editing it (see EDITABLE_STATUSES
  // in campaigns-api). Testing for DRAFT alone here silently discarded the
  // rejected campaign and started a blank one.
  if (item.status && !isEditable(item.status)) return null;
  if (!isOwnDraft(item, currentActor())) return null;
  return item;
}

export function useCampaignDraft({ step } = {}) {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // State as well as a ref: consumers need to re-render once the id exists,
  // and a ref alone would still read '' on the first render.
  const [campaignId, setCampaignId] = useState(getActiveCampaignId());

  // Pending (debounced) changes and the timer that flushes them.
  const pendingRef = useRef({});
  const timerRef = useRef(null);
  const idRef = useRef(getActiveCampaignId());
  // Resolves when the initial load settles (successfully or not) so that a save
  // queued during the load window waits instead of being dropped.
  const readyRef = useRef(null);
  // The step this screen records on the draft once it loads. Step 1 passes none:
  // opening it must not overwrite the step a "Continue your campaign?" prompt
  // is about to offer. (Back from step 2 records step 1 itself.)
  const stepRef = useRef(toStep(step));

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Wait for the draft to exist. Edits made during the load window are common
    // (step 1 writes immediately on "Use This"), and dropping them loses data.
    try {
      await readyRef.current;
    } catch {
      /* load failure is reported via `error`; fall through to the id check */
    }
    // Self-heal: if the initial load failed we still hold the user's edits, so
    // recover a usable draft rather than discarding their work. Retry the
    // pointer first — creating blindly would orphan an existing draft.
    if (!idRef.current) {
      try {
        let item = await openPointerDraft(getActiveCampaignId());
        if (!item) {
          item = await api.campaigns.create(newDraftFields(stepRef.current));
          setActiveCampaignId(item.campaignId);
        }
        idRef.current = item.campaignId;
        setCampaignId(item.campaignId);
        setDraft((prev) => ({ ...(prev || {}), ...item }));
        setError(null);
      } catch (e) {
        console.error('Could not recover campaign draft', e);
        setError(e);
        return null;
      }
    }

    const patch = pendingRef.current;
    if (Object.keys(patch).length === 0) return null;
    // Only clear once we know we can actually send it.
    pendingRef.current = {};
    try {
      const saved = await queueSave(idRef.current, patch);
      // Edits made while this PUT was in flight are not in `saved` yet.
      setDraft({ ...saved, ...pendingRef.current });
      return saved;
    } catch (e) {
      // Put the patch back so a transient failure does not lose the edit.
      pendingRef.current = { ...patch, ...pendingRef.current };
      console.error('Could not save campaign draft', e);
      setError(e);
      throw e;
    }
  }, []);

  /**
   * Merge fields into the draft. Updates local state immediately so the UI stays
   * responsive, and schedules a debounced save.
   */
  const update = useCallback(
    (fields) => {
      pendingRef.current = { ...pendingRef.current, ...fields };
      setDraft((prev) => ({ ...(prev || {}), ...fields }));
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        flush().catch(() => {
          /* surfaced via error state */
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [flush]
  );

  /**
   * Leave the current campaign as it is (it stays a DRAFT, listed under
   * Campaigns -> Drafts) and start this user on a brand-new one. Nothing is
   * deleted. Resolves to the new draft, or null if it could not be created.
   */
  const startNew = useCallback(() => {
    const run = async () => {
      // Land anything still queued on the campaign being left. A failed save
      // must not follow the user onto the new draft, so the queue is cleared.
      await flush().catch(() => {});
      pendingRef.current = {};
      idRef.current = '';
      setActiveCampaignId('');
      try {
        const item = await api.campaigns.create(newDraftFields(1));
        setActiveCampaignId(item.campaignId);
        idRef.current = item.campaignId;
        setCampaignId(item.campaignId);
        setDraft(item);
        setError(null);
        return item;
      } catch (e) {
        console.error('Could not start a new campaign draft', e);
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    };
    // Screens treat a null draft as "loading": nothing seeds from, or records a
    // step on, the old campaign while the new one is being created.
    setLoading(true);
    setDraft(null);
    setCampaignId('');
    const pending = run();
    // Edits made while the new draft is created wait for it, as on mount.
    readyRef.current = pending;
    return pending;
  }, [flush]);

  // Load the draft once at mount; create one if there is no active pointer.
  useEffect(() => {
    let active = true;

    const start = async () => {
      try {
        let id = idRef.current || (await adoptLegacyPointer());
        let item = null;

        if (id) {
          item = await openPointerDraft(id);
          if (!item) {
            id = '';
            setActiveCampaignId('');
          }
        }

        if (!id) {
          item = await api.campaigns.create(newDraftFields(stepRef.current));
          id = item.campaignId;
          setActiveCampaignId(id);
        }

        idRef.current = id;
        if (active) {
          setCampaignId(id);
          setDraft(item);
          // Remember the step the user is on, so re-entering the wizard can
          // offer to continue there. Only once the draft has loaded: an update()
          // before then would hand the steps a half-empty draft to seed from.
          // An edit the previous step failed to save rides along with it.
          const step = stepRef.current;
          const carried = { ...takeUnsaved(id) };
          if (step && toStep(item?.wizardStep) !== step) carried.wizardStep = step;
          if (Object.keys(carried).length) update(carried);
        }
      } catch (e) {
        console.error('Could not open campaign draft', e);
        if (active) setError(e);
      } finally {
        if (active) setLoading(false);
      }
    };

    // Kept so flush() can await the load rather than discarding queued edits.
    readyRef.current = start();
    return () => {
      active = false;
    };
  }, [update]);

  // Never leave unsaved edits behind when a step unmounts: send them through
  // the shared queue (the next step's load waits for it), and if that fails,
  // park them for the next step to re-apply.
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const id = idRef.current;
    const patch = pendingRef.current;
    if (!id || Object.keys(patch).length === 0) return;
    pendingRef.current = {};
    queueSave(id, patch).catch(() => {
      // Newer fields win over anything parked earlier.
      unsavedPatches.set(id, { ...unsavedPatches.get(id), ...patch });
    });
  }, []);

  return {
    draft,
    loading,
    error,
    campaignId,
    update,
    flush,
    startNew,
  };
}
