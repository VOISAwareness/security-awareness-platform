/**
 * useMyStanding — the signed-in person's points, rank and level.
 *
 * Sample data for now (services/sampleStanding.js, from the bundled user
 * list); `sample: true` says so. When GET /me/standing exists it is read here
 * first, with the sample as the fallback, and the screens don't change.
 */
import { useMemo } from 'react';

import masterUsers from '../MasterUserData.json';
import { DEMO_USER } from '../appConfig';
import { useUserType } from '../UserTypeContext/UserTypeContext';
import { sampleStanding } from './sampleStanding';

export function useMyStanding() {
  const { user } = useUserType() || {};
  const email = user?.UserEMailID || DEMO_USER.email;
  return useMemo(() => ({ ...sampleStanding(masterUsers, email), sample: true }), [email]);
}
