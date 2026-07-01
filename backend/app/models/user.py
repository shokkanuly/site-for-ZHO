from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, BigInteger, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, index=True) # Telegram User ID
    username = Column(String, nullable=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=True)
    role = Column(String, default="volunteer", nullable=False) # 'volunteer' or 'organizer'
    points = Column(Integer, default=0, nullable=False) # Gamification points
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    registrations = relationship("EventRegistration", back_populates="user", cascade="all, delete-orphan")
    events_organized = relationship("Event", back_populates="organizer", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")
