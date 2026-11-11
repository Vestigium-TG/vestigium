import uuid

import pytest

pytestmark = pytest.mark.integration


def evidence_body(source_id, **fields):
    return {"source_id": source_id, **fields}


def test_register_and_list_evidences(client, auth, claim, source):
    path = f"/claims/{claim['id']}/evidences"
    assert client.get(path, headers=auth).json() == []

    response = client.post(
        path,
        json=evidence_body(source["id"], excerpt="trecho", description="descrição"),
        headers=auth,
    )
    assert response.status_code == 200
    created = response.json()
    assert created["claim_id"] == claim["id"]
    assert created["source_id"] == source["id"]
    assert created["excerpt"] == "trecho" and created["description"] == "descrição"

    listed = client.get(path, headers=auth).json()
    # RN009: the source used by each evidence is exposed.
    assert listed == [
        {
            "id": created["id"],
            "claim_id": claim["id"],
            "source_id": source["id"],
            "description": "descrição",
            "excerpt": "trecho",
            "type": None,
            "created_at": created["created_at"],
        }
    ]


@pytest.mark.parametrize(
    "fields", [{"excerpt": "só trecho"}, {"description": "só descrição"}]
)
def test_excerpt_or_description_is_enough(client, auth, claim, source, fields):
    response = client.post(
        f"/claims/{claim['id']}/evidences",
        json=evidence_body(source["id"], **fields),
        headers=auth,
    )
    assert response.status_code == 200


@pytest.mark.parametrize(
    "body",
    [
        {"excerpt": "t", "description": "d"},  # missing source_id (RN008)
        {"source_id": "not-a-uuid", "description": "d"},
        {"source_id": "SOURCE"},
        {"source_id": "SOURCE", "excerpt": "  ", "description": ""},
        {"source_id": "SOURCE", "excerpt": None, "description": "   "},
    ],
)
def test_register_invalid_evidence(client, auth, claim, source, body):
    body = {k: (source["id"] if v == "SOURCE" else v) for k, v in body.items()}
    path = f"/claims/{claim['id']}/evidences"
    assert client.post(path, json=body, headers=auth).status_code == 422
    assert client.get(path, headers=auth).json() == []


def test_source_must_belong_to_claim_investigation(client, auth, claim):
    other_investigation = client.post(
        "/investigations",
        json={"title": "Outra", "input_type": "text", "original_content": "x"},
        headers=auth,
    ).json()["id"]
    foreign_source = client.post(
        f"/investigations/{other_investigation}/sources",
        json={"sources": [{"url": "https://outra", "title": "Outra"}]},
        headers=auth,
    ).json()[0]["id"]

    path = f"/claims/{claim['id']}/evidences"
    for source_id in (foreign_source, str(uuid.uuid4())):
        response = client.post(
            path, json=evidence_body(source_id, description="d"), headers=auth
        )
        assert response.status_code == 404
    assert client.get(path, headers=auth).json() == []


def test_delete_evidence(client, auth, claim, source):
    evidence = client.post(
        f"/claims/{claim['id']}/evidences",
        json=evidence_body(source["id"], description="d"),
        headers=auth,
    ).json()
    assert client.delete(f"/evidences/{evidence['id']}", headers=auth).status_code == 200
    assert client.get(f"/claims/{claim['id']}/evidences", headers=auth).json() == []
    assert client.delete(f"/evidences/{evidence['id']}", headers=auth).status_code == 404


def test_evidences_ownership(client, auth, other_auth, claim, source):
    path = f"/claims/{claim['id']}/evidences"
    body = evidence_body(source["id"], description="d")
    evidence = client.post(path, json=body, headers=auth).json()

    assert client.get(path, headers=other_auth).status_code == 403
    assert client.post(path, json=body, headers=other_auth).status_code == 403
    assert client.delete(f"/evidences/{evidence['id']}", headers=other_auth).status_code == 403
    assert client.get(path, headers={"x-token": "x"}).status_code == 403
    assert client.get(f"/claims/{uuid.uuid4()}/evidences", headers=auth).status_code == 404
    # The evidence survives the forbidden delete.
    assert len(client.get(path, headers=auth).json()) == 1
