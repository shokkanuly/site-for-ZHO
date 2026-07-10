from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, BigInteger
from sqlalchemy.orm import relationship
from app.database import Base

class Request(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    requester_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True) # routed to project
    
    type = Column(String, default="help", nullable=False) # help / official_letter / event_host / other
    subject = Column(String, nullable=False)
    description = Column(String, nullable=False)
    status = Column(String, default="pending", nullable=False) # pending / approved / rejected / resolved
    response = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    # Relationships
    requester = relationship("User", back_populates="requests")
    target_project = relationship("Project", back_populates="requests")
