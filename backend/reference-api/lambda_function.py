"""
reference-api: read access to the reference-data tables (and full CRUD for
sender-identities, which is the first screen wired to the backend).

One HTTP API (v2) Lambda, routed by `routeKey`. Table names are derived from a
single TABLE_PREFIX env var. Responses are JSON with a {data,...}/{error}
envelope; DynamoDB numbers are serialized as JSON numbers. CORS is handled at
the API-Gateway level, so responses carry no Access-Control headers themselves.
"""
import decimal
import json
import os
import re
import uuid
from datetime import UTC, datetime

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

TABLE_PREFIX = os.environ["TABLE_PREFIX"]
UPLOAD_BUCKET = os.environ.get("UPLOAD_BUCKET")
INGEST_FUNCTION = os.environ.get("INGEST_FUNCTION")
dynamodb = boto3.resource("dynamodb")
s3_client = boto3.client("s3")
lambda_client = boto3.client("lambda")


def table(name):
    return dynamodb.Table(f"{TABLE_PREFIX}-{name}")


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)


def respond(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, cls=DecimalEncoder),
    }


def ok(data, **extra):
    return respond(200, {"data": data, **extra})


def err(status, message):
    return respond(status, {"error": {"message": message}})


def scan_all(name):
    """Return every item in a (small) reference table, following pagination."""
    tbl = table(name)
    items, kwargs = [], {}
    while True:
        resp = tbl.scan(**kwargs)
        items.extend(resp.get("Items", []))
        lek = resp.get("LastEvaluatedKey")
        if not lek:
            return items
        kwargs["ExclusiveStartKey"] = lek


def get_one(name, key):
    item = table(name).get_item(Key=key).get("Item")
    return item


def parse_body(event):
    raw = event.get("body")
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    return json.loads(raw)


# DynamoDB's hard limit is 400 KB per item; leave headroom for what we add.
MAX_ITEM_BYTES = 380 * 1024

# Cover images the browser may upload. Anything else is refused before signing,
# so an arbitrary file type can never reach the bucket through a presigned PUT.
COVER_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}


def too_large(item):
    """Return the offending size in bytes if the item exceeds the DynamoDB cap."""
    size = len(json.dumps(item, cls=DecimalEncoder).encode("utf-8"))
    return size if size > MAX_ITEM_BYTES else 0


def size_error(size):
    return err(
        413,
        (
            f"Scenario is too large to save ({size // 1024} KB; limit "
            f"{MAX_ITEM_BYTES // 1024} KB). This usually means images were pasted "
            "into the email or landing page as embedded data. Link to images "
            "instead of embedding them."
        ),
    )


def next_sequence_id(rows, key_attr, prefix):
    """Continue a PREFIX-00N sequence, ignoring rows that don't match the shape."""
    nums = []
    pattern = rf"^{re.escape(prefix)}-(\d+)$"
    for row in rows:
        m = re.match(pattern, str(row.get(key_attr, "")))
        if m:
            nums.append(int(m.group(1)))
    return f"{prefix}-{(max(nums) + 1) if nums else 1:03d}"


def safe_name(name):
    return re.sub(r"[^A-Za-z0-9._-]", "_", str(name))


def cover_image_key(scenario_id, file_name):
    """S3 key for a scenario cover. Both segments are sanitized because the
    scenario id is typed by the user in the wizard, not generated."""
    return f"uploads/scenario-covers/{safe_name(scenario_id)}/{safe_name(file_name)}"


def delete_s3_prefix(bucket, prefix):
    """Remove every object under a prefix (re-uploads leave earlier versions
    behind). Best effort: a failure is logged and swallowed so it can never
    block the DynamoDB delete it accompanies."""
    try:
        paginator = s3_client.get_paginator("list_objects_v2")
        to_delete = [
            {"Key": obj["Key"]}
            for page in paginator.paginate(Bucket=bucket, Prefix=prefix)
            for obj in page.get("Contents", [])
        ]
        for i in range(0, len(to_delete), 1000):
            s3_client.delete_objects(
                Bucket=bucket, Delete={"Objects": to_delete[i : i + 1000]}
            )
    except ClientError as e:
        print(json.dumps({"message": "S3 cleanup failed", "prefix": prefix, "error": str(e)}))


