from sqlalchemy.orm import Session, joinedload
from . import models, schemas

def create_contact_request(db:Session, from_user_id: str, to_user_id: str):
    req = models.ContactRequest(from_user_id=from_user_id, to_user_id=to_user_id)
    db.add(req)
    db.commit()
    
    req = (
        db.query(models.ContactRequest)
        .options(
            joinedload(models.ContactRequest.to_user),
            joinedload(models.ContactRequest.from_user)
        )
        .filter(models.ContactRequest.id == req.id)
        .first()
    )

    return req

def get_incoming_requests(db: Session, user_id: str):
    return (
        db.query(models.ContactRequest)
        .options(joinedload(models.ContactRequest.from_user))
        .filter(models.ContactRequest.to_user_id == user_id)
        .all()
    )

def get_outgoing_requests(db: Session, user_id: str):
    return (
        db.query(models.ContactRequest)
        .options(joinedload(models.ContactRequest.to_user))
        .filter(
            models.ContactRequest.from_user_id == user_id)
        .all()
    )

def accept_request(db: Session, request_id: str, current_user_id: str):
    req = (
        db.query(models.ContactRequest)
        .options(
            joinedload(models.ContactRequest.from_user),
            joinedload(models.ContactRequest.to_user)
        )
        .filter(models.ContactRequest.id == request_id,
                models.ContactRequest.to_user_id == current_user_id)
                .first()
    )
    if not req:
        return None
    if req.to_user_id != current_user_id:
        return None

    contact1 = models.Contact(
        user_id=req.from_user_id,
        contact_id=req.to_user_id,
        name=req.to_user.name
    )
    contact2 = models.Contact(
        user_id=req.to_user_id,
        contact_id=req.from_user_id,
        name=req.from_user.name
)

    db.add_all([contact1, contact2])
    db.delete(req)
    db.commit()

    return req

def reject_request(db: Session, request_id: str, current_user_id: id):
    req = (
        db.query(models.ContactRequest)
        .options(joinedload(models.ContactRequest.from_user))
        .filter(models.ContactRequest.id == request_id)
        .first()
    )
    if not req:
        return None
    
    if req.to_user_id != current_user_id:
        return None
    
    db.delete(req)
    db.commit()

    return req

def list_contacts(db: Session, user_id: str):
    return db.query(models.Contact).filter(models.Contact.user_id == user_id).all()