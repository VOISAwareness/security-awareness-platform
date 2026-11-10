#!/usr/bin/env python3
"""
Seed the database with a fake company, so every screen can read backend data
(docs/database-schema.md).

One company of 800 people is generated from a seed number, the same every
run, and written to: users, campaigns, recipients, events,
training-assignments, points-ledger, stats-daily and people-snapshots. All
figures come from the same per-person record, so they agree across screens.

Safe by design:
  - nothing is written without --write (the default prints the row counts);
  - every row carries seed=true, and --wipe deletes exactly those rows;
  - addresses end in .example, which can never receive mail, and the script
    sends nothing; campaigns are seeded already SENT, or as drafts with no
    recipient list, so the scheduler never picks one up;
  - seeded events are skipped by the points-engine; the ledger is written
    here by the same rules.

Usage:
    python seed_company.py                         # dry run: row counts only
    AWS_PROFILE=vshield python seed_company.py --write
    AWS_PROFILE=vshield python seed_company.py --wipe
    python seed_company.py --today 2026-11-10 --people 800 --seed 2026
"""
import argparse
import datetime as dt
import decimal
import math
import random
import time
from collections import defaultdict

REGION = "ap-south-1"
NAME_PREFIX = "security-awareness-poc"
EMAIL_DOMAIN = "vshield-demo.example"
BOARD = "GLOBAL"  # as in points-engine
TOTAL = "TOTAL"
HISTORY = 10  # ledger entries kept per person: what GET /standing shows
RISK_WINDOW_DAYS = 90  # a person's tier looks at their last 90 days

# Table -> its key attributes (for --wipe), and whether it is provisioned at
# 5 writes a second (written slowly, so it is never throttled).
TABLES = {
    "users": (("UserID",), False),
    "campaigns": (("campaignId",), False),
    "recipients": (("campaignId", "recipientId"), False),
    "events": (("campaignId", "eventId"), False),
    "training-assignments": (("owner", "assignmentId"), False),
    "points-ledger": (("owner", "entryId"), True),
    "stats-daily": (("scope", "day"), False),
    "people-snapshots": (("snapshotDay", "owner"), False),
}

# Department -> (share of the company, how risky, how keen on training).
DEPARTMENTS = {
    "AIDA": (0.11, 1.20, 0.9),
    "CARE": (0.11, 1.25, 0.8),
    "Finance Operations": (0.08, 1.15, 1.0),
    "Network Engineering": (0.08, 0.95, 1.0),
    "Supply Chain Management": (0.07, 1.05, 1.0),
    "Cyber Security": (0.06, 0.55, 1.2),
    "Cloud Infrastructure": (0.07, 0.80, 1.1),
    "IT Operations": (0.07, 0.95, 1.0),
    "Procurement": (0.06, 1.10, 1.0),
    "Human Resources": (0.06, 1.05, 1.1),
    "Legal & Compliance": (0.05, 0.90, 1.1),
    "Sales & Enterprise": (0.06, 1.35, 0.8),
    "Digital Products": (0.05, 0.95, 1.0),
    "Marketing & Communications": (0.04, 1.30, 0.9),
    "Executive Board": (0.01, 1.10, 1.0),
    "IT Security": (0.02, 0.50, 1.2),
}
COUNTRIES = (("India", 0.30), ("UK", 0.16), ("Germany", 0.13), ("Egypt", 0.14),
             ("Italy", 0.12), ("Spain", 0.12), ("Albania", 0.03))
ROLES = (("Admin", 4), ("Campaign Creator", 12), ("Campaign Manager", 8),
         ("Gamification Engine Manager", 3), ("GMT", 6))  # everyone else: Regular User
FIRST = ("Aarav", "Aisha", "Alba", "Ana", "Arjun", "Ben", "Carla", "Dario", "Elena", "Emre",
         "Farah", "Felix", "Giulia", "Hana", "Hugo", "Ines", "Ivan", "Jana", "Karim", "Lena",
         "Luca", "Maya", "Mona", "Nadia", "Nikhil", "Olga", "Omar", "Paolo", "Priya", "Rosa",
         "Sami", "Sara", "Tariq", "Uma", "Vera", "Yusuf", "Zara", "Zoe", "Ilir", "Meera")
