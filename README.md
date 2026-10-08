# Security Awareness Platform

[![CI](https://github.com/VOISAwareness/security-awareness-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/VOISAwareness/security-awareness-platform/actions/workflows/ci.yml)
[![Deploy Lambdas](https://github.com/VOISAwareness/security-awareness-platform/actions/workflows/deploy-lambda.yml/badge.svg)](https://github.com/VOISAwareness/security-awareness-platform/actions/workflows/deploy-lambda.yml)
![AWS](https://img.shields.io/badge/AWS-Serverless-FF9900?logo=amazonaws&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Python](https://img.shields.io/badge/Python-3.14-3776AB?logo=python&logoColor=white)
![Terraform](https://img.shields.io/badge/Terraform-1.11%2B-7B42BC?logo=terraform&logoColor=white)
![License](https://img.shields.io/badge/license-Proprietary-red)

An enterprise, cloud-native platform for running security awareness programmes:
phishing simulations, training delivery, quiz assessment, risk scoring,
gamification and executive reporting — built on AWS serverless services.

---

## Project status

> **This repository is a working proof of concept, being built out in vertical slices.**
> The two diagrams below describe the **target** architecture. Parts of it are
> live today; parts are not yet built. Every section in this README marks which
> is which, so nothing here should be read as a description of production.

| | State |
|---|---|
| Backend API | **Live** — HTTP API + Python Lambdas + DynamoDB, serving the UI with real data |
| Frontend | **Live locally** — runs via `npm run dev`; there is **no** hosting/deploy pipeline yet |
| Infrastructure | **Partly codified** — Terraform owns tables, bucket and three Lambdas; five Lambdas' config is still click-ops |
| Authentication | **Not implemented** — Entra ID SSO is designed for but deferred; the UI uses a local role picker |
| Email sending | **SES sandbox** — real sends only reach verified identities |
| Analytics pipeline | **Not built** — S3/Glue/Athena layer is design only |
| Production cost | Estimated at ≈ $530/month for 30,000 users and ≈ $1,405/month for 3,00,000 — see [`docs/cost-estimate.md`](docs/cost-estimate.md) |

---

## High-Level Architecture

![Security Awareness Platform — AWS high-level architecture](docs/architecture.png)

**Figure 1 — Target AWS architecture for the productionised version** (vector copy:
[`docs/architecture.svg`](docs/architecture.svg)). Running cost:
[`docs/cost-estimate.md`](docs/cost-estimate.md).

The diagram is laid out as a 2 × 2 grid under a shared security strip. The AWS
Cloud boundary is L-shaped so that Microsoft 365 sits outside it.

| | Left | Right |
|---|---|---|
| **Top** | Application & Presentation Layer | Data & ETL Layer (AWS managed, regional) |
| **Bottom** | External Enabler Systems (Microsoft 365) | BI Data Layer (Analytics account) |

**How it works:**

- **Front door.** Users sign in with Microsoft Entra ID. CloudFront is the single
  entry point, with WAF, ACM and Route 53 alongside. It serves the React build and
  the SCORM training content from S3, and forwards `/api` to API Gateway
  (HTTP API, JWT). API Gateway is reachable only through CloudFront.
- **Application.** Lambdas run in private subnets of a Multi-AZ VPC.
  - DynamoDB and S3 are reached through gateway endpoints.
  - SES, SQS, Secrets Manager and Athena are reached through an interface endpoint.
  - The only outbound internet path is NAT Gateway → Internet Gateway →
    Microsoft Graph.
- **Queued email sending.** Application Services puts send jobs on Amazon SQS,
  which is regional and outside the VPC. The Email Sender Lambda sends at a
  controlled rate through SES to Outlook, with retries and a dead-letter queue.
- **Phishing loop.** When an employee clicks a simulation link in Outlook, the
  browser goes through CloudFront to the API. The API records the click and
  redirects the employee to the LMS in React.
- **Training content.** An admin uploads a SCORM `.zip` from the React app.
  1. Application Services checks the admin's role and issues a short-lived
     pre-signed URL.
  2. The browser uploads the file straight to S3 Training.
  3. GuardDuty scans the package. It is then validated (it must contain
     `imsmanifest.xml` and no path traversal) and published.
  4. Employees play it through CloudFront from a separate content domain.
- **Reported emails.** Outlook → reporting mailbox → Power Automate → SharePoint.
  Every 3 hours an EventBridge schedule runs the Report Ingestion Lambda. It pulls
  reports over Microsoft Graph, writes events to DynamoDB and writes raw payloads
  to S3 Raw.
- **Analytics.** Glue extracts DynamoDB and S3 Raw data into S3 Curated summary
  tables. Application Services queries Athena, which writes to S3 Query Results,
  and returns the results to the React charts. There is no separate BI tool.
- **Security, governance and observability** apply to all layers:
  - **Identity & Secrets:** IAM, Secrets Manager, KMS.
  - **Observability:** CloudWatch, X-Ray.
  - **Governance & Protection:** CloudTrail, AWS Config, GuardDuty.
  - **Resilience:** AWS Backup.

VPC, account and region names in the diagram are placeholders until the target
environment is confirmed.

### Implemented today vs. planned for production

| Area | Implemented today (proof of concept) | Planned for the productionised Vodafone version |
|---|---|---|
| Front end | React app, run locally with `npm run dev` | React on S3 behind CloudFront, with WAF, ACM and Route 53 |
| API | API Gateway HTTP API (v2), called directly, **no auth** | HTTP API reachable **only through CloudFront**, JWT-validated |
| Authentication / authorisation | **None**; the UI has a role picker | Entra ID SSO (OIDC); role checks inside the Lambdas using Entra groups |
| Compute and network | Lambdas with **no VPC**, on public AWS endpoints | Lambdas in private subnets of a Multi-AZ VPC; gateway and interface endpoints; NAT per AZ |
| Database | DynamoDB (15 tables, 5 GSIs), conditional writes | Same, plus customer-managed KMS keys, PITR, AWS Backup and TTL-based retention |
| Campaigns, approvals, scenarios, landing pages, recipient lists | **Built**, backed by the live API | Same, behind authentication |
| Email sending | Direct SES send, **sandbox** | SQS-queued Email Sender, SES production access, SPF/DKIM/DMARC, optional dedicated IP |
| Phishing tracking | Tracking Lambda (open / click / compromise); never stores submitted secrets | Signed, unguessable link tokens; scanner-click filtering; Defender simulation allow-list |
| Training / LMS | Training screens in the UI; no SCORM delivery | SCORM upload by pre-signed URL, GuardDuty scan, validation, playback from a separate domain |
| Reported emails | Not built | Power Automate → SharePoint → scheduled Graph ingestion (`Sites.Selected`, delta queries) |
| Analytics | Not built; UI charts use sample data | Glue → S3 Curated → Athena (scan-limited workgroup, cached results) → React charts |
| Security and governance | S3 SSE (AES256), GitHub OIDC deploys, structured logs | WAF, Secrets Manager, KMS CMKs, CloudTrail, Config, GuardDuty, X-Ray, CloudWatch alarms |
| Infrastructure as code | Terraform owns tables, bucket and 3 Lambdas; 5 Lambdas still click-ops | Everything in Terraform |
| Environments | One account; merging to `main` deploys | Separate dev and prod accounts, with promotion between them |

### Production rules not shown in the diagram

- **Role checks.** Role-based authorisation is enforced in every Lambda from Entra
  group claims, not only in the UI.
- **Link tokens.** Tracking links carry signed, unguessable tokens. Automated
  scanner clicks (for example Defender Safe Links) are filtered out of results.
- **Email domain.** The sending domain has SPF, DKIM and DMARC. Simulation domains
  are registered under Microsoft 365 *Advanced delivery → Phishing simulation*.
- **Personal data.** Retention is enforced with DynamoDB TTL and S3 lifecycle
  rules. Personal data is removed or pseudonymised before it reaches S3 Curated.
- **Microsoft Graph.** Access is limited to the one SharePoint site
  (`Sites.Selected`), with the credentials held in Secrets Manager.
- **Cost guard-rails.** The Athena workgroup has a per-query scan limit. Budget
  alerts are set on every account.
- **Uploads.** Uploaded zips have size limits and path-traversal checks, and are
  malware-scanned before publishing.

---

## DevSecOps CI/CD Pipeline

![Proposed DevSecOps CI/CD pipeline](docs/cicd-pipeline.png)

**Figure 2 — Proposed pipeline:** GitHub → SonarQube → CodeBuild → ECR (+ image
scan) / S3 → CodePipeline → Development and Production.

### What actually runs today

Figure 2 is **not yet implemented**. There is no Docker image, no ECR repository,
no CodeBuild project and no CodePipeline. Delivery runs entirely on **GitHub
Actions**, in three workflows:

```
                    ┌──────────────────────────── ci.yml ─────────────────────────────┐
  pull_request  ──► │ backend: ruff lint → py_compile → pytest                        │
  push to main  ──► │ frontend: npm ci → eslint (advisory) → node --test → vite build │
                    └─────────────────────────────────────────────────────────────────┘

                    ┌──────────────────── deploy-lambda.yml ──────────────────────────┐
  push to main      │ OIDC assume-role (no static keys)                                │
  touching          │   → py_compile every backend/*/lambda_function.py                │
  backend/**    ──► │   → zip each function                                            │
                    │   → aws lambda update-function-code  ×5                          │
                    └─────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────── terraform.yml ──────────────────────────┐
  Run workflow  ──► │ OIDC assume-role (main only)                                     │
  (button, main)    │   → terraform init → validate → plan (summary on the run page)   │
                    │   → apply: only if chosen, and stops if anything would be        │
                    │     destroyed unless allow_destroy is ticked                     │
                    └─────────────────────────────────────────────────────────────────┘
```

Key characteristics of the current pipeline:

- **No static AWS credentials.** `deploy-lambda.yml` assumes
  `GitHubActionsLambdaDeployRole` via GitHub OIDC; `terraform.yml` assumes
  `GitHubActionsTerraformRole`, which only runs from `main` and cannot delete
  the bucket, the tables or the API.
- **Infrastructure runs from a button.** Actions → *Terraform* → *Run workflow*
  plans or applies `infra/terraform/` with no AWS tools on anyone's machine.
- **CI has no AWS access at all.** Tests must never call AWS; set dummy env
  (including `AWS_DEFAULT_REGION`) before importing a Lambda that builds boto3
  clients at import time.
- **ESLint is advisory** (`continue-on-error: true`) while the prototype's
  ~90 pre-existing errors are cleared. Frontend unit tests are **blocking**.
- **Code only.** The deploy workflow updates function *code*; environment,
  memory, timeout, tables and routes are infrastructure (see below).
- **The frontend is not deployed by anything.** Merging to `main` publishes no
  UI. Running it locally is currently the only way to use the app.

### Proposed pipeline improvements

1. Add static analysis (SonarQube or CodeQL) as a required check.
2. Add a frontend deploy — S3 + CloudFront (or Amplify) — and an environment
   origin in the CORS allowlist to match.
3. Run `terraform plan` automatically on PRs (with a separate read-only role)
   and require a reviewer before `terraform.yml` applies.
4. Promote through Development → SIT → UAT → Production rather than deploying
   straight from `main`.
5. Retire the per-function `update-function-code` steps once all Lambdas are
   Terraform-managed (see below).

---

## Infrastructure as Code — current Terraform architecture

Terraform lives in [`infra/terraform/`](infra/terraform) and targets AWS account
`798299234472` in `ap-south-1`.

```hcl
terraform { required_version = ">= 1.11.0" }

backend "s3" {
  bucket       = "security-awareness-poc-satyajit-2026"
  key          = "terraform/state/poc.tfstate"
  region       = "ap-south-1"
  encrypt      = true
  use_lockfile = true    # S3-native locking — no paid DynamoDB lock table
}
```

Most resources began life as click-ops and were adopted with declarative
`import` blocks in [`imports.tf`](infra/terraform/imports.tf), so Terraform
describes what already exists rather than recreating it.

### The ownership split

This is the single most important rule in the repository:

> **Terraform owns infrastructure. GitHub Actions owns Lambda code.**

Do not add Lambda source zips to Terraform, and do not create or modify tables,
buckets or API routes by hand — change them in `infra/terraform/` and apply.

### What Terraform manages today

| File | Manages |
|---|---|
| `dynamodb.tf` | `campaigns` (GSI `status-index`), `recipients` (GSI `trackingToken-index`), `events` |
| `tables.tf` | 12 reference tables — users, sender-identities, scenarios, landing-pages, user-lists, user-list-members, gamification-rules, training-paths/videos/quizzes/certificates, campaigns-catalog |
| `s3.tf`, `s3_cors.tf` | Assets bucket, AES256 SSE, browser CORS rules for presigned uploads |
| `apigateway.tf` | The HTTP API's **CORS configuration only** |
| `campaigns_api.tf` | `campaigns-api` Lambda + IAM role/policy + integration + 5 routes |
| `reference_api.tf` | `reference-api` Lambda + IAM + integration + 26 routes |
| `recipient_ingest.tf` | `recipient-ingest` Lambda + IAM (S3 → DynamoDB ingest) |

All tables are `PAY_PER_REQUEST` with AWS-owned-key encryption; PITR, TTL and
deletion protection are off, matching the live state at import.

### What Terraform does **not** manage yet

| Outside Terraform | Consequence |
|---|---|
| `campaign-reader`, `email-sender`, `tracking`, `report-event`, `approval` Lambdas | Function config, env vars, memory and timeout are click-ops; only code is deployed, by Actions |
| Routes and integrations for those five functions | The HTTP API's route table is partly click-ops — `apigateway.tf` deliberately manages CORS only |
| SES identities, templates and configuration sets | Managed by hand |
| CloudWatch alarms, log retention, budgets | Not defined |
| IAM roles for the click-ops Lambdas, and `GitHubActionsLambdaDeployRole` | Created by hand |
| Any frontend hosting | Does not exist |

### Proposed Terraform direction

1. **Close the gap** — import the remaining five Lambdas, plus their routes,
   integrations and IAM roles, so one `terraform plan` describes the whole API.
2. **Move the API's routes into code**, replacing the CORS-only resource with a
   full `aws_apigatewayv2_api` definition.
3. **Split state per environment** (`dev`/`sit`/`uat`/`prod`) with a workspace or
   key prefix, instead of the single `poc.tfstate`.
4. **Parameterise the account and prefix** so the stack is reproducible outside
   the POC account, and drop the `import` blocks once state has settled.
5. **Add the operational layer** — log retention, alarms, budget guardrails and
   a frontend hosting stack (S3 + CloudFront + origin in `cors_allowed_origins`).
6. **Adopt KMS CMKs and PITR** when the platform leaves POC status, together with
   WAF and Secrets Manager as Figure 1 intends.

Always `terraform plan` before `apply`, and confirm `0 to destroy` unless a
destroy is genuinely intended.

---

## Technology stack

| Layer | Actually in use |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 3, React Router, Framer Motion, lucide-react — **JavaScript, not TypeScript** |
| Frontend state | React Context (`UserTypeContext`) — no Redux |
| HTTP client | native `fetch` via `src/services/api.js` — no Axios |
| Backend | Python 3.14 AWS Lambda, **stdlib + boto3 only** |
| API | API Gateway **HTTP API (v2)** |
| Data | Amazon DynamoDB (15 tables, on-demand) |
| Storage | Amazon S3 (templates, recipient uploads, Terraform state) |
| Email | Amazon SES (sandbox) |
| IaC | Terraform ≥ 1.11, AWS provider ~> 6.0 |
| CI/CD | GitHub Actions with OIDC |

---

## Data model

Fifteen DynamoDB tables, all prefixed `security-awareness-poc-`:

**Campaign execution** — `campaigns` (PK `campaignId`, GSI `status-index` on
`status`+`createdAt`), `recipients` (PK `campaignId`, SK `recipientId`, GSI
`trackingToken-index`), `events` (PK `campaignId`, SK `eventId`).

**Reference data** — `users`, `sender-identities`, `scenarios`, `landing-pages`,
`user-lists`, `user-list-members`, `gamification-rules`, `training-paths`,
`training-videos`, `training-quizzes`, `training-certificates`,
`campaigns-catalog`.

Canonical field names are **camelCase**. Canonical campaign statuses are the
backend enum:

```
DRAFT → PENDING_APPROVAL → APPROVED → SENDING → SENT
              ↓
           REJECTED                        FAILED
```

The frontend carries some legacy PascalCase names; reconcile them in the
frontend mapping layer (`src/services/campaignStatus.js`), not by rewriting
Lambdas.

---

## API reference

Base URL comes from `VITE_API_BASE_URL`. These are the routes Terraform defines:

**Campaigns** (`campaigns-api`)
```http
GET    /campaigns                  # optional ?status=
POST   /campaigns
GET    /campaigns/{campaignId}
PUT    /campaigns/{campaignId}
DELETE /campaigns/{campaignId}
```

**Workflow transitions** (`approval` Lambda — the sole owner of `status`)
```http
POST /campaigns/{id}/submit
POST /campaigns/{id}/approve
POST /campaigns/{id}/reject      # requires a non-empty comment
```

**Reference data** (`reference-api`)
```http
GET|POST|PUT|DELETE /sender-identities[/{id}]
GET                 /users[/{id}]
GET                 /scenarios[/{id}]
GET|POST|PUT|DELETE /landing-pages[/{id}]
GET                 /user-lists
GET                 /user-lists/{id}/members
PUT|DELETE          /user-lists/{id}
POST                /user-lists/bulk-upload     # returns a presigned S3 PUT URL
POST                /user-lists/{id}/ingest
GET                 /gamification-rules
GET                 /training/paths|videos|quizzes|certificates
GET                 /campaigns-catalog
```

Every Lambda response goes through a `build_response(status, body)` helper that
serialises with a `DecimalEncoder` (DynamoDB numbers → JSON numbers) and sets
`Content-Type: application/json`; CORS headers are added at the API Gateway level.

---

## Repository structure

```text
security-awareness-platform
├── .github/workflows/
│   ├── ci.yml                 # lint + test + build on every push/PR
│   ├── deploy-lambda.yml      # OIDC → zip → update-function-code (main only)
│   └── terraform.yml          # Run workflow → terraform plan / apply (main only)
├── backend/                   # one directory per Lambda
│   ├── approval/              # campaign workflow state machine
│   ├── campaign-reader/
│   ├── campaigns-api/         # campaign CRUD + list
│   ├── email-sender/          # SES delivery
│   ├── recipient-ingest/      # S3 upload → DynamoDB
│   ├── reference-api/         # reference data + presigned uploads
│   ├── report-event/
│   ├── tracking/              # open/click/compromise tracking
│   ├── seed-data/             # sample S3 payloads
│   └── tests/                 # pytest; must not call AWS
├── docs/
│   ├── architecture.png       # Figure 1 — target architecture (HD)
│   ├── architecture.svg       # Figure 1 — vector copy
│   ├── cost-estimate.md       # monthly/annual AWS cost for Figure 1
│   └── cicd-pipeline.png      # Figure 2 — proposed pipeline
├── frontend/VShield/          # React 19 + Vite app
│   └── src/
│       ├── Pages/             # Campaigns, Approvals, Scenarios, Training, …
│       ├── GlobalComponents/  # Layout, sidebar, header
│       ├── UserTypeContext/   # role + permission matrix
│       └── services/          # api.js, campaignStatus.js, hooks
├── infra/terraform/           # tables, bucket, HTTP API CORS, 3 Lambdas
├── AGENTS.md                  # conventions and guardrails — read before contributing
├── CONTRIBUTING.md
└── SECURITY.md
```

---

## Local development

### Frontend

```bash
git clone https://github.com/VOISAwareness/security-awareness-platform.git
cd security-awareness-platform/frontend/VShield
npm install
npm run dev
```

Open the app and sign in with any role and the POC password `123456`.

**How API calls are routed.** The HTTP API's CORS allowlist only contains
`http://localhost:5173` and `:5174`, so a browser served from a Codespace or
tunnel hostname would be blocked. `vite.config.js` therefore proxies `/api` to
AWS server-side, and `.env.development` points `VITE_API_BASE_URL` at `/api`.
Requests stay same-origin and CORS never applies, so the app works from
localhost, a Codespace or a tunnel alike. Recipient uploads PUT straight to a
presigned S3 URL, which skips that proxy, so a small dev-only middleware
forwards those too.

Production builds are unaffected — they read the absolute endpoint from `.env`
and PUT directly to S3. If the frontend is ever hosted, **that origin must be
added to `cors_allowed_origins` and applied.**

> Changes to `vite.config.js` are not hot-reloaded. Restart the dev server.

### Backend

```bash
pip install -r backend/requirements-dev.txt
ruff check backend
pytest backend/tests
```

### Infrastructure

From GitHub, with nothing installed locally: **Actions → Terraform → Run
workflow** on `main`, choose `plan` and read the summary, then run it again with
`apply`. The apply stops if anything would be destroyed unless `allow_destroy`
is ticked.

From a terminal with the AWS CLI and Terraform (e.g. a Codespace):

```bash
aws sso login --sso-session vshield-sso --use-device-code   # profile: vshield
cd infra/terraform
terraform init
terraform plan                                # confirm 0 to destroy
```

Changes to `infra/terraform/github_actions_terraform.tf` (the workflow's own
role) must be applied from a terminal: the workflow can read that role but not
change it.

---

## Roles and permissions

Defined in `frontend/VShield/src/UserTypeContext/UserTypeContext.jsx`.
Permissions are snapshotted into `localStorage` at login, so switching roles
requires signing out and back in.

| Role | Access |
|---|---|
| Admin | Everything |
| Campaign Creator | Campaigns, scenarios, training, lists, domains, approvals, analytics |
| Campaign Manager | Same as Campaign Creator |
| Gamification Manager | Gamification engine, analytics, personal pages |
| GMT (Leadership) | Analytics and personal pages |
| Regular User | My Space, My Training |

---

## Learning workflow

```text
Campaign created → user receives simulated phish → user clicks link
        ↓
Training auto-assigned → video watched (no seek-ahead, progress tracked)
        ↓
Completion validated → quiz unlocked → quiz passed
        ↓
Risk score updated → gamification points awarded
```

Video-based learning, unskippable playback, the quiz engine, risk scoring and
gamification are **product design**; the campaign lifecycle, approvals,
scenarios, landing pages and recipient lists are what is built today.

---

## Security posture

**In place**

- No static AWS credentials anywhere — deploys use GitHub OIDC.
- S3 encrypted at rest (AES256); TLS in transit.
- Tracking and `/compromise` endpoints **never store submitted secrets** —
  no passwords, OTPs or card data, in DynamoDB or in logs.
- CORS restricted to the dev origins rather than `*`.
- Structured JSON logging with `aws_request_id`, excluding secrets and full
  tracking tokens.
- `.tfstate`, `.tfplan` and local settings are git-ignored.
- DynamoDB conditional writes for state transitions (optimistic locking).

**Not yet in place** — authentication and authorisation at the API (the API is
currently unauthenticated), WAF, Secrets Manager, KMS CMKs, PITR/Backup,
CloudTrail/Config, and SES production access.

> SES is in sandbox. Never send simulated phishing to real employees from a
> non-production environment; keep a dry-run path.

---

## Contributing

Read [`AGENTS.md`](AGENTS.md) first — it encodes the conventions and guardrails
that keep changes safe. In short:

- Small, reviewable PRs; one concern each.
- Branch → PR → review → merge. Merging to `main` deploys backend code.
- **Rebase or merge `main` into a long-lived branch before merging it.** A branch
  cut from an old base can silently revert work when merged.
- Match existing style: Python is stdlib + boto3 with explicit responses;
  the frontend gets a data layer, not a redesign.
- Never commit secrets, real PII, or AWS keys.

Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.

---

## Roadmap

**Near term** — Entra ID SSO and API authorisation · frontend hosting and
deploy pipeline · import the remaining Lambdas into Terraform · SES production
access · fix the `TRAINING` nav link (`/training` has no route).

**Then** — the analytics pipeline (S3 → Glue → Athena) · executive dashboards ·
risk scoring engine · certificate generation · per-environment promotion.

**Later** — AI-assisted quiz generation · personalised learning paths · SCORM
support · mobile application · predictive risk analytics.

---

## License

Proprietary. All rights reserved. See [`LICENSE`](LICENSE).
