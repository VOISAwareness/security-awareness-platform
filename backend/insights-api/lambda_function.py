"""
insights-api: what Insights, the Big Picture and Home read, worked out from
the real tables.

GET /insights?role=   one payload in the shapes the frontend's pure
                      functions already take (docs/insights-data.md):
  items       one { campaign, report } per sent campaign (test campaigns
              left out), from the campaign's recipient rows
  org         24 steps of 30 days, oldest first: risk tiers, cohorts, who
              moved, drivers and training, company-wide and per department
  people      { rows, months, campaigns }: one row per person (no email
              address), the rows the people lists filter and the department
              charts count; each record is [campaign index, clicked,
              reported, gave], the index into `campaigns`
  programmes  each training path over the year (completion, quiz score, pass
              rate, average days to complete)
  asOf        when it was worked out (epoch ms); the period ends here

Rules (docs/database-schema.md, the sample data's):
- A person's tier looks at their last 90 days: critical gave details away,
  high clicked more than once, moderate clicked once or never reported, low
  reported and never clicked. The Risk Score is everyone's tier on 0-100.
- Opened counts anyone who opened, clicked, gave details or reported.
- Trained after a click: the training that click led to was passed.
- Gave details away is that it happened, never what was typed.

Everything is read from recipients (one row per person per campaign),
training-assignments, users and campaigns. At this size (about 15,000
recipient rows) the whole payload takes a second or two to build, and a warm
container keeps it for CACHE_SECONDS, so opening Insights again is instant.
Insights is for the roles that have the Analytics page; the role is
client-asserted until SSO (as everywhere else for now).
"""
import decimal
import json
import logging
import os
import statistics
import time
from collections import defaultdict
from datetime import UTC, datetime, timedelta

import boto3

TABLE_PREFIX = os.environ["TABLE_PREFIX"]
dynamodb = boto3.resource("dynamodb")
campaigns_table = dynamodb.Table(f"{TABLE_PREFIX}-campaigns")
recipients_table = dynamodb.Table(f"{TABLE_PREFIX}-recipients")
users_table = dynamodb.Table(f"{TABLE_PREFIX}-users")
assignments_table = dynamodb.Table(f"{TABLE_PREFIX}-training-assignments")
paths_table = dynamodb.Table(f"{TABLE_PREFIX}-training-paths")

log = logging.getLogger()
log.setLevel(logging.INFO)

INSIGHTS_ROLES = frozenset({"Admin", "Campaign Creator", "Campaign Manager"})
CACHE_SECONDS = int(os.environ.get("CACHE_SECONDS", "300"))
STEP_DAYS = 30
STEPS = 24  # two years of 30-day steps: a period, the one before, and the trends
PEOPLE_MONTHS = 6  # the steps each person's level is kept for
RISK_WINDOW_DAYS = 90
TIERS = ("low", "moderate", "high", "critical")
TIER_LEVEL = {"low": "Low", "moderate": "Moderate", "high": "High", "critical": "Critical"}
# Points a passed training earns (gamification's Trained + Evaluated).
TRAINING_POINTS = 60
SENT_STATUSES = frozenset({"SENDING", "SENT"})
COUNTS = ("sent", "delivered", "opened", "clicked", "compromised", "reported", "trained", "complained")

_cache = {"at": 0.0, "body": None}


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)


def respond(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": body if isinstance(body, str) else json.dumps(body, cls=DecimalEncoder),
    }


def err(status, message):
    return respond(status, {"error": {"message": message}})


def log_step(context, step, **fields):
    log.info(json.dumps({"step": step, "requestId": getattr(context, "aws_request_id", None), **fields}))


def scan_all(table, **kwargs):
    items, start = [], None
    while True:
        page = table.scan(**kwargs, **({"ExclusiveStartKey": start} if start else {}))
        items.extend(page.get("Items", []))
        start = page.get("LastEvaluatedKey")
        if not start:
            return items


def when(value):
    """An ISO timestamp as an aware datetime, or None."""
    if not value:
        return None
    try:
        moment = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    return moment if moment.tzinfo else moment.replace(tzinfo=UTC)


def ms(moment):
    return int(moment.timestamp() * 1000)


def rate(n, of):
    return n / of if of else 0


def minutes_between(start, end):
    return round((end - start).total_seconds() / 60) if start and end else None


def tier_of(clicks, gave, reports):
    if gave:
        return "critical"
    if clicks > 1:
        return "high"
    if clicks == 1 or not reports:
        return "moderate"
    return "low"