LAST = ("Ahmed", "Bianchi", "Costa", "Das", "Fischer", "Garcia", "Hassan", "Hoxha", "Iyer",
        "Jones", "Khan", "Lopez", "Mancini", "Meyer", "Nair", "Novak", "Patel", "Quinn",
        "Rao", "Rossi", "Saleh", "Schmidt", "Shah", "Silva", "Taylor", "Verma", "Weber",
        "Wright", "Youssef", "Zaman")

# Campaign type -> (scenario it uses, how tempting, chance a click goes on to
# give details, training path it leads to). Types and ids as the app has them.
TYPES = {
    "Credential theft": ("SC-001", 1.15, 0.42, "TP-00004"),
    "Data Entry": ("SC-003", 1.00, 0.38, "TP-00003"),
    "Click": ("SC-009", 0.90, 0.10, "TP-00001"),
    "Helpdesk impersonation": ("SC-044", 1.10, 0.34, "TP-00001"),
    "Reward scam": ("", 1.20, 0.22, "TP-00005"),
    "Travel scam": ("", 0.85, 0.20, "TP-00002"),
}
PATHS = {  # TrainingPathID -> (name, quiz pass mark)
    "TP-00001": ("Anti-Phishing & Social Engineering Remediation Path", 80),
    "TP-00002": ("Executive Wire Fraud & BEC Defense Track", 80),
    "TP-00003": ("Comprehensive 360° Phishing & Payload Defense", 80),
    "TP-00004": ("Authentication Hygiene & Credential Defense", 80),
    "TP-00005": ("Frontline Threat Reporting & Incident Response", 80),
}
RULES = {"Opened": 0, "Clicked": -30, "Compromised": -50, "Reported": 80, "Trained": 30, "Evaluated": 30}
EVENT_RULE = {"OPEN": "Opened", "CLICK": "Clicked", "COMPROMISE": "Compromised", "REPORT": "Reported"}
TITLES = ("Password expiry notice", "Shared document waiting", "Payroll update", "Mailbox quota exceeded",
          "Helpdesk ticket follow-up", "Gift card reward", "Travel booking change", "MFA re-enrolment",
          "Invoice approval needed", "Benefits enrolment", "Parcel delivery failed", "Policy acknowledgement")

# Level bands, lowest first: (id, min, max); min counts, max doesn't. Same
# table as reference-api (a test checks the two agree).
LEVEL_BANDS = (
    ("LN2", None, -200), ("LN1", -200, -100), ("L0", -100, 0),
    ("L1G1", 0, 50), ("L1G2", 50, 100), ("L1G3", 100, 150),
    ("L2G1", 150, 200), ("L2G2", 200, 250), ("L2G3", 250, 300),
    ("L3G1", 300, 450), ("L3G2", 450, 600), ("L3G3", 600, 750),
    ("L4G1", 750, 950), ("L4G2", 950, 1150), ("L4G3", 1150, 1300),
    ("L5G1", 1300, 1700), ("L5G2", 1700, 2100), ("L5G3", 2100, 2550),
    ("L6G1", 2550, 3150), ("L6G2", 3150, 3750), ("L6G3", 3750, 4400),
    ("L7G1", 4400, 5200), ("L7G2", 5200, 6050), ("L7G3", 6050, None),
)
TIER_WEIGHT = {"low": 0, "moderate": 1 / 3, "high": 2 / 3, "critical": 1}  # as Insights


def level_id(points):
    return next(i for i, lo, hi in LEVEL_BANDS if (lo is None or points >= lo) and (hi is None or points < hi))


def iso(moment):
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ")


