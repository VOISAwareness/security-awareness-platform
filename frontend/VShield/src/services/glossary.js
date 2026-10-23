/**
 * The app's words for what Insights and the Big Picture measure, in one
 * place, so the page's explanations, the exports and the guide all say the
 * same thing. Each measure: its name, what it tells you, and how it is
 * worked out. Plain module, so services and pages can share it.
 */

// Health, from reports against clicks. The services' word for the weakest
// is "Exposed"; people read "Not protected".
export const HEALTH_WORD = Object.freeze({ Protected: 'Protected', Holding: 'Holding', Exposed: 'Not protected' });
export const healthWord = (word) => HEALTH_WORD[word] ?? word;
export const HEALTH_RULE = 'Protected: 2 or more reports for every click · Holding: at least 1 · Not protected: fewer reports than clicks';

/** The kind of phishing email, as the scenario builder calls it. */
export const TYPE_WORD = 'Campaign type';

export const GLOSSARY = Object.freeze({
  health: {
    name: 'Health',
    what: 'Whether people report phishing faster than they fall for it.',
    how: HEALTH_RULE,
  },
  riskScore: {
    name: 'Risk Score',
    what: 'How exposed the company is to phishing, from 0 (no one at risk) to 100 (everyone at the highest level). Lower is safer.',
    how: "The average of everyone's risk level: low counts 0, moderate 33, high 67, critical 100.",
  },
  riskLevels: {
    name: 'Risk levels',
    what: "Each person's standing, from their own phishing record.",
    how: 'Low: reported, and never clicked · Moderate: clicked once, or never reported · High: clicked more than once · Critical: gave details away.',
  },
  highRisk: {
    name: 'At high risk',
    what: 'The people most likely to let an attacker in.',
    how: 'People at the high or critical risk level.',
  },
  hookRate: {
    name: 'Hook Rate',
    what: 'How many people a simulated phishing email fooled. Lower is better.',
    how: 'The share of emails delivered that were clicked.',
  },
  reportRate: {
    name: 'Report Rate',
    what: 'How alert people are. Higher is better.',
    how: 'The share of emails delivered that were reported.',
  },
  perClick: {
    name: 'Reports per click',
    what: 'Whether people spot phishing faster than they fall for it.',
    how: 'Emails reported for every email clicked: 2.3× means 23 reports for every 10 clicks.',
  },
  gaveDetails: {
    name: 'Gave details away',
    what: 'How often a click turned into a real compromise.',
    how: 'People who went on to enter details on the practice page. Only the fact is counted, never what was typed.',
  },
  outcomes: {
    name: 'What people did',
    what: 'Every email delivered, by what the person who got it did.',
    how: 'Reported it · Ignored it (neither reported nor clicked) · Clicked, no more · Gave details away (clicked, then entered details on the practice page).',
  },
  trainingImpact: {
    name: 'Training impact',
    what: 'Whether training changes what people do.',
    how: 'The Hook Rate of people who have finished their training against those who have not. 2.5× means the untrained click 2.5 times as often.',
  },
  trainingProgress: {
    name: 'Training progress',
    what: 'How far the training assigned in the period got.',
    how: 'Of the people assigned training: how many started, completed and passed it.',
  },
  scoreBreakdown: {
    name: 'Score breakdown',
    what: 'Which risk levels the Risk Score’s points come from.',
    how: "Each level's share of people times its weight (moderate 33, high 67, critical 100). Low adds nothing.",
  },
  riskDrivers: {
    name: 'Risk drivers',
    what: 'The habits behind the Risk Score.',
    how: 'Repeat clickers (clicked more than once) · Never reported · Training overdue · Failed the quiz again.',
  },
  vsCompany: {
    name: 'Compared with company',
    what: "Whether a department is riskier or safer than the whole company, month by month.",
    how: "The department's Risk Score minus the company's. Above the line is riskier.",
  },
  vsAverage: {
    name: 'Compared with average',
    what: 'How a campaign did against all the campaigns in the period.',
    how: "Its Hook Rate and Report Rate against the period's.",
  },
  reportedVsClicked: {
    name: 'Reported vs clicked',
    what: "Each department's Report Rate against its Hook Rate.",
    how: 'The gap is the Report Rate minus the Hook Rate, in points. The bigger the gap, the better.',
  },
  riskChange: {
    name: 'Risk change by department',
    what: "Where each department's Risk Score started the period and where it is now.",
    how: 'Closer to the centre is safer. A dot moving out means the department became riskier.',
  },
});
