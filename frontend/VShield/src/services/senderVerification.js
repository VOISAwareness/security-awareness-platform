// Email IDs & Domains: how each address stands with SES. Saving an address
// asks SES to email it a verification link; once someone clicks the link the
// address is verified and campaigns can send from it. The API reads the state
// live from SES on every list, so the page only has to show it.

export const VERIFICATION = {
  Verified: { label: 'Verified', tone: 'good', hint: 'Campaigns can send from this address' },
  Pending: { label: 'Pending', tone: 'warn', hint: 'Waiting for someone to click the link SES emailed to this address' },
  Failed: { label: 'Failed', tone: 'bad', hint: 'The link was not clicked in time; send it again' },
  'Not verified': { label: 'Not verified', tone: 'muted', hint: 'SES has not been asked to verify this address yet' },
  Unknown: { label: 'Status unavailable', tone: 'muted', hint: 'SES could not be asked right now' },
};

// Same rule as the API (reference-api clean_email): a real domain with a dot.
const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

export const isVerifiableEmail = (email) => typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email.trim());

export const verificationOf = (item) => VERIFICATION[item?.verificationStatus] || VERIFICATION['Not verified'];

/** Whether the page offers "Send verification email" for this address. */
export const canSendVerification = (item) =>
  isVerifiableEmail(item?.email) && item?.verificationStatus !== 'Verified' && item?.verificationStatus !== 'Unknown';

/** What to tell the person after saving or resending. */
export function verificationMessage(saved) {
  const email = saved?.email || 'this address';
  if (saved?.verificationStatus === 'Verified') return { tone: 'good', text: `${email} is already verified in SES` };
  if (saved?.verificationEmailSent) return { tone: 'good', text: `SES sent a verification email to ${email}. Click the link in it to verify.` };
  return { tone: 'bad', text: saved?.verificationError || `SES did not send a verification email to ${email}` };
}
