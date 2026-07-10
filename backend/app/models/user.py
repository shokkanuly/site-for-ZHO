from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, BigInteger, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, index=True) # Telegram User ID or unique ID
    username = Column(String, nullable=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    role = Column(String, default="volunteer", nullable=False) # 'super_admin', 'project_admin', 'volunteer', 'community_user'
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True) # Associated project (e.g. for admins/volunteers)
    points = Column(Integer, default=0, nullable=False) # Gamification points
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="users")
    registrations = relationship("EventRegistration", back_populates="user", cascade="all, delete-orphan")
    events_organized = relationship("Event", back_populates="organizer", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")
    volunteer_profiles = relationship("VolunteerProfile", back_populates="user", foreign_keys="[VolunteerProfile.user_id]", cascade="all, delete-orphan")
    news = relationship("News", back_populates="author")
    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")
    requests = relationship("Request", back_populates="requester", cascade="all, delete-orphan")

