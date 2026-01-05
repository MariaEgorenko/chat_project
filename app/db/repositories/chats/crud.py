from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from .models import Chat, Message

def get_or_create_chat_between(
        db: Session, user_id: str, companion_id: str
) -> Tuple[Chat, bool]:
    if user_id == companion_id:
        raise ValueError("You can't create a chat with yourself")
    
    u1, u2 = sorted([user_id, companion_id])
    chat = (
        db.query(Chat)
        .filter(and_(Chat.user1_id == u1, Chat.user2_id == u2))
        .first()
    )
    if chat:
        return chat, False
    
    chat = Chat(user1_id=u1, user2_id=u2)
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat, True

def get_user_chats(db: Session, user_id: str) -> List[Chat]:
    return (
        db.query(Chat)
        .filter(or_(Chat.user1_id == user_id, Chat.user2_id == user_id))
        .all()
    )

def get_chat(db: Session, chat_id: str) -> Optional[Chat]:
    return db.query(Chat).filter(Chat.id == chat_id).first()

def create_message(
        db: Session, sender_id: str, recipient_id:str, chat_id: str, content: str
) -> Message:
    msg = Message(chat_id=chat_id, sender_id=sender_id, recipient_id=recipient_id, content=content)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg

def get_chat_messages(
        db: Session, chat_id: str, limit: int = 50, offset: int = 0
) -> List[Message]:
    return (
        db.query(Message)
        .filter(Message.chat_id == chat_id)
        .order_by(Message.created_at.asc())
        .limit(limit)
        .all()
    )

def get_last_message_for_chat(db: Session, chat_id: str) -> Message | None:
    return (
        db.query(Message)
        .filter(Message.chat_id == chat_id)
        .order_by(desc(Message.created_at))
        .first()
    )