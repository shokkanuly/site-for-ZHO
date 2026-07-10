from typing import Optional
from pydantic import BaseModel, ConfigDict

class RoomBase(BaseModel):
    name: str
    capacity: int
    description: Optional[str] = None

class RoomCreate(RoomBase):
    pass

class RoomResponse(RoomBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
