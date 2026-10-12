import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LARGE_LIBRARY, TOP_COUNT, bodySnippet, bodyUsage, emailBodyOptions, sameBody } from './emailBodies.js';

const sc = (id, body, name = `Scenario ${id}`) => ({ scenarioId: id, scenarioName: name, emailBody: body });

test('snippet: text only, entities decoded, trimmed to length', () => {
  assert.equal(bodySnippet('<style>p{color:red}</style><p>Dear&nbsp;<b>User</b>,</p><p>Reset now &amp; keep access</p>'), 'Dear User , Reset now & keep access');
  assert.equal(bodySnippet('<p>abcdefghij</p>', 6), 'abcde…');
  assert.equal(bodySnippet(''), '');
});

test('sameBody ignores whitespace differences only', () => {
  assert.equal(sameBody('<p>Hi</p>\n  <p>there</p>', '<p>Hi</p> <p>there</p>'), true);
  assert.equal(sameBody('<p>Hi</p>', '<p>Hello</p>'), false);
});

test('usage counts campaigns past DRAFT, by picked body first, else scenario', () => {
  const uses = bodyUsage([
    { status: 'SENT', scenarioId: 'SC-1' },
    { status: 'APPROVED', scenarioId: 'SC-1', emailBodySourceId: 'SC-2' },
    { status: 'DRAFT', scenarioId: 'SC-1' },
    { status: 'PENDING_APPROVAL', scenarioId: 'start-fresh' },
    { status: 'SENT' },
  ]);
  assert.equal(uses.get('SC-1'), 1);
  assert.equal(uses.get('SC-2'), 1);
  assert.equal(uses.get('start-fresh'), 1);
  assert.equal(uses.size, 3);
});

test('options: most used first, ties by id, empty bodies skipped', () => {
  const { options, total, limited } = emailBodyOptions(
    [sc('SC-10', '<p>ten</p>'), sc('SC-2', '<p>two</p>'), sc('SC-3', '<p>three</p>'), sc('SC-4', '   ')],
    [{ status: 'SENT', scenarioId: 'SC-3' }, { status: 'SENT', scenarioId: 'SC-3' }, { status: 'SENT', scenarioId: 'SC-10' }]
  );
  assert.deepEqual(options.map((o) => [o.id, o.uses]), [['SC-3', 2], ['SC-10', 1], ['SC-2', 0]]);
  assert.equal(options[0].snippet, 'three');
  assert.equal(total, 3);
  assert.equal(limited, false);
});

test('identical bodies are offered once, under the most-used template', () => {
  const { options } = emailBodyOptions(
    [sc('SC-1', '<p>same</p>'), sc('SC-2', '<p>same</p>\n')],
    [{ status: 'SENT', scenarioId: 'SC-2' }]
  );
  assert.equal(options.length, 1);
  assert.equal(options[0].id, 'SC-2');
  assert.equal(options[0].uses, 1);
});

test(`up to ${LARGE_LIBRARY} bodies all show; past that only the top ${TOP_COUNT}`, () => {
  const many = (n) => Array.from({ length: n }, (_, i) => sc(`SC-${i + 1}`, `<p>body ${i + 1}</p>`));
  assert.equal(emailBodyOptions(many(LARGE_LIBRARY)).options.length, LARGE_LIBRARY);
  const campaigns = [{ status: 'SENT', scenarioId: 'SC-77' }, { status: 'SENT', scenarioId: 'SC-77' }, { status: 'SENT', scenarioId: 'SC-120' }];
  const big = emailBodyOptions(many(LARGE_LIBRARY + 1 + 20), campaigns);
  assert.equal(big.limited, true);
  assert.equal(big.total, LARGE_LIBRARY + 21);
  assert.equal(big.options.length, TOP_COUNT);
  assert.deepEqual(big.options.slice(0, 3).map((o) => o.id), ['SC-77', 'SC-120', 'SC-1']);
});
