import uuid

from pydantic import BaseModel


class EvidenceCreate(BaseModel):
    source_id: uuid.UUID
    description: str = ""
    excerpt: str | None = None
    type: str | None = None
