from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.user import UserResponse

class EventBase(BaseModel):
    title: str
    description: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: str
    event_date: datetime
    category: str = "general"
    points_reward: int = 10
    project_id: Optional[int] = None
    room_id: Optional[int] = None

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    event_date: Optional[datetime] = None
    status: Optional[str] = None
    category: Optional[str] = None
    points_reward: Optional[int] = None
    project_id: Optional[int] = None
    room_id: Optional[int] = None

class EventResponse(EventBase):
    id: int
    organizer_id: int
    status: str
    created_at: datetime
    organizer: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)



class EventRegistrationCreate(BaseModel):
    event_id: int

class EventRegistrationResponse(BaseModel):
    id: int
    event_id: int
    user_id: int
    status: str
    created_at: datetime
    event: Optional[EventResponse] = None
    user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
