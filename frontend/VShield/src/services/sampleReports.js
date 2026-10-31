/**
 * Sample campaign results for the leaderboard's Next Move view, until the
 * server has a reports API (GET /reports/campaigns/{id}, built from the
 * recipients and events tables and the points ledger).
 *
 * Everything is worked out from a campaign's seed, so the same campaign shows
 * the same numbers every time. Pure functions, so `node --test` can cover them.
 */
const POINTS = { Reported: 80, Trained: 30, Clicked: -30, Compromised: -50 };

// Small seeded generator (mulberry32): the same seed, the same numbers.
function random(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A department's steady lean, the same in every campaign: some teams click
// more than others, and fall for some lures more than others.
export function lean(key, spread) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 1 - spread / 2 + ((h >>> 0) % 1000) / 1000 * spread;
}

const pct = (n, of) => (of > 0 ? n / of : 0);
const pointsOf = (rules, event) => (Number.isFinite(rules?.[event]) ? rules[event] : POINTS[event]);

/**
 * One campaign's report: how its recipients responded, how fast, by
 * department, and what it did to points and levels.
 *
 * `depts` are the company's departments; `personAt(i)` names a sample person
 * (for the first people to report); `rules` are the live points per event.
 */
export function campaignReport(campaign, { depts = [], personAt = () => ({ name: '', dept: '' }), rules } = {}) {
  const r = random(campaign.seed * 9973 + 17);
  const sent = campaign.total;
  const delivered = sent - Math.round(sent * (0.003 + r() * 0.012));
  const opened = Math.round(delivered * (0.52 + r() * 0.2));
  // a campaign from the sample's story is drawn around its month's rates
  const story = campaign.climate;
  const clicked = Math.round(delivered * (story ? story.click * (0.85 + r() * 0.3) : 0.07 + r() * 0.11));
  const compromised = Math.round(clicked * (0.22 + r() * 0.2));
  const reported = Math.round(delivered * (story ? story.report * (0.85 + r() * 0.3) : 0.18 + r() * 0.24));
  const trained = Math.round(clicked * (0.45 + r() * 0.4));

  const firstReport = 2 + Math.floor(r() * 8); // minutes after the send
  const medianReport = 22 + Math.floor(r() * 45);
  const firstClick = 1 + Math.floor(r() * 5);

  // Departments: eight of the company's, recipients split by weight, each
  // with its own lean towards reporting or clicking.
  const start = campaign.seed % Math.max(1, depts.length);
  const picked = depts.length ? Array.from({ length: Math.min(8, depts.length) }, (_, k) => depts[(start + k * 3) % depts.length]) : [];
  const unique = [...new Set(picked)];
  const weights = unique.map(() => 0.6 + r());
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;
  let left = delivered;
  const departments = unique.map((name, k) => {
    const n = k === unique.length - 1 ? left : Math.round((delivered * weights[k]) / wsum);
    left -= n;
    const clickLean = lean(name, 0.9) * lean(`${name}|${campaign.type || ''}`, 0.7);
    const rep = Math.min(n, Math.round(n * pct(reported, delivered) * (0.75 + r() * 0.5) * (2 - lean(name, 0.9))));
    const clk = Math.min(n - rep, Math.round(n * pct(clicked, delivered) * (0.75 + r() * 0.5) * clickLean));
    const comp = Math.round(clk * pct(compromised, clicked || 1));
    const net = rep * pointsOf(rules, 'Reported') + clk * pointsOf(rules, 'Clicked') + comp * pointsOf(rules, 'Compromised');
    return { name, recipients: n, reported: rep, clicked: clk, compromised: comp, reportRate: pct(rep, n), clickRate: pct(clk, n), net };
  }).sort((a, b) => b.reportRate - a.reportRate || a.name.localeCompare(b.name));

  // drawn last, so the numbers above stay as they were
  const complained = Math.round(delivered * (0.0003 + r() * 0.0009)); // marked it as spam or complained

  // Each department's part in the same shape as the whole report, so it can
  // be read like a campaign of its own (scope.js): its opens, training and
  // complaints in proportion, and its own times, the earliest department's
  // first report being the campaign's. Worked from each department's lean,
  // not drawn, so every number above stays as it was.
  const later = (d, what, spread) => Math.round((lean(`${d.name}|${campaign.id}|${what}`, 1) - 0.5) * spread);
  const earliest = (what, has) => Math.min(...departments.filter(has).map((d) => later(d, what, 8)));
  const firstRep = earliest('first', (d) => d.reported > 0);
  const firstClk = earliest('click', (d) => d.clicked > 0);
  departments.forEach((d) => {
    const n = d.recipients;
    const fr = d.reported > 0 ? firstReport + later(d, 'first', 8) - firstRep : null;
    Object.assign(d, {
      sent: n,
      delivered: n,
      opened: Math.min(n, Math.max(d.reported + d.clicked, Math.round(n * pct(opened, delivered) * lean(`${d.name}|open`, 0.3)))),
      trained: Math.min(d.clicked, Math.round(d.clicked * pct(trained, clicked))),
      complained: Math.round(n * pct(complained, delivered)),
      timing: {
        firstReport: fr,
        medianReport: fr === null ? null : Math.max(fr + 1, Math.round(medianReport * lean(`${d.name}|${campaign.id}|median`, 0.5))),
        firstClick: d.clicked > 0 ? firstClick + later(d, 'click', 6) - firstClk : null,
      },
    });
  });

  const earned = reported * pointsOf(rules, 'Reported') + trained * pointsOf(rules, 'Trained');
  const lost = clicked * Math.abs(pointsOf(rules, 'Clicked')) + compromised * Math.abs(pointsOf(rules, 'Compromised'));

  const firstReporters = [0, 1, 2].map((k) => {
    const p = personAt(campaign.seed * 31 + k * 7);
    return { name: p.name, dept: p.dept, minutes: firstReport + k * (1 + (campaign.seed % 3)) };
  });

  return {
    id: campaign.id,
    name: campaign.name,
    started: campaign.started,
    sent,
    delivered,
    opened,
    clicked,
    compromised,
    reported,
    trained,
    complained,
    rates: {
      open: pct(opened, delivered),
      click: pct(clicked, delivered),
      compromise: pct(compromised, delivered),
      report: pct(reported, delivered),
      trainedAfterClick: pct(trained, clicked),
    },
    // reports for every click: above 1, more people report than fall for it
    resilience: clicked ? reported / clicked : null,
    timing: { firstReport, medianReport, firstClick },
    departments,
    points: { earned, lost, net: earned - lost },
    levels: {
      up: Math.round(reported * 0.22),
      down: Math.round(clicked * 0.18 + compromised * 0.3),
      belowZero: Math.round(compromised * 0.12),
    },
    firstReporters,
  };
}
