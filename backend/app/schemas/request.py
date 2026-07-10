from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.project import ProjectResponse
from app.schemas.user import UserResponse

class RequestBase(BaseModel):
    target_project_id: Optional[int] = None
    type: str # help / official_letter / event_host / other
    subject: str
    description: str

class RequestCreate(RequestBase):
    # For guest / community_user auto-registration
    guest_name: Optional[str] = None
    guest_phone: Optional[str] = None
    guest_age: Optional[int] = None

class RequestStatusUpdate(BaseModel):
    status: str
    response: Optional[str] = None

class RequestResponse(RequestBase):
    id: int
    requester_id: int
    status: str
    response: Optional[str] = None
    created_at: datetime
    requester: Optional[UserResponse] = None
    target_project: Optional[ProjectResponse] = None

    model_config = ConfigDict(from_attributes=True)
