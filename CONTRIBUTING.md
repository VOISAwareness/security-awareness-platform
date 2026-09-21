# Contributing

Read [AGENTS.md](AGENTS.md) first — it holds the conventions and guardrails.

## Workflow
1. Branch from `main`: `feat/…`, `fix/…`, `chore/…`, `docs/…`.
2. Make a small, focused change (one concern per PR).
3. Run checks locally (see below).
4. Open a PR using the template; describe scope, risk, and revert.
5. Get review; merge to `main`. Merging deploys Lambda code via GitHub Actions.

## Commit convention
Conventional Commits: `type(scope): summary`
Types: `feat, fix, docs, refactor, test, chore`. Example:
`feat(campaigns): add list endpoint with status filter`.

## Local checks
```bash
# Backend
pip install -r backend/requirements-dev.txt
ruff check backend
pytest backend

# Frontend
cd frontend/VShield && npm ci && npm run lint && npm run build

# Infra (from infra/terraform, AWS_PROFILE=vshield)
terraform fmt -check && terraform validate && terraform plan
```

## Boundaries
- Infra changes go through Terraform (`infra/terraform/`), never the console.
- Lambda **code** deploys via Actions; Terraform manages infra/config.
- Never commit secrets, tokens, presigned URLs, or real PII.
