from sqlalchemy import Column, String, Integer
from sqlalchemy.orm import relationship
from app.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False) # e.g. shanyraq, jasyl_el, taza_qazaqstan, zan_men_tartip, zhastar_ortalygy
    type = Column(String, default="partner", nullable=False) # core / partner
    description = Column(String, nullable=True)
    contact = Column(String, nullable=True)

    # Relationships
    users = relationship("User", back_populates="project")
    events = relationship("Event", back_populates="project")
    news = relationship("News", back_populates="project")
    requests = relationship("Request", back_populates="target_project")
    volunteer_profiles = relationship("VolunteerProfile", back_populates="project", cascade="all, delete-orphan")
