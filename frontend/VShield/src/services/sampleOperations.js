/**
 * What is going on in the app now, for Insights' Summary, until it reads the
 * campaigns and sender identities APIs: campaigns by workflow status (the
 * backend's, campaignStatus.js) other than those sent, sender domains not
 * yet verified, and the next campaigns scheduled. Fixed sample numbers.
 */
import { STATUS } from './campaignStatus.js';

// Campaigns by status now; the sent ones are the period's (insights()).
export const STATUS_NOW = Object.freeze({
  [STATUS.DRAFT]: 4,
  [STATUS.PENDING_APPROVAL]: 2,
  [STATUS.APPROVED]: 3,
  [STATUS.SENDING]: 1,
  [STATUS.REJECTED]: 1,
  [STATUS.FAILED]: 0,
});

export const SENDER_DOMAINS = Object.freeze({ verified: 3, unverified: 1 });

// The next campaigns scheduled, `inDays` after the newest campaign started.
export const SCHEDULED = Object.freeze([
  { name: 'Annual Bonus Letter', type: 'Reward scam', inDays: 3 },
  { name: 'MFA Reset Required', type: 'Helpdesk impersonation', inDays: 6 },
  { name: 'Conference Invitation', type: 'Travel scam', inDays: 9 },
]);
