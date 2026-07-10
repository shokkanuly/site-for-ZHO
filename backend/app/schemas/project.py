from typing import Optional
from pydantic import BaseModel, ConfigDict

class ProjectBase(BaseModel):
    name: str
    slug: str
    type: str = "partner" # core / partner
    description: Optional[str] = None
    contact: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