def tier_of(clicks, compromises, reports):
    """A person's risk tier from their record, by Insights' rules: critical
    gave details away; high clicked more than once; moderate clicked once or
    never reported; low reported and never clicked."""
    if compromises:
        return "critical"
    if clicks > 1:
        return "high"
    if clicks == 1 or not reports:
        return "moderate"
    return "low"


def risk_score(tiers):
    """Everyone's tier on 0-100, averaged (Insights' Risk Score)."""
    return round(sum(TIER_WEIGHT[t] for t in tiers) / len(tiers) * 100, 1) if tiers else None


def weighted(rng, pairs):
    return rng.choices([p[0] for p in pairs], weights=[p[1] for p in pairs])[0]


def make_people(rng, count):
    depts = [(name, share) for name, (share, _, _) in DEPARTMENTS.items()]
    roles = [role for role, n in ROLES for _ in range(n)]
    people, used = [], set()
    for i in range(count):
        first, last = rng.choice(FIRST), rng.choice(LAST)
        local, n = f"{first}.{last}".lower(), 1
        while local in used:
            n += 1
            local = f"{first}.{last}{n}".lower()
        used.add(local)
        dept = weighted(rng, depts)
        _, risky, keen = DEPARTMENTS[dept]
        # Most people rarely click; a few click often.
        kind = rng.random()
        click = (0.015 if kind < 0.62 else 0.09 if kind < 0.92 else 0.36) * risky
        people.append({
            "id": f"VSLD-{100001 + i}",
            "name": f"{first} {last}",
            "email": f"{local}@{EMAIL_DOMAIN}",
            "department": dept,
            "country": weighted(rng, COUNTRIES),
            "role": roles[i] if i < len(roles) else "Regular User",
            "click": min(0.6, click * rng.uniform(0.7, 1.3)),
            "report": min(0.85, max(0.03, rng.gauss(0.30, 0.16) / risky)),
            "keen": keen * rng.uniform(0.8, 1.2),
            "trainedAt": None,  # when their first training was completed
        })
    return people


