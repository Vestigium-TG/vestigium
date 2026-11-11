import pytest
from fastapi.testclient import TestClient

import controllers.claim_controller as claim_controller
import controllers.reflection_controller as reflection_controller
import services.ai_service as ai_service
import services.database_service as database_service
from main import app


class FakeAI:
    """Stands in for the Gemini layer; tests set the outputs or an error to raise."""

    def __init__(self):
        self.claims = ["Afirmação 1", "Afirmação 2"]
        self.questions = ["Pergunta 1?", "Pergunta 2?"]
        self.queries = ["consulta 1", "consulta 2"]
        self.search_results = [
            {"title": "Fonte A", "url": "https://a.example", "excerpt": "trecho A"}
        ]
        self.review = {"gaps": [], "contradictions": [], "complements": []}
        self.error = None
        self.calls = []

    def _answer(self, name, value, *args):
        self.calls.append((name, args))
        if self.error:
            raise self.error
        return value

    def install(self, monkeypatch):
        monkeypatch.setattr(
            claim_controller,
            "identify_claims",
            lambda content: self._answer("identify_claims", self.claims, content),
        )
        monkeypatch.setattr(
            database_service,
            "generate_questions",
            lambda text: self._answer("generate_questions", self.questions, text),
        )
        monkeypatch.setattr(
            claim_controller,
            "generate_search_queries",
            lambda text: self._answer("generate_search_queries", self.queries, text),
        )
        monkeypatch.setattr(
            claim_controller,
            "search_sources",
            lambda text, query=None: self._answer(
                "search_sources", self.search_results, text, query
            ),
        )
        monkeypatch.setattr(
            reflection_controller,
            "review_claim",
            lambda text, evidences, sources: self._answer(
                "review_claim", self.review, text, evidences, sources
            ),
        )

        def no_real_gemini():
            raise AssertionError("integration tests must not call the real Gemini")

        monkeypatch.setattr(ai_service, "_get_client", no_real_gemini)


@pytest.fixture
def fake_ai(monkeypatch):
    fake = FakeAI()
    fake.install(monkeypatch)
    return fake


@pytest.fixture
def client(fake_ai):
    return TestClient(app)


@pytest.fixture
def make_user(client, new_email):
    def create():
        email = new_email()
        assert client.post(
            "/auth/register", json={"email": email, "password": "senha123"}
        ).status_code == 200
        token = client.post(
            "/auth/login", json={"email": email, "password": "senha123"}
        ).json()["token"]
        return {"x-token": token}

    return create


@pytest.fixture
def auth(make_user):
    return make_user()


@pytest.fixture
def other_auth(make_user):
    return make_user()


@pytest.fixture
def investigation(client, auth):
    response = client.post(
        "/investigations",
        json={"title": "Teste", "input_type": "text", "original_content": "Texto"},
        headers=auth,
    )
    return response.json()["id"]


@pytest.fixture
def claim(client, auth, investigation):
    return client.post(f"/investigations/{investigation}/claims", headers=auth).json()[0]


@pytest.fixture
def source(client, auth, investigation):
    return client.post(
        f"/investigations/{investigation}/sources",
        json={"sources": [{"url": "https://fonte.example", "title": "Fonte"}]},
        headers=auth,
    ).json()[0]
