# Security Policy

## Reporting
Report suspected vulnerabilities privately to the maintainers. Do not open a
public issue for security problems.

## Handling of sensitive data
- This platform runs **simulated** phishing. It must never capture real
  credentials. Tracking, `/compromise`, and landing pages record only that an
  interaction occurred — never passwords, OTPs, card numbers, or similar, in
  either DynamoDB or logs.
- No secrets in the repo. AWS access is via SSO / OIDC roles, not static keys.
- Recipient and employee data is PII: keep it in DynamoDB/S3 within the account,
  never in the repo, logs, or client bundles.

## Email safety
- SES sandbox restricts sends to verified identities. Real-employee sends
  require production access and a verified domain.
- Non-prod must use a `testCampaign`/dry-run path or a recipient allowlist.
