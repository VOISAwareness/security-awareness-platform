import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

import { GLOSSARY, HEALTH_RULE, HEALTH_WORD, MEASURES, healthWord } from './glossary.js';

test('every measure has a name, what it tells you and how it is worked out', () => {
  for (const [key, g] of Object.entries(GLOSSARY)) {
    for (const part of ['name', 'what', 'how']) assert.ok(typeof g[part] === 'string' && g[part].length > 3, `${key}.${part}`);
  }
});

test('the measures go by exactly the agreed names, and nothing else borrows or bends one', () => {
  assert.deepEqual(MEASURES.map((k) => GLOSSARY[k].name), ['Risk Score', 'Hook Rate', 'Report Rate', 'Resilience Ratio', 'Training Lift', 'Gave details away', 'Protected / Holding / Not protected', 'People at high risk']);
  const others = Object.keys(GLOSSARY).filter((k) => !MEASURES.includes(k)).map((k) => GLOSSARY[k].name.toLowerCase());
  for (const name of others) {
    assert.ok(!/\b(at high risk|training impact|lift|hook|report rate|resilience|reports for every click|details)\b/.test(name), `"${name}" reads like a measure's name`);
  }
});

test('"Gave details away" has one meaning: a share of the emails delivered, like the Hook Rate', () => {
  assert.match(GLOSSARY.gaveDetails.how, /share of emails delivered/);
  assert.match(GLOSSARY.hookRate.how, /share of emails delivered/);
  assert.doesNotMatch(`${GLOSSARY.gaveDetails.what} ${GLOSSARY.gaveDetails.how}`, /of (those who|the) click/i);
});

test('units: points for the Risk Score, percentage points for a rate, people for a count', () => {
  assert.match(GLOSSARY.riskScore.how, /\(pts\)/);
  assert.match(GLOSSARY.hookRate.how, /\(pp\)/);
  assert.match(GLOSSARY.reportRate.how, /\(pp\)/);
  assert.match(GLOSSARY.highRisk.how, /in people/);
});

test('the risk drivers say which counts are in the Risk Score and which are not', () => {
  assert.match(GLOSSARY.riskDrivers.how, /In the Risk Score: repeat clickers .* never reported/);
  assert.match(GLOSSARY.riskDrivers.how, /not in the score: overdue training · failed the quiz again/);
});

test('health: people read "Not protected", and the rule names every word', () => {
  assert.equal(healthWord('Exposed'), 'Not protected');
  assert.equal(healthWord('Protected'), 'Protected');
  assert.equal(healthWord('Something else'), 'Something else');
  for (const word of Object.values(HEALTH_WORD)) assert.match(HEALTH_RULE, new RegExp(word));
  assert.doesNotMatch(HEALTH_RULE, /Exposed/);
});

test("every ⓘ on the Insights page points at a glossary entry", () => {
  const dir = new URL('../Pages/Insights/', import.meta.url);
  const used = new Set();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.jsx'))) {
    const src = readFileSync(new URL(file, dir), 'utf8');
    for (const m of src.matchAll(/\bdefine(?:=|: )["']([A-Za-z]+)["']/g)) used.add(m[1]);
    for (const m of src.matchAll(/\bterm="([A-Za-z]+)"/g)) used.add(m[1]);
  }
  assert.ok(used.size >= 12, `found ${used.size}`);
  for (const term of used) assert.ok(GLOSSARY[term], term);
});
