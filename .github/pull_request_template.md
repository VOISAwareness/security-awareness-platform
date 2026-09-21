## What & why
<!-- What does this change and why. Link issues. -->

## Scope
- [ ] Backend (`backend/`)
- [ ] Frontend (`frontend/VShield/`)
- [ ] Infra (`infra/terraform/`)
- [ ] Docs

## Risk & rollout
<!-- What could break? Does merging trigger a Lambda deploy? Any infra apply? -->

## How tested
<!-- Endpoints hit, commands run, screenshots. -->

## Revert plan
<!-- How to undo if this misbehaves. -->

## Checklist
- [ ] `ruff check` + `pytest` pass
- [ ] `terraform plan` clean (if infra changed)
- [ ] No secrets/PII; new env vars documented
- [ ] Follows AGENTS.md conventions
