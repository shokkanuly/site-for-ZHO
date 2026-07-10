from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.room import RoomResponse
from app.schemas.user import UserResponse

class BookingBase(BaseModel):
    room_id: int
    date: date
    time_start: str
    time_end: str

class BookingCreate(BookingBase):
    event_id: Optional[int] = None
    # For guest / community_user auto-registration
    guest_name: Optional[str] = None
    guest_phone: Optional[str] = None
    guest_age: Optional[int] = None

class BookingResponse(BookingBase):
    id: int
    requested_by: int
    event_id: Optional[int] = None
    status: str
    created_at: datetime
    room: Optional[RoomResponse] = None
    user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
