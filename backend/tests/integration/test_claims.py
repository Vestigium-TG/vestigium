import uuid

import pytest

from services.ai_service import GeminiEmptyResponseError, GeminiUnavailableError

pytestmark = pytest.mark.integration

AI_ERRORS = [
    (GeminiEmptyResponseError("empty"), 422),
    (GeminiUnavailableError("down"), 503),
]


# --- UC04: identify claims --------------------------------------------------


def test_identify_claims_persists_ai_claims(client, auth, fake_ai, investigation):
    response = client.post(f"/investigations/{investigation}/claims", headers=auth)
    assert response.status_code == 200
    claims = response.json()
    assert [c["text"] for c in claims] == fake_ai.claims
    assert all(c["investigation_id"] == investigation for c in claims)
    assert fake_ai.calls == [("identify_claims", ("Texto",))]

    listed = client.get(f"/investigations/{investigation}", headers=auth).json()["claims"]
    assert {c["id"] for c in listed} == {c["id"] for c in claims}


@pytest.mark.parametrize("error, status", AI_ERRORS)
def test_identify_claims_ai_errors(client, auth, fake_ai, investigation, error, status):
    fake_ai.error = error
    response = client.post(f"/investigations/{investigation}/claims", headers=auth)
    assert response.status_code == status
    listed = client.get(f"/investigations/{investigation}", headers=auth).json()["claims"]
    assert listed == []


def test_identify_claims_ownership(client, auth, other_auth, investigation):
    path = f"/investigations/{investigation}/claims"
    assert client.post(path, headers=other_auth).status_code == 403
    assert client.post(path, headers={"x-token": "bad"}).status_code == 403
    missing = f"/investigations/{uuid.uuid4()}/claims"
    assert client.post(missing, headers=auth).status_code == 404


# --- UC06: guiding questions ------------------------------------------------


def test_generate_and_list_questions(client, auth, fake_ai, claim):
    path = f"/claims/{claim['id']}/questions"
    assert client.get(path, headers=auth).json() == []

    response = client.post(path, headers=auth)
    assert response.status_code == 200
    assert [q["text"] for q in response.json()] == fake_ai.questions
    assert ("generate_questions", (claim["text"],)) in fake_ai.calls

    listed = client.get(path, headers=auth).json()
    assert [q["text"] for q in listed] == fake_ai.questions
    assert all(q["claim_id"] == claim["id"] for q in listed)


def test_list_questions_does_not_call_ai(client, auth, fake_ai, claim):
    fake_ai.calls.clear()
    client.get(f"/claims/{claim['id']}/questions", headers=auth)
    assert fake_ai.calls == []


@pytest.mark.parametrize("error, status", AI_ERRORS)
def test_generate_questions_ai_errors_allow_retry(
    client, auth, fake_ai, claim, error, status
):
    path = f"/claims/{claim['id']}/questions"
    fake_ai.error = error
    assert client.post(path, headers=auth).status_code == status
    assert client.get(path, headers=auth).json() == []

    fake_ai.error = None
    assert client.post(path, headers=auth).status_code == 200


# --- UC05: investigate claim ------------------------------------------------


def test_investigate_returns_claim_with_questions(client, auth, fake_ai, claim):
    response = client.post(f"/claims/{claim['id']}/investigate", headers=auth)
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == claim["id"] and body["text"] == claim["text"]
    assert [q["text"] for q in body["questions"]] == fake_ai.questions
    persisted = client.get(f"/claims/{claim['id']}/questions", headers=auth).json()
    assert len(persisted) == len(fake_ai.questions)


@pytest.mark.parametrize("error, status", AI_ERRORS)
def test_investigate_ai_errors(client, auth, fake_ai, claim, error, status):
    fake_ai.error = error
    assert client.post(f"/claims/{claim['id']}/investigate", headers=auth).status_code == status


# --- UC07: search queries and search ----------------------------------------


def test_search_queries_are_returned(client, auth, fake_ai, claim):
    response = client.post(f"/claims/{claim['id']}/search-queries", headers=auth)
    assert response.status_code == 200
    assert response.json() == {"claim_id": claim["id"], "queries": fake_ai.queries}


@pytest.mark.parametrize("error, status", AI_ERRORS)
def test_search_queries_ai_errors(client, auth, fake_ai, claim, error, status):
    fake_ai.error = error
    response = client.post(f"/claims/{claim['id']}/search-queries", headers=auth)
    assert response.status_code == status


def test_search_returns_candidates_without_persisting(
    client, auth, fake_ai, claim, investigation
):
    # RN007: results are only suggestions until the user registers a source.
    response = client.post(f"/claims/{claim['id']}/search", headers=auth)
    assert response.status_code == 200
    assert response.json() == {"message": None, "results": fake_ai.search_results}
    assert fake_ai.calls[-1] == ("search_sources", (claim["text"], None))
    assert client.get(f"/investigations/{investigation}/sources", headers=auth).json() == []


def test_search_uses_given_query(client, auth, fake_ai, claim):
    client.post(f"/claims/{claim['id']}/search", json={"query": "  termo  "}, headers=auth)
    assert fake_ai.calls[-1] == ("search_sources", (claim["text"], "termo"))


def test_search_without_results_is_ok_with_message(client, auth, fake_ai, claim):
    fake_ai.search_results = []
    response = client.post(f"/claims/{claim['id']}/search", headers=auth)
    assert response.status_code == 200
    assert response.json() == {"message": "No sources found", "results": []}


def test_search_unavailable(client, auth, fake_ai, claim):
    fake_ai.error = GeminiUnavailableError("down")
    assert client.post(f"/claims/{claim['id']}/search", headers=auth).status_code == 503


# --- ownership on every claim route -----------------------------------------

CLAIM_ROUTES = [
    ("post", "questions"),
    ("get", "questions"),
    ("post", "investigate"),
    ("post", "search-queries"),
    ("post", "search"),
]


@pytest.mark.parametrize("method, route", CLAIM_ROUTES)
def test_claim_routes_check_ownership(
    client, auth, other_auth, fake_ai, claim, method, route
):
    fake_ai.calls.clear()
    call = getattr(client, method)
    assert call(f"/claims/{claim['id']}/{route}", headers=other_auth).status_code == 403
    assert call(f"/claims/{claim['id']}/{route}", headers={"x-token": "x"}).status_code == 403
    assert call(f"/claims/{uuid.uuid4()}/{route}", headers=auth).status_code == 404
    assert fake_ai.calls == []
