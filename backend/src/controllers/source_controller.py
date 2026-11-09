import uuid

from backend.database import connect_db
from backend.models.source_model import SourcesCreate
from backend.services.auth_service import get_current_user_id
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter(prefix="/investigations", tags=["sources"])


@router.post("/{investigation_id}/sources")
def register_sources(
    investigation_id: uuid.UUID,
    data: SourcesCreate,
    user_id: str = Depends(get_current_user_id),
):
    for src in data.sources:
        if not src.url.strip() or not src.title.strip():
            raise HTTPException(status_code=422, detail="url and title cannot be empty")

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

    created = []
    for src in data.sources:
        sid = uuid.uuid4()
        cursor.execute(
            "INSERT INTO sources (id, investigation_id, url, title, content, type, accessed_at) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (
                str(sid),
                str(investigation_id),
                src.url,
                src.title,
                src.content,
                src.type,
                src.accessed_at,
            ),
        )
        created.append(
            {
                "id": str(sid),
                "investigation_id": str(investigation_id),
                "url": src.url,
                "title": src.title,
                "content": src.content,
                "type": src.type,
                "accessed_at": src.accessed_at,
            }
        )

    conn.commit()
    cursor.close()
    conn.close()
    return created


@router.get("/{investigation_id}/sources")
def list_sources(
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

    cursor.execute(
        "SELECT id, investigation_id, url, title, content, type, accessed_at FROM sources WHERE investigation_id = %s",
        (str(investigation_id),),
    )
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {
            "id": str(i[0]),
            "investigation_id": str(i[1]),
            "url": i[2],
            "title": i[3],
            "content": i[4],
            "type": i[5],
            "accessed_at": i[6],
        }
        for i in results
    ]
