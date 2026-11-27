/**
 * A campaign's email HTML, for a detail pop-up.
 *
 * The campaign lists (Campaigns, Requests & Approvals, Start New Campaign)
 * read GET /campaigns?view=summary, which leaves out each campaign's email
 * and landing page HTML: most of the list's bytes, and shown only when one
 * campaign is opened. A pop-up that previews the email asks for that one
 * campaign (GET /campaigns/{id}) when it opens; each is read once per visit.
 */
import { useEffect, useState } from 'react';

import { api } from './api.js';

const cache = new Map(); // campaignId -> Promise<string> (its email HTML, '' when it has none)

/** The email HTML of one campaign: read once, then from the cache. */
export function loadCampaignEmail(id, { client = api, store = cache } = {}) {
  if (!id) return Promise.resolve('');
  if (!store.has(id)) {
    const read = client.campaigns
      .get(id)
      .then((c) => String(c?.emailBody || c?.EmailBody || ''))
      .catch((error) => {
        store.delete(id); // a failed read is tried again next time
        throw error;
      });
    store.set(id, read);
  }
  return store.get(id);
}

/** Forget what was read (after a campaign changes, or in tests). */
export function forgetCampaignEmails(store = cache) {
  store.clear();
}

/**
 * { html, loading, failed } for the campaign a pop-up shows. `known` is HTML
 * the item already carries (older rows, scenario previews): used as it is.
 */
export function useCampaignEmail(id, known = '') {
  const [state, setState] = useState({ id: null, html: '', failed: false });
  useEffect(() => {
    if (!id || known) return undefined;
    let active = true;
    loadCampaignEmail(id)
      .then((html) => active && setState({ id, html, failed: false }))
      .catch(() => active && setState({ id, html: '', failed: true }));
    return () => {
      active = false;
    };
  }, [id, known]);
  if (known) return { html: known, loading: false, failed: false };
  if (!id) return { html: '', loading: false, failed: false };
  const mine = state.id === id;
  return { html: mine ? state.html : '', loading: !mine, failed: mine && state.failed };
}
