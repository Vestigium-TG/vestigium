import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException

from database import connect_db
from models.investigation_model import InvestigationCreate, InvestigationUpdate
from services.auth_service import get_current_user_id

router = APIRouter(prefix="/investigations", tags=["investigations"])

VALID_INPUT_TYPES = {"url", "text"}
INITIAL_STATUS = "in_progress"


def validate_input_type(input_type: str) -> None:
    if input_type not in VALID_INPUT_TYPES:
        raise HTTPException(
            status_code=422, detail="input_type must be 'url' or 'text'"
        )


@router.post("")
def create_investigation(
    data: InvestigationCreate, user_id: str = Depends(get_current_user_id)
):
    if not data.title.strip() or not data.original_content.strip():
        raise HTTPException(
            status_code=422, detail="title and original_content cannot be empty"
        )
    validate_input_type(data.input_type)

    conn = connect_db()
    cursor = conn.cursor()
    now = datetime.now(tz=ZoneInfo("America/Sao_Paulo"))
    investigation_id = uuid.uuid4()

    cursor.execute(
        """
        INSERT INTO investigations
        (id, user_id, title, input_type, original_content, status, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            str(investigation_id),
            user_id,
            data.title,
            data.input_type,
            data.original_content,
            INITIAL_STATUS,
            now,
            now,
        ),
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {
        "message": "Investigation created successfully",
        "id": str(investigation_id),
    }


@router.get("")
def list_investigations(user_id: str = Depends(get_current_user_id)):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, user_id, title, input_type, original_content, status, created_at, updated_at FROM investigations WHERE user_id = %s",
        (user_id,),
    )
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {
            "id": str(item[0]),
            "user_id": str(item[1]),
            "title": item[2],
            "input_type": item[3],
            "original_content": item[4],
            "status": item[5],
            "created_at": item[6],
            "updated_at": item[7],
        }
        for item in results
    ]


@router.get("/{investigation_id}")
def get_investigation(
    investigation_id: uuid.UUID, user_id: str = Depends(get_current_user_id)
):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, user_id, title, input_type, original_content, status, created_at, updated_at FROM investigations WHERE id = %s",
        (str(investigation_id),),
    )
    result = cursor.fetchone()

    cursor.execute(
        "SELECT id, investigation_id, source_id, text, relevance, created_at FROM claims WHERE investigation_id = %s ORDER BY created_at",
        (str(investigation_id),),
    )
    claims = [
        {
            "id": str(i[0]),
            "investigation_id": str(i[1]),
            "source_id": str(i[2]) if i[2] else None,
            "text": i[3],
            "relevance": i[4],
            "created_at": i[5],
        }
        for i in cursor.fetchall()
    ]

    cursor.close()
    conn.close()

    if result is None:
        raise HTTPException(status_code=404, detail="Investigation not found")
    if str(result[1]) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return {
        "id": str(result[0]),
        "user_id": str(result[1]),
        "title": result[2],
        "input_type": result[3],
        "original_content": result[4],
        "status": result[5],
        "created_at": result[6],
        "updated_at": result[7],
        "claims": claims,
    }


@router.patch("/{investigation_id}")
def update_investigation(
    investigation_id: uuid.UUID,
    data: InvestigationUpdate,
    user_id: str = Depends(get_current_user_id),
):
    if data.input_type is not None:
        validate_input_type(data.input_type)
    for field_name in ("title", "original_content"):
        value = getattr(data, field_name)
        if value is not None and not value.strip():
            raise HTTPException(status_code=422, detail=f"{field_name} cannot be empty")
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT user_id FROM investigations WHERE id = %s", (str(investigation_id),)
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

    fields = {
        k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None
    }
    fields["updated_at"] = datetime.now(tz=ZoneInfo("America/Sao_Paulo"))
    set_clause = ", ".join(f"{k} = %s" for k in fields)
    cursor.execute(
        f"UPDATE investigations SET {set_clause} WHERE id = %s",
        (*fields.values(), str(investigation_id)),
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Investigation updated successfully"}


@router.delete("/{investigation_id}")
def delete_investigation(
    investigation_id: uuid.UUID, user_id: str = Depends(get_current_user_id)
):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT user_id FROM investigations WHERE id = %s", (str(investigation_id),)
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

    inv_id = str(investigation_id)
    for table in ["evidences", "questions", "reflections"]:
        cursor.execute(
            f"DELETE FROM {table} WHERE claim_id IN (SELECT id FROM claims WHERE investigation_id = %s)",
            (inv_id,),
        )
    for table in ["claims", "sources", "conclusions", "investigations"]:
        cursor.execute(
            f"DELETE FROM {table} WHERE investigation_id = %s"
            if table != "investigations"
            else f"DELETE FROM {table} WHERE id = %s",
            (inv_id,),
        )

    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Investigation deleted successfully"}
