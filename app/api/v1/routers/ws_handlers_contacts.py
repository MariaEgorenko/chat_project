from typing import Dict, Any, Awaitable, Callable
from sqlalchemy.orm import Session

from ....db.repositories.contacts import crud as contacts_crud
from ....db.repositories.pending import crud as pending_crud
from .ws_utils import send_ws_message
from . import ws_schemas

WSHandler = Callable[[dict, Any, Session, Dict[str, Any], Dict[str, Any]],
                     Awaitable[None]]

async def require_auth(state: Dict[str, Any], websocket) -> Any:
    user = state.get("current_user")
    if not user:
        await send_ws_message(
            websocket,
            "error",
            ws_schemas.ErrorData(detail="not authenticated")
        )
        return None
    return user

async def handle_send_contact_request(msg, websocket, db: Session, active_ws, state):
    user = await require_auth(state, websocket)
    if not user:
        return
    
    data = msg.get("data") or {}
    to_user_id = data.get("to_user_id")

    if not to_user_id:
        await send_ws_message(
            websocket, 
            "error",
            ws_schemas.ErrorData(detail="to_user_id required")
        )
        return
    
    req = contacts_crud.create_contact_request(db, user.id, to_user_id)

    await send_ws_message(
        websocket,
        "contact_request_sent",
        ws_schemas.ContactRequestDataOut(
            id=req.id,
            to_user=req.to_user_id
        )
    )

    payload  = ws_schemas.ContactRequestDataIn(
            id=req.id,
            from_user=req.from_user_id,
        )
    
    other_ws = active_ws.get(to_user_id)
    if other_ws:
        await send_ws_message(
            other_ws,
            type_="contact_request",
            data=payload 
        )
    else:
        pending_crud.create_pending_message(
            db, 
            user_id=req.to_user_id,
            type_="contact_request",
            data=payload.model_dump()
        )

async def handle_get_pending_requests(msg, websocket, db: Session, active_ws, state):
    user = await require_auth(state, websocket)
    if not user:
        return
    
    pending = contacts_crud.get_incoming_requests(db, user.id)
    items = [
        ws_schemas.ContactRequestListItemIn(
            id=r.id,
            from_user=r.from_user_id,
        )
        for r in pending
    ]
    await send_ws_message(
        websocket,
        type_="pending_requests",
        data=ws_schemas.ContactRequestListDataIn(items=items)
    )

async def handle_get_outgoing_requests(msg, websocket, db: Session, active_ws, state):
    user = await require_auth(state, websocket)
    if not user:
        return
    
    outgoing = contacts_crud.get_outgoing_requests(db, user.id)
    items = [
        ws_schemas.ContactRequestListItemOut(
            id=r.id,
            to_user=r.to_user_id,
        )
        for r in outgoing
    ]
    await send_ws_message(
        websocket,
        type_="outgoing_requests",
        data=ws_schemas.ContactRequestListDataOut(items=items)
    )

async def handle_accept_contact_request(msg, websocket, db: Session, active_ws, state):
    user = await require_auth(state, websocket)
    if not user:
        return
    
    data = msg.get("data") or {}
    request_id = data.get("request_id")
    if not request_id:
        await send_ws_message(
            websocket,
            type_="error",
            data=ws_schemas.ErrorData(detail="request_id required"),
        )
        return
    
    req = contacts_crud.accept_request(db, request_id, user.id)
    if not req:
        await send_ws_message(
            websocket,
            type_="error",
            data=ws_schemas.ErrorData(detail="request not found"),
        )
        return
    
    await send_ws_message(
        websocket,
        type_="contact_request_accepted",
        data=ws_schemas.ContactRequestDataIn(
            id=req.id,
            from_user=req.from_user_id,
        ),
    )

    other_user_id = req.from_user_id
    other_ws = active_ws.get(other_user_id)
    payload = ws_schemas.ContactRequestDataOut(
                id=req.id,
                to_user=req.to_user_id,
            )
    if other_ws:
        await send_ws_message(
            other_ws,
            type_="contact_request_accepted_notification",
            data=payload,
        )
    else:
        pending_crud.create_pending_message(
            db, 
            user_id=other_user_id,
            type_="contact_request_accepted_notification",
            data=payload.model_dump()
        )

async def handle_reject_contact_request(msg, websocket, db: Session, active_ws, state):
    user = await require_auth(state, websocket)
    if not user:
        return

    data = msg.get("data") or {}
    request_id = data.get("request_id")
    if not request_id:
        await send_ws_message(
            websocket,
            type_="error",
            data=ws_schemas.ErrorData(detail="request_id required"),
        )
        return
    
    req = contacts_crud.reject_request(db, request_id, user.id)
    if not req:
        await send_ws_message(
            websocket,
            type_="error",
            data=ws_schemas.ErrorData(detail="request not found"),
        )
        return
    
    await send_ws_message(
        websocket,
        type_="contact_request_rejected",
        data=ws_schemas.ContactRequestDataIn(
            id=req.id,
            from_user=req.from_user_id
        )
    )

    other_user_id = req.from_user_id
    other_ws = active_ws.get(other_user_id)
    payload = ws_schemas.ContactRequestDataOut(
                id=req.id,
                to_user=req.to_user_id
            )
    if other_ws:
        await send_ws_message(
            other_ws,
            type_="contact_request_rejected_notification",
            data=payload
        )
    else:
        pending_crud.create_pending_message(
            db,
            user_id=other_user_id,
            type_="contact_request_rejected_notification",
            data=payload.model_dump()
        )


handlers_contacts: Dict[str, WSHandler] = {
    "send_contact_request": handle_send_contact_request,
    "get_pending_requests": handle_get_pending_requests,
    "accept_contact_request": handle_accept_contact_request,
    "reject_contact_request": handle_reject_contact_request,
    "get_outgoing_requests": handle_get_outgoing_requests,
}
