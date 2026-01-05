import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import (
    Column, String, Integer, Text, DateTime,
    ForeignKey, Boolean, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.db.base import Base

def current_time():
    return datetime.now(timezone(timedelta(hours=3)))

class Chat(Base):
    __tablename__ = "chats"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user1_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user2_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        UniqueConstraint("user1_id", "user2_id", name="uq_chat_user_pair"),
    )

    user1 = relationship("User", foreign_keys=[user1_id])
    user2 = relationship("User", foreign_keys=[user2_id])
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    chat_id = Column(String, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recipient_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=current_time, nullable=False)

    chat = relationship("Chat", back_populates="messages")
    sender = relationship(
        "User",
        foreign_keys=[sender_id],
        back_populates="sent_messages",
    )
    recipient = relationship(
        "User",
        foreign_keys=[recipient_id],
        back_populates="received_messages",
    )
