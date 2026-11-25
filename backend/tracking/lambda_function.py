import html
import json
import os
import re
import uuid
from datetime import UTC, datetime
from urllib.parse import quote

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

RECIPIENTS_TABLE = os.environ["RECIPIENTS_TABLE"]
EVENTS_TABLE = os.environ["EVENTS_TABLE"]
TRACKING_TOKEN_INDEX = os.environ["TRACKING_TOKEN_INDEX"]


def _sibling_table(name):
    """Default table name next to the recipients table (same prefix)."""
    prefix = RECIPIENTS_TABLE.rsplit("-", 1)[0] if "-" in RECIPIENTS_TABLE else RECIPIENTS_TABLE
    return f"{prefix}-{name}"


# The clicked campaign and the landing page chosen for it in the wizard.
CAMPAIGNS_TABLE = os.environ.get("CAMPAIGNS_TABLE") or _sibling_table("campaigns")
LANDING_PAGES_TABLE = os.environ.get("LANDING_PAGES_TABLE") or _sibling_table("landing-pages")
# A click assigns the campaign's training path to the person who clicked.
ASSIGNMENTS_TABLE = os.environ.get("ASSIGNMENTS_TABLE") or _sibling_table("training-assignments")
USERS_TABLE = os.environ.get("USERS_TABLE") or _sibling_table("users")
TRAINING_DUE_DAYS = 14
MAX_LANDING_BYTES = 350 * 1024
# Where the app runs (e.g. https://vshield.example.com), so the landing page's
# "My Training" link can leave the API's domain. Optional: a campaign saved
# from the app carries its own (appBaseUrl), used when this is not set.
APP_BASE_URL = os.environ.get("APP_BASE_URL", "")

dynamodb = boto3.resource("dynamodb")

recipients_table = dynamodb.Table(RECIPIENTS_TABLE)
events_table = dynamodb.Table(EVENTS_TABLE)
campaigns_table = dynamodb.Table(CAMPAIGNS_TABLE)
landing_pages_table = dynamodb.Table(LANDING_PAGES_TABLE)
assignments_table = dynamodb.Table(ASSIGNMENTS_TABLE)
users_table = dynamodb.Table(USERS_TABLE)


html_escape = html.escape


def utc_timestamp():
    """Return the current UTC timestamp in ISO-8601 format."""
    return datetime.now(UTC).isoformat()


def json_response(status_code, body):
    """Return a JSON API Gateway response."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
        },
        "body": json.dumps(body)
    }


def html_response(status_code, html, form_action="'none'"):
    """Return an HTML API Gateway response. `form_action` is the CSP
    form-action source: 'none' for every page except the browser page,
    whose one form may post only back to this API ('self')."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
            "X-Content-Type-Options": "nosniff",
            # Landing pages are authored HTML: styles, images and fonts
            # load, but no script runs and no form can submit anywhere, so
            # nothing a phished person types is ever sent.
            "Content-Security-Policy": (
                "default-src 'none'; "
                "style-src 'unsafe-inline' https:; "
                "img-src https: data:; "
                "font-src https: data:; "
                f"form-action {form_action}; "
                "base-uri 'none'; "
                "frame-ancestors 'none'"
            ),
            "Referrer-Policy": "no-referrer"
        },
        "body": html,
        "isBase64Encoded": False
    }


def get_tracking_token(event):
    """
    Read the tracking token from API Gateway path parameters
    or from a direct Lambda test event.
    """
    path_parameters = event.get("pathParameters") or {}

    return (
        path_parameters.get("trackingToken")
        or event.get("trackingToken")
    )


def build_invalid_link_page():
    """Build the invalid-token HTML page."""
    return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >
    <title>Invalid Security Awareness Link</title>

    <style>
        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 24px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f4f4f4;
            color: #333333;
            font-family: Arial, Helvetica, sans-serif;
        }

        .container {
            width: 100%;
            max-width: 600px;
            padding: 32px;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
        }

        h1 {
            margin: 0 0 16px;
            color: #e60000;
            font-size: 28px;
            line-height: 36px;
        }

        p {
            margin: 0;
            color: #555555;
            font-size: 15px;
            line-height: 24px;
        }
    </style>
</head>

<body>
    <main class="container">
        <h1>Invalid Link</h1>

        <p>
            This security-awareness link is invalid or unavailable.
        </p>
    </main>