def build(today, people_count=800, seed=2026):
    """Every table's rows for the fake company as it stands on `today`."""
    rng = random.Random(seed)
    now = dt.datetime.combine(today, dt.time(12, 0))
    people = make_people(rng, people_count)
    by_dept = defaultdict(list)
    for p in people:
        by_dept[p["department"]].append(p)
    head = {d: members[0]["email"] for d, members in by_dept.items()}
    creators = [p["email"] for p in people if p["role"] in ("Campaign Creator", "Campaign Manager")]
    admins = [p["email"] for p in people if p["role"] == "Admin"]

    users = [{
        "UserID": p["id"], "UserName": p["name"], "UserEMailID": p["email"],
        "Department": p["department"], "Country": p["country"], "role": p["role"],
        "jobTitle": "Head of " + p["department"] if head[p["department"]] == p["email"] else "Associate",
        "managerEmail": head[p["department"]], "location": p["country"],
        "active": True, "source": "seed", "seed": True,
    } for p in people]

    campaigns, recipients, events, assignments = [], [], [], []
    ledger = defaultdict(list)  # email -> [(at, entryId, rule, delta, campaignId, name)]
    record = defaultdict(list)  # email -> [(at, clicked, compromised, reported)]
    stats = defaultdict(lambda: defaultdict(int))  # (scope, day) -> counters
    has_path = set()  # (email, path) already assigned or taken

    def scopes(p, ctype=None):
        out = ["COMPANY", f"DEPT#{p['department']}", f"COUNTRY#{p['country']}"]
        if ctype:
            out += [f"TYPE#{ctype}", f"DEPT#{p['department']}#TYPE#{ctype}"]
        return out

    def add_training(p, path, source, assigned, campaign_id="", recipient_id=""):
        """One training assignment, played out to the end if `today` allows."""
        has_path.add((p["email"], path))
        name, pass_mark = PATHS[path]
        row = {
            "owner": p["email"], "assignmentId": f"A#{iso(assigned)}#{path}", "TrainingPathID": path,
            "source": source, "department": p["department"], "country": p["country"],
            "assignedAt": iso(assigned), "dueAt": iso(assigned + dt.timedelta(days=14)),
            "status": "ASSIGNED", "videosWatched": [], "attemptCount": 0, "seed": True,
        }
        if campaign_id:
            row.update(campaignId=campaign_id, recipientId=recipient_id)
        day = assigned.date().isoformat()
        for s in scopes(p):
            stats[(s, day)]["trainingAssigned"] += 1
        started = assigned + dt.timedelta(days=rng.uniform(0.2, 6))
        if rng.random() < min(0.97, 0.86 * p["keen"]) and started < now:
            row.update(status="IN_PROGRESS", startedAt=iso(started))
            done = started + dt.timedelta(days=rng.uniform(0.5, 9) / p["keen"])
            if rng.random() < min(0.97, 0.88 * p["keen"]) and done < now:
                score = int(max(40, min(100, rng.gauss(80 + 5 * p["keen"], 9))))
                passed = score >= pass_mark
                row.update(status="COMPLETED", completedAt=iso(done), quizScore=score, quizPassed=passed,
                           attemptCount=1 if passed else rng.randint(1, 3), videosWatched=["TV-00001"])
                if passed:
                    row.update(certificateId="TC-00001", certificateIssuedAt=iso(done))
                p["trainedAt"] = min(p["trainedAt"] or done, done)
                tag = campaign_id or path
                ledger[p["email"]].append((iso(done), f"E#{tag}#Trained", "Trained", RULES["Trained"], campaign_id, name))
                if passed:
                    ledger[p["email"]].append((iso(done), f"E#{tag}#Evaluated", "Evaluated", RULES["Evaluated"], campaign_id, name))
                for s in scopes(p):
                    c = stats[(s, day)]
                    c["trainingCompleted"] += 1
                    c["trainingPassed"] += passed
                    c["quizScoreSum"] += score
                    c["completeDaysSum"] += round((done - assigned).total_seconds() / 86400 * 10)  # tenths of a day
        assignments.append(row)
        return row["assignmentId"]

    # --- 45 campaigns already sent, about one every eight days -----------------
    sent_count = 45
    type_names = list(TYPES)
    for k in range(sent_count):
        age = 358 - k * 8 + rng.randint(-2, 2)  # days ago
        start = dt.datetime.combine(today - dt.timedelta(days=age), dt.time(rng.choice((7, 8, 9, 10)), 30))
        if start >= now:
            continue
        ctype = type_names[k % len(type_names)]
        scenario, tempting, gives, path = TYPES[ctype]
        cid = f"CAMP-S{k + 1:03d}"
        title = f"{TITLES[k % len(TITLES)]} ({start.strftime('%b %Y')})"
        if rng.random() < 0.35:
            audience = rng.sample(people, int(len(people) * rng.uniform(0.45, 0.7)))
        else:
            chosen = rng.sample(list(by_dept), rng.randint(2, 5))
            audience = [p for d in chosen for p in by_dept[d]]
        story = 1.25 - 0.45 * (1 - age / 360)  # people get harder to fool over the year
        counts = defaultdict(int)
        for n, p in enumerate(audience):
            rid = f"REC-S{k + 1:03d}-{n + 1:04d}"
            delivered = rng.random() < 0.985
            row = {
                "campaignId": cid, "recipientId": rid, "recipientName": p["name"], "recipientEmail": p["email"],
                "userId": p["id"], "department": p["department"], "country": p["country"],
                "sendStatus": "SENT" if delivered else "FAILED", "sentAt": iso(start),
                "createdAt": iso(start), "updatedAt": iso(start), "seed": True,
            }
            day = start.date().isoformat()
            keys = [(s, day) for s in scopes(p, ctype)]
            for key in keys:
                stats[key]["sent"] += 1
            counts["sent"] += 1
            if not delivered:
                recipients.append(row)
                continue
            row["deliveredAt"] = iso(start + dt.timedelta(seconds=rng.randint(5, 90)))
            happened = [("delivered", None)]
            opened_at = start + dt.timedelta(minutes=rng.expovariate(1 / 95))
            trained = p["trainedAt"] is not None and p["trainedAt"] < start
            clicked = compromised = reported = False
            if rng.random() < 0.64 and opened_at < now:
                row["openedAt"] = iso(opened_at)
                happened.append(("opened", ("OPEN", opened_at)))
                p_click = min(0.9, p["click"] * tempting * story * (0.45 if trained else 1) / 0.64)
                if rng.random() < p_click:
                    clicked_at = opened_at + dt.timedelta(minutes=rng.uniform(0.3, 12))
                    clicked = True
                    row.update(clickedAt=iso(clicked_at), lastClickedAt=iso(clicked_at), clickCount=1)
                    happened.append(("clicked", ("CLICK", clicked_at)))
                    if rng.random() < gives:
                        compromised = True
                        gave_at = clicked_at + dt.timedelta(minutes=rng.uniform(0.3, 4))
                        row["compromisedAt"] = iso(gave_at)
                        happened.append(("compromised", ("COMPROMISE", gave_at)))
                    if (p["email"], path) not in has_path:
                        row["trainingAssignmentId"] = add_training(
                            p, path, "ASSIGNED", clicked_at + dt.timedelta(minutes=5), cid, rid)
                p_report = p["report"] * (1.5 if trained else 1) * (0.3 if clicked else 1) / 0.64
                if rng.random() < min(0.95, p_report):
                    minutes = min(2880, rng.lognormvariate(math.log(42), 0.85))
                    reported_at = max(opened_at, start + dt.timedelta(minutes=minutes))
                    if reported_at < now:
                        reported = True
                        row["reportedAt"] = iso(reported_at)
                        happened.append(("reported", ("REPORT", reported_at)))
                        for key in keys:
                            stats[key]["reportMinutes"] += round((reported_at - start).total_seconds() / 60)
                            stats[key]["reportCount"] += 1
            for name, event in happened:
                counts[name] += 1
                for key in keys:
                    stats[key][name] += 1
                if event:
                    etype, at = event
                    eid = f"EVT-S{k + 1:03d}-{n + 1:04d}-{etype[:2]}"
                    events.append({
                        "campaignId": cid, "eventId": eid, "recipientId": rid, "eventType": etype,
                        "eventTimestamp": iso(at), "eventSource": "SEED", "seed": True,
                    })
                    delta = RULES[EVENT_RULE[etype]]
                    if delta:
                        ledger[p["email"]].append(
                            (iso(at), f"E#{cid}#{EVENT_RULE[etype]}", EVENT_RULE[etype], delta, cid, title))
            record[p["email"]].append((start, clicked, compromised, reported))
            recipients.append(row)
        for s in ("COMPANY", f"TYPE#{ctype}"):
            stats[(s, start.date().isoformat())]["campaigns"] += 1
        end = start + dt.timedelta(days=7)
        creator = rng.choice(creators)
        campaigns.append({
            "campaignId": cid, "status": "SENT", "campaignTitle": title,
            "campaignDescription": f"{ctype} simulation for {len(audience)} people.",
            "campaignType": ctype, "scenarioId": scenario, "trainingId": path,
            "startTime": iso(start), "endTime": iso(end), "startAt": iso(start), "endAt": iso(end), "timeZone": "UTC",
            "autoEndPostSending": True, "isTestCampaign": False,
            "senderEmailId": f"no-reply@{EMAIL_DOMAIN}", "senderName": "IT Service Desk",
            "emailSubject": title, "emailBody": "<p>Seeded campaign: this email was never sent.</p>",
            "createdBy": creator, "submittedBy": creator, "approvedBy": rng.choice(admins),
            "createdAt": iso(start - dt.timedelta(days=5)), "updatedAt": iso(end), "sentAt": iso(start),
            "counts": dict(counts), "seed": True,
        })

    # --- a few campaigns still in the workflow (no recipient list: never sent) --
    for n, status in enumerate(("DRAFT", "DRAFT", "PENDING_APPROVAL", "PENDING_APPROVAL", "REJECTED")):
        ctype = type_names[n % len(type_names)]
        created = now - dt.timedelta(days=n + 1)
        creator = rng.choice(creators)
        row = {
            "campaignId": f"CAMP-W{n + 1:03d}", "status": status, "campaignTitle": f"{TITLES[-1 - n]} (planned)",
            "campaignDescription": f"{ctype} simulation, not sent.", "campaignType": ctype,
            "scenarioId": TYPES[ctype][0], "trainingId": TYPES[ctype][3], "isTestCampaign": False,
            "senderEmailId": f"no-reply@{EMAIL_DOMAIN}", "senderName": "IT Service Desk",
            "emailSubject": TITLES[-1 - n], "emailBody": "<p>Seeded campaign.</p>",
            "createdBy": creator, "createdAt": iso(created), "updatedAt": iso(created), "seed": True,
        }
        if status != "DRAFT":
            row["submittedBy"] = creator
        if status == "REJECTED":
            row.update(rejectedBy=rng.choice(admins), rejectionReason="Sender name needs changing.")
        campaigns.append(row)

    # --- training people chose to take ------------------------------------------
    for p in people:
        for month in range(12):
            if rng.random() < 0.035 * p["keen"]:
                path = rng.choice(list(PATHS))
                when = now - dt.timedelta(days=month * 30 + rng.uniform(1, 29))
                if (p["email"], path) not in has_path:
                    add_training(p, path, "VOLUNTARY", when)

    # --- points ledger: each person's total, and their latest entries ----------
    ledger_rows, totals_at = [], {}
    for p in people:
        entries = sorted(ledger[p["email"]])
        totals_at[p["email"]] = entries
        if not entries:
            continue
        total = sum(e[3] for e in entries)
        ledger_rows.append({
            "owner": p["email"], "entryId": TOTAL, "points": total, "entries": len(entries),
            "updatedAt": entries[-1][0], "board": BOARD, "seed": True,
        })
        for at, entry_id, rule, delta, cid, name in entries[-HISTORY:]:
            ledger_rows.append({
                "owner": p["email"], "entryId": entry_id, "rule": rule, "delta": delta, "campaignId": cid,
                "campaignName": name, "at": at, "createdAt": at, "seed": True,
            })

    # --- people as they stood on the first of each month, and today ------------
    days = sorted({today} | {(today.replace(day=1) - dt.timedelta(days=31 * m)).replace(day=1) for m in range(12)})
    snapshots = []
    for day in days:
        end = dt.datetime.combine(day, dt.time(23, 59, 59))
        since = end - dt.timedelta(days=RISK_WINDOW_DAYS)
        for p in people:
            recent = [r for r in record[p["email"]] if since < r[0] <= end]
            so_far = [r for r in record[p["email"]] if r[0] <= end]
            clicks, gave, reports = (sum(r[i] for r in recent) for i in (1, 2, 3))
            points = sum(e[3] for e in totals_at[p["email"]] if e[0] <= iso(end))
            done = [a for a in assignments if a["owner"] == p["email"] and a.get("completedAt", "9") <= iso(end)]
            tier = tier_of(clicks, gave, reports)
            snapshots.append({
                "snapshotDay": day.isoformat(), "owner": p["email"], "department": p["department"],
                "country": p["country"], "riskTier": tier, "riskScore": round(TIER_WEIGHT[tier] * 100),
                "points": points, "levelId": level_id(points),
                "campaigns": len(so_far), "clicks": sum(r[1] for r in so_far), "reports": sum(r[3] for r in so_far),
                "trainedState": ("ASSIGNED" if any(a["source"] == "ASSIGNED" for a in done)
                                 else "VOLUNTARY" if done else "NONE"),
                "seed": True,
            })

    stats_rows = [{"scope": scope, "day": day, **counters, "seed": True} for (scope, day), counters in sorted(stats.items())]
    return {
        "users": users, "campaigns": campaigns, "recipients": recipients, "events": events,
        "training-assignments": assignments, "points-ledger": ledger_rows,
        "stats-daily": stats_rows, "people-snapshots": snapshots,
    }


