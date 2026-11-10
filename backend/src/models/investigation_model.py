from pydantic import BaseModel


class InvestigationCreate(BaseModel):
    title: str
    input_type: str
    original_content: str


class InvestigationUpdate(BaseModel):
    title: str | None = None
    status: str | None = None
    input_type: str | None = None
    original_content: str | None = None
