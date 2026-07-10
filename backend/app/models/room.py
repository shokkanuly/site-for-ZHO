from sqlalchemy import Column, String, Integer
from sqlalchemy.orm import relationship
from app.database import Base

class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    capacity = Column(Integer, nullable=False)
    description = Column(String, nullable=True)

    # Relationships
    events = relationship("Event", back_populates="room")
    bookings = relationship("Booking", back_populates="room", cascade="all, delete-orphan")
