/**
 * App-wide values that used to be hard-coded, screen by screen, as one
 * person's name and email address.
 *
 * SUPPORT_EMAIL — the contact shown in the header, landing page and footer.
 *   Set VITE_SUPPORT_EMAIL to point an environment at a different mailbox.
 * DEMO_USER — the stand-in recipient for email, landing-page and certificate
 *   previews, and the demo profile in bundled sample data. Never a real person.
 */
export const SUPPORT_EMAIL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPPORT_EMAIL) ||
  'vois.shield@vodafone.com';

export const DEMO_USER = {
  name: 'VOIS Demo User',
  email: 'vois.demo.user@vodafone.com',
};

/**
 * APP_URL — where this app is served, used for links that leave the app and
 * must come back to it: the landing page's "Go to My Training" buttons are
 * shown on the tracking domain, so they need the app's absolute address.
 *   Set VITE_APP_URL when the app is reached at a different address from the
 *   one admins edit landing pages on; otherwise the current origin is used.
 */
export const APP_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_URL) ||
  (typeof window !== 'undefined' ? window.location.origin : '');
