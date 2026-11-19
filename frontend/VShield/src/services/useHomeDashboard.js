/**
 * useHomeDashboard — the Home screen's data: the campaigns list (without its
 * HTML: GET /campaigns?view=summary), then the counts of the campaigns in the
 * chosen period and of the latest campaign, in one read
 * (GET /campaigns/tallies, kept once fetched; a new period reads only the
 * campaigns not yet counted).
 */
import { useEffect, useMemo, useState } from 'react';

import { api } from './api.js';
import { normalizeCampaign } from './campaignStatus.js';
import {
  campaignsInPeriod,
  latestCampaign,
  periodRange,
  summariseCampaign,
  summarisePeriod,
  tallyRows,
} from './homeDashboard.js';

// A period with more campaigns than this shows its newest ones' results (the
// tallies read takes at most 50, with the latest campaign).
const MAX_RESULT_FETCHES = 40;

// One object for ever: a new one each render would restart the effects below.
const API = { list: () => api.campaigns.summary(), tallies: (ids) => api.campaigns.tallies(ids) };
const NOTHING = tallyRows([]);

export function useHomeDashboard(period, load = API) {
  const [campaigns, setCampaigns] = useState(null);
  const [listError, setListError] = useState(null);
  const [results, setResults] = useState({});

  useEffect(() => {
    let active = true;
    load
      .list()
      .then((rows) => {
        if (active) setCampaigns((Array.isArray(rows) ? rows : []).map(normalizeCampaign).filter(Boolean));
      })
      .catch((error) => {
        console.error('Could not load campaigns for Home', error);
        if (active) setListError(error);
      });
    return () => {
      active = false;
    };
  }, [load]);

  const inPeriod = useMemo(
    () => (campaigns ? campaignsInPeriod(campaigns, periodRange(period)) : []),
    [campaigns, period]
  );
  const latest = useMemo(() => (campaigns ? latestCampaign(campaigns) : null), [campaigns]);

  const wanted = useMemo(() => {
    const ids = inPeriod.slice(0, MAX_RESULT_FETCHES).map((c) => c.campaignId);
    if (latest && !ids.includes(latest.campaignId)) ids.push(latest.campaignId);
    return ids;
  }, [inPeriod, latest]);

  useEffect(() => {
    let active = true;
    const missing = wanted.filter((id) => !(id in results));
    if (missing.length) {
      // A campaign the answer leaves out (deleted meanwhile), or a failed
      // read, counts as having no rows rather than waiting for ever.
      const settle = (found) =>
        active &&
        setResults((r) => ({ ...r, ...Object.fromEntries(missing.map((id) => [id, found?.[id] || NOTHING])) }));
      load
        .tallies(missing)
        .then(settle)
        .catch((error) => {
          console.error('Could not load campaign counts for Home', error);
          settle(null);
        });
    }
    return () => {
      active = false;
    };
    // `results` is read only to skip what is already fetched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, load]);

  const counted = useMemo(() => inPeriod.slice(0, MAX_RESULT_FETCHES), [inPeriod]);
  const summary = useMemo(() => summarisePeriod(counted, results), [counted, results]);
  const latestCard = useMemo(
    () => summariseCampaign(latest, latest ? results[latest.campaignId] : undefined),
    [latest, results]
  );

  return {
    loading: campaigns === null && !listError,
    error: listError,
    // Total/Active/Closed count every campaign in the period, not just the fetched ones.
    summary: { ...summary, ...totals(inPeriod) },
    latest: latestCard,
  };
}

function totals(list) {
  const summary = summarisePeriod(list, {});
  return { total: summary.total, active: summary.active, closed: summary.closed };
}
