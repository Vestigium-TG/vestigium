from pydantic import BaseModel


class ConclusionUpsert(BaseModel):
    text: str
