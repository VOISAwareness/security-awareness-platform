/**
 * useCampaignDraft — one shared mechanism for the 6-step campaign wizard.
 *
 * The wizard's draft is a campaign row with status = DRAFT on the server. Only a
 * *pointer* to it (the campaignId) stays in localStorage, so the work follows the
 * user across browsers and devices.
 *
 * Why a hook rather than per-screen fetches:
 *  - The rich-text editors call persistChanges on EVERY keystroke. Sending a PUT
 *    each time would hammer the API, so saves are debounced and coalesced.
 *  - Every screen reads the draft once at mount; this gives them one consistent
 *    loading story instead of six different ones.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from './api';
import { isEditable } from './campaignStatus';

const POINTER_KEY = 'voisshield_active_campaign_id';
const LEGACY_DRAFT_KEY = 'voisshield_active_campaign_draft';
const SAVE_DEBOUNCE_MS = 800;

export function getActiveCampaignId() {
  try {
    return localStorage.getItem(POINTER_KEY) || '';
  } catch {
    return '';
  }
}

export function setActiveCampaignId(id) {
  try {
    if (id) localStorage.setItem(POINTER_KEY, id);
    else localStorage.removeItem(POINTER_KEY);
  } catch {
    /* storage unavailable (private mode) — the server still holds the draft */
  }
}

export function clearActiveCampaign() {
  setActiveCampaignId('');
  try {
    localStorage.removeItem(LEGACY_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function useCampaignDraft() {
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

  // Load the draft once at mount; create one if there is no active pointer.
  useEffect(() => {
    let active = true;

    const start = async () => {
      try {
        let id = idRef.current;
        let item = null;

        if (id) {
          item = await api.campaigns.get(id).catch(() => null);
          // Pointer may reference a campaign that was deleted or already sent.
          // REJECTED counts as openable: the whole point of a rejection is that
          // the owner reworks it, and the backend allows editing it (see
          // EDITABLE_STATUSES in campaigns-api). Testing for DRAFT alone here
          // silently discarded the rejected campaign and started a blank one.
          if (item && item.status && !isEditable(item.status)) item = null;
          if (!item) {
            id = '';
            setActiveCampaignId('');
          }
        }

        if (!id) {
          item = await api.campaigns.create({});
          id = item.campaignId;
          setActiveCampaignId(id);
        }

        idRef.current = id;
        if (active) {
          setCampaignId(id);
          setDraft(item);
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
  }, []);

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
        const pointer = getActiveCampaignId();
        let item = pointer ? await api.campaigns.get(pointer).catch(() => null) : null;
        if (item && item.status && !isEditable(item.status)) item = null;
        if (!item) {
          item = await api.campaigns.create({});
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
      const saved = await api.campaigns.update(idRef.current, patch);
      setDraft(saved);
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

  // Never leave unsaved edits behind when a step unmounts.
  useEffect(() => () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      const patch = pendingRef.current;
      if (idRef.current && Object.keys(patch).length) {
        api.campaigns.update(idRef.current, patch).catch(() => {});
      }
    }
  }, []);

  return {
    draft,
    loading,
    error,
    campaignId,
    update,
    flush,
  };
}
