import uuid
from sqlalchemy import Column, String
from ...base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    login = Column(String, unique=True, index=True)
    name = Column(String, index=True)
    hashed_password = Column(String)