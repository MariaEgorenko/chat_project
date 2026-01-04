import uuid 
import json
from sqlalchemy import Column, String, DateTime, ForeignKey, func
from ...base import Base


class PendingMessage(Base):
    __tablename__ = 'pending_messages'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)
    payload = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    def payload_dict(self) -> dict:
        return json.loads(self.payload)