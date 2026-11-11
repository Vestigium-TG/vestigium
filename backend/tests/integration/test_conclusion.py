import uuid

import pytest

pytestmark = pytest.mark.integration


@pytest.fixture
def reflection(client, auth, claim):
    return client.post(
        f"/claims/{claim['id']}/reflection", json={"text": "reflexão"}, headers=auth
    ).json()


def test_get_missing_conclusion_is_not_found(client, auth, investigation):
    response = client.get(f"/investigations/{investigation}/conclusion", headers=auth)
    assert response.status_code == 404


def test_conclusion_requires_a_reflection(client, auth, investigation, claim):
    # RN006: the user must have analyzed the claims before concluding.
    path = f"/investigations/{investigation}/conclusion"
    assert client.put(path, json={"text": "conclusão"}, headers=auth).status_code == 422
    assert client.get(path, headers=auth).status_code == 404
    status = client.get(f"/investigations/{investigation}", headers=auth).json()["status"]
    assert status == "in_progress"


@pytest.mark.parametrize("body", [{"text": ""}, {"text": "   "}, {}])
def test_conclusion_text_required(client, auth, investigation, reflection, body):
    path = f"/investigations/{investigation}/conclusion"
    assert client.put(path, json=body, headers=auth).status_code == 422
    assert client.get(path, headers=auth).status_code == 404


def test_create_then_update_conclusion(client, auth, investigation, reflection):
    path = f"/investigations/{investigation}/conclusion"
    created = client.put(path, json={"text": "primeira"}, headers=auth)
    assert created.status_code == 200
    created = created.json()
    assert created["investigation_id"] == investigation
    assert created["text"] == "primeira"

    investigation_body = client.get(f"/investigations/{investigation}", headers=auth).json()
    assert investigation_body["status"] == "concluida"

    updated = client.put(path, json={"text": "segunda"}, headers=auth).json()
    # 1:1 upsert: same row, created_at preserved, updated_at moves forward.
    assert updated["id"] == created["id"]
    assert updated["created_at"] == created["created_at"]
    assert updated["updated_at"] > created["updated_at"]

    fetched = client.get(path, headers=auth).json()
    assert fetched == {
        "id": created["id"],
        "investigation_id": investigation,
        "text": "segunda",
        "created_at": created["created_at"],
        "updated_at": updated["updated_at"],
    }


def test_single_conclusion_row_per_investigation(client, auth, db, investigation, reflection):
    path = f"/investigations/{investigation}/conclusion"
    for text in ("a", "b", "c"):
        client.put(path, json={"text": text}, headers=auth)
    db.execute("SELECT COUNT(*) FROM conclusions WHERE investigation_id = %s", (investigation,))
    assert db.fetchone()[0] == 1


def test_conclusion_ownership(client, auth, other_auth, investigation, reflection):
    path = f"/investigations/{investigation}/conclusion"
    client.put(path, json={"text": "minha"}, headers=auth)

    assert client.get(path, headers=other_auth).status_code == 403
    assert client.put(path, json={"text": "x"}, headers=other_auth).status_code == 403
    assert client.get(path, headers={"x-token": "x"}).status_code == 403
    missing = f"/investigations/{uuid.uuid4()}/conclusion"
    assert client.get(missing, headers=auth).status_code == 404
    assert client.put(missing, json={"text": "x"}, headers=auth).status_code == 404
    assert client.get(path, headers=auth).json()["text"] == "minha"
