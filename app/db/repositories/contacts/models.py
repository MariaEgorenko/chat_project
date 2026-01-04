import uuid
from sqlalchemy import Column, String, ForeignKey
from ...base import Base


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    contact_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))


class ContactRequest(Base):
    __tablename__ = "contact_requests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    from_user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    to_user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))