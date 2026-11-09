import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from backend.database import connect_db
from backend.models.reflection_model import ReflectionCreate
from backend.services.auth_service import get_current_user_id
from backend.services.database_service import get_claim_with_ownership
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter(prefix="/claims", tags=["reflections"])


@router.post("/{claim_id}/reflections")
def register_reflection(
    claim_id: uuid.UUID,
    data: ReflectionCreate,
    user_id: str = Depends(get_current_user_id),
):
    if not data.text.strip():
        raise HTTPException(status_code=422, detail="text cannot be empty")

    conn = connect_db()
    cursor = conn.cursor()

    try:
        claim = get_claim_with_ownership(cursor, claim_id, user_id)
    except HTTPException:
        cursor.close()
        conn.close()
        raise

    now = datetime.now(tz=ZoneInfo("America/Sao_Paulo"))
    reflection_id = uuid.uuid4()

    cursor.execute(
        """
        INSERT INTO reflections (id, claim_id, text, created_at)
        VALUES (%s, %s, %s, %s)
        """,
        (str(reflection_id), claim["id"], data.text, now),
    )

    conn.commit()
    cursor.close()
    conn.close()

    return {
        "id": str(reflection_id),
        "claim_id": claim["id"],
        "text": data.text,
        "created_at": now,
    }
