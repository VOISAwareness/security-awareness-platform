/**
 * useGlobalBoard — the global leaderboard: everyone ranked by points, from
 * GET /leaderboard (the points ledger; liveLeaderboard.js). `ready` is false
 * only while that read is under way; if it fails the board is empty and
 * `failed` is true.
 */
import { useEffect, useState } from 'react';

import { api } from './api';
import { boardFromApi } from './liveLeaderboard';

const EMPTY = { podium: { first: null, second: null, third: null }, rows: [], total: 0, youRank: null };

export function useGlobalBoard(viewer, role) {
  const [live, setLive] = useState(null); // { key, board }
  const key = `${viewer}|${role || ''}`;

  useEffect(() => {
    let active = true;
    api.points
      .leaderboard(viewer, role)
      .then((data) => {
        if (active) setLive({ key, board: boardFromApi(data) });
      })
      .catch((e) => {
        console.error('Could not load the leaderboard', e);
        if (active) setLive({ key, board: null });
      });
    return () => {
      active = false;
    };
  }, [viewer, role, key]);

  if (!live || live.key !== key) return { ...EMPTY, sample: false, ready: false };
  return live.board ? { ...live.board, sample: false, ready: true } : { ...EMPTY, sample: false, ready: true, failed: true };
}
