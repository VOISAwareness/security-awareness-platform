/**
 * A campaign's results, from the backend (GET /campaigns/{id}/results): one
 * row per recipient with what they did. The View Analytics pop-up works out
 * its rates, locations and departments from these rows.
 */
import { useEffect, useState } from 'react';

import { api } from './api.js';

/** The pop-up's row shape from the API's: `trapped` is a click. */
export function analyticsRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((r) => r && r.recipientEmail)
    .map((r) => ({
      email: String(r.recipientEmail).toLowerCase(),
      name: r.recipientName || '',
      country: r.country || 'Unknown',
      department: r.department || 'Unknown',
      opened: Boolean(r.opened),
      trapped: Boolean(r.clicked),
      compromised: Boolean(r.compromised),
      trained: Boolean(r.trained),
      reported: Boolean(r.reported),
    }));
}

const loadResults = (id) => api.campaigns.results(id);

/** `rows` is [] until the API answers; `loading` until then, `error` if it fails. */
export function useCampaignResults(campaignId, load = loadResults) {
  const [state, setState] = useState({ id: null, rows: [], error: null });

  useEffect(() => {
    if (!campaignId) return undefined;
    let active = true;
    load(campaignId)
      .then((rows) => {
        if (active) setState({ id: campaignId, rows: analyticsRows(rows), error: null });
      })
      .catch((error) => {
        console.error('Could not load campaign results', error);
        if (active) setState({ id: campaignId, rows: [], error });
      });
    return () => {
      active = false;
    };
  }, [campaignId, load]);

  const current = state.id === campaignId;
  return {
    rows: current ? state.rows : [],
    loading: Boolean(campaignId) && !current,
    error: current ? state.error : null,
  };
}
