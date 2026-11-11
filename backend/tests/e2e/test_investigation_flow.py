import uuid
from datetime import datetime

import pytest

from services.ai_service import VERDICT_PATTERN

pytestmark = pytest.mark.e2e


def expect(response, status=200):
    assert response.status_code == status, response.text
    return response.json()


def ai_call(response):
    # RNF14: an unavailable/rate-limited Gemini answers 503, which is not a backend bug.
    if response.status_code == 503:
        pytest.skip(f"Gemini unavailable during the e2e run: {response.text}")
    return expect(response)


def test_full_flow_without_ai(http, user, db):
    """Every non-AI step of an investigation over real HTTP, as the frontend would do it."""
    h = user["headers"]
    me = expect(http.get("/auth/me", headers=h))
    assert me["email"] == user["email"]

    investigation = expect(
        http.post(
            "/investigations",
            json={"title": "E2E", "input_type": "text", "original_content": "Texto"},
            headers=h,
        )
    )["id"]
    assert investigation in [i["id"] for i in expect(http.get("/investigations", headers=h))]

    # Claims normally come from Gemini (UC04); inserted directly so this flow needs no AI.
    claim = str(uuid.uuid4())
    db.execute(
        "INSERT INTO claims (id, investigation_id, text, created_at) VALUES (%s, %s, %s, %s)",
        (claim, investigation, "A afirmação de teste", datetime.now()),
    )
    db.connection.commit()
    claims = expect(http.get(f"/investigations/{investigation}", headers=h))["claims"]
    assert [c["id"] for c in claims] == [claim]

    source = expect(
        http.post(
            f"/investigations/{investigation}/sources",
            json={"sources": [{"url": "https://fonte.example", "title": "Fonte"}]},
            headers=h,
        )
    )[0]
    assert len(expect(http.get(f"/investigations/{investigation}/sources", headers=h))) == 1

    evidence = expect(
        http.post(
            f"/claims/{claim}/evidences",
            json={"source_id": source["id"], "excerpt": "trecho", "description": "d"},
            headers=h,
        )
    )
    assert expect(http.get(f"/claims/{claim}/evidences", headers=h))[0]["id"] == evidence["id"]

    expect(http.put(f"/investigations/{investigation}/conclusion", json={"text": "c"}, headers=h), 422)
    expect(http.post(f"/claims/{claim}/reflection", json={"text": "reflexão"}, headers=h))
    assert len(expect(http.get(f"/claims/{claim}/reflection", headers=h))) == 1

    expect(http.put(f"/investigations/{investigation}/conclusion", json={"text": "conclusão"}, headers=h))
    assert expect(http.get(f"/investigations/{investigation}/conclusion", headers=h))["text"] == "conclusão"
    assert expect(http.get(f"/investigations/{investigation}", headers=h))["status"] == "concluida"

    expect(http.patch(f"/investigations/{investigation}", json={"title": "Renomeada"}, headers=h))
    assert expect(http.get(f"/investigations/{investigation}", headers=h))["title"] == "Renomeada"

    expect(http.delete(f"/evidences/{evidence['id']}", headers=h))
    expect(http.delete(f"/investigations/{investigation}", headers=h))
    expect(http.get(f"/investigations/{investigation}", headers=h), 404)

    expect(http.post("/auth/logout", headers=h))
    expect(http.get("/auth/me", headers=h), 403)


def test_full_flow_with_real_gemini(http, user, gemini_api_key):
    """The AI-assisted path (UC04-UC07, review) against the real Gemini API."""
    if not gemini_api_key:
        pytest.skip("GEMINI_API_KEY not configured")
    h = user["headers"]
    content = (
        "A Torre Eiffel foi inaugurada em 1889 em Paris e tem cerca de 330 metros "
        "de altura. Ela foi construída para a Exposição Universal daquele ano."
    )
    investigation = expect(
        http.post(
            "/investigations",
            json={"title": "E2E Gemini", "input_type": "text", "original_content": content},
            headers=h,
        )
    )["id"]

    claims = ai_call(http.post(f"/investigations/{investigation}/claims", headers=h))
    assert claims and all(c["text"].strip() for c in claims)
    claim = claims[0]["id"]

    investigated = ai_call(http.post(f"/claims/{claim}/investigate", headers=h))
    assert investigated["questions"]
    assert len(expect(http.get(f"/claims/{claim}/questions", headers=h))) == len(
        investigated["questions"]
    )

    queries = ai_call(http.post(f"/claims/{claim}/search-queries", headers=h))["queries"]
    assert queries

    search = ai_call(http.post(f"/claims/{claim}/search", json={"query": queries[0]}, headers=h))
    assert isinstance(search["results"], list)
    # RN007: nothing is persisted until the user picks a source.
    assert expect(http.get(f"/investigations/{investigation}/sources", headers=h)) == []
    picked = search["results"][0] if search["results"] else {
        "title": "Torre Eiffel - Wikipédia",
        "url": "https://pt.wikipedia.org/wiki/Torre_Eiffel",
    }
    source = expect(
        http.post(
            f"/investigations/{investigation}/sources",
            json={"sources": [{"url": picked["url"], "title": picked["title"]}]},
            headers=h,
        )
    )[0]
    evidence = expect(
        http.post(
            f"/claims/{claim}/evidences",
            json={
                "source_id": source["id"],
                "excerpt": "inaugurada em 1889",
                "description": "A fonte confirma o ano de inauguração.",
            },
            headers=h,
        )
    )

    review = ai_call(http.post(f"/claims/{claim}/review", headers=h))
    assert set(review) == {"claim_id", "gaps", "contradictions", "complements"}
    for category in ("gaps", "contradictions", "complements"):
        for item in review[category]:
            # RN012: every item cites the registered evidence or source.
            assert item["evidence_id"] == evidence["id"] or item["source_id"] == source["id"]
            # RN011: no truth verdict.
            assert not VERDICT_PATTERN.search(item["text"])

    expect(http.post(f"/claims/{claim}/reflection", json={"text": "Reflexão"}, headers=h))
    expect(http.put(f"/investigations/{investigation}/conclusion", json={"text": "Conclusão"}, headers=h))
    assert expect(http.get(f"/investigations/{investigation}", headers=h))["status"] == "concluida"
    expect(http.delete(f"/investigations/{investigation}", headers=h))
