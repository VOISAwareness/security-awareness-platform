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

/**
 * The measures Insights reports, by their agreed names, in the order people
 * meet them. Every measure on the page, in the exports and in the guide
 * takes its name from here. The other entries below explain a chart, not a
 * measure.
 */
export const MEASURES = Object.freeze(['riskScore', 'openRate', 'hookRate', 'reportRate', 'perClick', 'trainingImpact', 'gaveDetails', 'health', 'highRisk', 'trainingCompletion']);

export const GLOSSARY = Object.freeze({
  health: {
    name: Object.values(HEALTH_WORD).join(' / '),
    what: 'The health of a period, a department, a campaign type or a campaign, from its reports against its clicks.',
    how: HEALTH_RULE,
  },
  riskScore: {
    name: 'Risk Score',
    what: 'How exposed the company is to phishing, from 0 (no one at risk) to 100 (everyone at the highest level). Lower is safer.',
    how: "The average of everyone's risk level: low counts 0, moderate 33, high 67, critical 100. Its change is in points (pts).",
  },
  riskLevels: {
    name: 'Risk levels',
    what: "Each person's standing, from their own phishing record.",
    how: 'Low: reported, and never clicked · Moderate: clicked once, or never reported · High: clicked more than once · Critical: gave details away.',
  },
  highRisk: {
    name: 'People at high risk',
    what: 'How many people are at the two highest risk levels. Lower is safer.',
    how: 'People at the high level (clicked more than once) or the critical level (gave details away). Its change is counted in people.',
  },
  openRate: {
    name: 'Open Rate',
    what: 'How many of the emails delivered were opened. Neither good nor bad on its own.',
    how: 'The share of emails delivered that were opened. Its change is in percentage points (pp).',
  },
  hookRate: {
    name: 'Hook Rate',
    what: 'How many people a simulated phishing email fooled. Lower is better.',
    how: 'The share of emails delivered that were clicked. Its change is in percentage points (pp).',
  },
  reportRate: {
    name: 'Report Rate',
    what: 'How alert people are. Higher is better.',
    how: 'The share of emails delivered that were reported. Its change is in percentage points (pp).',
  },
  perClick: {
    name: 'Resilience Ratio',
    what: 'How many phishing emails people report for every one they click. Higher is better.',
    how: 'Emails reported divided by emails clicked: 2.3× means 23 reports for every 10 clicks.',
  },
  gaveDetails: {
    name: 'Gave details away',
    what: 'How many of the emails delivered led someone to enter details on the practice page. Lower is better.',
    how: 'The share of emails delivered whose person clicked, then entered details on the practice page: the same base as the Hook Rate and Report Rate. Only the fact is counted, never what was typed.',
  },
  outcomes: {
    name: 'What people did',
    what: 'Every email delivered, by what the person who got it did.',
    how: 'Reported it · Ignored it (neither reported nor clicked) · Clicked, no more · Gave details away (clicked, then entered details on the practice page).',
  },
  trainingImpact: {
    name: 'Training Lift',
    what: 'How much less often trained people click. Higher is better.',
    how: 'The Hook Rate of people who have not finished their training divided by that of people who have. 2.5× means the untrained click 2.5 times as often.',
  },
  trainingCompletion: {
    name: 'Training completed',
    what: 'How much of the training assigned in the period was completed. Higher is better.',
    how: 'Trainings completed divided by trainings assigned, over the period.',
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
    what: 'Four counts of people. Two are part of the Risk Score; the two training counts are not.',
    how: 'In the Risk Score: repeat clickers (clicked more than once) · never reported. Training, not in the score: overdue training · failed the quiz again.',
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
    name: 'Reports vs clicks',
    what: 'Whether a department reports phishing more often than it falls for it.',
    how: "Each dot sits at the department's Hook Rate (across) and Report Rate (up). Above the dashed line: 2 or more reports for every click (Protected). Below the solid line: fewer reports than clicks (Not protected).",
  },
  riskChange: {
    name: 'Risk change by department',
    what: "How far each department's Risk Score moved over the period.",
    how: 'Its Risk Score now minus its Risk Score at the start of the period. Below zero is safer.',
  },
});
