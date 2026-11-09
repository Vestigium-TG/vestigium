from datetime import datetime

from pydantic import BaseModel, Field


class SourceCreate(BaseModel):
    url: str
    title: str
    content: str | None = None
    type: str | None = None
    accessed_at: datetime | None = None

class SourcesCreate(BaseModel):
    sources: list[SourceCreate] = Field(min_length=1)

class SearchRequest(BaseModel):
    query: str | None = None
