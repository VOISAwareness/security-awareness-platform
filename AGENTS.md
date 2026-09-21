# AGENTS.md

Operating guide for AI coding agents (and humans) working in this repository.
Read this first. It encodes the conventions, guardrails, and workflows that keep
changes safe and consistent.

> Ground truth about the live cloud environment and the integration plan lives in
> the Obsidian vault at `Corporate Security application/VShield Integration/`.
> This file is the *repo* contract; the vault is the *project* memory.

## 1. What this project is

A Security Awareness / phishing-simulation platform.

- **Frontend** — `frontend/VShield/`: React 19 + Vite 8 + Tailwind 3 (JavaScript,
  not TypeScript). Currently a design prototype; being wired to real endpoints.
- **Backend** — `backend/`: Python 3.14 AWS Lambda functions (`boto3` only),
  deployed behind an API Gateway **HTTP API (v2)**, with **DynamoDB** as the
  datastore, **S3** for templates/uploads, and **SES** for email.
- **Infra** — `infra/terraform/`: Terraform manages AWS resources (imported from
  the original click-ops POC). Lambda **code** is deployed by GitHub Actions, not
  Terraform (see §6).

Authoritative decisions: the platform uses **DynamoDB (not Aurora)**; keep costs
on **free tier** where possible; auth (Entra ID) is deferred but designed-for.

## 2. Golden rules

1. **Never commit secrets.** No AWS keys, tokens, presigned URLs, or real PII.
   `.claude/settings.local.json`, `*.tfstate`, and `*.tfplan` are gitignored.
2. **Terraform owns infra; Actions owns Lambda code.** Do not add Lambda source
   zips to Terraform, and do not create/modify tables/APIs by hand — change them
   in `infra/terraform/` and `terraform apply`.
3. **Always `terraform plan` before `apply`** and confirm `0 to destroy` unless a
   destroy is explicitly intended.
4. **SES is in sandbox.** Real sends only reach verified identities; keep a
   `testCampaign`/dry-run path. Never send to real employees from non-prod.
5. **`/compromise` and tracking endpoints must never store submitted secrets**
   (passwords, OTPs, card data) — not in DynamoDB, not in logs.
6. **Small, reviewable PRs.** One concern per PR. Branch, PR, review, merge.
7. **Match existing style.** Python: stdlib + boto3, explicit responses, JSON
   structured logging with `aws_request_id`. Frontend: keep the existing design;
   add a data layer, don't rewrite UI.

## 3. Repository layout

```
backend/                 Lambda functions, one dir each (lambda_function.py)
  <fn>/lambda_function.py
  <fn>/requirements.txt
  seed-data/             Sample S3 payloads (sender whitelist, recipient CSV)
frontend/VShield/        React app (Vite)
infra/terraform/         IaC: tables, bucket, HTTP API (imported)
docs/                    Architecture + CICD diagrams (being corrected)
.github/workflows/       deploy-lambda.yml (deploy), ci.yml (lint+test)
AGENTS.md                This file
```

## 4. Local setup

- **AWS**: SSO profile `vshield` (account 798299234472, ap-south-1).
  `aws sso login --sso-session vshield-sso` to refresh.
- **Terraform** >= 1.11 in `infra/terraform/` (state in S3).
- **Python** 3.12+ for local lint/test (runtime is 3.14 in Lambda).
- Backend dev deps: `pip install -r backend/requirements-dev.txt`.

## 5. Backend conventions

- One Lambda per directory under `backend/`; handler is
  `lambda_function.lambda_handler`.
- Config via environment variables (never hardcode table/bucket names).
- Every response goes through a `build_response(status, body)` helper that:
  serializes with a `DecimalEncoder` (DynamoDB numbers → JSON numbers), sets
  `Content-Type: application/json`, and lets API-Gateway-level CORS add origins.
- Use DynamoDB **conditional writes** for state transitions (optimistic locking).
- Log one structured JSON line per significant step, including
  `context.aws_request_id`. Never log secrets or full tracking tokens.
- Prefer a shared `vshield-common` layer for shared helpers once introduced.

## 6. Deploy & CI

- **`ci.yml`** runs on every push/PR: backend `ruff` lint + `pytest` + `py_compile`;
  frontend `npm ci` + `npm run build` on Node 22 (ESLint is advisory until the
  prototype's existing lint debt is cleared).
- CI has **no AWS credentials or region**. Tests must not call AWS; set dummy
  env (incl. `AWS_DEFAULT_REGION`) before importing a Lambda that builds boto3
  clients at import time.
- `frontend/VShield/.npmrc` sets `legacy-peer-deps=true` because
  `react-simple-maps@3` declares peer React <=18 (works on React 19).
- **`deploy-lambda.yml`** runs on push to `main` touching `backend/**` (and via
  workflow_dispatch): OIDC assume-role → zip → `aws lambda update-function-code`
  for each function. It deploys **code only**; env/config/tables are Terraform.
- Merging to `main` therefore deploys. Keep `main` green.

## 7. Data model & contracts

- Canonical field names are **camelCase**; canonical statuses are the backend
  enum (`DRAFT|PENDING_APPROVAL|APPROVED|SENDING|SENT|REJECTED|FAILED`).
- The frontend uses some PascalCase/legacy names; reconcile in the frontend
  `services/api.js` mapping layer, not by rewriting Lambdas.
- Tables, keys, GSIs, and the target data model are specified in the vault note
  `04 - Target DynamoDB Data Model`.

## 8. Definition of done

- [ ] `ruff check` and `pytest` pass locally and in CI.
- [ ] `terraform plan` is clean (or intended) for any infra change.
- [ ] No secrets/PII added; new env vars documented.
- [ ] PR description states scope, risk, and how to revert.
- [ ] Behavior verified against a real endpoint where feasible.

## 9. Do / Don't (quick reference)

**Do:** small PRs · env-driven config · conditional writes · structured logs ·
plan before apply · keep frontend design intact.
**Don't:** hand-edit AWS resources · commit secrets · send real email in
non-prod · store submitted credentials · mix infra and code deploys.
