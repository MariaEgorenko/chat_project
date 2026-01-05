from typing import Optional, Dict, Any
from .ws_schemas import WSMessage, MessageData, ErrorData

async def send_ws_message(
        websocket,
        type_: Optional[str] = None,
        data: Optional[MessageData] = None,
        msg: Optional[WSMessage] = None
    ) -> None:
    if msg is None:
        if type_ is None or data is None:
            raise ValueError("Either msg or (type_ and data) must be provided")
        msg = WSMessage(type=type_, data=data)

    await websocket.send_json(msg.model_dump())

async def require_auth(state: Dict[str, Any], websocket) -> Any:
    user = state.get("current_user")
    if not user:
        await send_ws_message(
            websocket,
            "error",
            ErrorData(detail="not authenticated")
        )
        return None
    return user