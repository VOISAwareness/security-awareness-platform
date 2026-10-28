// The colour contract: every role in both themes, health and risk mapped to
// the right role, no risk level wearing the brand red, one hex per role.
//   node --test src/Pages/Insights/insightsColours.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { INK, ROLES, STEADY_INK, TIER_TEXT, TINT, healthInk, healthTone, themeVars, tierInk, tierText } from './insightsColours.js';

const MODES = ['light', 'dark'];
const HEX = /^#[0-9A-F]{6}$/;

// OKLab ΔE ×100 and WCAG contrast, as the dataviz validator measures them
const lin = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
const oklab = (h) => {
  const [r, g, b] = lin(h);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const deltaE = (a, b) => { const x = oklab(a); const y = oklab(b); return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
const lum = (h) => { const [r, g, b] = lin(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('every role exists in both themes, as a hex', () => {
  assert.deepEqual(ROLES, ['good', 'caution', 'bad', 'severe', 'context', 'measure', 'brand']);
  for (const mode of MODES) for (const role of ROLES) assert.match(INK[mode][role], HEX, `${mode}.${role}`);
  assert.equal(INK.light.brand, '#E60000');
  assert.equal(INK.dark.brand, '#FF4545');
  assert.equal(STEADY_INK, INK.light.context);
});

test('the old names are plain aliases', () => {
  for (const mode of MODES) {
    assert.equal(INK[mode].danger, INK[mode].severe);
    assert.equal(INK[mode].alert, INK[mode].bad);
    assert.equal(INK[mode].neutral, INK[mode].measure);
  }
});

test('no role reuses another role\'s hex', () => {
  for (const mode of MODES) {
    const hexes = ROLES.map((r) => INK[mode][r]);
    assert.equal(new Set(hexes).size, hexes.length, `${mode}: ${hexes.join(' ')}`);
  }
});

test('health words map to their tone and colour', () => {
  assert.equal(healthTone('Protected'), 'good');
  assert.equal(healthTone('Holding'), 'caution');
  assert.equal(healthTone('Exposed'), 'bad');
  assert.equal(healthTone(undefined), 'neutral');
  for (const mode of MODES) {
    const ink = INK[mode];
    assert.equal(healthInk('Protected', ink), ink.good);
    assert.equal(healthInk('Holding', ink), ink.caution);
    assert.equal(healthInk('Exposed', ink), ink.bad);
    assert.equal(healthInk('Unknown', ink), ink.context);
  }
});

test('risk levels run green, amber, red, deep red, and none is the brand', () => {
  for (const mode of MODES) {
    const t = tierInk(mode === 'dark');
    const k = INK[mode];
    assert.deepEqual(Object.keys(t), ['low', 'moderate', 'high', 'critical']);
    assert.deepEqual(Object.values(t), [k.good, k.caution, k.bad, k.severe]);
    // the warm arm deepens as risk rises
    const L = (h) => oklab(h)[0];
    assert.ok(L(t.moderate) > L(t.high) && L(t.high) > L(t.critical), `${mode}: lightness falls from moderate to critical`);
    for (const brand of [k.brand, '#E60000']) {
      for (const tier of Object.keys(t)) assert.notEqual(t[tier], brand);
      assert.ok(deltaE(t.critical, brand) >= 15, `${mode}: critical is ${deltaE(t.critical, brand).toFixed(1)} from ${brand}`);
    }
    assert.ok(deltaE(t.moderate, t.high) >= 15, `${mode}: moderate and high apart`);
    assert.ok(deltaE(t.high, t.critical) >= 15, `${mode}: high and critical apart`);
  }
  assert.equal(tierInk(true), tierInk(true), 'the same object every call');
});

test('the ink on each risk level reads at 4.5:1', () => {
  assert.equal(TIER_TEXT, tierText(false));
  for (const mode of MODES) {
    const t = tierInk(mode === 'dark'); const x = tierText(mode === 'dark');
    for (const tier of Object.keys(t)) assert.ok(contrast(t[tier], x[tier]) >= 4.5, `${mode} ${tier}: ${contrast(t[tier], x[tier]).toFixed(2)}`);
  }
});

test('washes for every tone, watch kept as neutral', () => {
  for (const mode of MODES) {
    for (const tone of ['good', 'caution', 'bad', 'neutral']) {
      assert.ok(TINT[mode][tone].wash.startsWith('linear-gradient('), `${mode}.${tone}`);
      assert.ok(TINT[mode][tone].edge, `${mode}.${tone} edge`);
    }
    assert.equal(TINT[mode].watch, TINT[mode].neutral);
  }
});

test('theme variables keep every name, add caution, and the glass is nearly solid', () => {
  const names = ['--bg', '--bg-edge', '--sheet', '--sheet-edge', '--l-shadow', '--card', '--card-edge', '--base', '--glass', '--pill', '--ghost', '--text', '--muted', '--hair', '--hair-strong', '--track', '--tick', '--grid', '--ink', '--ink-on', '--row', '--row-hair', '--plate', '--chip', '--lift', '--soft-bad', '--soft-good', '--good-soft', '--bad-soft', '--brand', '--bp-accent', '--caution-soft', '--brand-fill'];
  for (const dark of [false, true]) {
    const v = themeVars(dark);
    for (const n of names) assert.ok(v[n], `${dark ? 'dark' : 'light'} ${n}`);
    assert.equal(v['--brand'], INK[dark ? 'dark' : 'light'].brand);
    assert.ok(Number(v['--glass'].match(/([\d.]+)\)$/)[1]) >= 0.9, '--glass');
  }
  // light --muted reads at 4.5:1 on the darkest plate it sits on
  assert.ok(contrast(themeVars(false)['--muted'], '#EEF2F6') >= 4.5);
  // white words on a brand button
  assert.ok(contrast('#FFFFFF', themeVars(true)['--brand-fill']) >= 4.5);
});
