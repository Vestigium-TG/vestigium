import uuid

import pytest

from services.ai_service import GeminiEmptyResponseError, GeminiUnavailableError

pytestmark = pytest.mark.integration


def test_register_list_and_delete_reflections(client, auth, claim):
    path = f"/claims/{claim['id']}/reflection"
    assert client.get(path, headers=auth).json() == []

    first = client.post(path, json={"text": "primeira"}, headers=auth)
    second = client.post(path, json={"text": "segunda"}, headers=auth)
    assert first.status_code == second.status_code == 200
    assert first.json()["claim_id"] == claim["id"]

    listed = client.get(path, headers=auth).json()
    assert [r["text"] for r in listed] == ["primeira", "segunda"]

    reflection_id = first.json()["id"]
    assert client.delete(f"/reflection/{reflection_id}", headers=auth).status_code == 200
    assert [r["text"] for r in client.get(path, headers=auth).json()] == ["segunda"]
    assert client.delete(f"/reflection/{reflection_id}", headers=auth).status_code == 404


@pytest.mark.parametrize("body", [{"text": ""}, {"text": "   "}, {}])
def test_register_invalid_reflection(client, auth, claim, body):
    path = f"/claims/{claim['id']}/reflection"
    assert client.post(path, json=body, headers=auth).status_code == 422
    assert client.get(path, headers=auth).json() == []


def test_old_plural_path_does_not_exist(client, auth, claim):
    response = client.post(
        f"/claims/{claim['id']}/reflections", json={"text": "x"}, headers=auth
    )
    assert response.status_code == 404


def test_reflections_ownership(client, auth, other_auth, claim):
    path = f"/claims/{claim['id']}/reflection"
    reflection = client.post(path, json={"text": "r"}, headers=auth).json()

    assert client.get(path, headers=other_auth).status_code == 403
    assert client.post(path, json={"text": "r"}, headers=other_auth).status_code == 403
    assert client.delete(f"/reflection/{reflection['id']}", headers=other_auth).status_code == 403
    assert client.get(path, headers={"x-token": "x"}).status_code == 403
    assert client.get(f"/claims/{uuid.uuid4()}/reflection", headers=auth).status_code == 404
    assert len(client.get(path, headers=auth).json()) == 1


# --- review (UC11) ----------------------------------------------------------


@pytest.fixture
def evidence(client, auth, claim, source):
    return client.post(
        f"/claims/{claim['id']}/evidences",
        json={"source_id": source["id"], "excerpt": "trecho", "description": "desc"},
        headers=auth,
    ).json()


def test_review_sends_context_and_returns_analysis(
    client, auth, fake_ai, claim, source, evidence, db
):
    fake_ai.review = {
        "gaps": [{"text": "lacuna", "evidence_id": evidence["id"], "source_id": None}],
        "contradictions": [],
        "complements": [{"text": "c", "evidence_id": None, "source_id": source["id"]}],
    }
    db.execute("SELECT COUNT(*) FROM reflections")
    reflections_before = db.fetchone()[0]

    response = client.post(f"/claims/{claim['id']}/review", headers=auth)
    assert response.status_code == 200
    assert response.json() == {"claim_id": claim["id"], **fake_ai.review}

    name, (text, evidences, sources) = fake_ai.calls[-1]
    assert name == "review_claim" and text == claim["text"]
    assert evidences == [
        {
            "id": evidence["id"],
            "source_id": source["id"],
            "description": "desc",
            "excerpt": "trecho",
        }
    ]
    assert sources == [
        {"id": source["id"], "title": "Fonte", "url": "https://fonte.example", "content": None}
    ]
    # The review is not persisted anywhere.
    db.execute("SELECT COUNT(*) FROM reflections")
    assert db.fetchone()[0] == reflections_before


def test_review_with_only_sources_is_allowed(client, auth, fake_ai, claim, source):
    assert client.post(f"/claims/{claim['id']}/review", headers=auth).status_code == 200


def test_review_without_evidences_or_sources(client, auth, fake_ai, claim):
    response = client.post(f"/claims/{claim['id']}/review", headers=auth)
    assert response.status_code == 422
    assert all(name != "review_claim" for name, _ in fake_ai.calls)


@pytest.mark.parametrize(
    "error, status",
    [(GeminiUnavailableError("down"), 503), (GeminiEmptyResponseError("empty"), 422)],
)
def test_review_ai_errors(client, auth, fake_ai, claim, evidence, error, status):
    fake_ai.error = error
    assert client.post(f"/claims/{claim['id']}/review", headers=auth).status_code == status


def test_review_ownership(client, auth, other_auth, fake_ai, claim, evidence):
    fake_ai.calls.clear()
    assert client.post(f"/claims/{claim['id']}/review", headers=other_auth).status_code == 403
    assert client.post(f"/claims/{uuid.uuid4()}/review", headers=auth).status_code == 404
    assert fake_ai.calls == []
