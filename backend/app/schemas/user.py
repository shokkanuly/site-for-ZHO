from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class UserBase(BaseModel):
    id: int # Unique user ID
    username: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None
    phone: Optional[str] = None
    age: Optional[int] = None
    role: str = "volunteer" # super_admin / project_admin / volunteer / community_user
    project_id: Optional[int] = None

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    age: Optional[int] = None
    role: Optional[str] = None
    project_id: Optional[int] = None
    points: Optional[int] = None

class UserResponse(UserBase):
    points: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

