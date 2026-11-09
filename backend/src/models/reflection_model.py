from pydantic import BaseModel


class ReflectionCreate(BaseModel):
    text: str
