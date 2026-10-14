/**
 * useMyStanding — the signed-in person's points, rank and level.
 *
 * Sample data by default (services/sampleStanding.js, from the bundled user
 * list); `sample: true` says so. With VITE_LIVE_LEVELS=true it reads GET
 * /standing instead (liveStanding.js), and falls back to the sample if the
 * server can't answer. `ready` is false only while that first read is under
 * way, so screens don't treat a placeholder as the person's level.
 */
import { useEffect, useMemo, useState } from 'react';

import masterUsers from '../MasterUserData.json';
import { DEMO_USER } from '../appConfig';
import { useUserType } from '../UserTypeContext/UserTypeContext';
import { api } from './api';
import { LIVE_LEVELS, standingFromApi } from './liveStanding';
import { sampleStanding } from './sampleStanding';

export function useMyStanding() {
  const { user } = useUserType() || {};
  const email = (user?.UserEMailID || DEMO_USER.email).trim().toLowerCase();
  const sample = useMemo(() => ({ ...sampleStanding(masterUsers, email), sample: true, ready: true }), [email]);
  const [live, setLive] = useState(null); // { email, standing }

  useEffect(() => {
    if (!LIVE_LEVELS) return undefined;
    let active = true;
    api.points
      .standing(email)
      .then((data) => {
        const standing = standingFromApi(data, { email, name: user?.UserName, department: user?.Department });
        if (active) setLive({ email, standing });
      })
      .catch((e) => {
        console.error('Could not load your points; showing sample data', e);
        if (active) setLive({ email, standing: null });
      });
    return () => {
      active = false;
    };
  }, [email, user?.UserName, user?.Department]);

  if (!LIVE_LEVELS) return sample;
  if (!live || live.email !== email) {
    return { email, points: 0, rank: null, total: null, level: null, progress: null, best: null, history: [], sample: false, ready: false };
  }
  return live.standing ? { ...live.standing, sample: false, ready: true } : sample;
}