def summary(tables, today):
    """A few headline figures, to check the company looks right before writing."""
    r = tables["recipients"]
    delivered = sum("deliveredAt" in x for x in r)
    latest = [s["riskTier"] for s in tables["people-snapshots"] if s["snapshotDay"] == today.isoformat()]
    a = tables["training-assignments"]
    pct = lambda n, d: f"{n / d * 100:.1f}%" if d else "-"  # noqa: E731
    return {
        "open rate": pct(sum("openedAt" in x for x in r), delivered),
        "hook rate": pct(sum("clickedAt" in x for x in r), delivered),
        "compromise rate": pct(sum("compromisedAt" in x for x in r), delivered),
        "report rate": pct(sum("reportedAt" in x for x in r), delivered),
        "risk score today": risk_score(latest),
        "trained rate": pct(sum(x["status"] == "COMPLETED" for x in a), len(a)),
        "pass rate": pct(sum(bool(x.get("quizPassed")) for x in a), sum(x["status"] == "COMPLETED" for x in a)),
    }


def to_item(row):
    """DynamoDB takes Decimal, not float."""
    return {k: decimal.Decimal(str(v)) if isinstance(v, float) else v for k, v in row.items()}


def write(db, tables):
    for short, rows in tables.items():
        table = db.Table(f"{NAME_PREFIX}-{short}")
        slow = TABLES[short][1]
        print(f"  {table.name}: writing {len(rows)}" + (" (5 a second, about "
              f"{len(rows) // 300 + 1} min)" if slow else ""), flush=True)
        with table.batch_writer() as batch:
            for n, row in enumerate(rows, start=1):
                batch.put_item(Item=to_item(row))
                if slow and n % 5 == 0:
                    time.sleep(1)


