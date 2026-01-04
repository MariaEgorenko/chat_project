from typing import Dict, Any, Awaitable, Callable
from sqlalchemy.orm import Session

from .ws_handlers_contacts import handlers_contacts

WSHandler = Callable[[dict, Any, Session, Dict[str, Any], Dict[str, Any]], Awaitable[None]]

handlers: Dict[str, WSHandler] = {
    **handlers_contacts,
}