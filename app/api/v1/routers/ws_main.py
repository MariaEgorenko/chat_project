from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from typing import Dict
import json

from ....db.session import get_db
from ....core.security import decode_access_token
from ....db.repositories.users.crud import get_user_by_id
from . import ws_handlers

router = APIRouter(tags="ws")

active_ws: Dict[str, WebSocket] = {}

@router.websocket("/ws")
async def main_ws(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    user_id = payload.get("sub")
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    db: Session = next(get_db())
    user = get_user_by_id(db, user_id)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    state = {"current_user": user}
    active_ws[user.id] = websocket

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "detail": "invavlid json"})
                continue

            action = msg.get("action")
            handler = ws_handlers.handlers.get(action)
            if not handler:
                await websocket.send_json({"type": "error", "detail": f"unknown action {action}"})
                continue

            await handler(msg, websocket, db, active_ws, state)

    except WebSocketDisconnect:
        user = state.get("current_user")
        if user:
            active_ws.pop(user.id, None)