def sign_cover(item):
    """Uploaded covers live in a private bucket, so a bare URL would 403. Swap
    the stored key for a presigned GET. CoverImageID stays a string, so the
    response shape is unchanged and the UI's existing resolver handles it."""
    key = (item or {}).get("CoverImageID", "")
    if not UPLOAD_BUCKET or not str(key).startswith("uploads/"):
        return item
    signed = dict(item)
    signed["CoverImageID"] = s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": UPLOAD_BUCKET, "Key": key},
        ExpiresIn=3600,
    )
    return signed


# routeKey -> table name for simple "list all" GETs
LIST_ROUTES = {
    "GET /sender-identities": "sender-identities",
    "GET /users": "users",
    "GET /scenarios": "scenarios",
    "GET /landing-pages": "landing-pages",
    "GET /user-lists": "user-lists",
    "GET /gamification-rules": "gamification-rules",
    "GET /training/paths": "training-paths",
    "GET /training/videos": "training-videos",
    "GET /training/quizzes": "training-quizzes",
    "GET /training/certificates": "training-certificates",
    "GET /campaigns-catalog": "campaigns-catalog",
}

# routeKey -> (table, key-attribute) for "get by id" GETs
GET_BY_ID = {
    "GET /sender-identities/{id}": ("sender-identities", "id"),
    "GET /users/{id}": ("users", "UserID"),
    "GET /scenarios/{id}": ("scenarios", "scenarioId"),
    "GET /landing-pages/{id}": ("landing-pages", "LandingPageID"),
}


