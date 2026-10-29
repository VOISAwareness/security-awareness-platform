/**
 * Sample countries for Insights' Regions, until the reports API splits a
 * campaign's emails by country. The countries are the people directory's
 * (MasterUserData.json); each campaign's emails are split across them by
 * each country's share of people, and its clicks and reports by each
 * country's steady lean towards clicking or reporting. The splits add up to
 * the campaign's own counts, so the company's figures stay as they were.
 * Pure, so `node --test` can cover it.
 */
import { lean } from './sampleReports.js';

// Each country's share of the company's people.
export const COUNTRIES = Object.freeze([
  { name: 'India', share: 0.27 },
  { name: 'United Kingdom', share: 0.2 },
  { name: 'Germany', share: 0.15 },
  { name: 'Egypt', share: 0.14 },
  { name: 'Italy', share: 0.11 },
  { name: 'Spain', share: 0.105 },
  { name: 'Albania', share: 0.025 },
]);

/** `total` as whole numbers in proportion to `weights`, adding up to `total` (largest remainder). */
export function apportion(total, weights) {
  const sum = weights.reduce((a, w) => a + w, 0);
  if (!total || !sum) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => {
    if (left > 0) { out[i] += 1; left -= 1; }
  });
  return out;
}

/** One campaign's counts (an insights() campaign row) split by country, in COUNTRIES' order. */
export function countriesOf(row) {
  const mail = COUNTRIES.map((c) => c.share * lean(`${c.name}|${row.id}`, 0.3));
  const delivered = apportion(row.delivered || 0, mail);
  const clicked = apportion(row.clicked || 0, mail.map((w, i) => w * lean(`${COUNTRIES[i].name}#click`, 0.9)));
  const reported = apportion(row.reported || 0, mail.map((w, i) => w * lean(`${COUNTRIES[i].name}#report`, 0.9)));
  const compromised = apportion(row.compromised || 0, clicked);
  return COUNTRIES.map((c, i) => ({ name: c.name, delivered: delivered[i], clicked: clicked[i], reported: reported[i], compromised: compromised[i] }));
}
