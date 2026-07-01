from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class UserBase(BaseModel):
    id: int # Telegram User ID
    username: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None
    role: str = "volunteer"

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    points: Optional[int] = None

class UserResponse(UserBase):
    points: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
