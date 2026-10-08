/**
 * useGamificationRules — the live gamification rules, read once per mount.
 *
 * Every screen that shows points re-reads on mount, so a change saved in the
 * Gamification Engine is what the campaign wizard shows when you come back.
 * `rows` is null until the API answers; `error` is set if it never does.
 */
import { useEffect, useState } from 'react';

import { api } from './api';
import { pointsByEvent } from './gamificationPoints';

export function useGamificationRules() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    api.gamificationRules
      .list()
      .then((data) => {
        if (active) setRows(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.error('Could not load gamification rules', e);
        if (active) setError(e);
      });
    return () => {
      active = false;
    };
  }, []);

  return { rows, points: pointsByEvent(rows), loading: rows === null && !error, error };
}
