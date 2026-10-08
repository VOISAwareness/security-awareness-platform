/**
 * Who is acting, for the audit fields the backend records (createdBy,
 * submittedBy, approvedBy, rejectedBy, withdrawnBy).
 *
 * POC identity: the profile picked on the login screen. It is client-supplied
 * until Entra ID lands, so it identifies people for display and ownership
 * checks but is not a security boundary. Emails are lower-cased so the
 * "created by me" / "approved by me" comparisons on the approvals screens
 * match however the address was typed.
 */
const ACTIVE_USER_KEY = 'voisshield_active_user';

export function actorFor(user) {
  const email = String(user?.UserEMailID || user?.email || user?.userEmail || '').trim();
  if (email) return email.toLowerCase();
  return String(user?.role || 'wizard-user').trim();
}

/** The logged-in actor, for code that runs outside React (the draft hook). */
export function currentActor() {
  try {
    return actorFor(JSON.parse(localStorage.getItem(ACTIVE_USER_KEY) || 'null'));
  } catch {
    return actorFor(null);
  }
}
