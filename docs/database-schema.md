# Database schema: every screen on backend data

Status: **proposal for review**. Nothing here is built until it is agreed.

Goal: no data lives in the frontend. Every screen reads and writes through
the API, and the database holds a fake company of 800 people that behaves
like the real one. When Vodafone's SSO and Active Directory arrive, real
people replace the fake ones and nothing else changes.

Out of scope here (decided): sign-in and roles from AD security groups,
distribution-list sync, recording of reported emails (the Vodafone team feeds
it), SCORM package size limits, hosting.

## 1. Rules

- DynamoDB, on-demand, free tier. One table per thing, as today.
- Existing tables keep their key and field names (some are PascalCase from
  the prototype). New tables and new fields are camelCase. The frontend maps
  names in `services/api.js`, nowhere else.
- A person is always identified by their lower-cased email, the value SSO
  will give later. `UserID` stays as a display id.
- Timestamps are UTC ISO strings (`2026-11-10T09:30:00Z`).
- Nothing a phished person types is ever stored (AGENTS.md rule 5).
- Every seeded row carries `seed: true`, so the fake company can be removed
  with one command.

## 2. Tables at a glance

| # | Table | Key (PK / SK) | State | Change |
|---|---|---|---|---|
| 1 | users | `UserID` · index `UserEMailID` | exists | add role and AD-style fields; drop computed figures |
| 2 | campaigns | `campaignId` · index `status`+`createdAt` | exists | add `CANCELLED`, `campaignType`, counters |
| 3 | recipients | `campaignId` / `recipientId` · index `trackingToken` | exists | add person snapshot, outcome times, index by email |
| 4 | events | `campaignId` / `eventId` (stream on) | exists | add `OPEN`; stop storing the full token |
| 5 | scenarios | `scenarioId` | exists | none |
| 6 | scenario-drafts | `owner` / `draftId` | exists | none |
| 7 | landing-pages | `LandingPageID` | exists | none |
| 8 | sender-identities | `id` · index `email` | exists | none |
| 9 | user-lists | `userListId` | exists | none (DL sync later) |
| 10 | user-list-members | `userListId` / `email` | exists | none |
| 11 | training-paths | `TrainingPathID` | exists | screens start saving to it |
| 12 | training-videos | `TrainingVideoID` | exists | screens start saving to it |
| 13 | training-quizzes | `TrainingQuizID` | exists | screens start saving to it |
| 14 | training-certificates | `TrainingCertificateID` | exists | screens start saving to it |
| 15 | training-packages | `PackageID` | exists | none |
| 16 | **training-assignments** | `owner` / `assignmentId` · index `TrainingPathID`+`assignedAt` | **new** | who has which training, and how it went |
| 17 | **announcements** | `announcementId` · index `status`+`createdAt` | **new** | announcement templates and roll-outs |
| 18 | gamification-rules | `EventOperation` | exists | none |
| 19 | points-ledger | `owner` / `entryId` · index `board`+`points` | exists | none |
| 20 | **stats-daily** | `scope` / `day` | **new** | daily totals that Insights, Home and Big Picture read |
| 21 | **people-snapshots** | `snapshotDay` / `owner` | **new** | each person's risk score and level over time |
| 22 | settings | `settingId` | exists | none |
| – | campaigns-catalog | `campaignId` | exists | **remove**: prototype leftover, no screen reads it |

Three new tables, one removed, four changed.

## 3. Changed tables

### users
The local copy of what Active Directory will supply.

| Field | Notes |
|---|---|
| `UserID` (PK) | display id, `VSLD-000001` |
| `UserEMailID` (index) | lower-cased; the identity everywhere else |
| `UserName`, `Department`, `Country` | as today |
| `role` **new** | Admin, Campaign Creator, Campaign Manager, Gamification Engine Manager, GMT, Regular User. Later set from the AD security group |
| `jobTitle`, `managerEmail`, `location` **new** | optional AD attributes |
| `active` **new** | false when a person leaves; they stay in history |
| `source` **new** | `seed` now, `ad` later |

Removed from the row: `HookRate%`, `ReportRate%`, `CampaignsInvolvedIn`,
`TrainingAssigned`, `TrainingCompleted`, `GamificationPoint`. These are
results, so they are worked out from recipients, training-assignments and the
points ledger.

### campaigns
Existing fields stay (title, description, times, sender, subject, body,
scenario, landing page, training, list, test flag, workflow and audit
fields).

