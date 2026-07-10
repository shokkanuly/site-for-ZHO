from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, ForeignKey, Date, DateTime, BigInteger
from sqlalchemy.orm import relationship
from app.database import Base

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    requested_by = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="SET NULL"), nullable=True) # Linked public event if any
    
    date = Column(Date, nullable=False)
    time_start = Column(String, nullable=False) # e.g. "10:00"
    time_end = Column(String, nullable=False)   # e.g. "12:00"
    status = Column(String, default="pending", nullable=False) # pending / approved / rejected
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    # Relationships
    room = relationship("Room", back_populates="bookings")
    user = relationship("User", back_populates="bookings")
    event = relationship("Event", back_populates="bookings")
