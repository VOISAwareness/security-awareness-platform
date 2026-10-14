/**
 * useGlobalBoard — the global leaderboard: everyone ranked by points.
 *
 * Sample data by default (the bundled user list, sampleLeaderboard.js), with
 * the viewer's rank from their sample standing. With VITE_LIVE_LEVELS=true it
 * reads GET /leaderboard (liveLeaderboard.js), falling back to the sample if
 * the server can't answer. `ready` is false only while that read is under way.
 */
import { useEffect, useMemo, useState } from 'react';

import masterUsers from '../MasterUserData.json';
import { api } from './api';
import { LIVE_LEVELS } from './liveStanding';
import { boardFromApi } from './liveLeaderboard';
import { globalBoard } from './sampleLeaderboard';

const SAMPLE = globalBoard(masterUsers);

export function useGlobalBoard(viewer, role, sampleRank) {
  const sample = useMemo(
    () => ({ ...SAMPLE, youRank: sampleRank || SAMPLE.total, sample: true, ready: true }),
    [sampleRank],
  );
  const [live, setLive] = useState(null); // { key, board }
  const key = `${viewer}|${role || ''}`;

  useEffect(() => {
    if (!LIVE_LEVELS) return undefined;
    let active = true;
    api.points
      .leaderboard(viewer, role)
      .then((data) => {
        if (active) setLive({ key, board: boardFromApi(data) });
      })
      .catch((e) => {
        console.error('Could not load the leaderboard; showing sample data', e);
        if (active) setLive({ key, board: null });
      });
    return () => {
      active = false;
    };
  }, [viewer, role, key]);

  if (!LIVE_LEVELS) return sample;
  if (!live || live.key !== key) {
    return { podium: { first: null, second: null, third: null }, rows: [], total: 0, youRank: null, sample: false, ready: false };
  }
  return live.board ? { ...live.board, sample: false, ready: true } : sample;
}
