"""announcement-sender: emails an approved roll-out (moto's in-memory DynamoDB
and SES; nothing leaves the process)."""
import importlib.util
import os
from pathlib import Path
from types import SimpleNamespace

import boto3
import pytest
from moto import mock_aws

BACKEND = Path(__file__).resolve().parents[1]
REGION = "ap-south-1"
SENDER = "security@x.example"


class Ctx(SimpleNamespace):
    def get_remaining_time_in_millis(self):
        return self.left


def ctx(left=10**9):
    return Ctx(aws_request_id="test", function_name="t-announcement-sender", left=left)


@pytest.fixture(scope="module")
def mod():
    for k, v in {"ANNOUNCEMENTS_TABLE": "t-announcements", "RECIPIENTS_TABLE": "t-recipients",
                 "USER_LIST_MEMBERS_TABLE": "t-user-list-members", "AWS_DEFAULT_REGION": REGION}.items():
        os.environ.setdefault(k, v)
    spec = importlib.util.spec_from_file_location("announcement_sender", BACKEND / "announcement-sender" / "lambda_function.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def aws(mod, monkeypatch):
    for name in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
        monkeypatch.setenv(name, "testing")
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    with mock_aws():
        db = boto3.resource("dynamodb", region_name=REGION)
        ann = db.create_table(TableName="t-announcements", BillingMode="PAY_PER_REQUEST",
                              KeySchema=[{"AttributeName": "announcementId", "KeyType": "HASH"}],
                              AttributeDefinitions=[{"AttributeName": "announcementId", "AttributeType": "S"}])
        rec = db.create_table(TableName="t-recipients", BillingMode="PAY_PER_REQUEST",
                              KeySchema=[{"AttributeName": "campaignId", "KeyType": "HASH"},
                                         {"AttributeName": "recipientId", "KeyType": "RANGE"}],
                              AttributeDefinitions=[{"AttributeName": "campaignId", "AttributeType": "S"},
                                                    {"AttributeName": "recipientId", "AttributeType": "S"}])
        mem = db.create_table(TableName="t-user-list-members", BillingMode="PAY_PER_REQUEST",
                              KeySchema=[{"AttributeName": "userListId", "KeyType": "HASH"},
                                         {"AttributeName": "email", "KeyType": "RANGE"}],
                              AttributeDefinitions=[{"AttributeName": "userListId", "AttributeType": "S"},
                                                    {"AttributeName": "email", "AttributeType": "S"}])
        ses = boto3.client("ses", region_name=REGION)
        ses.verify_email_identity(EmailAddress=SENDER)
        monkeypatch.setattr(mod, "announcements_table", ann)
        monkeypatch.setattr(mod, "recipients_table", rec)
        monkeypatch.setattr(mod, "members_table", mem)
        monkeypatch.setattr(mod, "ses_client", ses)
        monkeypatch.setattr(mod, "SENDING_ENABLED", True)
        monkeypatch.setattr(mod, "ALLOWED_DOMAINS", frozenset({"x.example"}))
        monkeypatch.setattr(mod, "FALLBACK_SENDER", "")
        monkeypatch.setattr(mod, "TEST_RECIPIENT", "")
        monkeypatch.setattr(mod, "MAX_PER_SECOND", 10_000.0)
        for email, name in (("ana@x.example", "Ana"), ("ben@x.example", "Ben"), ("cy@elsewhere.example", "Cy")):
            mem.put_item(Item={"userListId": "UL-1", "email": email, "userName": name})
        yield SimpleNamespace(ann=ann, rec=rec, mem=mem, ses=ses)


def rollout(aws, **extra):
    item = {"announcementId": "ANR-001", "kind": "ROLLOUT", "status": "APPROVED", "selectedListId": "UL-1",
            "announcementSenderEmailId": SENDER, "announcementSenderName": "Security Team",
            "announcementEmailSubject": "Hi {{USER_NAME}}", "announcementEmailBody": "<p>Hello {{USER_NAME}}</p>",
            "expiresAt": 2_000_000_000, **extra}
    aws.ann.put_item(Item=item)
    return item


def rows(aws, rid="ANR-001"):
    return aws.rec.query(KeyConditionExpression=boto3.dynamodb.conditions.Key("campaignId").eq(rid))["Items"]


def status(aws, rid="ANR-001"):
    return aws.ann.get_item(Key={"announcementId": rid})["Item"]


def test_nothing_is_sent_while_sending_is_off(mod, aws, monkeypatch):
    monkeypatch.setattr(mod, "SENDING_ENABLED", False)
    rollout(aws)
    assert mod.lambda_handler({"announcementId": "ANR-001"}, ctx())["skipped"] == "sending is off"
    assert status(aws)["status"] == "APPROVED" and rows(aws) == []


def test_a_list_is_sent_once_each_and_only_inside_the_allowed_domains(mod, aws):
    rollout(aws)
    out = mod.lambda_handler({"announcementId": "ANR-001"}, ctx())
    assert out == {"announcementId": "ANR-001", "sent": 2, "failed": 1}
    by = {r["recipientEmail"]: r for r in rows(aws)}
    assert by["ana@x.example"]["sendStatus"] == "SENT" and by["ana@x.example"]["sesMessageId"]
    assert by["cy@elsewhere.example"]["sendStatus"] == "FAILED"
    assert by["cy@elsewhere.example"]["failureReason"] == "NotAllowedDomain"
    for r in by.values():  # a token each, the roll-out's retention, marked as an announcement's
        assert len(r["trackingToken"]) > 30 and r["tokenFingerprint"] and r["kind"] == "ANNOUNCEMENT"
        assert r["expiresAt"] == 2_000_000_000
    done = status(aws)
    assert done["status"] == "SENT" and done["sentCount"] == 2 and done["failedCount"] == 1
    # invoked again (an overlapping scheduler run): nothing more goes out
    assert mod.lambda_handler({"announcementId": "ANR-001"}, ctx())["skipped"] == "not approved"
    assert len(rows(aws)) == 3


def test_the_name_is_filled_in_and_there_is_a_text_part(mod, aws):
    assert mod.render("Hello {{USER_NAME}}", "Ana") == "Hello Ana"
    assert mod.plain_text("<p>Hello <b>Ana</b></p><p>Bye &amp; thanks</p>") == "Hello Ana\nBye & thanks"


def test_a_name_from_a_list_cannot_become_markup_in_the_email(mod, aws):
    evil = 'Bob <a href="https://evil.example/login">Click to re-verify</a>'
    assert mod.render("<p>Hi {{USER_NAME}}</p>", evil, html=True) == (
        "<p>Hi Bob &lt;a href=&quot;https://evil.example/login&quot;&gt;Click to re-verify&lt;/a&gt;</p>"
    )
    # the subject is plain text, and the text part reads the name back as typed
    assert mod.render("Hi {{USER_NAME}}", evil) == f"Hi {evil}"
    assert mod.plain_text(mod.render("<p>Hi {{USER_NAME}}</p>", evil, html=True)) == f"Hi {evil}"


def test_the_sent_email_carries_the_escaped_name(mod, aws, monkeypatch):
    evil = 'Eve <img src="https://evil.example/x.png">'
    aws.mem.put_item(Item={"userListId": "UL-2", "email": "eve@x.example", "userName": evil})
    rollout(aws, selectedListId="UL-2")
    sent = []
    real = aws.ses.send_email
    monkeypatch.setattr(aws.ses, "send_email", lambda **kw: (sent.append(kw), real(**kw))[1], raising=False)
    assert mod.lambda_handler({"announcementId": "ANR-001"}, ctx())["sent"] == 1
    html = sent[0]["Message"]["Body"]["Html"]["Data"]
    assert "<img" not in html and "&lt;img" in html and "evil.example/x.png" in html
    assert evil in sent[0]["Message"]["Body"]["Text"]["Data"]


def test_a_test_announcement_never_goes_to_its_list(mod, aws, monkeypatch):
    monkeypatch.setattr(mod, "TEST_RECIPIENT", "tester@x.example")
    rollout(aws, isAnnouncementTestCampaign=True)
    mod.lambda_handler({"announcementId": "ANR-001"}, ctx())
    assert [r["recipientEmail"] for r in rows(aws)] == ["tester@x.example"]
    rollout(aws, announcementId="ANR-002", isAnnouncementTestCampaign="true", selectedSingleUserEmail="ben@x.example")
    mod.lambda_handler({"announcementId": "ANR-002"}, ctx())
    assert [r["recipientEmail"] for r in rows(aws, "ANR-002")] == ["ben@x.example"]


def test_it_fails_unsent_with_no_verified_sender_or_no_one_to_send_to(mod, aws):
    rollout(aws, announcementSenderEmailId="unverified@x.example")
    out = mod.lambda_handler({"announcementId": "ANR-001"}, ctx())
    assert "No sender" in out["failed"] and status(aws)["status"] == "FAILED" and rows(aws) == []
    rollout(aws, announcementId="ANR-002", selectedListId="UL-EMPTY")
    out = mod.lambda_handler({"announcementId": "ANR-002"}, ctx())
    assert out["failed"] == "It has no recipients." and status(aws, "ANR-002")["status"] == "FAILED"


def test_the_fallback_sender_is_used_when_the_chosen_one_is_not_verified(mod, aws, monkeypatch):
    monkeypatch.setattr(mod, "FALLBACK_SENDER", SENDER)
    rollout(aws, announcementSenderEmailId="unverified@x.example")
    assert mod.lambda_handler({"announcementId": "ANR-001"}, ctx())["sent"] == 2


def test_ses_refusing_everyone_fails_the_rollout_with_each_reason(mod, aws, monkeypatch):
    from botocore.exceptions import ClientError

    def refuse(**_):
        raise ClientError({"Error": {"Code": "MessageRejected", "Message": "Email address is not verified."}}, "SendEmail")

    monkeypatch.setattr(mod.ses_client, "send_email", refuse)
    rollout(aws)
    assert mod.lambda_handler({"announcementId": "ANR-001"}, ctx()) == {"announcementId": "ANR-001", "sent": 0, "failed": 3}
    assert sorted(r["failureReason"] for r in rows(aws)) == ["MessageRejected", "MessageRejected", "NotAllowedDomain"]
    assert status(aws)["status"] == "FAILED"


def test_a_cancel_while_sending_stops_it(mod, aws, monkeypatch):
    monkeypatch.setattr(mod, "CHECK_EVERY", 1)
    rollout(aws)
    real_send = mod.send_one

    def send_then_cancel(r, person, source):
        result = real_send(r, person, source)
        aws.ann.update_item(Key={"announcementId": "ANR-001"}, UpdateExpression="SET #s = :c",
                            ExpressionAttributeNames={"#s": "status"}, ExpressionAttributeValues={":c": "CANCELLED"})
        return result

    monkeypatch.setattr(mod, "send_one", send_then_cancel)
    out = mod.lambda_handler({"announcementId": "ANR-001"}, ctx())
    assert out["stopped"] is True and out["sent"] == 1 and len(rows(aws)) == 1
    assert status(aws)["status"] == "CANCELLED"  # left as cancelled


def test_a_run_short_of_time_carries_on_in_a_new_one_and_nobody_gets_it_twice(mod, aws, monkeypatch):
    invoked = []
    monkeypatch.setattr(mod, "lambda_client", SimpleNamespace(invoke=lambda **kw: invoked.append(kw)))
    rollout(aws)
    runs = iter([10**9, 1_000])  # the first person, then out of time

    class Short(Ctx):
        def get_remaining_time_in_millis(self):
            return next(runs, 1_000)

    out = mod.lambda_handler({"announcementId": "ANR-001"}, Short(aws_request_id="t", function_name="t-announcement-sender"))
    assert out["continued"] is True and len(rows(aws)) == 1
    assert invoked and invoked[0]["FunctionName"] == "t-announcement-sender" and b'"resume": true' in invoked[0]["Payload"]
    assert status(aws)["status"] == "SENDING"
    out = mod.lambda_handler({"announcementId": "ANR-001", "resume": True}, ctx())
    assert out == {"announcementId": "ANR-001", "sent": 2, "failed": 1}
    emails = [r["recipientEmail"] for r in rows(aws)]
    assert sorted(emails) == sorted(set(emails)) and len(emails) == 3
    assert status(aws)["status"] == "SENT"


def test_no_id_or_not_a_rollout(mod, aws):
    assert mod.lambda_handler({}, ctx()) == {"error": "announcementId is required"}
    aws.ann.put_item(Item={"announcementId": "ANC-001", "kind": "TEMPLATE", "status": "ACTIVE"})
    assert mod.lambda_handler({"announcementId": "ANC-001"}, ctx()) == {"error": "No roll-out with that id"}


def test_each_email_has_its_own_ive_read_this_button(mod, aws, monkeypatch):
    monkeypatch.setattr(mod, "API_BASE_URL", "https://api.x.example")
    sent = []
    real = mod.ses_client.send_email
    monkeypatch.setattr(mod.ses_client, "send_email", lambda **kw: (sent.append(kw), real(**kw))[1])
    rollout(aws, announcementEmailBody="<html><body><p>Hello {{USER_NAME}}</p></body></html>")
    mod.lambda_handler({"announcementId": "ANR-001"}, ctx())
    tokens = {r["recipientEmail"]: r["trackingToken"] for r in rows(aws)}
    for kw in sent:
        email = kw["Destination"]["ToAddresses"][0]
        html = kw["Message"]["Body"]["Html"]["Data"]
        text = kw["Message"]["Body"]["Text"]["Data"]
        url = f"https://api.x.example/ack/{tokens[email]}"
        assert f'href="{url}"' in html and html.index(url) < html.index("</body>")  # inside the body
        assert "read this" in html and text.endswith(f"I've read this: {url}") and text.count("read this") == 1
    assert len(sent) == 2  # the outside-domain address was never sent


def test_no_button_without_an_https_api_address(mod, monkeypatch):
    for base in ("", "http://api.x.example"):
        monkeypatch.setattr(mod, "API_BASE_URL", base)
        assert mod.ack_url("t") == ""
    assert mod.with_ack_button("<p>Hi</p>", "") == "<p>Hi</p>"
    assert mod.with_ack_button("<p>Hi</p>", "https://a/ack/t").startswith("<p>Hi</p><table")
