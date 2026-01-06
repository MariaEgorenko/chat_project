import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from ...base import Base


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    contact_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)


class ContactRequest(Base):
    __tablename__ = "contact_requests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    from_user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    to_user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))

    from_user = relationship("User", foreign_keys=[from_user_id], lazy="joined")
    to_user = relationship("User", foreign_keys=[to_user_id], lazy="joined")