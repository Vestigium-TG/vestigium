import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException

from backend.services.ai_service import (
    GeminiEmptyResponseError,
    GeminiUnavailableError,
    generate_questions,
)


def get_claim_with_ownership(cursor, claim_id: uuid.UUID, user_id: str) -> dict:
    cursor.execute(
        """
        SELECT c.id, c.investigation_id, c.source_id, c.text, c.relevance,
               c.created_at, i.user_id
        FROM claims c
        JOIN investigations i ON i.id = c.investigation_id
        WHERE c.id = %s
        """,
        (str(claim_id),),
    )

    result = cursor.fetchone()

    if result is None:
        raise HTTPException(status_code=404, detail="Claim not found")

    if str(result[6]) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return {
        "id": str(result[0]),
        "investigation_id": str(result[1]),
        "source_id": str(result[2]) if result[2] else None,
        "text": result[3],
        "relevance": result[4],
        "created_at": result[5],
    }


def generate_and_persist_questions(
    cursor, claim_id: str, claim_text: str
) -> list[dict]:
    try:
        question_texts = generate_questions(claim_text)
    except GeminiEmptyResponseError:
        raise HTTPException(status_code=422, detail="No questions generated")
    except GeminiUnavailableError:
        raise HTTPException(status_code=503, detail="AI service currently unavailable")

    now = datetime.now(tz=ZoneInfo("America/Sao_Paulo"))
    created_questions = []

    for text in question_texts:
        question_id = uuid.uuid4()
        cursor.execute(
            """
            INSERT INTO questions (id, claim_id, text, answer, type, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (str(question_id), claim_id, text, None, None, now),
        )

        created_questions.append(
            {
                "id": str(question_id),
                "claim_id": claim_id,
                "text": text,
                "answer": None,
                "type": None,
                "created_at": now,
            }
        )

    return created_questions
