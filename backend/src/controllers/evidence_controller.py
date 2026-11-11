import uuid

from fastapi import APIRouter, Depends, HTTPException

from database import connect_db, current_timestamp
from models.evidence_model import EvidenceCreate
from services.auth_service import get_current_user_id
from services.database_service import get_claim_with_ownership

router = APIRouter(prefix="/claims", tags=["evidences"])
router_evidences = APIRouter(prefix="/evidences", tags=["evidences"])


@router.get("/{claim_id}/evidences")
def list_evidences(claim_id: uuid.UUID, user_id: str = Depends(get_current_user_id)):
    conn = connect_db()
    cursor = conn.cursor()
    try:
        claim = get_claim_with_ownership(cursor, claim_id, user_id)
        cursor.execute(
            "SELECT id, claim_id, source_id, description, excerpt, type, created_at FROM evidences WHERE claim_id = %s ORDER BY created_at",
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
            "source_id": str(i[2]),
            "description": i[3],
            "excerpt": i[4],
            "type": i[5],
            "created_at": i[6],
        }
        for i in results
    ]


@router.post("/{claim_id}/evidences")
def register_evidence(
    claim_id: uuid.UUID,
    data: EvidenceCreate,
    user_id: str = Depends(get_current_user_id),
):
    if not data.description.strip() and not (data.excerpt or "").strip():
        raise HTTPException(
            status_code=422, detail="excerpt and description cannot both be empty"
        )
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

        now = current_timestamp()
        eid = uuid.uuid4()
        cursor.execute(
            "INSERT INTO evidences (id, claim_id, source_id, description, excerpt, type, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s)",
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


@router_evidences.delete("/{evidence_id}")
def delete_evidence(
    evidence_id: uuid.UUID, user_id: str = Depends(get_current_user_id)
):
    conn = connect_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT claim_id FROM evidences WHERE id = %s", (str(evidence_id),)
        )
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Evidence not found")
        get_claim_with_ownership(cursor, result[0], user_id)

        cursor.execute("DELETE FROM evidences WHERE id = %s", (str(evidence_id),))
        conn.commit()
    finally:
        cursor.close()
        conn.close()
    return {"message": "Evidence deleted successfully"}
