import assert from 'node:assert/strict';
import test from 'node:test';

import {
  browserPageHasAction,
  dropBrowserLinks,
  emailHasTrap,
  emailOpensBrowserPage,
  previewDocument,
  previewHtml,
  simulationProblem,
  toBrowserPageHtml,
} from './simulationPages.js';

const LANDING = '<a href="{{phishLink}}">Verify</a>';
const BROWSER = '<div data-action="page" data-target-page="2" data-url="{{phishLink}}?next=browser"><a href="{{phishLink}}?next=browser">Sign in</a></div>';
const PAGE2 = '<input type="password"><a href="{{compromiseLink}}">Continue</a>';

test('a trap is a link to the phishing placeholder, not any data-url', () => {
  assert.equal(emailHasTrap(LANDING), true);
  assert.equal(emailHasTrap(BROWSER), true);
  assert.equal(emailHasTrap('<div data-url="#page-2">x</div>'), false);
  assert.equal(emailHasTrap('<p>Hello {{phishLink}}</p>'), false);
  assert.equal(emailHasTrap(''), false);
});

test('the email opens the browser page only through ?next=browser', () => {
  assert.equal(emailOpensBrowserPage(BROWSER), true);
  assert.equal(emailOpensBrowserPage(BROWSER), true); // a global regex keeps no state between calls
  assert.equal(emailOpensBrowserPage(LANDING), false);
});

test('page 2 needs a configured compromise action, not just something clickable', () => {
  assert.equal(browserPageHasAction(PAGE2), true);
  assert.equal(browserPageHasAction('<div data-action="training"><button>Go</button></div>'), true);
  // A bare button is not an action until the author configures it.
  assert.equal(browserPageHasAction('<button>Go</button>'), false);
  assert.equal(browserPageHasAction('<input type="password"><p>No way out</p>'), false);
});

test('a template on page 2 arrives with nothing pre-wired', () => {
  const template =
    '<div data-action="landing" data-url="{{phishLink}}"><a href="{{phishLink}}">Sign in</a></div>' +
    '<a href="{{ phishLink }}?next=browser" data-action="page" data-target-page="2">x</a>';
  const out = toBrowserPageHtml(template);
  // No phishing/compromise link and no action is pre-selected.
  assert.equal(/phishLink|compromiseLink/.test(out), false);
  assert.equal(/data-action=/.test(out), false);
  assert.equal(/data-target-page/.test(out), false);
  assert.equal(browserPageHasAction(out), false);
  // Links do nothing in the editor.
  assert.equal(out.match(/onclick="return false;"/g).length, 2);
});

test('deleting page 2 turns its email links back into landing links', () => {
  const out = dropBrowserLinks(BROWSER + LANDING);
  assert.equal(emailOpensBrowserPage(out), false);
  assert.equal(out.includes('data-action="landing"'), true);
  assert.equal(out.includes('data-target-page'), false);
  assert.equal(emailHasTrap(out), true);
});

test('what stops a save', () => {
  assert.match(simulationProblem({ emailBody: '<p>No trap</p>' }), /On-Click/);
  assert.equal(simulationProblem({ emailBody: LANDING }), '');
  assert.equal(simulationProblem({ emailBody: LANDING, browserPageHtml: '<p><br></p>' }), '');
  assert.match(simulationProblem({ emailBody: BROWSER, browserPageHtml: '' }), /browser page is empty/);
  assert.match(simulationProblem({ emailBody: BROWSER, browserPageHtml: '<p>Hi</p>' }), /no On-Click yet/);
  assert.match(simulationProblem({ emailBody: LANDING, browserPageHtml: PAGE2 }), /never opened/);
  assert.equal(simulationProblem({ emailBody: LANDING + BROWSER, browserPageHtml: PAGE2 }), '');
});

test('a preview reads as the recipient would see it', () => {
  const html =
    '<p contenteditable="true" style="cursor: move">Dear {{userName}} (@UserDepartment), {{currentDate}}</p>' +
    '<a href="{{phishLink}}?next=browser">Sign in</a><a href="{{compromiseLink}}">Go</a>';
  const out = previewHtml(html, { recipient: { name: '<Ana>', department: 'Ops' }, date: new Date('2026-11-25T10:00:00Z') });
  assert.equal(out.includes('contenteditable') || out.includes('cursor: move'), false);
  assert.match(out, /Dear &lt;Ana&gt; \(Ops\), 25 Nov 2026/);
  assert.match(out, /href="https:\/\/track\.example\.com\/t\/preview\?next=browser"/);
  assert.match(out, /href="#">Go/);
  assert.match(previewDocument('<p>x</p>'), /^<!DOCTYPE html>.*<p>x<\/p><\/body><\/html>$/);
});

test('a picture employees could not see stops a save, on either page', () => {
  const hosted = '<img src="https://d1.cloudfront.net/media/0123456789abcdef0123456789abcdef/a.png">';
  assert.equal(simulationProblem({ emailBody: LANDING + hosted }), '');
  assert.match(simulationProblem({ emailBody: LANDING + '<img src="logo.png">' }), /^1 picture in the email/);
  assert.match(
    simulationProblem({ emailBody: LANDING + BROWSER, browserPageHtml: PAGE2 + '<img src="a.png"><div style="background:url(b.jpg)"></div>' }),
    /^2 pictures on the browser page/,
  );
});

test('previewSubject fills sample values and drops links', async () => {
  const { previewSubject } = await import('./simulationPages.js');
  const r = { name: 'Alex Morgan', email: 'alex@example.com' };
  const d = new Date('2026-11-27T10:00:00Z');
  assert.equal(previewSubject('@UserName, check @UserEmailID', { recipient: r, date: d }), 'Alex Morgan, check alex@example.com');
  assert.equal(previewSubject('Hi @UserName (@UserDepartment) @PhishLink', { recipient: r, date: d }), 'Hi Alex Morgan ()');
  assert.equal(previewSubject('@UserDepartment', { recipient: { department: 'Finance' }, date: d }), 'Finance');
  assert.equal(previewSubject('Due @CurrentDate', { recipient: r, date: d }), 'Due 27 Nov 2026');
});
