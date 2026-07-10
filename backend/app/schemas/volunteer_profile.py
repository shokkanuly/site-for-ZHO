from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.project import ProjectResponse
from app.schemas.user import UserResponse

class VolunteerProfileBase(BaseModel):
    user_id: int
    project_id: int
    skills: Optional[str] = None
    hours_logged: int = 0
    status: str = "active"
    coordinator_id: Optional[int] = None

class VolunteerProfileCreate(BaseModel):
    # Used by admins to register a user directly as a volunteer
    username: str
    first_name: str
    phone: Optional[str] = None
    age: Optional[int] = None
    project_id: int
    skills: Optional[str] = None
    coordinator_id: Optional[int] = None

class VolunteerProfileResponse(VolunteerProfileBase):
    id: int
    joined_at: datetime
    user: Optional[UserResponse] = None
    project: Optional[ProjectResponse] = None
    coordinator: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
