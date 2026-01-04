from typing import Optional, Union
from .ws_schemas import WSMessage, MessageData

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