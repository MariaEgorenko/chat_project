from typing import Dict, Any, Awaitable, Callable
from sqlalchemy.orm import Session

from ....db.repositories.chats import crud as chats_crud
from ....db.repositories.pending import crud as pending_crud
from .ws_utils import send_ws_message, require_auth
from . import ws_schemas
from ....services.chat_utils import _build_chat_item, _get_chat_for_user

WSHandler = Callable[[dict, Any, Session, Dict[str, Any], Dict[str, Any]], Awaitable[None]]

async def handle_create_chat(msg, websocket, db: Session, active_ws, state):
    """
    action: "create_chat"
    data: {"companion_id": str}
    Создаёт (или возвращает существующий) персональный чат между текущим пользователем и companion_id.
    """
    user = await require_auth(state, websocket)
    if not user:
        return
    
    data = msg.get("data") or {}
    companion_id = data.get("companion_id")
    if not companion_id:
        await send_ws_message(
            websocket,
            "error",
            ws_schemas.ErrorData(detail="companion_id required"),
        )
        return
    
    chat, created = chats_crud.get_or_create_chat_between(db, user.id, companion_id)

    payload_for_creator = _build_chat_item(db, chat, current_user_id=user.id)

    await send_ws_message(
        websocket,
        type_="chat_created",
        data=payload_for_creator,
    )

    if created:
        other_ws = active_ws.get(companion_id)
        if other_ws:
            payload_for_companion = _build_chat_item(db, chat, current_user_id=companion_id)
            await send_ws_message(
            other_ws,
            type_="chat_created",
            data=payload_for_companion,
        )


async def handle_get_chat_messages(msg, websocket, db: Session, active_ws, state):
    """
    action: "get_chat_messages"
    data: {"chat_id": str, "limit": int | None, "offset": int | None}
    Возвращает историю сообщений чата.
    """
    user = await require_auth(state, websocket)
    if not user:
        return
    
    data = msg.get("data") or {}
    chat_id = data.get("chat_id")
    if not chat_id:
        await send_ws_message(
            websocket,
            "error",
            ws_schemas.ErrorData(detail="chat_id required"),
        )
        return

    limit = data.get("limit") or 50
    offset = data.get("offset") or 0
    
    chat = _get_chat_for_user(db, chat_id, user.id)
    if not chat:
        await send_ws_message(
            websocket,
            "error",
            ws_schemas.ErrorData(detail="chat not found or no access"),
        )
        return
    
    messages = chats_crud.get_chat_messages(db, chat.id, limit=limit, offset=offset)

    history_items = [
        ws_schemas.ChatHistoryItem(
            id=m.id,
            sender_id=m.sender_id,
            current_user_id=user.id,
            content=m.content,
            created_at=m.created_at.isoformat(),
        )
        for m in messages
    ]

    await send_ws_message(
        websocket,
        type_="chat_messages",
        data=ws_schemas.ChatHistoryData(
            chat_id=chat.id,
            messages=history_items,
        ),
    )

async def handle_send_chat_message(msg, websocket, db: Session, active_ws, state):
    """
    action: "send_chat_message"
    data: {"chat_id": int, "content": str}
    Создаёт сообщение и отправляет собеседнику (если онлайн) или в pending.
    """
    user = await require_auth(state, websocket)
    if not user:
        return
    
    data = msg.get("data") or {}
    chat_id = data.get("chat_id")
    content = data.get("content")

    if not chat_id or not content:
        await send_ws_message(
            websocket,
            "error",
            ws_schemas.ErrorData(detail="chat_id and content required"),
        )
        return
    
    chat = _get_chat_for_user(db, chat_id, user.id)
    if not chat:
        await send_ws_message(
            websocket,
            "error",
            ws_schemas.ErrorData(detail="chat not found or no access"),
        )
        return
    
    recipient_id = chat.user1_id if chat.user2_id == user.id else chat.user2_id

    msg_obj = chats_crud.create_message(db, user.id, recipient_id, chat.id, content)

    payload = ws_schemas.ChatMessageOut(
        id=msg_obj.id,
        chat_id=msg_obj.chat_id,
        sender_id=msg_obj.sender_id,
        current_user_id=user.id,
        content=msg_obj.content,
        created_at=msg_obj.created_at.isoformat(),
    )

    await send_ws_message(
        websocket,
        type_="chat_message",
        data=payload,
    )

    other_user_id = chat.user1_id if chat.user2_id == user.id else chat.user2_id
    other_ws = active_ws.get(other_user_id)

    payload_for_recipient = ws_schemas.ChatMessageOut(
        id=msg_obj.id,
        chat_id=msg_obj.chat_id,
        sender_id=msg_obj.sender_id,
        content=msg_obj.content,
        created_at=msg_obj.created_at.isoformat(),
        current_user_id=other_user_id,
    )

    if other_ws:
        await send_ws_message(
            other_ws,
            type_="chat_message",
            data=payload_for_recipient,
        )
    else:
        pending_crud.create_pending_message(
            db,
            user_id=other_user_id,
            type_="chat_message",
            data=payload_for_recipient.model_dump(),
        )

async def handle_get_chats(msg, websocket, db: Session, active_ws, state):
    """
    action: "get_chats"
    data: {}
    Возвращает список персональных чатов текущего пользователя.
    """
    user = await require_auth(state, websocket)
    if not user:
        return
    
    db_chats = chats_crud.get_user_chats(db, user.id)

    items: list[ws_schemas.ChatItem] = [
        _build_chat_item(db, ch, user.id)
        for ch in db_chats
    ]

    await send_ws_message(
    websocket,
    type_="chats_list",
    data=ws_schemas.ChatsListData(items=items),
)

async def handle_open_chat(msg, websocket, db: Session, active_ws, state):
    """
    action: "open_chat"
    data: {"companion_id": str}
    Создаёт (или возвращает) чат и отдаёт историю.
    """
    user = await require_auth(state, websocket)
    if not user:
        return

    data = msg.get("data") or {}
    companion_id = data.get("companion_id")
    if not companion_id:
        await send_ws_message(
            websocket,
            "error",
            ws_schemas.ErrorData(detail="companion_id required"),
        )
        return

    chat = chats_crud.get_or_create_chat_between(db, user.id, companion_id)
    messages = chats_crud.get_chat_messages(db, chat.id, limit=50, offset=0)

    history_items = [
        ws_schemas.ChatHistoryItem(
            id=m.id,
            sender_id=m.sender_id,
            content=m.content,
            created_at=m.created_at.isoformat(),
        )
        for m in messages
    ]

    await send_ws_message(
        websocket,
        type_="chat_opened",
        data=ws_schemas.ChatHistoryData(
            chat_id=chat.id,
            messages=history_items,
        ),
    )

handlers_chats: Dict[str, WSHandler] = {
    "send_chat_message": handle_send_chat_message,
    "get_chat_messages": handle_get_chat_messages,
    "create_chat": handle_create_chat,
    "get_chats": handle_get_chats,
    "open_chat": handle_open_chat,
}