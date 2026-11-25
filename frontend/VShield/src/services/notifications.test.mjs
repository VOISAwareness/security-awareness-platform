import assert from 'node:assert/strict';
import test from 'node:test';

import { NOTICE_KIND } from './campaignNotices.js';
import { TABS, TYPES, fromApi, fromCampaignNotices, groupByDay, inTab, shortTime, typeOf, unreadCounts } from './notifications.js';

const NOW = Date.parse('2026-11-25T15:00:00Z'); // 15:00 GMT

test('every type names a known tab and tone', () => {
  const tabs = new Set(TABS.map((t) => t.id));
  for (const [type, t] of Object.entries(TYPES)) {
    assert.ok(tabs.has(t.tab), type);
    assert.ok(['amber', 'mint', 'rose', 'lilac', 'sky', 'teal', 'slate'].includes(t.tone), type);
  }
  assert.equal(typeOf({ type: 'nope' }).tab, 'all');
});

test('fromApi drops broken rows and sorts newest first', () => {
  const got = fromApi({ items: [
    { id: 'a', type: 'campaign.sent', title: 'Old', at: '2026-11-20T10:00:00Z' },
    { id: 'b', type: 'campaign.approved', title: 'New', at: NOW, read: true, link: { to: '/campaigns' } },
    { id: 'c' }, null,
  ] });
  assert.deepEqual(got.map((n) => n.id), ['b', 'a']);
  assert.equal(got[0].read, true);
  assert.equal(got[1].read, false);
  assert.equal(got[1].link, null);
});

test('campaign notices become notifications, with what was already seen read', () => {
  const got = fromCampaignNotices([
    { key: 'C1:t', campaignId: 'C1', title: 'Payroll', kind: NOTICE_KIND.CHANGES, by: 'mgr', message: 'Fix it', at: 't', wizardStep: 3 },
    { key: 'C2:t', campaignId: 'C2', title: 'Gift', kind: NOTICE_KIND.REJECTED, by: 'mgr', message: '', at: 't' },
  ], new Set(['C2:t']));
  assert.equal(got[0].type, 'campaign.changes_requested');
  assert.equal(got[0].title, 'Payroll needs changes');
  assert.deepEqual(got[0].link, { to: 'draft', campaignId: 'C1', wizardStep: 3 });
  assert.equal(got[0].read, false);
  assert.equal(got[1].type, 'campaign.rejected');
  assert.equal(got[1].detail, 'mgr');
  assert.equal(got[1].read, true);
});

test('unread counts per tab; announcements count only in All', () => {
  const items = [
    { id: '1', type: 'campaign.pending_approval' },
    { id: '2', type: 'campaign.sent' },
    { id: '3', type: 'campaign.sent', read: true },
    { id: '4', type: 'announcement.published' },
    { id: '5', type: 'achievement.badge' },
  ];
  assert.deepEqual(unreadCounts(items), { all: 4, approvals: 1, campaigns: 1, training: 0, achievements: 1 });
  assert.deepEqual(inTab(items, 'campaigns').map((n) => n.id), ['2', '3']);
  assert.equal(inTab(items, 'all').length, 5);
});

test('grouped by UK day, empty groups left out', () => {
  const g = groupByDay([
    { id: 'a', at: NOW - 3600e3 },
    { id: 'b', at: Date.parse('2026-11-24T23:30:00Z') },
    { id: 'c', at: Date.parse('2026-11-20T10:00:00Z') },
  ], NOW);
  assert.deepEqual(g.map((x) => [x.id, x.items.map((n) => n.id)]), [['today', ['a']], ['yesterday', ['b']], ['earlier', ['c']]]);
  assert.deepEqual(groupByDay([{ id: 'a', at: NOW }], NOW).map((x) => x.id), ['today']);
});

test('short times', () => {
  assert.equal(shortTime(NOW - 20e3, NOW), 'Just now');
  assert.equal(shortTime(NOW - 5 * 60e3, NOW), '5m');
  assert.equal(shortTime(NOW - 3 * 3600e3, NOW), '3h');
  assert.equal(shortTime(Date.parse('2026-11-24T14:05:00Z'), NOW), '14:05');
  assert.equal(shortTime(Date.parse('2026-11-12T09:00:00Z'), NOW), '12 Nov');
  assert.equal(shortTime('', NOW), '');
});
