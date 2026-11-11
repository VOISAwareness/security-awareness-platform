/**
 * useHomeDashboard — the Home screen's data: the campaigns list, then the
 * results of the campaigns in the chosen period and of the latest campaign
 * (one GET /campaigns/{id}/results each, kept once fetched).
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
} from './homeDashboard.js';

// A period with more campaigns than this shows its newest ones' results.
const MAX_RESULT_FETCHES = 40;

// One object for ever: a new one each render would restart the effects below.
const API = { list: (...a) => api.campaigns.list(...a), results: (id) => api.campaigns.results(id) };

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
    wanted
      .filter((id) => !(id in results))
      .forEach((id) => {
        load
          .results(id)
          .then((rows) => active && setResults((r) => ({ ...r, [id]: Array.isArray(rows) ? rows : [] })))
          .catch((error) => {
            console.error('Could not load results for', id, error);
            // Counted as having no rows rather than waiting for ever.
            if (active) setResults((r) => ({ ...r, [id]: [] }));
          });
      });
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
