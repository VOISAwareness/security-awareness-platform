/**
 * useCampaigns — shared campaign list + workflow actions.
 *
 * Both the Campaigns hub and the Requests & Approvals queue read the same
 * endpoint and perform the same transitions, so the fetching, normalization,
 * error handling and refresh-after-action logic live here once.
 *
 * Notes that matter to callers:
 *  - Rows come back NORMALIZED (see campaignStatus.js). Three field
 *    vocabularies exist in the table; screens should never see that.
 *  - `reject` REQUIRES a non-empty comment. The approval Lambda returns 400
 *    without one, so the caller must collect it rather than send a default.
 *  - After any transition the list is refetched. The approval Lambda is the
 *    only owner of `status`, so re-reading is the only way to be sure.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from './api';
import { normalizeCampaign } from './campaignStatus';

export function useCampaigns({ status = null, actor = 'wizard-user' } = {}) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Which campaignId currently has a transition in flight, so a row can show a
  // spinner and both action buttons can be disabled for that row alone.
  const [pendingAction, setPendingAction] = useState(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyRows = useCallback((rows) => {
    if (!mountedRef.current) return;
    const list = Array.isArray(rows) ? rows : [];
    const normalized = list.map(normalizeCampaign).filter(Boolean);
    // campaigns-api already sorts newest-first, but ordering is part of this
    // hook's contract, so don't make every screen depend on the server keeping
    // that promise.
    normalized.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    setCampaigns(normalized);
    setError(null);
    setLoading(false);
  }, []);

  const applyError = useCallback((e) => {
    console.error('Could not load campaigns', e);
    if (!mountedRef.current) return;
    setError(e);
    setLoading(false);
  }, []);

  // The initial fetch is written as a promise chain rather than an awaited call
  // so that state is only ever set from a callback — the effect body itself
  // updates nothing synchronously. This mirrors how the wizard screens fetch.
  useEffect(() => {
    let active = true;
    api.campaigns
      .list(status || undefined)
      .then((rows) => {
        if (active) applyRows(rows);
      })
      .catch((e) => {
        if (active) applyError(e);
      });
    return () => {
      active = false;
    };
  }, [status, applyRows, applyError]);

  /**
   * Refetch without touching `loading`. Used after a transition: the row being
   * acted on already shows its own spinner via `pendingAction`, and raising the
   * global flag would blank the entire table for every approve or delete.
   */
  const refetchQuietly = useCallback(async () => {
    try {
      applyRows(await api.campaigns.list(status || undefined));
    } catch (e) {
      applyError(e);
    }
  }, [status, applyRows, applyError]);

  /** Public refetch. Shows the loading state — for Retry buttons and the like. */
  const refresh = useCallback(async () => {
    if (mountedRef.current) setLoading(true);
    await refetchQuietly();
  }, [refetchQuietly]);

  /** Run a workflow transition, then refetch. Throws so callers can toast. */
  const runAction = useCallback(
    async (campaignId, fn) => {
      setPendingAction(campaignId);
      try {
        const result = await fn();
        await refetchQuietly();
        return result;
      } finally {
        if (mountedRef.current) setPendingAction(null);
      }
    },
    [refetchQuietly]
  );

  const approve = useCallback(
    (campaignId, comments = '') =>
      runAction(campaignId, () => api.campaigns.approve(campaignId, actor, comments)),
    [actor, runAction]
  );

  const reject = useCallback(
    (campaignId, comments) => {
      const text = String(comments || '').trim();
      if (!text) {
        // Fail here rather than letting the server 400: the caller needs to
        // know it must collect a reason, not that "something went wrong".
        return Promise.reject(new Error('A reason is required when rejecting a campaign.'));
      }
      return runAction(campaignId, () => api.campaigns.reject(campaignId, actor, text));
    },
    [actor, runAction]
  );

  const remove = useCallback(
    (campaignId) => runAction(campaignId, () => api.campaigns.remove(campaignId)),
    [runAction]
  );

  return {
    campaigns,
    loading,
    error,
    pendingAction,
    refresh,
    approve,
    reject,
    remove,
  };
}
