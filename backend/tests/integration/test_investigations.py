import uuid

import pytest

pytestmark = pytest.mark.integration

VALID = {"title": "Título", "input_type": "text", "original_content": "Conteúdo"}


def test_create_and_get_investigation(client, auth):
    response = client.post("/investigations", json=VALID, headers=auth)
    assert response.status_code == 200
    investigation_id = response.json()["id"]

    body = client.get(f"/investigations/{investigation_id}", headers=auth).json()
    assert body["title"] == "Título"
    assert body["input_type"] == "text"
    assert body["original_content"] == "Conteúdo"
    assert body["status"] == "in_progress"
    assert body["claims"] == []


def test_create_with_url_input_type(client, auth):
    body = dict(VALID, input_type="url", original_content="https://x.example")
    assert client.post("/investigations", json=body, headers=auth).status_code == 200


@pytest.mark.parametrize(
    "override",
    [
        {"input_type": "video"},
        {"title": "   "},
        {"original_content": ""},  # RN003: needs at least one content source
        {"original_content": None},
    ],
)
def test_create_invalid_investigation(client, auth, override):
    body = {k: v for k, v in dict(VALID, **override).items() if v is not None}
    assert client.post("/investigations", json=body, headers=auth).status_code == 422


def test_routes_require_valid_token(client, investigation):
    bad = {"x-token": "invalid"}
    assert client.post("/investigations", json=VALID, headers=bad).status_code == 403
    assert client.get("/investigations", headers=bad).status_code == 403
    assert client.get(f"/investigations/{investigation}", headers=bad).status_code == 403


def test_list_only_returns_own_investigations(client, auth, other_auth):
    mine = client.post("/investigations", json=VALID, headers=auth).json()["id"]
    theirs = client.post("/investigations", json=VALID, headers=other_auth).json()["id"]
    ids = [i["id"] for i in client.get("/investigations", headers=auth).json()]
    assert mine in ids and theirs not in ids


def test_other_user_cannot_access_investigation(client, other_auth, investigation):
    # RN001
    path = f"/investigations/{investigation}"
    assert client.get(path, headers=other_auth).status_code == 403
    assert client.patch(path, json={"title": "x"}, headers=other_auth).status_code == 403
    assert client.delete(path, headers=other_auth).status_code == 403


def test_missing_investigation_is_not_found(client, auth):
    path = f"/investigations/{uuid.uuid4()}"
    assert client.get(path, headers=auth).status_code == 404
    assert client.patch(path, json={"title": "x"}, headers=auth).status_code == 404
    assert client.delete(path, headers=auth).status_code == 404


def test_invalid_uuid_is_unprocessable(client, auth):
    assert client.get("/investigations/not-a-uuid", headers=auth).status_code == 422


def test_patch_updates_fields(client, auth, investigation):
    path = f"/investigations/{investigation}"
    before = client.get(path, headers=auth).json()
    response = client.patch(
        path, json={"title": "Novo", "status": "pausada"}, headers=auth
    )
    assert response.status_code == 200
    after = client.get(path, headers=auth).json()
    assert after["title"] == "Novo" and after["status"] == "pausada"
    assert after["original_content"] == before["original_content"]
    assert after["updated_at"] > before["updated_at"]


@pytest.mark.parametrize(
    "body", [{"input_type": "video"}, {"title": " "}, {"original_content": ""}]
)
def test_patch_invalid_fields(client, auth, investigation, body):
    response = client.patch(f"/investigations/{investigation}", json=body, headers=auth)
    assert response.status_code == 422


def test_delete_cascades_all_dependent_data(client, auth, db, investigation, source):
    # RN014: no orphan rows after deleting an investigation.
    claim = client.post(f"/investigations/{investigation}/claims", headers=auth).json()[0]
    client.post(f"/claims/{claim['id']}/questions", headers=auth)
    client.post(
        f"/claims/{claim['id']}/evidences",
        json={"source_id": source["id"], "description": "d"},
        headers=auth,
    )
    client.post(f"/claims/{claim['id']}/reflection", json={"text": "r"}, headers=auth)
    client.put(
        f"/investigations/{investigation}/conclusion", json={"text": "c"}, headers=auth
    )

    assert client.delete(f"/investigations/{investigation}", headers=auth).status_code == 200
    assert client.get(f"/investigations/{investigation}", headers=auth).status_code == 404

    for table, column, value in [
        ("investigations", "id", investigation),
        ("claims", "investigation_id", investigation),
        ("sources", "investigation_id", investigation),
        ("conclusions", "investigation_id", investigation),
        ("questions", "claim_id", claim["id"]),
        ("evidences", "claim_id", claim["id"]),
        ("reflections", "claim_id", claim["id"]),
    ]:
        db.execute(f"SELECT COUNT(*) FROM {table} WHERE {column} = %s", (value,))
        assert db.fetchone()[0] == 0, table
