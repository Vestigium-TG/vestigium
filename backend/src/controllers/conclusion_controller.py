import uuid

from fastapi import APIRouter, Depends, HTTPException

from database import connect_db
from services.auth_service import get_current_user_id
from services.database_service import check_investigation_ownership

router = APIRouter(prefix="/investigations", tags=["conclusion"])


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
