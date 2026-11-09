import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from backend.database import connect_db
from backend.models.source_model import SearchRequest
from backend.services.ai_service import (
    GeminiEmptyResponseError,
    GeminiUnavailableError,
    generate_search_queries,
    identify_claims,
    search_sources,
)
from backend.services.auth_service import get_current_user_id
from backend.services.database_service import (
    generate_and_persist_questions,
    get_claim_with_ownership,
)
from fastapi import APIRouter, Depends, HTTPException

# Two routers: claim-level endpoints live under /claims, while the endpoint that
# creates claims for an investigation lives under /investigations/{id}/claims.
router_claims = APIRouter(prefix="/claims", tags=["claims"])
router_investigations = APIRouter(prefix="/investigations", tags=["claims"])

AI_UNAVAILABLE_DETAIL = "AI service currently unavailable"


@router_investigations.post("/{investigation_id}/claims")
def create_claims(
    investigation_id: uuid.UUID, user_id: str = Depends(get_current_user_id)
):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT user_id, original_content FROM investigations WHERE id = %s",
        (str(investigation_id),),
    )
    result = cursor.fetchone()
    if not result:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Investigation not found")
    if str(result[0]) != user_id:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        claim_texts = identify_claims(result[1])
    except (GeminiEmptyResponseError, GeminiUnavailableError) as e:
        cursor.close()
        conn.close()
        raise HTTPException(
            status_code=503 if isinstance(e, GeminiUnavailableError) else 422,
            detail=str(e),
        )

    now = datetime.now(tz=ZoneInfo("America/Sao_Paulo"))
    created = []
    for text in claim_texts:
        cid = uuid.uuid4()
        cursor.execute(
            "INSERT INTO claims (id, investigation_id, source_id, text, relevance, created_at) VALUES (%s, %s, %s, %s, %s, %s)",
            (str(cid), str(investigation_id), None, text, None, now),
        )
        created.append(
            {
                "id": str(cid),
                "investigation_id": str(investigation_id),
                "source_id": None,
                "text": text,
                "relevance": None,
                "created_at": now,
            }
        )

    conn.commit()
    cursor.close()
    conn.close()
    return created


@router_claims.post("/{claim_id}/questions")
def create_questions(claim_id: uuid.UUID, user_id: str = Depends(get_current_user_id)):
    conn = connect_db()
    cursor = conn.cursor()
    try:
        claim = get_claim_with_ownership(cursor, claim_id, user_id)
        questions = generate_and_persist_questions(cursor, claim["id"], claim["text"])
    finally:
        conn.commit()
        cursor.close()
        conn.close()
    return questions


@router_claims.get("/{claim_id}/questions")
def list_questions(claim_id: uuid.UUID, user_id: str = Depends(get_current_user_id)):
    conn = connect_db()
    cursor = conn.cursor()
    try:
        claim = get_claim_with_ownership(cursor, claim_id, user_id)
        cursor.execute(
            "SELECT id, claim_id, text, answer, type, created_at FROM questions WHERE claim_id = %s ORDER BY created_at",
            (claim["id"],),
        )
        results = cursor.fetchall()
    finally:
        cursor.close()
        conn.close()
    return [
        {
            "id": str(i[0]),
            "claim_id": str(i[1]),
            "text": i[2],
            "answer": i[3],
            "type": i[4],
            "created_at": i[5],
        }
        for i in results
    ]


@router_claims.post("/{claim_id}/investigate")
def investigate_claim(claim_id: uuid.UUID, user_id: str = Depends(get_current_user_id)):
    conn = connect_db()
    cursor = conn.cursor()
    try:
        claim = get_claim_with_ownership(cursor, claim_id, user_id)
        questions = generate_and_persist_questions(cursor, claim["id"], claim["text"])
    finally:
        conn.commit()
        cursor.close()
        conn.close()
    claim["questions"] = questions
    return claim


@router_claims.post("/{claim_id}/search-queries")
def generate_claim_queries(
    claim_id: uuid.UUID, user_id: str = Depends(get_current_user_id)
):
    conn = connect_db()
    cursor = conn.cursor()
    try:
        claim = get_claim_with_ownership(cursor, claim_id, user_id)
    finally:
        cursor.close()
        conn.close()
    try:
        queries = generate_search_queries(claim["text"])
    except GeminiEmptyResponseError:
        raise HTTPException(status_code=422, detail="No search queries generated")
    except GeminiUnavailableError:
        raise HTTPException(status_code=503, detail=AI_UNAVAILABLE_DETAIL)
    return {"claim_id": claim["id"], "queries": queries}


@router_claims.post("/{claim_id}/search")
def search_claim_sources(
    claim_id: uuid.UUID,
    data: SearchRequest | None = None,
    user_id: str = Depends(get_current_user_id),
):
    conn = connect_db()
    cursor = conn.cursor()
    try:
        claim = get_claim_with_ownership(cursor, claim_id, user_id)
    finally:
        cursor.close()
        conn.close()
    query = data.query.strip() if data and data.query else None
    try:
        results = search_sources(claim["text"], query)
    except GeminiUnavailableError:
        raise HTTPException(status_code=503, detail=AI_UNAVAILABLE_DETAIL)
    return {"message": None if results else "No sources found", "results": results}
