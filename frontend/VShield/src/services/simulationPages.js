/**
 * The two pages of a phishing simulation, and the rules that keep them working.
 *
 *  Page 1, the email (`emailBody`). Each element's On Click is one of:
 *    - landing  `{{phishLink}}`               click recorded, then the
 *                                              campaign's landing page (Oops)
 *    - browser  `{{phishLink}}?next=browser`  click recorded, then page 2
 *  Page 2, the browser page (`browserPageHtml`, optional): a fake sign-in or
 *  code screen served by the tracking Lambda as plain HTML on the API's own
 *  domain. Every element on it submits the page (`{{compromiseLink}}`): the
 *  person is marked compromised, then shown the landing page, which leads to
 *  My Training. Nothing typed into it is ever sent or stored.
 */

import { missingPictures, picturesLabel } from './pictures.js';

export const PHISH_LINK = '{{phishLink}}';
export const BROWSER_PAGE_LINK = '{{phishLink}}?next=browser';
export const COMPROMISE_LINK = '{{compromiseLink}}';

export const EMAIL_PAGE_ID = 1;
export const BROWSER_PAGE_ID = 2;
export const MAX_PAGES = 2;

export const PAGE_LABELS = {
  [EMAIL_PAGE_ID]: 'Email',
  [BROWSER_PAGE_ID]: 'Browser page',
};

const EMPTY_HTML = new Set(['', '<br>', '<p></p>', '<p><br></p>', '<div><br></div>']);

export const isBlankHtml = (html) => EMPTY_HTML.has(String(html ?? '').trim().toLowerCase());

const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PHISH_RE = /\{\{\s*phishLink\s*\}\}/i;
const BROWSER_RE = new RegExp(escapeRe('{{') + '\\s*phishLink\\s*' + escapeRe('}}') + '\\?next=browser', 'gi');

/** Does an href / data-url in the email point at the tracked phishing link? */
export function emailHasTrap(html) {
  const markup = String(html || '');
  return /(?:href|data-url)\s*=\s*"[^"]*\{\{\s*phishLink\s*\}\}[^"]*"/i.test(markup);
}

/** Does any element of the email open the browser page? */
export function emailOpensBrowserPage(html) {
  BROWSER_RE.lastIndex = 0;
  return BROWSER_RE.test(String(html || ''));
}

// Words on a real action button: the only elements that take an On-Click on
// the browser page (Next, Submit, Confirm, Sign in...). Matched on its text.
export const ACTION_WORDS =
  /\b(next|submit|confirm|continue|proceed|sign\s*in|signin|log\s*in|login|log\s*on|logon|verify|validate|authenticate|authori[sz]e|unlock|access|send|ok|okay|done|finish|register|activate|reset|update|save|go|enter)\b/i;

/**
 * Has the browser page a configured On-Click: a submit button wired to mark
 * the employee compromised? (Nothing is wired automatically any more; the
 * author sets it on the real button, so this is what a save needs.)
 */
export function browserPageHasAction(html) {
  return /data-action\s*=\s*"training"|\{\{\s*compromiseLink\s*\}\}/i.test(String(html || ''));
}

/**
 * Page-2 HTML with nothing pre-wired. A template or an inserted button arrives
 * with NO On-Click: every pre-set action and every phishing / compromise link
 * is stripped to an inert '#', and links do nothing when clicked in the editor.
 * The author then sets the On-Click on the real submit button (Next, Submit,
 * Confirm...) through the modal, which is the only thing that marks compromise.
 */
export function toBrowserPageHtml(html) {
  return String(html || '')
    .replace(/\s+data-action\s*=\s*"(?:landing|page|training)"/gi, '')
    .replace(/\s+data-url\s*=\s*"[^"]*"/gi, '')
    .replace(/\s+data-target-page\s*=\s*"[^"]*"/gi, '')
    .replace(new RegExp(PHISH_RE.source + '(?:\\?next=browser)?', 'gi'), '#')
    .replace(/\{\{\s*compromiseLink\s*\}\}/gi, '#')
    .replace(/<a\b(?![^>]*\bonclick\s*=)/gi, '<a onclick="return false;" ');
}

/** The email with every browser-page link turned back into a landing link. */
export function dropBrowserLinks(html) {
  return String(html || '')
    .replace(BROWSER_RE, PHISH_LINK)
    .replace(/data-action\s*=\s*"page"/gi, 'data-action="landing"')
    .replace(/\s+data-target-page\s*=\s*"[^"]*"/gi, '');
}

/**
 * What stops these pages being saved, as a message, or '' when they are fine:
 *  - the email needs at least one trap (a phishing link);
 *  - an email element that opens the browser page needs that page;
 *  - a browser page needs something to click, and an email element to open it;
 *  - no page may have a picture employees could not see (a file name or path,
 *    file:, blob:, localhost...): upload it where the editor marks it.
 */
