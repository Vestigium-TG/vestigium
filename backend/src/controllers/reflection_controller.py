import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException

from database import connect_db
from models.reflection_model import ReflectionCreate
from services.auth_service import get_current_user_id
from services.database_service import get_claim_with_ownership

router = APIRouter(prefix="/claims", tags=["reflections"])
router_reflection = APIRouter(prefix="/reflection", tags=["reflections"])


@router.get("/{claim_id}/reflection")
def list_reflections(
    claim_id: uuid.UUID, user_id: str = Depends(get_current_user_id)
):
    conn = connect_db()
    cursor = conn.cursor()
    try:
        claim = get_claim_with_ownership(cursor, claim_id, user_id)
        cursor.execute(
            "SELECT id, claim_id, text, created_at FROM reflections WHERE claim_id = %s ORDER BY created_at",
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
            "created_at": i[3],
        }
        for i in results
    ]


@router.post("/{claim_id}/reflection")
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


@router_reflection.delete("/{reflection_id}")
def delete_reflection(
    reflection_id: uuid.UUID, user_id: str = Depends(get_current_user_id)
):
    conn = connect_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT claim_id FROM reflections WHERE id = %s", (str(reflection_id),)
        )
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Reflection not found")
        get_claim_with_ownership(cursor, result[0], user_id)

        cursor.execute("DELETE FROM reflections WHERE id = %s", (str(reflection_id),))
        conn.commit()
    finally:
        cursor.close()
        conn.close()
    return {"message": "Reflection deleted successfully"}
