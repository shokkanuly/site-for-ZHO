from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserResponse

class ChatMessageCreate(BaseModel):
    message: str

class ChatMessageResponse(BaseModel):
    id: int
    event_id: int
    user_id: int
    message: str
    created_at: datetime
    user: UserResponse

    model_config = ConfigDict(from_attributes=True)