export function simulationProblem({ emailBody, browserPageHtml } = {}) {
  if (!emailHasTrap(emailBody)) {
    return 'Configure an On-Click action on at least one email element (e.g. the phishing button) before continuing.';
  }
  const hasBrowserPage = !isBlankHtml(browserPageHtml);
  if (emailOpensBrowserPage(emailBody) && !hasBrowserPage) {
    return 'An email element opens the browser page, but the browser page is empty. Design page 2 or change that element\'s On-Click action.';
  }
  if (hasBrowserPage && !browserPageHasAction(browserPageHtml)) {
    return 'The browser page (page 2) has no On-Click yet. Select its submit button (Next, Submit, Confirm...) and set On-Click to "Mark compromised".';
  }
  if (hasBrowserPage && !emailOpensBrowserPage(emailBody)) {
    return 'The browser page (page 2) is never opened. Set an email element\'s On-Click action to "Add one more page for compromised part", or delete page 2.';
  }
  const emailMissing = missingPictures(emailBody).length;
  if (emailMissing) {
    return `${picturesLabel(emailMissing)} in the email can't be shown to employees. Upload ${emailMissing === 1 ? 'it' : 'each one'} where it's marked in the editor, or remove ${emailMissing === 1 ? 'it' : 'them'}.`;
  }
  const pageMissing = hasBrowserPage ? missingPictures(browserPageHtml).length : 0;
  if (pageMissing) {
    return `${picturesLabel(pageMissing)} on the browser page can't be shown to employees. Upload ${pageMissing === 1 ? 'it' : 'each one'} where it's marked in the editor, or remove ${pageMissing === 1 ? 'it' : 'them'}.`;
  }
  return '';
}

// Sample values a preview fills in, so it reads as the recipient would see it.
export const PREVIEW_RECIPIENT = {
  name: 'Alex Morgan',
  email: 'alex.morgan@example.com',
  department: 'Finance',
  country: 'United Kingdom',
  manager: 'Jordan Lee',
  employeeId: 'EMP-10432',
};
export const PREVIEW_TRACKING_URL = 'https://track.example.com/t/preview';

const PREVIEW_FIELDS = [
  [['{{userName}}', '{{USER_NAME}}', '{{UserName}}', '@UserName', '@userName'], 'name'],
  [['{{email}}', '{{userEmail}}', '@UserEmailID'], 'email'],
  [['{{department}}', '@UserDepartment'], 'department'],
  [['{{country}}', '{{location}}', '@UserCountry'], 'country'],
  [['{{managerName}}', '@ManagerName'], 'manager'],
  [['{{employeeId}}', '@EmployeeID'], 'employeeId'],
];

const escapeHtml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * An email or page as the recipient sees it: placeholders filled with sample
 * values and the editor's own marks (editable text, move cursors) taken out.
 * Links point at a sample tracking address, so hovering one shows where it goes.
 */
export function previewHtml(html, { recipient = PREVIEW_RECIPIENT, date = new Date() } = {}) {
  let out = String(html || '');
  const values = recipient;
  for (const [placeholders, field] of PREVIEW_FIELDS) {
    const value = escapeHtml(values[field] ?? '');
    for (const placeholder of placeholders) out = out.split(placeholder).join(value);
  }
  const today = escapeHtml(date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
  out = out.split('{{currentDate}}').join(today).split('@CurrentDate').join(today);
  return out
    .replace(/\{\{\s*(?:phishLink|PHISH_LINK|phishingLink|trackingUrl|TRACKING_URL)\s*\}\}|@PhishLink\b/g, PREVIEW_TRACKING_URL)
    .replace(/\{\{\s*compromiseLink\s*\}\}/g, '#')
    .replace(/\s+contenteditable\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/cursor\s*:\s*move/gi, 'cursor:default');
}

// The fx a scenario's email template can carry (filled in later, when a
// campaign made from it is sent).
export const PERSONAL_FX = [
  { label: '@UserName', desc: 'Target user full name' },
  { label: '@UserEmailID', desc: 'Target user email address' },
  { label: '@UserDepartment', desc: 'Target user department' },
  { label: '@UserCountry', desc: 'Target user work location' },
  { label: '@ManagerName', desc: 'Target direct reporting manager' },
  { label: '@EmployeeID', desc: 'Corporate employee badge number' },
  { label: '@CurrentDate', desc: 'Simulation execution timestamp' },
];
// A subject line is plain text: no links in it.
export const SUBJECT_FX = PERSONAL_FX;

const SUBJECT_FIELDS = [
  [['{{userName}}', '{{USER_NAME}}', '{{UserName}}', '@UserName', '@userName'], (r) => r.name || ''],
  [['{{email}}', '{{userEmail}}', '@UserEmailID'], (r) => r.email || ''],
  [['{{department}}', '@UserDepartment'], (r) => r.department || ''],
  [['{{country}}', '{{location}}', '@UserCountry'], (r) => r.country || ''],
  [['{{managerName}}', '@ManagerName'], (r) => r.manager || ''],
  [['{{employeeId}}', '@EmployeeID'], (r) => r.employeeId || ''],
];
const SUBJECT_BLANKED =
  /\{\{\s*(?:phishLink|PHISH_LINK|phishingLink|trackingUrl|TRACKING_URL|compromiseLink)\s*\}\}|@PhishLink\b/g;

/** A subject line as the recipient sees it (plain text, not HTML). */
export function previewSubject(subject, { recipient = PREVIEW_RECIPIENT, date = new Date() } = {}) {
  let out = String(subject || '');
  for (const [placeholders, valueOf] of SUBJECT_FIELDS) {
    const value = valueOf(recipient);
    for (const placeholder of placeholders) out = out.split(placeholder).join(value);
  }
  const today = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  out = out.split('{{currentDate}}').join(today).split('@CurrentDate').join(today);
  return out.replace(SUBJECT_BLANKED, '').replace(/\s{2,}/g, ' ').trim();
}

/** A whole document around a preview, for a sandboxed frame. */
export function previewDocument(html, { background = '#ffffff', padding = '16px' } = {}) {
  return (
    '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<style>html,body{margin:0;}body{padding:' + padding + ';background:' + background + ';' +
    "font-family:'Segoe UI',Calibri,Arial,sans-serif;font-size:14px;color:#242424;}" +
    'img{max-width:100%;}.vshield-canvas-item{cursor:default!important;}a{cursor:pointer;}</style>' +
    '</head><body>' + previewHtml(html) + '</body></html>'
  );
}
