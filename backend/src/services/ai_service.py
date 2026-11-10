import json
import os

from google import genai
from google.genai import errors as genai_errors

MODEL_NAME = "gemini-2.5-flash"
_client: genai.Client | None = None


class GeminiUnavailableError(Exception):
    pass


class GeminiEmptyResponseError(Exception):
    pass


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise GeminiUnavailableError("GEMINI_API_KEY is not configured")
        _client = genai.Client(api_key=api_key)
    return _client


def _generate_json_list(prompt: str) -> list[str]:
    client = _get_client()
    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "ARRAY",
                    "items": {"type": "STRING"},
                },
            },
        )
    except (genai_errors.ServerError, genai_errors.APIError) as error:
        raise GeminiUnavailableError(str(error)) from error
    except Exception as error:
        raise GeminiUnavailableError(str(error)) from error

    text = (response.text or "").strip()
    if not text:
        raise GeminiEmptyResponseError("Gemini returned an empty response")

    try:
        items = json.loads(text)
    except json.JSONDecodeError as error:
        raise GeminiEmptyResponseError("Gemini returned invalid JSON format") from error

    items = [item.strip() for item in items if isinstance(item, str) and item.strip()]
    if not items:
        raise GeminiEmptyResponseError("Gemini returned no valid items")

    return items


def identify_claims(content: str) -> list[str]:
    prompt = (
        "You are a fact-checking assistant. Read the content below and "
        "identify verifiable factual claims. Return ONLY a JSON array of "
        "strings, one string per claim, with no extra commentary.\n\n"
        f"Content:\n{content}"
    )
    return _generate_json_list(prompt)


def generate_questions(claim_text: str) -> list[str]:
    prompt = (
        "You are a fact-checking assistant. For the claim below, "
        "generate guiding questions to help a researcher investigate and "
        "critically analyze it. Return ONLY a JSON array of strings.\n\n"
        f"Claim:\n{claim_text}"
    )
    return _generate_json_list(prompt)


def generate_search_queries(claim_text: str) -> list[str]:
    prompt = (
        "You are a fact-checking assistant. For the claim below, "
        "suggest search terms (queries for a search engine) to help find "
        "verifying sources. Return ONLY a JSON array of strings.\n\n"
        f"Claim:\n{claim_text}"
    )
    return _generate_json_list(prompt)


def search_sources(claim_text: str, query: str | None = None) -> list[dict]:
    client = _get_client()
    prompt = (
        "You are a fact-checking assistant. Search the web for reliable sources "
        "that help verify the claim below (both confirming and refuting sources). "
        "Briefly summarize what each source states.\n\n"
        f"Claim:\n{claim_text}"
    )
    if query:
        prompt += f"\n\nUse this search query:\n{query}"

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config={"tools": [{"google_search": {}}]},
        )
    except Exception as error:
        raise GeminiUnavailableError(str(error)) from error

    candidates = response.candidates or []
    metadata = candidates[0].grounding_metadata if candidates else None

    if metadata is None or not metadata.grounding_chunks:
        return []

    excerpts_by_chunk: dict[int, list[str]] = {}
    for support in metadata.grounding_supports or []:
        text = (support.segment.text or "").strip() if support.segment else ""
        if not text:
            continue
        for idx in support.grounding_chunk_indices or []:
            excerpts_by_chunk.setdefault(idx, []).append(text)

    results = []
    seen_urls = set()

    for idx, chunk in enumerate(metadata.grounding_chunks):
        web = chunk.web
        if web is None or not web.uri or web.uri in seen_urls:
            continue

        seen_urls.add(web.uri)
        results.append(
            {
                "title": web.title or web.domain or web.uri,
                "url": web.uri,
                "excerpt": " ".join(excerpts_by_chunk.get(idx, [])) or None,
            }
        )

    return results
