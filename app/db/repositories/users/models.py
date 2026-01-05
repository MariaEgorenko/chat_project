import uuid
from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from ...base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    login = Column(String, unique=True, index=True)
    name = Column(String, index=True)
    hashed_password = Column(String)

    sent_messages = relationship(
        "Message",
        foreign_keys="Message.sender_id",
        back_populates="sender",
    )

    received_messages = relationship(
        "Message",
        foreign_keys="Message.recipient_id",
        back_populates="recipient",
    )