import json
from sqlalchemy.orm import Session
from . import models

def create_pending_message(
        db: Session, user_id: str, type_: str, data: dict
        ) -> models.PendingMessage:
    msg = models.PendingMessage(
        user_id=user_id,
        type=type_,
        payload=json.dumps(data),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg

def list_pending_messages(db: Session, user_id: str):
    return (
        db.query(models.PendingMessage)
        .filter(models.PendingMessage.user_id == user_id)
        .order_by(models.PendingMessage.created_at)
        .all()
    )

def delete_pending_message(db: Session, msg: models.PendingMessage):
    db.delete(msg)
    db.commit()