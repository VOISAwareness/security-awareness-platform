/**
 * useMyStanding — the signed-in person's points, rank and level, from
 * GET /standing (the points ledger; liveStanding.js). `ready` is false only
 * while it is read, so screens don't treat a placeholder as the person's
 * level; if it can't be read, `failed` is true and they show 0 points.
 */
import { useEffect, useState } from 'react';

import { DEMO_USER } from '../appConfig';
import { useUserType } from '../UserTypeContext/UserTypeContext';
import { api } from './api';
import { levelFor, progressFor } from './levels';
import { standingFromApi } from './liveStanding';

const nothing = (email, extra) => ({ email, points: 0, rank: null, total: null, level: null, progress: null, best: null, history: [], ...extra });

export function useMyStanding() {
  const { user } = useUserType() || {};
  const email = (user?.UserEMailID || DEMO_USER.email).trim().toLowerCase();
  const [live, setLive] = useState(null); // { email, standing }

  useEffect(() => {
    let active = true;
    api.points
      .standing(email)
      .then((data) => {
        const standing = standingFromApi(data, { email, name: user?.UserName, department: user?.Department });
        if (active) setLive({ email, standing });
      })
      .catch((e) => {
        console.error('Could not load your points', e);
        if (active) setLive({ email, standing: null });
      });
    return () => {
      active = false;
    };
  }, [email, user?.UserName, user?.Department]);

  if (!live || live.email !== email) return nothing(email, { ready: false });
  if (live.standing) return { ...live.standing, ready: true };
  // unknown to the ledger, or it could not be read: a New Joiner on 0 points
  return nothing(email, { level: levelFor(0), progress: progressFor(0), ready: true, failed: true });
}
