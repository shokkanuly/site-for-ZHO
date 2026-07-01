from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, BigInteger, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    organizer_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Location coordinates for 2GIS / Yandex Maps
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String, nullable=False)
    
    event_date = Column(DateTime, nullable=False)
    status = Column(String, default="active", nullable=False) # 'active', 'completed', 'cancelled'
    category = Column(String, default="general", nullable=False) # 'jasyl_el', 'taza_qazaqstan', 'shanyraq', 'zan_men_tartip', 'general'
    points_reward = Column(Integer, default=10, nullable=False) # Volunteer points reward
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    organizer = relationship("User", back_populates="events_organized")
    registrations = relationship("EventRegistration", back_populates="event", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="event", cascade="all, delete-orphan")


class EventRegistration(Base):
    __tablename__ = "event_registrations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="joined", nullable=False) # 'joined', 'completed', 'absent'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    event = relationship("Event", back_populates="registrations")
    user = relationship("User", back_populates="registrations")

    # Limit 1 registration per user per event
    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_event_user"),
    )
