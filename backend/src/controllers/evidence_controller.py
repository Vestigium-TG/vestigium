import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from backend.database import connect_db
from backend.models.evidence_model import EvidenceCreate
from backend.services.auth_service import get_current_user_id
from backend.services.database_service import get_claim_with_ownership
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter(prefix="/claims", tags=["evidence"])


@router.post("/{claim_id}/evidence")
def register_evidence(
    claim_id: uuid.UUID,
    data: EvidenceCreate,
    user_id: str = Depends(get_current_user_id),
):
    if not data.description.strip():
        raise HTTPException(status_code=422, detail="description cannot be empty")
    conn = connect_db()
    cursor = conn.cursor()
    try:
        claim = get_claim_with_ownership(cursor, claim_id, user_id)
        cursor.execute(
            "SELECT id FROM sources WHERE id = %s AND investigation_id = %s",
            (str(data.source_id), claim["investigation_id"]),
        )
        if not cursor.fetchone():
            raise HTTPException(
                status_code=404, detail="Source not found in this investigation"
            )

        now = datetime.now(tz=ZoneInfo("America/Sao_Paulo"))
        eid = uuid.uuid4()
        cursor.execute(
            "INSERT INTO evidence (id, claim_id, source_id, description, excerpt, type, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (
                str(eid),
                claim["id"],
                str(data.source_id),
                data.description,
                data.excerpt,
                data.type,
                now,
            ),
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()
    return {
        "id": str(eid),
        "claim_id": claim["id"],
        "source_id": str(data.source_id),
        "description": data.description,
        "excerpt": data.excerpt,
        "type": data.type,
        "created_at": now,
    }
