from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from ....db.session import get_db
from ....api.v1.deps import get_current_user
from ....db.repositories.users.models import User
from ....db.repositories.contacts import (
    crud as contacts_crud,
    schemas as contacts_schemas
)

router = APIRouter(prefix="/contacts", tags=["contacts"])

@router.get("/search", response_model=List[contacts_schemas.UserSearchResult])
def search_users(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    users = (
        db.query(User)
        .filter(
            (User.login.ilike(f"%{q}%"))
        )
        .limit(20)
        .all()
    )
    return [u for u in users if u.id != current_user.id]

@router.get("/", response_model=List[str])
def get_contacts(
        db: Session = Depends(get_db),
        current_user = Depends(get_current_user)
):
    contacts = contacts_crud.list_contacts(db, current_user.id)
    return [contact.contact_id for contact in contacts]