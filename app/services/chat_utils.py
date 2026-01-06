from sqlalchemy.orm import Session
from ..db.repositories.chats import crud as chats_crud
from ..db.repositories.users import crud as users_crud
from ..api.v1.routers.ws_schemas import ChatItem

def _get_chat_for_user(db: Session, chat_id: str, user_id: str):
    chat = chats_crud.get_chat(db, chat_id)
    if not chat or user_id not in (chat.user1_id, chat.user2_id):
        return None
    return chat

def build_companion_data(db: Session, chat, current_user_id: str):
    companion_id = chat.user1_id if chat.user2_id == current_user_id else chat.user2_id
    companion = users_crud.get_user_by_id(db, companion_id)
    companion_name = getattr(companion, "name", None) or getattr(companion, "login", None) or str(companion_id)
    
    return {
        "companion_id": companion_id,
        "companion_name": companion_name,
    }

def _build_chat_item(db: Session, chat, current_user_id: str) -> ChatItem:
    companion_id = chat.user1_id if chat.user2_id == current_user_id else chat.user2_id
    companion = users_crud.get_user_by_id(db, companion_id)

    last_msg_obj = chats_crud.get_last_message_for_chat(db, chat.id)
    if last_msg_obj:
        last_msg = last_msg_obj.content
        last_msg_at = last_msg_obj.created_at.isoformat()
    else:
        last_msg = "История пуста"
        last_msg_at = None

    return ChatItem(
        id=chat.id,
        companion_id=companion_id,
        companion_name=getattr(companion, "name", None),
        last_message=last_msg,
        last_message_at=last_msg_at,
    )