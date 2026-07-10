from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, BigInteger
from sqlalchemy.orm import relationship
from app.database import Base

class VolunteerProfile(Base):
    __tablename__ = "volunteer_profiles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    skills = Column(String, nullable=True)
    hours_logged = Column(Integer, default=0, nullable=False)
    status = Column(String, default="active", nullable=False) # active / inactive
    coordinator_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    user = relationship("User", back_populates="volunteer_profiles", foreign_keys=[user_id])
    coordinator = relationship("User", foreign_keys=[coordinator_id])
    project = relationship("Project", back_populates="volunteer_profiles")
