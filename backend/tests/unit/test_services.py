import uuid

import pytest
from fastapi import HTTPException

import services.database_service as db_service
from services.ai_service import GeminiEmptyResponseError, GeminiUnavailableError
from services.auth_service import TOKENS, get_current_user_id


class FakeCursor:
    def __init__(self, rows=()):
        self.rows = list(rows)
        self.executed = []

    def execute(self, query, params=None):
        self.executed.append((query, params))

    def fetchone(self):
        return self.rows.pop(0) if self.rows else None


USER_ID = str(uuid.uuid4())
CLAIM_ID = uuid.uuid4()
INVESTIGATION_ID = uuid.uuid4()


# --- auth_service -----------------------------------------------------------


def test_valid_token_returns_user_id(monkeypatch):
    monkeypatch.setitem(TOKENS, "token-ok", USER_ID)
    assert get_current_user_id("token-ok") == USER_ID


def test_unknown_token_is_forbidden():
    with pytest.raises(HTTPException) as error:
        get_current_user_id("does-not-exist")
    assert error.value.status_code == 403


# --- check_investigation_ownership -------------------------------------------


def test_investigation_ownership_ok():
    cursor = FakeCursor([(USER_ID,)])
    db_service.check_investigation_ownership(cursor, INVESTIGATION_ID, USER_ID)
    assert cursor.executed[0][1] == (str(INVESTIGATION_ID),)


@pytest.mark.parametrize(
    "rows, status", [([], 404), ([(str(uuid.uuid4()),)], 403)]
)
def test_investigation_ownership_errors(rows, status):
    with pytest.raises(HTTPException) as error:
        db_service.check_investigation_ownership(
            FakeCursor(rows), INVESTIGATION_ID, USER_ID
        )
    assert error.value.status_code == status


# --- get_claim_with_ownership -----------------------------------------------


def claim_row(owner, source_id=None):
    return (CLAIM_ID, INVESTIGATION_ID, source_id, "texto", None, "now", owner)


def test_claim_ownership_returns_serialized_claim():
    source_id = uuid.uuid4()
    claim = db_service.get_claim_with_ownership(
        FakeCursor([claim_row(USER_ID, source_id)]), CLAIM_ID, USER_ID
    )
    assert claim == {
        "id": str(CLAIM_ID),
        "investigation_id": str(INVESTIGATION_ID),
        "source_id": str(source_id),
        "text": "texto",
        "relevance": None,
        "created_at": "now",
    }


@pytest.mark.parametrize(
    "rows, status", [([], 404), ([claim_row(str(uuid.uuid4()))], 403)]
)
def test_claim_ownership_errors(rows, status):
    with pytest.raises(HTTPException) as error:
        db_service.get_claim_with_ownership(FakeCursor(rows), CLAIM_ID, USER_ID)
    assert error.value.status_code == status


# --- generate_and_persist_questions -----------------------------------------


def test_questions_are_persisted_one_by_one(monkeypatch):
    monkeypatch.setattr(db_service, "generate_questions", lambda text: ["q1", "q2"])
    cursor = FakeCursor()
    questions = db_service.generate_and_persist_questions(cursor, "cid", "texto")
    assert [q["text"] for q in questions] == ["q1", "q2"]
    assert all(q["claim_id"] == "cid" for q in questions)
    assert len(cursor.executed) == 2
    assert all("INSERT INTO questions" in query for query, _ in cursor.executed)


@pytest.mark.parametrize(
    "error, status",
    [(GeminiEmptyResponseError("empty"), 422), (GeminiUnavailableError("down"), 503)],
)
def test_question_generation_errors_map_to_http(monkeypatch, error, status):
    def fail(text):
        raise error

    monkeypatch.setattr(db_service, "generate_questions", fail)
    cursor = FakeCursor()
    with pytest.raises(HTTPException) as http_error:
        db_service.generate_and_persist_questions(cursor, "cid", "texto")
    assert http_error.value.status_code == status
    assert cursor.executed == []
