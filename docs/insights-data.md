# Insights: how the data fits together

Insights, the Leaderboard's Big Picture and My Space all read the same few
sources. This note is the map: where each number comes from, the one rule
that scopes it (company or department), and what the backend APIs must
return for the pages to keep working when the sample data gives way to
real data. Keep it current when a source, a shape or a rule changes.

## 1. Sources

All of it comes from one call, `GET /insights?role=` (`backend/insights-api`),
worked out from the `campaigns`, `recipients`, `training-assignments`,
`training-paths` and `users` tables. It returns the sources below in the
shapes the pure functions take, so the pages need no case of their own.

| Source | Field | Shape |
|---|---|---|
| Campaign reports | `items` | one `{ campaign, report }` per sent campaign, test campaigns left out (section 4) |
| People and risk | `org` | 24 thirty-day steps, oldest first, the newest ending at `asOf`: tiers, departments, cohorts, who moved, drivers, training (per department and per programme) |
| The people behind a figure | `people` | `{ rows, months, campaigns }`: one row per person (section 6) |
| Training programmes | `programmes` | each training path over the year: `{ program, assigned, completion, score, pass, avgDays, status }` |
| Targets | `GET /insights-targets` (`settings` table) | `{ targets, version, modifiedBy, modifiedAt }` |

Only Admin, Campaign Creator and Campaign Manager (the roles with the
Analytics page) get an answer; the role is client-asserted until SSO. No
email address, tracking token or anything typed on a landing page is in it.
A warm Lambda keeps the answer for five minutes (`CACHE_SECONDS`).

How each figure is counted:
- **Opened**: opened, clicked, gave details or reported (a mail client that
  blocks the pixel still counts once they act).
- **Trained** after a click: the training that click led to was passed.
- **Tier**: a person's last 90 days at the step's end (section 4 of
  `database-schema.md`). Everyone in `users` counts, so someone sent nothing
  in 90 days is Moderate ("never reported"), as the sample data had it.
- **Cohorts**: trained is anyone who has passed a training by the step's
  end; `trainedClicks` and `untrainedClicks` count the people on each side
  who clicked an email sent during the step.
- **Training** in a step counts the assignments given during it, as they
  stood at its end; `quizTaken`, `quizScoreSum` and `daysSum` (days from
  assigned to passed) let a period work out the average quiz score and the
  average time to complete.
- **People records** are `[campaign index, clicked, reported, gave]` over the
  six months the levels cover; `services/api.js` names them from
  `campaigns` into peopleTable's `{ campaign, type, clicked, reported, gave }`.

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
| `groupsOf(people)` | the people behind a campaign type in a department, by what they did (section 6) |

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

## 6. The people behind a figure, and the Big Picture

On a campaign type opened inside a department, **See the people** (admins
only, as the Big Picture's People list is) opens a dialog over the page
(`Pages/Insights/InsightsPeople.jsx`): everyone that type's campaigns
reached in the department, in four groups that do not overlap and add up
to the emails delivered, as "What people did" splits them:

| Group | Who | Last column |
|---|---|---|
| Clicked | clicked, gave no details away | Training after (Completed, Started, Not yet) |
| Gave details away | clicked and entered details on the practice page | Training after |
| Reported | reported it without clicking | Time to report |
| Did nothing | neither clicked nor reported | Opened it |

Each person counts once per campaign, in the worst group they reached
(gave details away, then clicked, then reported). The list pages to fit,
finds a name or a campaign, and **Export** downloads every group, a sheet
each (`peopleBehindBook()`). No email addresses are shown or exported.

What the reports API must return for it, one row per person per campaign:

```
{
  name, department,
  campaign: { id, name, started },
  did: 'gave' | 'clicked' | 'reported' | 'nothing',
  sentAt, at,              // when it was sent; when they did it (the send for 'nothing')
  minutes,                 // from the send to `at`; null for 'nothing'
  opened,                  // for 'nothing': whether they opened it
  training,                // after a click: 'completed' | 'started' | 'not yet'; else null
  clicks,                  // their clicks in the period, every campaign type
}
```

Until then `sampleBehind()` makes them up from the department's part of
each campaign: the same counts, its first click and first report at the
figures' minutes, half its reports in by their median, and its training
after a click. "Gave details away" records that it happened, never what was
typed (AGENTS.md rule 5).

**Open in the Big Picture**, in the dialog, opens Leaderboard › The Big
Picture on People, narrowed to that department and to those who clicked
that campaign type. The two pages pass the view in the router's navigation
state:

```
Insights ──► /leaderboard  state: { view: 'reports',
                                    people: { dept, lure },
                                    back: { path, label, restore } }
/leaderboard ──► Insights  state: { restore: { days, tab, trail } }
```

- `people` narrows the People list. `lure` keeps the people whose record
  shows they clicked that campaign type (`clickedTypes`, from
  `services/bigPicture.js`); it shows as a chip that can be cleared.
- `back` turns the Leaderboard's back button into "Insights · Cyber
  Security · Travel scam". Following it returns `restore`, from which
  Insights rebuilds the same period, tab and trail of what was open.
- Before leaving, Insights stores `restore` on its own history entry too,
  so the browser's Back works the same way.

With sample data the two pages read different samples (Insights about
15,000 people, the Big Picture the board's 104), so the dialog's people
and the Big Picture's differ, and a narrow filter there can find no one;
the list then says so and offers to widen it. With real data both read the
same events and people.

## 7. Adding a page or a measure

- **A page:** read `ctx.m` and `ctx.p`, and let the scope do the rest. Use
  `ctx.company` only to set a department against the company.
- **A measure:** work it out in a `services/` function with a test, take
  its name from `services/glossary.js`, and give it a target in
  `insightsTargets.js` if it has one.
- **A new field from an API:** add it to the sample source first, in the
  same shape, so the pages and tests work before the API does. Then note
  it in section 4.
