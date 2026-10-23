import assert from 'node:assert/strict';
import test from 'node:test';

import { DEPT_QUESTIONS, deptOrder, deptRows, deptSays } from './deptQuestions.js';
import { insights, peopleInsights } from './insights.js';
import { campaignReport } from './sampleReports.js';
import { CAMPAIGNS, DEPTS, PAST_CAMPAIGNS, person } from './sampleCampaigns.js';
import { organisation } from './sampleOrganisation.js';

const ITEMS = [...CAMPAIGNS, ...PAST_CAMPAIGNS].map((campaign) => ({ campaign, report: campaignReport(campaign, { depts: DEPTS, personAt: person }) }));
const at = (days) => {
  const m = insights(ITEMS, { days });
  const p = peopleInsights(organisation({ end: m.basis.end, steps: 24 }), { days });
  const cells = Object.fromEntries(Object.entries(m.deptLures).map(([name, list]) => [name, Object.fromEntries(list.map((x) => [x.type, x]))]));
  return { m, p, rows: deptRows(m, p), ctx: { company: p.now.score, days, lures: m.lures, cells } };
};

test('four questions, each with a chip label', () => {
  assert.deepEqual(DEPT_QUESTIONS.map((q) => q.id), ['risk', 'change', 'reports', 'types']);
  for (const q of DEPT_QUESTIONS) assert.ok(q.label.length > 5);
});

test('a row per department, with its risk, its change and its emails', () => {
  const { p, rows } = at(30);
  assert.equal(rows.length, p.departments.length);
  for (const r of rows) {
    assert.ok(Number.isFinite(r.score));
    assert.ok(Number.isFinite(r.change), `${r.name} has a change`);
    assert.ok(Math.abs(r.score - r.before - r.change) < 1e-9);
    assert.ok(r.emails > 0 && r.hooked >= 0 && r.hooked <= 1 && r.reportRate >= 0 && r.reportRate <= 1, r.name);
    assert.ok(['Protected', 'Holding', 'Exposed'].includes(r.health.word));
  }
});

test('the order: riskiest first, or the most improved first', () => {
  const { rows } = at(30);
  const risk = deptOrder(rows, 'risk');
  risk.forEach((r, i) => assert.ok(i === 0 || r.score <= risk[i - 1].score));
  const change = deptOrder(rows, 'change');
  change.forEach((r, i) => assert.ok(i === 0 || r.change >= change[i - 1].change));
  assert.equal(rows.length, risk.length, 'ordering copies, never drops');
});

test('three sentences per question, reporting only', () => {
  for (const days of [30, 60, 90]) {
    const { rows, ctx } = at(days);
    for (const q of DEPT_QUESTIONS) {
      const says = deptSays(q.id, rows, ctx);
      assert.equal(says.length, 3, `${q.id} at ${days} days`);
      for (const s of says) {
        assert.ok(['good', 'bad', 'watch'].includes(s.tone));
        assert.ok(s.strong && s.text, `${q.id}: ${s.strong}${s.text}`);
        assert.doesNotMatch(`${s.strong}${s.text}`, /\bshould\b|\bmust\b|\bneeds? to\b|Exposed|NaN|undefined/, `${q.id}: ${s.strong}${s.text}`);
      }
    }
  }
});

test('who is riskiest names the top and the bottom, against the company', () => {
  const { rows, ctx } = at(30);
  const [top, above, low] = deptSays('risk', rows, ctx);
  const list = deptOrder(rows, 'risk');
  assert.equal(top.strong, list[0].name);
  assert.equal(low.strong, list.at(-1).name);
  assert.equal(above.strong, `${rows.filter((r) => r.score > ctx.company).length} of ${rows.length}`);
});

test('who is changing follows the period: safer over 30 days, riskier over 90', () => {
  const count = (days) => {
    const { rows } = at(days);
    return { safer: rows.filter((r) => r.change <= -0.05).length, riskier: rows.filter((r) => r.change >= 0.05).length };
  };
  const a = count(30); const c = count(90);
  assert.ok(a.safer > a.riskier, `30 days: ${JSON.stringify(a)}`);
  assert.ok(c.riskier > c.safer, `90 days: ${JSON.stringify(c)}`);
  const { rows, ctx } = at(30);
  const [first] = deptSays('change', rows, ctx);
  assert.equal(first.strong, a.safer === rows.length ? `All ${rows.length}` : `${a.safer} of ${rows.length}`);
  assert.match(first.text, /got safer over the last 30 days/);
  if (a.riskier) assert.match(first.text, new RegExp(`${a.riskier} got riskier`));
});

test('reports vs clicks counts each health, in the words people read', () => {
  const { rows, ctx } = at(90);
  const [prot, notProt] = deptSays('reports', rows, ctx);
  assert.equal(prot.strong, `${rows.filter((r) => r.health.word === 'Protected').length} of ${rows.length}`);
  const exposed = rows.filter((r) => r.health.word === 'Exposed').length;
  assert.match(notProt.text, /Not protected/);
  if (exposed) assert.equal(notProt.strong, String(exposed));
});

test('what fools them names the campaign types and the hottest cell', () => {
  const { m, rows, ctx } = at(30);
  const [most, cell, fewest] = deptSays('types', rows, ctx);
  assert.match(most.strong, new RegExp(m.lures[0].type));
  assert.match(fewest.strong, new RegExp(m.lures.at(-1).type));
  const hottest = Math.max(...Object.values(ctx.cells).flatMap((t) => Object.values(t)).map((x) => x.hooked));
  assert.match(cell.text, new RegExp(`${Math.round(hottest * 100)}%`));
});

test('no departments, nothing to say', () => {
  assert.deepEqual(deptSays('risk', [], { company: 20, days: 30 }), []);
});