| New field | Notes |
|---|---|
| `status` gains `CANCELLED` | with `cancelledBy`, `cancelledAt`, `cancelReason` |
| `campaignType` | one of the six types; chosen in "Start fresh", copied from the scenario otherwise |
| `counts` | `{ sent, delivered, opened, clicked, compromised, reported }`, kept current by the stats function, so lists don't count rows |

### recipients
One row per person per campaign. This is what "View analytics" lists.

| New field | Notes |
|---|---|
| `userId`, `department`, `country` | copied from the person when the email is sent, so department figures stay true if someone moves later |
| `sentAt`, `deliveredAt`, `openedAt`, `clickedAt`, `compromisedAt`, `reportedAt` | first time each happened (`clickedAt` exists today) |
| `trainingAssignmentId` | the training given because of this click, if any |
| new index `recipientEmail` + `createdAt` | "the campaigns this person was in" for My Space and the people pop-up |

### events
One row per thing that happened. The stream feeds the points and stats
functions.

| Field | Notes |
|---|---|
| `eventType` | `OPEN` **new**, `CLICK`, `COMPROMISE`, `REPORT`, `TRAINED`, `EVALUATED` |
| `eventSource` | `EMAIL_OPEN_PIXEL`, `EMAIL_TRACKING_LINK`, `LANDING_PAGE`, `REPORT_FEED` (Vodafone's), `TRAINING`, `SEED` |
| `trackingToken` | **replaced by `tokenFingerprint`**; the full token stays only on the recipient row |

`COMPROMISE` records only that someone pressed submit on the landing page,
never what they typed.

## 4. New tables

### training-assignments
One row per person per training path.

| Field | Notes |
|---|---|
| `owner` (PK) | the person's email |
| `assignmentId` (SK) | `A#<assignedAt>#<TrainingPathID>` |
| `TrainingPathID` (index, with `assignedAt`) | lists everyone on a programme |
| `source` | `ASSIGNED` (given after a click) or `VOLUNTARY` (taken by choice) |
| `campaignId`, `recipientId` | set when `source` is `ASSIGNED` |
| `department`, `country` | copied from the person |
| `assignedAt`, `dueAt`, `startedAt`, `completedAt` | "time to complete" is `completedAt − assignedAt` |
| `status` | `ASSIGNED`, `IN_PROGRESS`, `COMPLETED` (overdue is worked out from `dueAt`) |
| `videosWatched` | ids of the videos finished |
| `quizScore`, `quizPassed`, `attemptCount` | latest attempt; pass mark comes from the quiz |
| `certificateId`, `certificateIssuedAt` | set on a pass |

Replaces `TrainingAllocationData.json`, `MyTrainingData.json` and the
training figures in the sample organisation.

### announcements
| Field | Notes |
|---|---|
| `announcementId` (PK) | `ANC-…` |
| `kind` | `TEMPLATE` (a reusable announcement) or `ROLLOUT` (one sending of it) |
| `templateId` | on a roll-out, the template it came from |
| `name`, `description`, `targetAudience` | |
| `senderEmailId`, `senderName`, `emailSubject`, `emailBody` | |
| `userListId`, `startAt`, `timeZone` | roll-outs only |
| `status` (index, with `createdAt`) | same enum as campaigns |
| `createdBy`, `createdAt`, `updatedAt` | |
| `counts` | `{ sent, delivered, opened, acknowledged }` |

A roll-out is sent by the existing email sender. Its people and events go in
`recipients` and `events` under the announcement's id, with an `ACKNOWLEDGE`
event, so no separate tables are needed.

### stats-daily
Small running totals, so no screen ever scans the events table.

| Field | Notes |
|---|---|
| `scope` (PK) | `COMPANY`, `DEPT#<name>`, `TYPE#<campaignType>`, `DEPT#<name>#TYPE#<type>`, `COUNTRY#<name>` |
| `day` (SK) | `2026-11-10` |
| `campaigns`, `sent`, `delivered`, `opened`, `clicked`, `compromised`, `reported` | counts for that day |
| `reportMinutes`, `reportCount` | for "Avg time for reporting" |
| `trainingAssigned`, `trainingCompleted`, `trainingPassed`, `quizScoreSum`, `completeDaysSum` | for the Training tab |

A new `stats-engine` function reads the events stream and adds to these rows,
the same way `points-engine` keeps the points ledger. A 90-day view is a
read of 90 small rows per scope. If analytics later moves to the data lake in
the HLD, the API keeps the same shape and only its source changes.

### people-snapshots
| Field | Notes |
|---|---|
| `snapshotDay` (PK) | first of each month, plus today |
| `owner` (SK) | the person's email |
| `department`, `country` | |
| `riskScore`, `riskTier` | |
| `points`, `levelId` | from the points ledger |
| `clicks`, `reports`, `campaigns` | running totals to that day |
| `trainedState` | `ASSIGNED`, `VOLUNTARY` or `NONE`, for the training lift chart |

Written by a monthly job (and by the seed for past months). It gives the
risk score over time, who moved between levels, and high-risk people.

## 5. The fake company (seed)

One script, `backend/seed-data/seed_company.py`, replaces today's seed and
writes every table so the figures agree with each other.

| What | Size |
|---|---|
| People | 800, in the 16 departments and 7 countries used today, one role each |
| Campaigns | about 45 over the last 12 months, across the six types, plus a few in draft, pending, approved, rejected and cancelled |
| Recipients | about 15,000 rows (each campaign goes to a list, not to everyone) |
| Events | about 30,000: opens, clicks, submissions, reports |
| Training | 5 paths with videos, quizzes and certificates; about 2,500 assignments, both assigned and voluntary |
| Points, daily totals, snapshots | produced from the above by the same rules the live functions use |

It is repeatable (same seed, same company), marks its rows `seed: true`, and
has a `--wipe` option. The row counts are estimates and will be confirmed
when the script exists. All of it fits the DynamoDB free tier.

Emails are fake addresses that cannot receive mail; the script never sends
anything.

## 6. What each screen reads and writes

| Screen | Tables | New endpoints needed |
|---|---|---|
| Login profile picker | users | none (uses `GET /users`) |
| Home | campaigns, stats-daily | `GET /stats/summary` |
| Start New Campaign | campaigns, scenarios, landing-pages, user-lists, training-paths, sender-identities | none; the training step switches to `GET /training/…` |
| Campaigns · View analytics | recipients, events | `GET /campaigns/{id}/results` |
| Campaigns · Cancel / Reinvoke | campaigns | `POST /campaigns/{id}/cancel`, `/reinvoke` |
| Requests & Approvals | campaigns | none |
| Scenarios, Landing Page Catalogue, Email IDs, User Lists, Gamification Engine | as today | none |
| Training (admin) | training-paths, -videos, -quizzes, -certificates, -packages | `POST`, `PUT`, `DELETE` for the four content types; presigned upload for videos |
| Training report | training-assignments | `GET /training/assignments?path=` |
| My Training | training-assignments and the training content | `GET /my-training`, `POST /my-training/{id}/progress`, `/quiz`, `/enrol` |
| Announcements | announcements, recipients, events | CRUD plus submit, approve, send, acknowledge |
| Insights (all four tabs), Big Picture | stats-daily, people-snapshots, recipients, training-assignments, settings | `GET /insights?days=&scope=`, `GET /insights/people` |
| Leaderboard, My Space | points-ledger, recipients, training-assignments | none new for points; `GET /my-space` for the person's own history |

## 7. Frontend files this removes

`MasterUserData.json`, `CampaignsData.json`, `ScenariosData.json`,
`UserDLsData.json`, `LandingPageCatalogues.json`, `AnnouncementData.json`,
`EmailIDsAndDomains.json`, `GamificationData.json`, `dashboardData.json`,
the nine training JSON files, and the sample services
(`sampleCampaigns`, `sampleCampaignResults`, `sampleReports`,
`sampleOrganisation`, `sampleLeaderboard`, `sampleStanding`, `sampleStory`).
Each goes in the PR that connects its screen. The unused
`Pages/DashboardAndAnalytics` folder goes with `dashboardData.json`.

## 8. Build order

1. Tables and seed: the three new tables, the changed fields, `seed_company.py`.
2. People: login picker and every user lookup read `GET /users`.
3. Campaign results, cancel and reinvoke, campaign type.
4. Training content saved to the backend.
5. Training assignments and My Training.
6. Announcements.
7. `stats-engine`, then Insights, Big Picture and Home (includes the rest of the Insights team feedback).
8. Flow check as each role, then the security review.

## 9. Open points

1. **Open tracking.** `OPEN` needs a tiny image in each email. Mail clients
   that block images will under-count opens. Fine for now?
2. **Compromise.** Landing pages cannot submit forms today (by design). To
   record a compromise, the page's submit button would call a link that
   records the event and sends nothing typed. Agree?
3. **Risk score.** The seed and the monthly job need one formula. Proposed:
   keep the one the sample data uses today, and write it down in this file
   when step 7 starts.
