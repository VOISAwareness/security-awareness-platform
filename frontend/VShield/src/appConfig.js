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