# --- the rows -----------------------------------------------------------------

def outcome(r, trained_ids):
    """One recipient row as what happened, with times; nothing typed."""
    sent_at = when(r.get("sentAt") or r.get("createdAt"))
    delivered = r.get("sendStatus", "SENT") == "SENT" or bool(r.get("deliveredAt"))
    clicked_at, gave_at, reported_at = when(r.get("clickedAt")), when(r.get("compromisedAt")), when(r.get("reportedAt"))
    opened_at = when(r.get("openedAt"))
    return {
        "email": str(r.get("recipientEmail", "")).lower(),
        "department": r.get("department") or "",
        "sentAt": sent_at,
        "delivered": delivered,
        "opened": bool(opened_at or clicked_at or gave_at or reported_at),
        "openedAt": opened_at,
        "clickedAt": clicked_at,
        "gaveAt": gave_at,
        "reportedAt": reported_at,
        "trained": bool(clicked_at) and r.get("trainingAssignmentId") in trained_ids,
        "trainingId": r.get("trainingAssignmentId"),
    }


def tally(rows):
    """The counts and times of a set of outcomes, in the report's shape."""
    sent = len(rows)
    got = [x for x in rows if x["delivered"]]
    c = {
        "sent": sent,
        "delivered": len(got),
        "opened": sum(x["opened"] for x in got),
        "clicked": sum(bool(x["clickedAt"]) for x in got),
        "compromised": sum(bool(x["gaveAt"]) for x in got),
        "reported": sum(bool(x["reportedAt"]) for x in got),
        "trained": sum(x["trained"] for x in got),
        "complained": 0,  # no complaint feed yet
    }
    report_minutes = sorted(m for m in (minutes_between(x["sentAt"], x["reportedAt"]) for x in got) if m is not None)
    click_minutes = [m for m in (minutes_between(x["sentAt"], x["clickedAt"]) for x in got) if m is not None]
    c["timing"] = {
        "firstReport": report_minutes[0] if report_minutes else None,
        "medianReport": round(statistics.median(report_minutes)) if report_minutes else None,
        "firstClick": min(click_minutes) if click_minutes else None,
    }
    return c


def campaign_report(campaign, rows, names):
    c = tally(rows)
    by_dept = defaultdict(list)
    for x in rows:
        by_dept[x["department"] or names.get(x["email"], {}).get("department") or "Unknown"].append(x)
    departments = []
    for name, part in by_dept.items():
        d = tally(part)
        d.update(name=name, recipients=d["delivered"], reportRate=rate(d["reported"], d["delivered"]),
                 clickRate=rate(d["clicked"], d["delivered"]))
        departments.append(d)
    departments.sort(key=lambda d: (-d["reportRate"], d["name"]))
    started = when(campaign.get("startAt") or campaign.get("sentAt") or campaign.get("startTime"))
    if started is None:
        started = min((x["sentAt"] for x in rows if x["sentAt"]), default=None)
    report = {
        "id": campaign["campaignId"],
        "name": campaign.get("campaignTitle") or campaign["campaignId"],
        "started": started.date().isoformat() if started else None,
        **c,
        "rates": {
            "open": rate(c["opened"], c["delivered"]),
            "click": rate(c["clicked"], c["delivered"]),
            "compromise": rate(c["compromised"], c["delivered"]),
            "report": rate(c["reported"], c["delivered"]),
            "trainedAfterClick": rate(c["trained"], c["clicked"]),
        },
        "resilience": c["reported"] / c["clicked"] if c["clicked"] else None,
        "departments": departments,
    }
    meta = {
        "id": report["id"],
        "name": report["name"],
        "type": campaign.get("campaignType") or "Other",
        "started": report["started"],
        "total": c["sent"],
    }
    return {"campaign": meta, "report": report}


# --- training -------------------------------------------------------------------

def training_view(a):
    """One assignment as the fields Insights counts."""
    status = a.get("status", "ASSIGNED")
    attempts = int(a.get("attemptCount") or 0)
    passed = status == "COMPLETED"
    assigned, completed = when(a.get("assignedAt")), when(a.get("completedAt"))
    return {
        "owner": str(a.get("owner", "")).lower(),
        "path": a.get("TrainingPathID", ""),
        "assignedAt": assigned,
        "startedAt": when(a.get("startedAt")) or (completed if passed else None),
        "completedAt": completed if passed else None,
        "dueAt": when(a.get("dueAt")),
        "lastAttemptAt": when(a.get("lastAttemptAt")),
        "quizScore": int(a["quizScore"]) if a.get("quizScore") is not None else None,
        "passed": passed,
        "attempts": attempts,
        "fails": max(0, attempts - 1) if passed else attempts,
        "days": (completed - assigned).total_seconds() / 86400 if passed and assigned and completed else None,
    }