def wipe(db):
    from boto3.dynamodb.conditions import Attr

    for short, (keys, slow) in TABLES.items():
        table = db.Table(f"{NAME_PREFIX}-{short}")
        found, kwargs = [], {"FilterExpression": Attr("seed").eq(True),
                             "ProjectionExpression": ", ".join(f"#k{i}" for i in range(len(keys))),
                             "ExpressionAttributeNames": {f"#k{i}": k for i, k in enumerate(keys)}}
        while True:
            page = table.scan(**kwargs)
            found.extend(page.get("Items", []))
            if not page.get("LastEvaluatedKey"):
                break
            kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]
        print(f"  {table.name}: deleting {len(found)} seeded rows", flush=True)
        with table.batch_writer() as batch:
            for n, key in enumerate(found, start=1):
                batch.delete_item(Key=key)
                if slow and n % 5 == 0:
                    time.sleep(1)


def main(argv=None):
    parser = argparse.ArgumentParser(description="Seed a fake company (see the module docstring).")
    parser.add_argument("--write", action="store_true", help="write the rows (default: only print the counts)")
    parser.add_argument("--wipe", action="store_true", help="delete every row carrying seed=true")
    parser.add_argument("--today", type=dt.date.fromisoformat, default=dt.date.today())
    parser.add_argument("--people", type=int, default=800)
    parser.add_argument("--seed", type=int, default=2026)
    args = parser.parse_args(argv)

    if args.wipe:
        import boto3

        wipe(boto3.resource("dynamodb", region_name=REGION))
        print("Done.")
        return
    tables = build(args.today, args.people, args.seed)
    for short, rows in tables.items():
        print(f"  {NAME_PREFIX}-{short}: {len(rows)} rows")
    for name, value in summary(tables, args.today).items():
        print(f"  {name}: {value}")
    if not args.write:
        print("Dry run: nothing written. Add --write to write these rows.")
        return
    import boto3

    write(boto3.resource("dynamodb", region_name=REGION), tables)
    print("Done.")


if __name__ == "__main__":
    main()
