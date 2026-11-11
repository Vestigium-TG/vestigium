import uuid

import pytest

pytestmark = pytest.mark.integration


def test_register_and_list_sources(client, auth, investigation):
    path = f"/investigations/{investigation}/sources"
    assert client.get(path, headers=auth).json() == []

    body = {
        "sources": [
            {"url": "https://a.example", "title": "A"},
            {
                "url": "https://b.example",
                "title": "B",
                "content": "conteúdo",
                "type": "artigo",
                "accessed_at": "2026-11-10T10:00:00",
            },
        ]
    }
    response = client.post(path, json=body, headers=auth)
    assert response.status_code == 200
    created = response.json()
    assert [s["title"] for s in created] == ["A", "B"]
    assert all(s["investigation_id"] == investigation for s in created)

    listed = {s["id"]: s for s in client.get(path, headers=auth).json()}
    assert set(listed) == {s["id"] for s in created}
    b = next(s for s in listed.values() if s["title"] == "B")
    assert b["content"] == "conteúdo" and b["type"] == "artigo"
    assert b["accessed_at"].startswith("2026-11-10T10:00:00")


@pytest.mark.parametrize(
    "body",
    [
        {"sources": []},
        {"sources": [{"url": " ", "title": "A"}]},
        {"sources": [{"url": "https://a", "title": ""}]},
        {"sources": [{"title": "A"}]},
        {},
    ],
)
def test_register_invalid_sources(client, auth, investigation, body):
    path = f"/investigations/{investigation}/sources"
    assert client.post(path, json=body, headers=auth).status_code == 422
    assert client.get(path, headers=auth).json() == []


def test_sources_ownership(client, auth, other_auth, investigation):
    path = f"/investigations/{investigation}/sources"
    body = {"sources": [{"url": "https://a", "title": "A"}]}
    assert client.post(path, json=body, headers=other_auth).status_code == 403
    assert client.get(path, headers=other_auth).status_code == 403
    assert client.get(path, headers={"x-token": "x"}).status_code == 403
    missing = f"/investigations/{uuid.uuid4()}/sources"
    assert client.post(missing, json=body, headers=auth).status_code == 404
    assert client.get(missing, headers=auth).status_code == 404
