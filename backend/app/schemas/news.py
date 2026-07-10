from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.project import ProjectResponse
from app.schemas.user import UserResponse

class NewsBase(BaseModel):
    project_id: Optional[int] = None
    title: str
    body: str

class NewsCreate(NewsBase):
    pass

class NewsResponse(NewsBase):
    id: int
    published_at: datetime
    author_id: Optional[int] = None
    project: Optional[ProjectResponse] = None
    author: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
