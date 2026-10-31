# Insights: how the data fits together

Insights, the Leaderboard's Big Picture and My Space all read the same few
sources. This note is the map: where each number comes from, the one rule
that scopes it (company or department), and what the backend APIs must
return for the pages to keep working when the sample data gives way to
real data. Keep it current when a source, a shape or a rule changes.

## 1. Sources

| Source | Today | Will come from | Shape |
|---|---|---|---|
| Campaign reports | `services/sampleReports.js` (`campaignReport`) | reports API, from the `events` table joined to `recipients` and `users` | one report per campaign (below) |
| Campaigns | `services/sampleCampaigns.js` | `campaigns` table (`campaigns-api`) | `{ id, name, type, started, total, … }` |
| People and risk | `services/sampleOrganisation.js` (`organisation`) | people and risk API, from the points ledger and users | thirty-day snapshots: tiers, departments, cohorts, training |
| Targets | defaults in `services/insightsTargets.js` | `GET /insights-targets` (`settings` table) | `{ targets, version, modifiedBy, modifiedAt }` |
| Training programmes | `DashboardAndAnalytics/dashboardData.json` | training API | `{ trainingPrograms }` |

## 2. From sources to pages

```
campaign reports ──► scope (company | one department) ──► insights()        ──┐
                                                                               ├──► every Insights page
people snapshots ──────────────────────────────────────► peopleInsights()  ──┘
targets ──► targetsWith() ──► the targets in force (band, charts, Departments)
```

Everything after the sources is a pure function in `services/`, covered by
`node --test`:

| Function | Gives |
|---|---|
| `insights(items, { days, now })` | the period and the one before, campaign types, campaigns, departments (now and before), department × type, twelve 30-day steps (each with its departments) |
| `peopleInsights(org, { days })` | Risk Score, people at high risk, tiers, movements, training, each department's (with its trend and training before) |
| `trends(m, p)` | the Summary's charts |
| `deptTargets(m, p, targets)` | the Departments table: six measures per department, now and before, most off target first |
| `deptPage(m, p, name)` | a department's page: its Risk Score, months, campaign types, training |
| `scopeItems(items, scope)` | the items as a scope sees them (section 3) |

## 3. The scope: company or one department

A page shows the whole company or one department. A department's scope is
applied **before** anything is worked out: `scopeItems()` cuts each
campaign report down to that department's part, in the same shape as a
whole report, and drops campaigns that did not go to it. Every calculation
then runs unchanged, so any page opened inside a department (a campaign
type from "What they fall for", a campaign from there) shows that
department's figures without a case of its own. A new page gets this for
free as long as it reads `ctx.m`.

In the page (`Pages/Insights/Insights.jsx`): the scope is the last
department in the trail of what was opened. While it is set, the corner
tile and the band show the department, and the campaign type and campaign
profiles get `ctx.m` (the department's), `ctx.company` (the company's, to
set it against) and `ctx.scope` (its name).

## 4. What the reports API must return

One report per campaign, in the shape `campaignReport()` returns today:

```
{
  id, name, started,
  sent, delivered, opened, clicked, compromised, reported, trained, complained,
  rates: { open, click, compromise, report, trainedAfterClick },
  resilience,
  timing: { firstReport, medianReport, firstClick },        // minutes after the send
  departments: [
    {
      name, recipients,
      sent, delivered, opened, clicked, compromised, reported, trained, complained,
      reportRate, clickRate,
      timing: { firstReport, medianReport, firstClick },    // null where nobody did it
    },
  ],
}
```

**The scope depends on the `departments` rows carrying the same counts and
times as the report itself.** Each count is that department's people only;
the rows add up to the report (recipients to `delivered`). A department
row without `opened`, `trained` or `timing` still works, but its pages show
`—` for what is missing.

Rules every source keeps:
- Counts are whole numbers; rates are fractions (0.05, not 5).
- "Gave details away" counts that it happened, never what was typed (AGENTS.md rule 5).
- Departments are named as in the `users` table.
- Test campaigns are left out.

## 5. Targets

Defaults live in `services/insightsTargets.js`. An admin's targets
(`GET/PUT /insights-targets`, reference-api, `settings` table) replace
them measure by measure (`targetsWith()`). The dialog asks for the target
only; the at-risk edge keeps the default's proportion (`pairFor()`). The
API stores both edges, so either way of setting them reads the same.

## 6. Adding a page or a measure

- **A page:** read `ctx.m` and `ctx.p`, and let the scope do the rest. Use
  `ctx.company` only to set a department against the company.
- **A measure:** work it out in a `services/` function with a test, take
  its name from `services/glossary.js`, and give it a target in
  `insightsTargets.js` if it has one.
- **A new field from an API:** add it to the sample source first, in the
  same shape, so the pages and tests work before the API does. Then note
  it in section 4.