def new_training():
    return {"assigned": 0, "started": 0, "completed": 0, "passed": 0, "quizTaken": 0, "quizScoreSum": 0,
            "daysSum": 0.0, "badges": 0, "points": 0}


def add_training(t, a, to):
    """Count one assignment given in a step, as it stood at the step's end."""
    t["assigned"] += 1
    if a["startedAt"] and a["startedAt"] <= to:
        t["started"] += 1
    if a["lastAttemptAt"] and a["lastAttemptAt"] <= to and a["quizScore"] is not None:
        t["quizTaken"] += 1
        t["quizScoreSum"] += a["quizScore"]
    if a["completedAt"] and a["completedAt"] <= to:
        t["completed"] += 1
        t["passed"] += 1
        t["badges"] += 1
        t["points"] += TRAINING_POINTS
        t["daysSum"] += a["days"] or 0


def finish_training(t):
    t["quizScore"] = t["quizScoreSum"] / t["quizTaken"] if t["quizTaken"] else None
    t["daysSum"] = round(t["daysSum"], 1)
    return t


# --- people over time -------------------------------------------------------------

def build_org(people, received, training, path_names, end):
    """24 steps of 30 days up to `end`, oldest first, in sampleOrganisation's shape."""
    depts = sorted({p["department"] for p in people.values()})
    index = {d: i for i, d in enumerate(depts)}
    step = timedelta(days=STEP_DAYS)
    window = timedelta(days=RISK_WINDOW_DAYS)
    trained_at = {}
    for a in training:
        if a["completedAt"] and (a["owner"] not in trained_at or a["completedAt"] < trained_at[a["owner"]]):
            trained_at[a["owner"]] = a["completedAt"]
    by_owner = defaultdict(list)
    for a in training:
        by_owner[a["owner"]].append(a)

    def tier_at(email, to):
        recs = [x for x in received.get(email, ()) if x["delivered"] and to - window < x["sentAt"] <= to]
        clicks = sum(bool(x["clickedAt"] and x["clickedAt"] <= to) for x in recs)
        gave = sum(bool(x["gaveAt"] and x["gaveAt"] <= to) for x in recs)
        reports = sum(bool(x["reportedAt"] and x["reportedAt"] <= to) for x in recs)
        return tier_of(clicks, gave, reports), recs, clicks, reports

    rank = {t: i for i, t in enumerate(TIERS)}
    steps = []
    first_end = end - (STEPS - 1) * step
    tiers_before = {e: tier_at(e, first_end - step)[0] for e in people}
    for k in range(STEPS):
        to = first_end + k * step
        since = to - step
        rows = [{"name": d, "index": i, "people": 0, "tiers": dict.fromkeys(TIERS, 0),
                 "cohorts": {"trained": 0, "untrained": 0, "trainedClicks": 0, "untrainedClicks": 0},
                 "training": new_training()} for i, d in enumerate(depts)]
        improved = slipped = 0
        drivers = {"repeatClickers": 0, "neverReported": 0, "overdueTraining": 0, "quizFailures": 0}
        paths = defaultdict(new_training)
        for email, p in people.items():
            d = rows[index[p["department"]]]
            tier, recs, clicks, reports = tier_at(email, to)
            d["people"] += 1
            d["tiers"][tier] += 1
            was = tiers_before.get(email, tier)
            improved += rank[tier] < rank[was]
            slipped += rank[tier] > rank[was]
            tiers_before[email] = tier
            trained = email in trained_at and trained_at[email] <= to
            clicked_in_step = any(x["clickedAt"] and since < x["sentAt"] <= to for x in recs)
            side = "trained" if trained else "untrained"
            d["cohorts"][side] += 1
            d["cohorts"][f"{side}Clicks"] += clicked_in_step
            drivers["repeatClickers"] += clicks >= 2
            drivers["neverReported"] += bool(recs) and not reports
            mine = by_owner.get(email, ())
            drivers["overdueTraining"] += any(
                a["assignedAt"] and a["assignedAt"] <= to and a["dueAt"] and a["dueAt"] < to
                and not (a["completedAt"] and a["completedAt"] <= to) for a in mine)
            drivers["quizFailures"] += any(
                a["fails"] >= 2 and a["lastAttemptAt"] and a["lastAttemptAt"] <= to and not a["passed"] for a in mine)
            for a in mine:
                if a["assignedAt"] and since < a["assignedAt"] <= to:
                    add_training(d["training"], a, to)
                    add_training(paths[path_names.get(a["path"], a["path"])], a, to)
        for d in rows:
            finish_training(d["training"])
        total = new_training()
        for d in rows:
            for key in ("assigned", "started", "completed", "passed", "quizTaken", "quizScoreSum", "badges", "points"):
                total[key] += d["training"][key]
            total["daysSum"] += d["training"]["daysSum"]
        steps.append({
            "to": ms(to),
            "people": sum(d["people"] for d in rows),
            "tiers": {t: sum(d["tiers"][t] for d in rows) for t in TIERS},
            "cohorts": {key: sum(d["cohorts"][key] for d in rows)
                        for key in ("trained", "untrained", "trainedClicks", "untrainedClicks")},
            "improved": improved,
            "slipped": slipped,
            "drivers": drivers,
            "training": {**finish_training(total), "paths": {n: finish_training(t) for n, t in sorted(paths.items())}},
            "departments": rows,
        })
    return steps