</body>
</html>
"""


def build_success_page(campaign_id, training_url=None):
    """
    Build the successful click-tracking page. With `training_url` (the
    app's My Training page) its button links there.

    This is deliberately a normal string rather than an f-string.
    A placeholder is replaced afterward so CSS braces remain unchanged.
    """
    html = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>Security Awareness Training</title>

    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background-color: #0d5db8;
            background-image: linear-gradient(
                180deg,
                #0f64c6 0%,
                #0a4f9e 100%
            );
            color: #ffffff;
            font-family: "Segoe UI", Arial, Helvetica, sans-serif;
            text-align: center;
            -webkit-font-smoothing: antialiased;
        }

        .container {
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        .main-heading {
            margin-bottom: 24px;
            color: #ffffff;
            font-size: 56px;
            font-weight: 700;
            line-height: 1.15;
            letter-spacing: -0.5px;
        }

        .sub-heading {
            margin-bottom: 8px;
            color: #ffffff;
            font-size: 32px;
            font-weight: 600;
            line-height: 1.3;
        }

        .simulation-tag {
            margin-bottom: 22px;
            color: #e3effd;
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .description-text {
            max-width: 820px;
            margin: 0 auto 14px;
            color: #e1edfc;
            font-size: 15px;
            line-height: 1.6;
        }

        .instructions-text {
            margin-bottom: 32px;
            color: #ffffff;
            font-size: 15px;
            font-weight: 500;
            line-height: 1.5;
        }

        .training-button {
            display: inline-block;
            padding: 13px 34px;
            background-color: #ffffff;
            border: 2px solid #ffffff;
            border-radius: 6px;
            color: #0d5db8;
            font-family: inherit;
            font-size: 16px;
            font-weight: 600;
            line-height: 22px;
            text-decoration: none;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
        }

        .training-button:hover {
            background-color: #f0f6ff;
            color: #09478f;
        }

        .campaign-meta {
            margin-top: 48px;
            color: rgba(255, 255, 255, 0.7);
            font-family: Consolas, Monaco, monospace;
            font-size: 12px;
            line-height: 18px;
        }

        .privacy-note {
            max-width: 700px;
            margin: 24px auto 0;
            color: #dbeafd;
            font-size: 12px;
            line-height: 19px;
        }

        @media only screen and (max-width: 768px) {
            body {
                padding: 18px;
            }

            .container {
                padding: 28px 10px;
            }

            .main-heading {
                font-size: 38px;
            }

            .sub-heading {
                font-size: 24px;
            }

            .description-text,
            .instructions-text {
                font-size: 14px;
            }

            .training-button {
                width: 100%;
                max-width: 320px;
                padding: 14px 20px;
            }
        }
    </style>
</head>

<body>
    <main class="container">
        <h1 class="main-heading">
            Security Awareness<br>
            Simulation
        </h1>

        <h2 class="sub-heading">
            This was a controlled test
        </h2>

        <p class="simulation-tag">
            Security awareness simulation
        </p>

        <p class="description-text">
            This interaction was part of an authorized security-awareness
            proof of concept. The purpose is to help users recognize
            suspicious email characteristics and use approved reporting
            procedures.
        </p>

        <p class="instructions-text">
            Review the available security-awareness guidance to learn how
            to identify and report suspicious messages.
        </p>

        <div>
            __TRAINING__
        </div>

        <p class="privacy-note">
            This page does not request or collect passwords,
            authentication codes, payment details, or other authentication
            secrets.
        </p>

        <p class="campaign-meta">
            Campaign reference: __CAMPAIGN_ID__
        </p>
    </main>
</body>
</html>
"""

    training = (
        '<a class="training-button" target="_top" href="'
        + html_escape(training_url)
        + '">Start your security training</a>'
        if training_url
        else '<span class="training-button">Your security training has been assigned</span>'
    )
    return html.replace(
        "__CAMPAIGN_ID__",
        html_escape(campaign_id)
    ).replace("__TRAINING__", training)


# The landing page editor's dynamic fields, both spellings it has used
# ("@UserName" chips and "{{userName}}" codes). Fields the click cannot know
# are blanked so no raw placeholder ever reaches the page.
LANDING_PLACEHOLDERS = (
    (("@UserEmailID", "{{email}}", "{{userEmail}}"), "recipientEmail"),
    (("@UserDepartment", "{{department}}"), "department"),
    (("@UserCountry", "{{country}}"), "country"),
    (("@UserName", "@userName", "{{userName}}", "{{USER_NAME}}", "{{UserName}}"), "recipientName"),
    (("@ManagerName", "{{managerName}}"), None),
    (("@EmployeeID", "{{employeeId}}"), None),
)
LANDING_DATE_PLACEHOLDERS = ("@CurrentDate", "{{currentDate}}")


def personalize_landing(content, recipient):
    """Fill the landing page's dynamic fields from the clicked recipient,
    HTML-escaped so a name can never become markup."""
    recipient = recipient or {}
    for placeholders, field in LANDING_PLACEHOLDERS:
        value = html.escape(str(recipient.get(field) or "")) if field else ""
        for placeholder in placeholders:
            content = content.replace(placeholder, value)
    today = datetime.now(UTC).strftime("%d %b %Y")
    for placeholder in LANDING_DATE_PLACEHOLDERS:
        content = content.replace(placeholder, today)
    return content


def read_campaign(campaign_id):
    """The clicked campaign's row, or None when it cannot be read."""
    try:
        return campaigns_table.get_item(Key={"campaignId": campaign_id}).get("Item") or {}
    except ClientError as error:
        print(json.dumps({
            "message": "Campaign unavailable; showing the standard page",
            "campaignId": campaign_id,
            "errorCode": error.response.get("Error", {}).get("Code", ""),
        }))
        return None


_ORIGIN = re.compile(r"^https?://[A-Za-z0-9.-]+(?::\d{1,5})?$")


def training_url(campaign):
    """The app's My Training page: APP_BASE_URL, else the origin the campaign
    was saved from. None when neither is a plain http(s) origin."""
    for base in (APP_BASE_URL, (campaign or {}).get("appBaseUrl")):
        base = str(base or "").strip().rstrip("/")
        if _ORIGIN.match(base):
            return base + MY_TRAINING_PATH
    return None


MY_TRAINING_PATH = "/my-training"
# The landing page editor links its training button to /my-training (or a
# bare "#training"), which on the API's own domain would be a dead link.
_TRAINING_HREF = re.compile(
    r"""href\s*=\s*(["'])\s*(?:/my-training|#training|\{\{\s*trainingLink\s*\}\})\s*\1""",
    re.IGNORECASE,
)


def link_training(content, url):
    """Point the page's training links at the app's My Training page."""
    if not url:
        return content
    return _TRAINING_HREF.sub(lambda m: 'href="' + html_escape(url) + '"', content)


def landing_html(campaign_id, recipient=None, campaign=None):
    """
    The landing page chosen for the campaign: its own edited copy
    (landingPageContent) when it has one, else the catalogue page it names
    (landingPageId). None when there is none, or it cannot be read; the
    caller then shows the standard awareness page.
    """
    if campaign is None:
        campaign = read_campaign(campaign_id)
    if campaign is None:
        return None
    try:
        content = campaign.get("landingPageContent")
        if not (isinstance(content, str) and content.strip()):
            page_id = campaign.get("landingPageId")
            if not page_id:
                return None
            page = landing_pages_table.get_item(Key={"LandingPageID": str(page_id)}).get("Item") or {}
            content = page.get("LandingPageContent")
    except ClientError as error:
        print(json.dumps({
            "message": "Landing page unavailable; showing the standard page",
            "campaignId": campaign_id,
            "errorCode": error.response.get("Error", {}).get("Code", ""),
        }))
        return None
    if not (isinstance(content, str) and content.strip()):
        return None
    if len(content.encode("utf-8")) > MAX_LANDING_BYTES:
        print(json.dumps({
            "message": "Landing page too large; showing the standard page",
            "campaignId": campaign_id,
            "bytes": len(content.encode("utf-8")),
        }))
        return None
    content = link_training(personalize_landing(content, recipient), training_url(campaign))
    return build_landing_page(content)


def oops_page(campaign_id, recipient, campaign):
    """The campaign's landing page, else the standard awareness page."""
    page = landing_html(campaign_id, recipient, campaign) if campaign is not None else None
    return page or build_success_page(campaign_id, training_url(campaign))


# --- the browser page (stage 2) ---------------------------------------------
#
# A scenario can carry a second page, `browserPageHtml`: a fake sign-in or
# code screen. An email link to it (the phishing link with ?next=browser)
# records the click and shows that page instead of the landing page. Any
# button or link on it, or Enter in a field, posts the page's one form back to
# POST /track/{token}/compromise, which marks the person compromised and
# shows the landing page. Nothing typed is ever sent: the fields lose their
# names (an unnamed field is never part of a form's submission), the page can
# run no script, and the compromise handler never reads the request body.

BROWSER_NEXT = "browser"
_SCRIPT_BLOCK = re.compile(r"<script\b[^>]*>.*?</script\s*>", re.IGNORECASE | re.DOTALL)
_FORM_TAG = re.compile(r"</?form\b[^>]*>", re.IGNORECASE)
# A form control is read attribute by attribute (a quoted value is one unit),
# so `<input type="text"/name="x">` or a tab or newline before `name` cannot
# slip past, and a value that merely contains "/name=" is left alone.
_CONTROL_TAG = re.compile(r"<(input|select|textarea|button)\b([^>]*)>", re.IGNORECASE)
_ANY_ATTR = re.compile(r"""([^\s"'<>/=]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>`=]+))?""")
_UNSENDABLE_ATTRS = frozenset({"name", "form", "formaction", "formmethod", "formenctype", "formtarget"})


def _strip_unsendable(match):
    kept = [
        a.group(0)
        for a in _ANY_ATTR.finditer(match.group(2))
        if a.group(1).lower() not in _UNSENDABLE_ATTRS
    ]
    return "<" + match.group(1) + ("".join(" " + k for k in kept)) + ">"


_EDITABLE_ATTR = re.compile(r"""\s+contenteditable\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)""", re.IGNORECASE)
_EVENT_ATTR = re.compile(r"""\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)""", re.IGNORECASE)
_ANCHOR = re.compile(r"<a\b([^>]*)>(.*?)</a\s*>", re.IGNORECASE | re.DOTALL)
_ATTR = re.compile(r"""([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("[^"]*"|'[^']*')""")
_BUTTON_RESET = (
    "border:none;background:none;padding:0;margin:0;font:inherit;color:inherit;"
    "text-align:inherit;cursor:pointer;"
)


def _anchor_to_submit(match):
    """A link on the browser page becomes a submit button with its look."""
    attrs = {k.lower(): v[1:-1] for k, v in _ATTR.findall(match.group(1))}
    own = attrs.get("style", "")
    # A block link fills its row; a button only does when told to.
    block = "display:block" in own.replace(" ", "").lower()
    style = _BUTTON_RESET + ("width:100%;" if block else "") + own
    keep = "".join(
        f' {k}="{html_escape(html.unescape(attrs[k]))}"'
        for k in ("class", "id", "title", "data-action")
        if k in attrs
    )
    return f'<button type="submit"{keep} style="{html_escape(html.unescape(style))}">{match.group(2)}</button>'


def browser_page_content(content):
    """The authored page with every way to send data taken out, and every
    link turned into a button that submits the (empty) form."""
    content = _SCRIPT_BLOCK.sub("", content)
    content = _FORM_TAG.sub("", content)
    content = _EVENT_ATTR.sub("", content)
    # The editor's own marks: nothing on the served page is editable or draggable.
    content = _EDITABLE_ATTR.sub("", content)
    content = re.sub(r"cursor\s*:\s*move", "cursor:default", content, flags=re.IGNORECASE)
    content = _CONTROL_TAG.sub(_strip_unsendable, content)
    return _ANCHOR.sub(_anchor_to_submit, content)


def browser_html(campaign, recipient, tracking_token):
    """The campaign's browser page as a whole document, or None when it has none."""
    content = (campaign or {}).get("browserPageHtml")
    if not (isinstance(content, str) and content.strip()):
        return None
    if len(content.encode("utf-8")) > MAX_LANDING_BYTES:
        print(json.dumps({
            "message": "Browser page too large; showing the landing page",
            "campaignId": (campaign or {}).get("campaignId", ""),
            "bytes": len(content.encode("utf-8")),
        }))
        return None
    content = browser_page_content(personalize_landing(content, recipient))
    # Relative to /track/{token}, so it holds whatever stage or domain serves it.
    action = quote(str(tracking_token), safe="") + "/compromise"
    title = html_escape(str((campaign or {}).get("browserPageTitle") or "Sign in"))
    return (
        "<!DOCTYPE html>\n"
        '<html lang="en"><head><meta charset="UTF-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
        '<meta name="robots" content="noindex, nofollow">'
        f"<title>{title}</title>"
        "<style>html,body{margin:0;padding:0;}"
        "body{min-height:100vh;font-family:'Segoe UI',Arial,sans-serif;background:#f3f4f6;}"
        "form{margin:0;min-height:100vh;}</style>"
        "</head><body>"
        f'<form method="post" action="{html_escape(action)}" autocomplete="off" novalidate>'
        + content
        + "</form></body></html>"
    )


def build_landing_page(content):
    """A whole page around a landing page's HTML fragment."""
    return (
        "<!DOCTYPE html>\n"
        '<html lang="en"><head><meta charset="UTF-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
        '<meta name="robots" content="noindex, nofollow">'
        "<title>Security Awareness</title>"
        "<style>html,body{margin:0;padding:0;}"
        "body{min-height:100vh;display:flex;flex-direction:column;}"
        "body>*{flex:1 0 auto;}</style>"
        "</head><body>"
        + content
        + "</body></html>"
    )


def assign_training(campaign_id, recipient, clicked_at):
    """
    Give the person who clicked the campaign's training path (source
    ASSIGNED), once: not if they already have that path and haven't passed
    it. Best effort: a failure is logged and the click still counts.
    Returns the assignment id, or None.
    """
    email = str(recipient.get("recipientEmail") or recipient.get("email") or "").strip().lower()
    if not email or recipient.get("trainingAssignmentId"):
        return None
    try:
        campaign = campaigns_table.get_item(Key={"campaignId": campaign_id}).get("Item") or {}
        path_id = campaign.get("trainingId")
        if not path_id or campaign.get("isTestCampaign") is True:
            return None
        mine = assignments_table.query(KeyConditionExpression=Key("owner").eq(email)).get("Items", [])
        if any(a.get("TrainingPathID") == path_id and not a.get("quizPassed") for a in mine):
            return None
        people = users_table.query(
            IndexName="email-index", KeyConditionExpression=Key("UserEMailID").eq(email), Limit=1
        ).get("Items", [])
        person = people[0] if people else {}
        due = datetime.fromisoformat(clicked_at.replace("Z", "+00:00")).timestamp() + TRAINING_DUE_DAYS * 86400
        assignment_id = f"A#{clicked_at}#{path_id}"
        assignments_table.put_item(
            Item={
                "owner": email,
                "assignmentId": assignment_id,
                "TrainingPathID": path_id,
                "source": "ASSIGNED",
                "campaignId": campaign_id,
                "recipientId": recipient["recipientId"],
                "department": person.get("Department", ""),
                "country": person.get("Country", ""),
                "assignedAt": clicked_at,
                "dueAt": datetime.fromtimestamp(due, UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "status": "ASSIGNED",
                "videosWatched": [],
                "attemptCount": 0,
            },
            ConditionExpression="attribute_not_exists(assignmentId)",
        )
        recipients_table.update_item(
            Key={"campaignId": campaign_id, "recipientId": recipient["recipientId"]},
            UpdateExpression="SET trainingAssignmentId = :a",
            ExpressionAttributeValues={":a": assignment_id},
        )
        return assignment_id
    except ClientError as error:
        print(json.dumps({
            "message": "Training not assigned; the click is recorded",
            "campaignId": campaign_id,
            "errorCode": error.response.get("Error", {}).get("Code", ""),
        }))
        return None


def is_compromise(event):
    """POST /track/{trackingToken}/compromise: the browser page was submitted."""
    route = str(event.get("routeKey") or "")
    method = ((event.get("requestContext") or {}).get("http") or {}).get("method", "")
    return route.endswith("/compromise") or (method == "POST" and str(event.get("rawPath", "")).endswith("/compromise"))


def wants_browser_page(event):
    """The email link asked for the browser page (?next=browser)."""
    query = event.get("queryStringParameters") or {}
    return str(query.get("next") or "").strip().lower() == BROWSER_NEXT


def record_click(campaign_id, recipient_id, tracking_token, event_timestamp, stage, context):
    """One CLICK event and the recipient's click summary."""
    event_id = f"EVT-{uuid.uuid4().hex}"
    events_table.put_item(
        Item={
            "campaignId": campaign_id,
            "eventId": event_id,
            "recipientId": recipient_id,
            "eventType": "CLICK",
            "eventTimestamp": event_timestamp,
            "eventSource": "EMAIL_TRACKING_LINK",
            "stage": stage,
            "trackingToken": tracking_token
        }
    )
    recipients_table.update_item(
        Key={
            "campaignId": campaign_id,
            "recipientId": recipient_id
        },
        UpdateExpression=(
            "SET clickedAt = "
            "if_not_exists(clickedAt, :clickedAt), "
            "lastClickedAt = :clickedAt, "
            "updatedAt = :clickedAt "
            "ADD clickCount :increment"
        ),
        ExpressionAttributeValues={
            ":clickedAt": event_timestamp,
            ":increment": 1
        }
    )
    print(json.dumps({
        "message": "Click event recorded",
        "campaignId": campaign_id,
        "recipientId": recipient_id,
        "eventId": event_id,
        "stage": stage,
        "requestId": context.aws_request_id
    }))


def record_compromise(campaign_id, recipient_id, tracking_token, event_timestamp, context):
    """
    One COMPROMISE event and the recipient's compromise summary. Only that
    the browser page was submitted is stored: never anything typed into it.
    A compromise is also a click, so clickedAt is set if it is missing.
    """
    event_id = f"EVT-{uuid.uuid4().hex}"
    events_table.put_item(
        Item={
            "campaignId": campaign_id,
            "eventId": event_id,
            "recipientId": recipient_id,
            "eventType": "COMPROMISE",
            "eventTimestamp": event_timestamp,
            "eventSource": "BROWSER_PAGE",
            "trackingToken": tracking_token
        }
    )
    recipients_table.update_item(
        Key={
            "campaignId": campaign_id,
            "recipientId": recipient_id
        },
        UpdateExpression=(
            "SET compromisedAt = if_not_exists(compromisedAt, :at), "
            "clickedAt = if_not_exists(clickedAt, :at), "
            "lastCompromisedAt = :at, "
            "updatedAt = :at "
            "ADD compromiseCount :increment"
        ),
        ExpressionAttributeValues={
            ":at": event_timestamp,
            ":increment": 1
        }
    )
    print(json.dumps({
        "message": "Compromise event recorded",
        "campaignId": campaign_id,
        "recipientId": recipient_id,
        "eventId": event_id,
        "requestId": context.aws_request_id
    }))


def lambda_handler(event, context):
    """
    GET  /track/{token}                record a click, show the landing page
    GET  /track/{token}?next=browser   record a click, show the browser page
    POST /track/{token}/compromise     record a compromise, show the landing page
    """
    tracking_token = get_tracking_token(event)

    if not tracking_token:
        return json_response(
            400,
            {
                "message": "trackingToken is required"
            }
        )

    try:
        recipient_response = recipients_table.query(
            IndexName=TRACKING_TOKEN_INDEX,
            KeyConditionExpression=(
                Key("trackingToken").eq(tracking_token)
            ),
            Limit=1
        )

        recipients = recipient_response.get(
            "Items",
            []
        )

        if not recipients:
            return html_response(
                404,
                build_invalid_link_page()
            )

        recipient = recipients[0]

        campaign_id = recipient["campaignId"]
        recipient_id = recipient["recipientId"]
        event_timestamp = utc_timestamp()

        if is_compromise(event):
            # The request body (whatever the form carried) is never read.
            record_compromise(campaign_id, recipient_id, tracking_token, event_timestamp, context)
            assign_training(campaign_id, recipient, event_timestamp)
            return html_response(200, oops_page(campaign_id, recipient, read_campaign(campaign_id)))

        browser = wants_browser_page(event)
        record_click(
            campaign_id, recipient_id, tracking_token, event_timestamp,
            "BROWSER_PAGE" if browser else "LANDING_PAGE", context,
        )

        assign_training(campaign_id, recipient, event_timestamp)

        # The click is recorded; now the browser page when the link asked for
        # it, else the page the campaign chose for people who click, or the
        # standard awareness page.
        campaign = read_campaign(campaign_id)
        if browser:
            page = browser_html(campaign, recipient, tracking_token)
            if page:
                return html_response(200, page, form_action="'self'")
        return html_response(200, oops_page(campaign_id, recipient, campaign))

    except ClientError as error:
        error_details = error.response.get(
            "Error",
            {}
        )

        error_code = error_details.get(
            "Code",
            "AWSClientError"
        )

        error_message = error_details.get(
            "Message",
            "AWS service operation failed"
        )

        print(
            json.dumps(
                {
                    "message": "Tracking operation failed",
                    "errorCode": error_code,
                    "errorDetail": error_message,
                    "requestId": context.aws_request_id
                }
            )
        )

        return json_response(
            500,
            {
                "message": "Unable to record tracking event",
                "errorCode": error_code,
                "requestId": context.aws_request_id
            }
        )

    except Exception as error:
        print(
            json.dumps(
                {
                    "message": "Unexpected tracking error",
                    "errorType": type(error).__name__,
                    "errorDetail": str(error)[:300],
                    "requestId": context.aws_request_id
                }
            )
        )

        return json_response(
            500,
            {
                "message": "An unexpected error occurred",
                "errorType": type(error).__name__,
                "requestId": context.aws_request_id
            }
        )