def lambda_handler(event, context):
    route = event.get("routeKey", "")
    params = event.get("pathParameters") or {}

    try:
        if route in LIST_ROUTES:
            name = LIST_ROUTES[route]
            items = scan_all(name)
            if name == "scenarios":
                items = [sign_cover(i) for i in items]
            return ok(items, count=len(items))

        if route in GET_BY_ID:
            name, key_attr = GET_BY_ID[route]
            item = get_one(name, {key_attr: params["id"]})
            if not item:
                return err(404, "Not found")
            return ok(sign_cover(item) if name == "scenarios" else item)

        if route == "GET /user-lists/{id}/members":
            resp = table("user-list-members").query(
                KeyConditionExpression=Key("userListId").eq(params["id"])
            )
            members = resp.get("Items", [])
            return ok(members, count=len(members))

        # --- sender-identities CRUD (first wired screen) ---
        if route == "POST /sender-identities":
            body = parse_body(event)
            if not body.get("email"):
                return err(400, "email is required")
            item = dict(body)
            item.setdefault("id", f"em-{uuid.uuid4().hex[:8]}")
            item.setdefault("status", "Active")
            item.setdefault("usageCount", 0)
            item.setdefault(
                "createdDate", datetime.now(UTC).strftime("%d %b %Y")
            )
            table("sender-identities").put_item(Item=item)
            return respond(201, {"data": item})

        if route == "PUT /sender-identities/{id}":
            body = parse_body(event)
            existing = get_one("sender-identities", {"id": params["id"]})
            if not existing:
                return err(404, "Not found")
            merged = {**existing, **body, "id": params["id"]}
            table("sender-identities").put_item(Item=merged)
            return ok(merged)

        if route == "DELETE /sender-identities/{id}":
            table("sender-identities").delete_item(Key={"id": params["id"]})
            return respond(204, {"data": None})

        # --- landing-pages CRUD (catalogue screen) ---
        if route == "POST /landing-pages":
            body = parse_body(event)
            if not body.get("LandingPageName"):
                return err(400, "LandingPageName is required")
            item = dict(body)
            if not item.get("LandingPageID"):
                # Continue the LP-00N sequence the catalogue already uses.
                item["LandingPageID"] = next_sequence_id(
                    scan_all("landing-pages"), "LandingPageID", "LP"
                )
            item.setdefault(
                "CreatedDate", datetime.now(UTC).strftime("%d/%m/%Y %I:%M %p")
            )
            item.setdefault("LandingPageDescription", "")
            item.setdefault("LandingPageContent", "")
            table("landing-pages").put_item(Item=item)
            return respond(201, {"data": item})

        if route == "PUT /landing-pages/{id}":
            body = parse_body(event)
            existing = get_one("landing-pages", {"LandingPageID": params["id"]})
            if not existing:
                return err(404, "Landing page not found")
            merged = {**existing, **body, "LandingPageID": params["id"]}
            table("landing-pages").put_item(Item=merged)
            return ok(merged)

        if route == "DELETE /landing-pages/{id}":
            table("landing-pages").delete_item(Key={"LandingPageID": params["id"]})
            return respond(204, {"data": None})

        # --- scenarios CRUD (authoring wizard) ---
        if route == "POST /scenarios":
            body = parse_body(event)
            if not body.get("scenarioName"):
                return err(400, "scenarioName is required")
            item = dict(body)
            # The wizard's first step asks the author to type an id, so the
            # SC-00N sequence is only a fallback for when one wasn't supplied.
            item["scenarioId"] = body.get("scenarioId") or next_sequence_id(
                scan_all("scenarios"), "scenarioId", "SC"
            )
            now = datetime.now(UTC)
            item.setdefault("CreatedOn", f"{now.day}-{now.strftime('%b-%y')}")
            for field in (
                "description",
                "emailBody",
                "CoverImageID",
                "landingPageId",
                "trainingId",
            ):
                item.setdefault(field, "")
            oversize = too_large(item)
            if oversize:
                return size_error(oversize)
            try:
                table("scenarios").put_item(
                    Item=item,
                    ConditionExpression="attribute_not_exists(scenarioId)",
                )
            except ClientError as e:
                # Caught here on purpose: the outer handler would flatten this
                # into a generic 500 and the author would never learn the id is
                # taken. Unlike landing-pages, the id is user-typed, so a plain
                # put_item would silently overwrite someone else's scenario.
                if e.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
                    return err(409, f"Scenario {item['scenarioId']} already exists")
                raise
            return respond(201, {"data": item})

        if route == "PUT /scenarios/{id}":
            body = parse_body(event)
            existing = get_one("scenarios", {"scenarioId": params["id"]})
            if not existing:
                return err(404, "Scenario not found")
            merged = {**existing, **body, "scenarioId": params["id"]}
            oversize = too_large(merged)
            if oversize:
                return size_error(oversize)
            table("scenarios").put_item(Item=merged)
            return ok(merged)

        if route == "DELETE /scenarios/{id}":
            table("scenarios").delete_item(Key={"scenarioId": params["id"]})
            if UPLOAD_BUCKET:
                delete_s3_prefix(
                    UPLOAD_BUCKET,
                    f"uploads/scenario-covers/{safe_name(params['id'])}/",
                )
            return respond(204, {"data": None})

        # Presign a cover upload. No DynamoDB row is written here -- the POST or
        # PUT that follows persists the returned key on the scenario itself.
        if route == "POST /scenarios/cover-upload":
            if not UPLOAD_BUCKET:
                return err(500, "Upload bucket is not configured")
            body = parse_body(event)
            if not body.get("scenarioId"):
                return err(400, "scenarioId is required")
            if not body.get("fileName"):
                return err(400, "fileName is required")
            content_type = body.get("contentType") or "image/png"
            if content_type not in COVER_CONTENT_TYPES:
                return err(400, f"Unsupported cover image type: {content_type}")
            key = cover_image_key(body["scenarioId"], body["fileName"])
            upload_url = s3_client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": UPLOAD_BUCKET,
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=900,
            )
            return respond(
                201, {"data": {"coverImageKey": key, "uploadUrl": upload_url}}
            )

        # --- recipient list bulk upload: create pending list + presigned S3 PUT ---
        if route == "POST /user-lists/bulk-upload":
            if not UPLOAD_BUCKET:
                return err(500, "Upload bucket is not configured")
            body = parse_body(event)
            if not body.get("name"):
                return err(400, "name is required")
            # Reusing an existing listId lets "edit + re-upload" replace a list
            # in place instead of creating a duplicate.
            list_id = body.get("listId") or f"ul-{uuid.uuid4().hex[:8]}"
            raw_name = body.get("fileName") or "recipients.csv"
            s3_key = f"uploads/recipients/{list_id}/{safe_name(raw_name)}"
            now = datetime.now(UTC).isoformat()

            table("user-lists").put_item(
                Item={
                    "userListId": list_id,
                    "id": list_id,
                    "name": body["name"],
                    "description": body.get("description", ""),
                    "type": "Bulk Upload",
                    "listType": "SAVED",
                    "status": "UPLOADING",
                    "s3Key": s3_key,
                    "s3Bucket": UPLOAD_BUCKET,
                    "totalUsers": 0,
                    "createdDate": now,
                }
            )
            upload_url = s3_client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": UPLOAD_BUCKET,
                    "Key": s3_key,
                    "ContentType": "text/csv",
                },
                ExpiresIn=900,
            )
            return respond(
                201,
                {"data": {"listId": list_id, "s3Key": s3_key, "uploadUrl": upload_url}},
            )

        # --- trigger ingest after the browser has PUT the file to S3 ---
        if route == "POST /user-lists/{id}/ingest":
            if not INGEST_FUNCTION:
                return err(500, "Ingest function is not configured")
            lst = get_one("user-lists", {"userListId": params["id"]})
            if not lst:
                return err(404, "List not found")
            key, bucket = lst.get("s3Key"), lst.get("s3Bucket")
            if not key or not bucket:
                return err(400, "List has no uploaded file yet")
            payload = {"Records": [{"s3": {"bucket": {"name": bucket}, "object": {"key": key}}}]}
            lambda_client.invoke(
                FunctionName=INGEST_FUNCTION,
                InvocationType="RequestResponse",
                Payload=json.dumps(payload).encode("utf-8"),
            )
            updated = get_one("user-lists", {"userListId": params["id"]})
            return ok(updated)

        if route == "PUT /user-lists/{id}":
            body = parse_body(event)
            existing = get_one("user-lists", {"userListId": params["id"]})
            if not existing:
                return err(404, "List not found")
            merged = {**existing, **body, "userListId": params["id"]}
            table("user-lists").put_item(Item=merged)
            return ok(merged)

        if route == "DELETE /user-lists/{id}":
            list_id = params["id"]
            existing = get_one("user-lists", {"userListId": list_id})
            # Remove the cached member rows.
            members_tbl = table("user-list-members")
            resp = members_tbl.query(
                KeyConditionExpression=Key("userListId").eq(list_id)
            )
            with members_tbl.batch_writer() as batch:
                for m in resp.get("Items", []):
                    batch.delete_item(Key={"userListId": list_id, "email": m["email"]})
            # Remove EVERY uploaded file for this list (re-uploads leave earlier
            # versions behind), so no recipient PII is orphaned in S3.
            bucket = (existing or {}).get("s3Bucket") or UPLOAD_BUCKET
            if bucket:
                delete_s3_prefix(bucket, f"uploads/recipients/{list_id}/")
            table("user-lists").delete_item(Key={"userListId": list_id})
            return respond(204, {"data": None})

        return err(404, f"No handler for route: {route}")

    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "AWSClientError")
        print(
            json.dumps(
                {
                    "message": "AWS error",
                    "code": code,
                    "route": route,
                    "operation": e.operation_name,
                    "detail": e.response.get("Error", {}).get("Message", "")[:400],
                }
            )
        )
        return err(500, "A backend error occurred")
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"message": "Unhandled error", "type": type(e).__name__, "route": route}))
        return err(500, "An unexpected error occurred")
