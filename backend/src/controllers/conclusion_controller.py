import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException

from database import connect_db
from models.conclusion_model import ConclusionUpsert
from services.auth_service import get_current_user_id
from services.database_service import check_investigation_ownership

router = APIRouter(prefix="/investigations", tags=["conclusion"])

CONCLUDED_STATUS = "concluida"


@router.get("/{investigation_id}/conclusion")
def get_conclusion(
    investigation_id: uuid.UUID, user_id: str = Depends(get_current_user_id)
):
    conn = connect_db()
    cursor = conn.cursor()
    try:
        check_investigation_ownership(cursor, investigation_id, user_id)
        cursor.execute(
            "SELECT id, investigation_id, text, created_at, updated_at FROM conclusions WHERE investigation_id = %s",
            (str(investigation_id),),
        )
        result = cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

    if result is None:
        raise HTTPException(status_code=404, detail="Conclusion not found")
    return {
        "id": str(result[0]),
        "investigation_id": str(result[1]),
        "text": result[2],
        "created_at": result[3],
        "updated_at": result[4],
    }


@router.put("/{investigation_id}/conclusion")
def upsert_conclusion(
    investigation_id: uuid.UUID,
    data: ConclusionUpsert,
    user_id: str = Depends(get_current_user_id),
):
    if not data.text.strip():
        raise HTTPException(status_code=422, detail="text cannot be empty")

    conn = connect_db()
    cursor = conn.cursor()
    try:
        check_investigation_ownership(cursor, investigation_id, user_id)
        cursor.execute(
            """
            SELECT 1 FROM reflections r
            JOIN claims c ON c.id = r.claim_id
            WHERE c.investigation_id = %s
            LIMIT 1
            """,
            (str(investigation_id),),
        )
        if not cursor.fetchone():
            raise HTTPException(
                status_code=422,
                detail="At least one reflection must be registered before concluding",
            )

        now = datetime.now(tz=ZoneInfo("America/Sao_Paulo"))
        cursor.execute(
            """
            INSERT INTO conclusions (id, investigation_id, text, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (investigation_id)
            DO UPDATE SET text = EXCLUDED.text, updated_at = EXCLUDED.updated_at
            RETURNING id, created_at
            """,
            (str(uuid.uuid4()), str(investigation_id), data.text, now, now),
        )
        conclusion_id, created_at = cursor.fetchone()
        cursor.execute(
            "UPDATE investigations SET status = %s, updated_at = %s WHERE id = %s",
            (CONCLUDED_STATUS, now, str(investigation_id)),
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()
    return {
        "id": str(conclusion_id),
        "investigation_id": str(investigation_id),
        "text": data.text,
        "created_at": created_at,
        "updated_at": now,
    }
