import json
import os
import re

from google import genai
from google.genai import errors as genai_errors

MODEL_NAME = "gemini-2.5-flash"
# Caps each source's content in the review prompt so large pages don't exceed the token limit (RNF13).
MAX_SOURCE_CONTENT_CHARS = 2000
REVIEW_CATEGORIES = ("gaps", "contradictions", "complements")
# Items phrased as a truth verdict are discarded (RN11).
VERDICT_PATTERN = re.compile(
    r"\b(verdadeir[oa]s?|fals[oa]s?|true|false|fake|mentira|veredito|verdict)\b",
    re.IGNORECASE,
)
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


def _generate_json(prompt: str, schema: dict):
    client = _get_client()
    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": schema,
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
        return json.loads(text)
    except json.JSONDecodeError as error:
        raise GeminiEmptyResponseError("Gemini returned invalid JSON format") from error


def _generate_json_list(prompt: str) -> list[str]:
    items = _generate_json(prompt, {"type": "ARRAY", "items": {"type": "STRING"}})
    if not isinstance(items, list):
        raise GeminiEmptyResponseError("Gemini returned invalid JSON format")

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


def review_claim(
    claim_text: str, evidences: list[dict], sources: list[dict]
) -> dict[str, list[dict]]:
    sources_text = "\n".join(
        f"- source_id={src['id']} | title: {src['title']} | url: {src['url']}"
        + (
            f" | content: {src['content'][:MAX_SOURCE_CONTENT_CHARS]}"
            if src["content"]
            else ""
        )
        for src in sources
    )
    evidences_text = "\n".join(
        f"- evidence_id={ev['id']} | source_id={ev['source_id']}"
        f" | description: {ev['description']} | excerpt: {ev['excerpt'] or ''}"
        for ev in evidences
    )
    prompt = (
        "You are a critical-thinking assistant. Analyze the claim below together "
        "with the evidences and sources registered by the researcher, and point "
        "out gaps (what is missing to analyze the claim), contradictions (between "
        "evidences, sources or the claim) and complements (additional aspects "
        "worth investigating). Every item MUST cite the evidence_id and/or "
        "source_id it is based on, using only the ids listed below. Do NOT state "
        "whether the claim is true or false and do not give any verdict; the "
        "conclusion belongs to the researcher. Write the items in the same "
        "language as the claim.\n\n"
        f"Claim:\n{claim_text}\n\n"
        f"Evidences:\n{evidences_text or '(none)'}\n\n"
        f"Sources:\n{sources_text or '(none)'}"
    )
    item_schema = {
        "type": "OBJECT",
        "properties": {
            "text": {"type": "STRING"},
            "evidence_id": {"type": "STRING", "nullable": True},
            "source_id": {"type": "STRING", "nullable": True},
        },
        "required": ["text"],
    }
    data = _generate_json(
        prompt,
        {
            "type": "OBJECT",
            "properties": {
                category: {"type": "ARRAY", "items": item_schema}
                for category in REVIEW_CATEGORIES
            },
            "required": list(REVIEW_CATEGORIES),
        },
    )
    if not isinstance(data, dict):
        raise GeminiEmptyResponseError("Gemini returned invalid JSON format")

    evidence_ids = {ev["id"] for ev in evidences}
    source_ids = {src["id"] for src in sources}
    review = {}
    for category in REVIEW_CATEGORIES:
        review[category] = []
        for item in data.get(category) or []:
            if not isinstance(item, dict):
                continue
            text = str(item.get("text") or "").strip()
            evidence_id = item.get("evidence_id")
            source_id = item.get("source_id")
            evidence_id = evidence_id if evidence_id in evidence_ids else None
            source_id = source_id if source_id in source_ids else None
            # Items without a valid citation (RN12) or with a verdict (RN11) are dropped.
            if not text or (evidence_id is None and source_id is None):
                continue
            if VERDICT_PATTERN.search(text):
                continue
            review[category].append(
                {"text": text, "evidence_id": evidence_id, "source_id": source_id}
            )
    return review
