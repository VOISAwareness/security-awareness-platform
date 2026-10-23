import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

import { GLOSSARY, HEALTH_RULE, HEALTH_WORD, healthWord } from './glossary.js';

test('every measure has a name, what it tells you and how it is worked out', () => {
  for (const [key, g] of Object.entries(GLOSSARY)) {
    for (const part of ['name', 'what', 'how']) assert.ok(typeof g[part] === 'string' && g[part].length > 3, `${key}.${part}`);
  }
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