def step_of(a):
    """A person's newest training as the people list's step."""
    if a["passed"]:
        return "Passed"
    if a["attempts"]:
        return "Completed"  # took the quiz, has not passed yet
    if a["startedAt"]:
        return "Started"
    return "Not started"


def build_people(people, received, training, names_by_id, path_names, org, now):
    """One row per person, in insightsPeople.peopleTable's shape (no email),
    each campaign record compacted (see `records`)."""
    months = org[-PEOPLE_MONTHS:]
    window_start = datetime.fromtimestamp(months[0]["to"] / 1000, UTC) - timedelta(days=STEP_DAYS)
    by_owner = defaultdict(list)
    for a in training:
        by_owner[a["owner"]].append(a)
    campaigns = [{"name": c["name"], "type": c["type"]} for c in names_by_id.values()]
    index_of = {cid: i for i, cid in enumerate(names_by_id)}
    rows = []
    for n, (email, p) in enumerate(sorted(people.items(), key=lambda e: (e[1]["department"], e[1]["name"]))):
        levels = []
        for s in months:
            to = datetime.fromtimestamp(s["to"] / 1000, UTC)
            recs = [x for x in received.get(email, ()) if x["delivered"] and to - timedelta(days=RISK_WINDOW_DAYS) < x["sentAt"] <= to]
            levels.append(TIER_LEVEL[tier_of(
                sum(bool(x["clickedAt"] and x["clickedAt"] <= to) for x in recs),
                sum(bool(x["gaveAt"] and x["gaveAt"] <= to) for x in recs),
                sum(bool(x["reportedAt"] and x["reportedAt"] <= to) for x in recs))])
        # [campaign index, clicked, reported, gave]: `campaigns` names each
        # index, and services/api.js expands them into peopleTable's records
        records = [[index_of[x["campaignId"]], int(bool(x["clickedAt"])), int(bool(x["reportedAt"])),
                    int(bool(x["gaveAt"]))]
                   for x in sorted(received.get(email, ()), key=lambda x: x["sentAt"])
                   if x["delivered"] and x["sentAt"] > window_start and x["campaignId"] in index_of]
        mine = sorted(by_owner.get(email, ()), key=lambda a: a["assignedAt"] or now)
        latest = mine[-1] if mine else None
        overdue = any(not a["passed"] and a["dueAt"] and a["dueAt"] < now for a in mine)
        fails = max((a["fails"] for a in mine), default=0)
        row = {
            "id": p["id"] or n,
            "name": p["name"],
            "initials": "".join(w[0] for w in p["name"].split()[:2]).upper(),
            "department": p["department"],
            "joined": 0,
            "levels": levels,
            "level": levels[-1],
            "records": records,
            "emails": len(records),
            "clicked": sum(r[1] for r in records),
            "reported": sum(r[2] for r in records),
            "gave": sum(r[3] for r in records),
            "step": step_of(latest) if latest else "Not started",
            "programme": path_names.get(latest["path"], latest["path"]) if latest else None,
            "overdue": overdue,
            "quizFails": fails,
        }
        row["drivers"] = {
            "neverReported": row["emails"] > 0 and row["reported"] == 0,
            "repeatClicker": row["clicked"] >= 2,
            "overdue": overdue,
            "quizFailedTwice": fails >= 2,
        }
        rows.append(row)
    return {"rows": rows, "months": [{"to": s["to"]} for s in months], "campaigns": campaigns}


