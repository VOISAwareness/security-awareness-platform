# Runbook: a campaign end to end (non-prod, SES sandbox)

Scenario → campaign → approval → sent by SES at its scheduled time → the
recipient clicks → the campaign moves Scheduled → Ongoing → Historical. Plus
the SCORM package check. Non-prod only, and only to SES-whitelisted addresses.

## 0. One-time setup

| What | Where | Why |
|---|---|---|
| A **sender** address verified in SES | SES → Verified identities | Emails can only come from a verified identity |
| A **recipient** address verified in SES | SES → Verified identities | The SES sandbox only delivers to verified addresses |
| The sender added on **Email IDs & Domains** | App | The wizard's sender list comes from there |
| `SES_ALLOWED_SENDERS` = the whitelisted sender(s), comma-separated | Lambda → `security-awareness-poc-email-sender` → Configuration → Environment variables | A campaign sends from its chosen sender only if it is listed; otherwise from `SES_SENDER_EMAIL` |
| `terraform apply` with `campaign_scheduler.tf` (plan: **0 to destroy**) | Actions → Terraform → apply | The every-minute scheduler |

Never put a real employee's address in a test list: in the sandbox SES
rejects unverified addresses, and they are recorded as failed, not emailed.

## 1. Recipient list (bulk upload)

1. **User Lists → Bulk upload → Download template.**
2. Fill **one row**: `User Name`, `Email ID` (the whitelisted recipient), `Department`, `Location`.
3. Upload it. The list goes **Processing → Ready** (recipient-ingest reads the CSV from S3).
   - Stuck on Processing: CloudWatch logs of `security-awareness-poc-recipient-ingest`.

## 2. Scenario

1. **Scenarios → Create** a scenario; leave the page midway and come back: the **draft** is kept.
2. Finish and save it. It appears on **Start New Campaign**.

## 3. Campaign

1. **Start New Campaign** → pick the scenario.
2. **Details**: a start time **5–10 minutes from now**, an end time after it.
3. **Email**: the whitelisted **sender**, the uploaded **list**; the body keeps the phishing link placeholder.
4. **Landing page**, **Training**: pick any.
5. Leave midway: the campaign is a **draft** under **Campaigns → Drafts**; resume it.
6. **Review → Submit**. It is **Pending approval**.

## 4. Approval (Requests & Approvals)

As an approver:

| Action | Result |
|---|---|
| **Approve** | Approved; on **Campaigns → Scheduled** until its start |
| **Notify for changes** (message required) | Back to the creator on **Notified**; they edit and resubmit |
| **Reject** (reason required) | **Final**: on **Rejected** with the reason; the creator can **Delete** or **Copy to new draft** |
| Approve after the start time passed | Refused: the request is **Expired**; the creator uses **Extend and invoke** to pick a new time and resubmit |

## 5. Scheduled send

Within about a minute of the start time:

1. `campaign-scheduler` logs `Scheduled send started` with the campaignId.
2. `email-sender` sends; the campaign goes **Approved → Sending → Sent** and shows on **Ongoing**.
3. The email arrives at the whitelisted recipient, **from the chosen sender**.
4. Click the link: the tracking page opens, and the click is recorded (events table).
5. After the end time the campaign is on **Historical**.

If nothing arrives:

| Look at | For |
|---|---|
| `campaign-scheduler` logs | `Scheduler run` every minute; `Scheduled start missed` = the start was over an hour ago |
| `email-sender` logs | SES errors, e.g. `Email address is not verified` (sender or recipient not whitelisted) |
| The campaign row | `status`, `startAt` (UTC) and `failureReason` |

## 6. SCORM package (Training → packages)

1. Upload a small SCORM / HTML5 **.zip**. It is listed with its size.
2. **Open** it: it loads from S3.
3. **Delete** it: it goes from the list, and from S3 (`uploads/training-packages/`).
