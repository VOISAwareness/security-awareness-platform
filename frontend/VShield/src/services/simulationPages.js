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

/** Can the person do anything on the browser page (a link, button or submit)? */
export function browserPageHasAction(html) {
  return /<a\b[^>]*\bhref\s*=|<button\b|<input\b[^>]*type\s*=\s*["']?(?:submit|button|image)/i.test(String(html || ''));
}

/**
 * Page-2 HTML: its phishing links (from a template or an inserted button)
 * become the compromise action, which is the only action page 2 has.
 */
export function toBrowserPageHtml(html) {
  return String(html || '')
    .replace(new RegExp(PHISH_RE.source + '(?:\\?next=browser)?', 'gi'), COMPROMISE_LINK)
    .replace(/data-action\s*=\s*"(?:landing|page)"/gi, 'data-action="training"')
    .replace(/\s+data-target-page\s*=\s*"[^"]*"/gi, '');
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
 *  - a browser page needs something to click, and an email element to open it.
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
    return 'The browser page (page 2) needs a button or link for the employee to submit.';
  }
  if (hasBrowserPage && !emailOpensBrowserPage(emailBody)) {
    return 'The browser page (page 2) is never opened. Set an email element\'s On-Click action to "Add one more page for compromised part", or delete page 2.';
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
  [['{{country}}', '@UserCountry'], 'country'],
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
  for (const [placeholders, field] of PREVIEW_FIELDS) {
    const value = escapeHtml(recipient[field] ?? '');
    for (const placeholder of placeholders) out = out.split(placeholder).join(value);
  }
  const today = escapeHtml(date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
  out = out.split('{{currentDate}}').join(today).split('@CurrentDate').join(today);
  return out
    .replace(/\{\{\s*(?:phishLink|PHISH_LINK|phishingLink|trackingUrl|TRACKING_URL)\s*\}\}/g, PREVIEW_TRACKING_URL)
    .replace(/\{\{\s*compromiseLink\s*\}\}/g, '#')
    .replace(/\s+contenteditable\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/cursor\s*:\s*move/gi, 'cursor:default');
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
