from types import SimpleNamespace

import pytest

import services.ai_service as ai


class FakeModels:
    def __init__(self):
        self.response = None
        self.error = None
        self.calls = []

    def generate_content(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return self.response


@pytest.fixture
def gemini(monkeypatch):
    models = FakeModels()
    monkeypatch.setattr(ai, "_get_client", lambda: SimpleNamespace(models=models))
    return models


def text_response(text):
    return SimpleNamespace(text=text)


def grounded_response(chunks, supports=None):
    metadata = SimpleNamespace(grounding_chunks=chunks, grounding_supports=supports)
    return SimpleNamespace(candidates=[SimpleNamespace(grounding_metadata=metadata)])


def web_chunk(uri, title=None, domain=None):
    return SimpleNamespace(web=SimpleNamespace(uri=uri, title=title, domain=domain))


def support(text, indices):
    return SimpleNamespace(
        segment=SimpleNamespace(text=text), grounding_chunk_indices=indices
    )


# --- client -----------------------------------------------------------------


def test_get_client_without_api_key_is_unavailable(monkeypatch):
    monkeypatch.setattr(ai, "_client", None)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(ai.GeminiUnavailableError):
        ai._get_client()


# --- JSON list generation ---------------------------------------------------


def test_generate_json_list_strips_and_filters_items(gemini):
    gemini.response = text_response('["  a ", "", 3, null, "b"]')
    assert ai._generate_json_list("prompt") == ["a", "b"]


def test_generate_json_list_requests_string_array_schema(gemini):
    gemini.response = text_response('["a"]')
    ai._generate_json_list("prompt")
    config = gemini.calls[0]["config"]
    assert config["response_mime_type"] == "application/json"
    assert config["response_schema"] == {"type": "ARRAY", "items": {"type": "STRING"}}


@pytest.mark.parametrize(
    "text", [None, "", "   ", "not json", '{"a": 1}', '["", "  "]', "[]"]
)
def test_generate_json_list_invalid_or_empty_response(gemini, text):
    gemini.response = text_response(text)
    with pytest.raises(ai.GeminiEmptyResponseError):
        ai._generate_json_list("prompt")


@pytest.mark.parametrize(
    "error",
    [
        RuntimeError("connection reset"),
        ai.genai_errors.ClientError(
            429, {"error": {"message": "quota", "status": "RESOURCE_EXHAUSTED"}}
        ),
        ai.genai_errors.ServerError(
            503, {"error": {"message": "down", "status": "UNAVAILABLE"}}
        ),
    ],
)
def test_gemini_errors_and_rate_limit_map_to_unavailable(gemini, error):
    # RNF14: rate limit is treated as AI service unavailability.
    gemini.error = error
    with pytest.raises(ai.GeminiUnavailableError):
        ai._generate_json_list("prompt")


@pytest.mark.parametrize(
    "function", [ai.identify_claims, ai.generate_questions, ai.generate_search_queries]
)
def test_prompt_helpers_send_input_and_return_items(gemini, function):
    gemini.response = text_response('["x", "y"]')
    assert function("conteúdo de entrada") == ["x", "y"]
    assert "conteúdo de entrada" in gemini.calls[0]["contents"]


# --- source search ----------------------------------------------------------


def test_search_sources_without_grounding_returns_empty(gemini):
    gemini.response = SimpleNamespace(candidates=[])
    assert ai.search_sources("claim") == []
    gemini.response = grounded_response([])
    assert ai.search_sources("claim") == []


def test_search_sources_maps_dedups_and_joins_excerpts(gemini):
    gemini.response = grounded_response(
        [
            web_chunk("https://a.com", title="A"),
            web_chunk("https://a.com", title="A again"),
            web_chunk("https://b.com", domain="b.com"),
            web_chunk(None),
            SimpleNamespace(web=None),
        ],
        [support("first", [0]), support("second", [0, 2]), support("  ", [2])],
    )
    assert ai.search_sources("claim") == [
        {"title": "A", "url": "https://a.com", "excerpt": "first second"},
        {"title": "b.com", "url": "https://b.com", "excerpt": "second"},
    ]


def test_search_sources_uses_query_and_google_search_tool(gemini):
    gemini.response = grounded_response([])
    ai.search_sources("claim text", "custom query")
    call = gemini.calls[0]
    assert "claim text" in call["contents"]
    assert "custom query" in call["contents"]
    assert call["config"] == {"tools": [{"google_search": {}}]}


def test_search_sources_error_is_unavailable(gemini):
    gemini.error = RuntimeError("boom")
    with pytest.raises(ai.GeminiUnavailableError):
        ai.search_sources("claim")


# --- claim review (UC11) ----------------------------------------------------

EVIDENCES = [{"id": "e1", "source_id": "s1", "description": "desc", "excerpt": None}]
SOURCES = [{"id": "s1", "title": "Fonte", "url": "https://s1", "content": "c"}]


@pytest.fixture
def review_response(monkeypatch):
    captured = {}

    def set_response(data):
        def fake(prompt, schema):
            captured["prompt"] = prompt
            captured["schema"] = schema
            return data

        monkeypatch.setattr(ai, "_generate_json", fake)
        return captured

    return set_response


def item(text, evidence_id=None, source_id=None):
    return {"text": text, "evidence_id": evidence_id, "source_id": source_id}


def test_review_keeps_only_items_citing_known_context(review_response):
    review_response(
        {
            "gaps": [
                item("Falta dado oficial", evidence_id="e1"),
                item("Sem citação"),
                item("Id inventado", evidence_id="zzz"),
                item("   ", source_id="s1"),
                "not a dict",
            ],
            "contradictions": [item("Fonte diverge", evidence_id="zzz", source_id="s1")],
            "complements": [item("Ver outra fonte", source_id="s1")],
        }
    )
    assert ai.review_claim("claim", EVIDENCES, SOURCES) == {
        "gaps": [item("Falta dado oficial", evidence_id="e1")],
        "contradictions": [item("Fonte diverge", source_id="s1")],
        "complements": [item("Ver outra fonte", source_id="s1")],
    }


@pytest.mark.parametrize(
    "text",
    [
        "A afirmação é falsa",
        "A afirmação é verdadeira",
        "Isso é FALSO",
        "The claim is true",
        "This is false",
        "Trata-se de fake news",
        "É mentira",
        "Veredito: inconclusivo",
    ],
)
def test_review_drops_verdicts(review_response, text):
    # RN11: no true/false verdict may be returned.
    review_response({"gaps": [item(text, evidence_id="e1")]})
    assert ai.review_claim("claim", EVIDENCES, SOURCES)["gaps"] == []


@pytest.mark.parametrize("text", ["Indício de falsificação", "Mede a veracidade"])
def test_review_verdict_filter_ignores_related_words(review_response, text):
    review_response({"gaps": [item(text, evidence_id="e1")]})
    assert ai.review_claim("claim", EVIDENCES, SOURCES)["gaps"] == [
        item(text, evidence_id="e1")
    ]


def test_review_missing_categories_become_empty_lists(review_response):
    review_response({})
    assert ai.review_claim("claim", EVIDENCES, SOURCES) == {
        "gaps": [],
        "contradictions": [],
        "complements": [],
    }


def test_review_non_object_response_is_empty_error(review_response):
    review_response(["a"])
    with pytest.raises(ai.GeminiEmptyResponseError):
        ai.review_claim("claim", EVIDENCES, SOURCES)


def test_review_prompt_has_context_ids_and_truncated_content(review_response):
    captured = review_response({})
    long_source = dict(SOURCES[0], content="x" * (ai.MAX_SOURCE_CONTENT_CHARS + 500))
    ai.review_claim("texto da afirmação", EVIDENCES, [long_source])
    prompt = captured["prompt"]
    assert "texto da afirmação" in prompt
    assert "evidence_id=e1" in prompt and "source_id=s1" in prompt
    # RNF13: source content is truncated instead of failing.
    assert "x" * ai.MAX_SOURCE_CONTENT_CHARS in prompt
    assert "x" * (ai.MAX_SOURCE_CONTENT_CHARS + 1) not in prompt
    assert set(captured["schema"]["properties"]) == set(ai.REVIEW_CATEGORIES)


def test_review_propagates_gemini_errors(monkeypatch):
    def fail(prompt, schema):
        raise ai.GeminiUnavailableError("down")

    monkeypatch.setattr(ai, "_generate_json", fail)
    with pytest.raises(ai.GeminiUnavailableError):
        ai.review_claim("claim", EVIDENCES, SOURCES)