def build_programmes(training, path_names, now):
    """Each path over the last year, in the old analytics page's shape."""
    year_ago = now - timedelta(days=365)
    by_path = defaultdict(list)
    for a in training:
        if a["assignedAt"] and a["assignedAt"] > year_ago:
            by_path[a["path"]].append(a)
    out = []
    for path, rows in sorted(by_path.items()):
        took = [a for a in rows if a["quizScore"] is not None]
        done = [a for a in rows if a["passed"]]
        days = [a["days"] for a in done if a["days"] is not None]
        completion = round(100 * rate(len(done), len(rows)))
        out.append({
            "id": path,
            "program": path_names.get(path, path),
            "assigned": len(rows),
            "completion": completion,
            "score": round(sum(a["quizScore"] for a in took) / len(took)) if took else None,
            "pass": round(100 * rate(len(done), len(took))) if took else None,
            "avgDays": round(sum(days) / len(days), 1) if days else None,
            "status": "Good" if completion >= 80 else "Needs attention" if completion >= 60 else "Poor",
        })
    return out


def build(now=None):
    now = now or datetime.now(UTC)
    users = [u for u in scan_all(users_table) if u.get("active", True) is not False]
    people = {}
    for u in users:
        email = str(u.get("UserEMailID", "")).lower()
        if email:
            people[email] = {"id": u.get("UserID"), "name": u.get("UserName") or email.split("@")[0],
                             "department": u.get("Department") or "Unknown"}
    path_names = {p["TrainingPathID"]: p.get("TrainingPathName") or p["TrainingPathID"]
                  for p in scan_all(paths_table) if p.get("TrainingPathID")}
    raw_training = scan_all(assignments_table)
    training = [training_view(a) for a in raw_training]
    trained_ids = {a.get("assignmentId") for a in raw_training if a.get("status") == "COMPLETED"}

    sent = [c for c in scan_all(campaigns_table)
            if c.get("status") in SENT_STATUSES and not c.get("isTestCampaign")]
    wanted = {c["campaignId"] for c in sent}
    rows_by_campaign = defaultdict(list)
    for r in scan_all(recipients_table):
        if r.get("campaignId") in wanted:
            x = outcome(r, trained_ids)
            if x["sentAt"]:
                x["campaignId"] = r["campaignId"]
                rows_by_campaign[r["campaignId"]].append(x)
    items = [campaign_report(c, rows_by_campaign[c["campaignId"]], people)
             for c in sent if rows_by_campaign[c["campaignId"]]]
    items.sort(key=lambda x: (x["campaign"]["started"] or "", x["campaign"]["name"]), reverse=True)
    names_by_id = {x["campaign"]["id"]: x["campaign"] for x in items}

    received = defaultdict(list)  # email -> outcomes, every campaign
    for part in rows_by_campaign.values():
        for x in part:
            received[x["email"]].append(x)
    org = build_org(people, received, training, path_names, now) if people else []
    return {
        "asOf": ms(now),
        "items": items,
        "org": org,
        "people": build_people(people, received, training, names_by_id, path_names, org, now) if org else {"rows": [], "months": [], "campaigns": []},
        "programmes": build_programmes(training, path_names, now),
    }


def lambda_handler(event, context):
    route = event.get("routeKey", "")
    qs = event.get("queryStringParameters") or {}
    try:
        if route == "GET /insights":
            if qs.get("role") not in INSIGHTS_ROLES:
                return err(403, "Insights is for admins, campaign creators and campaign managers.")
            fresh = qs.get("fresh") == "1"
            if fresh or not _cache["body"] or time.time() - _cache["at"] > CACHE_SECONDS:
                started = time.time()
                data = build()
                _cache["body"] = json.dumps({"data": data}, cls=DecimalEncoder, separators=(",", ":"))
                _cache["at"] = time.time()
                log_step(context, "built", campaigns=len(data["items"]), people=len(data["people"]["rows"]),
                         ms=round((time.time() - started) * 1000), bytes=len(_cache["body"]))
            return respond(200, _cache["body"])
        return err(404, f"No route {route}")
    except Exception as e:  # noqa: BLE001 - one clear 500 with the request id
        log.exception(json.dumps({"step": "failed", "requestId": getattr(context, "aws_request_id", None),
                                  "error": type(e).__name__}))
        return err(500, "Insights could not be worked out. Try again in a minute.")
