from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, BigInteger
from sqlalchemy.orm import relationship
from app.database import Base


class DirectChatRoom(Base):
    """A persistent chat room between staff members (leaders channel or per-project channel)."""
    __tablename__ = "direct_chat_rooms"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    # "leaders" = global leaders channel, "project_2", "project_3" etc = project-specific
    room_key = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    messages = relationship("DirectChatMessage", back_populates="room", cascade="all, delete-orphan")


class DirectChatMessage(Base):
    """A message in a DirectChatRoom."""
    __tablename__ = "direct_chat_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    room_id = Column(Integer, ForeignKey("direct_chat_rooms.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    room = relationship("DirectChatRoom", back_populates="messages")
    sender = relationship("User", back_populates="direct_messages")
