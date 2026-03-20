from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.person import PersonCreate, PersonResponse, PersonUpdate
from app.services.person_service import (
    create_person_for_family,
    delete_person,
    list_people_by_family,
    update_person,
)

router = APIRouter(tags=["Pessoas da Família"])


@router.post("/families/{family_id}/people", response_model=PersonResponse, status_code=201)
def create_person_for_family_endpoint(
    family_id: int,
    payload: PersonCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    return create_person_for_family(db, family_id, payload)


@router.get("/families/{family_id}/people", response_model=list[PersonResponse])
def list_people_by_family_endpoint(
    family_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    return list_people_by_family(db, family_id)


@router.put("/people/{person_id}", response_model=PersonResponse)
def update_person_endpoint(
    person_id: int,
    payload: PersonUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    return update_person(db, person_id, payload)


@router.delete("/people/{person_id}", status_code=204)
def delete_person_endpoint(
    person_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    delete_person(db, person_id)
    return Response(status_code=204)
