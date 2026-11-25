import assert from 'node:assert/strict';
import test from 'node:test';

import {
  browserPageHasAction,
  dropBrowserLinks,
  emailHasTrap,
  emailOpensBrowserPage,
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

test('page 2 needs something to click', () => {
  assert.equal(browserPageHasAction(PAGE2), true);
  assert.equal(browserPageHasAction('<button>Go</button>'), true);
  assert.equal(browserPageHasAction('<input type="submit" value="Go">'), true);
  assert.equal(browserPageHasAction('<input type="password"><p>No way out</p>'), false);
});

test('a template on page 2 has only the compromise action', () => {
  const template =
    '<div data-action="landing" data-url="{{phishLink}}"><a href="{{phishLink}}">Sign in</a></div>' +
    '<a href="{{ phishLink }}?next=browser" data-action="page" data-target-page="2">x</a>';
  const out = toBrowserPageHtml(template);
  assert.equal(out.includes('phishLink'), false);
  assert.equal(out.match(/\{\{compromiseLink\}\}/g).length, 3);
  assert.equal(out.includes('data-action="landing"') || out.includes('data-target-page'), false);
  assert.equal(out.match(/data-action="training"/g).length, 2);
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
  assert.match(simulationProblem({ emailBody: BROWSER, browserPageHtml: '<p>Hi</p>' }), /needs a button/);
  assert.match(simulationProblem({ emailBody: LANDING, browserPageHtml: PAGE2 }), /never opened/);
  assert.equal(simulationProblem({ emailBody: LANDING + BROWSER, browserPageHtml: PAGE2 }), '');
});
