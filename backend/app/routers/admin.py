from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ClientProfile, ROLE_ADMIN, ROLES, User
from ..schemas import AdjustPointsIn, CreateUserIn, MeOut, UpdateUserIn, UserOut
from ..security import hash_password, require_admin
from ..services import level_for_points

router = APIRouter(prefix="/api/admin", tags=["admin"])

admin_only = require_admin


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(admin_only)) -> list[User]:
    return list(db.scalars(select(User).order_by(User.id)))


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(
    data: CreateUserIn, db: Session = Depends(get_db), _=Depends(admin_only)
) -> User:
    if data.role not in ROLES:
        raise HTTPException(status_code=400, detail="Неизвестная роль")
    if db.scalar(select(User).where(User.email == data.email.lower())) is not None:
        raise HTTPException(status_code=400, detail="Email уже занят")
    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=data.role,
    )
    db.add(user)
    db.flush()
    if data.role == "client":
        db.add(ClientProfile(user_id=user.id))
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int, data: UpdateUserIn, db: Session = Depends(get_db), _=Depends(admin_only)
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if data.role is not None:
        if data.role not in ROLES:
            raise HTTPException(status_code=400, detail="Неизвестная роль")
        user.role = data.role
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.password:
        user.password_hash = hash_password(data.password)
    db.commit()
    db.refresh(user)
    return user


@router.post("/clients/{user_id}/points", response_model=UserOut)
def adjust_points(
    user_id: int,
    data: AdjustPointsIn,
    db: Session = Depends(get_db),
    _=Depends(admin_only),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    profile = db.scalar(select(ClientProfile).where(ClientProfile.user_id == user.id))
    if profile is None:
        profile = ClientProfile(user_id=user.id)
        db.add(profile)
        db.flush()
    profile.points = max(0, profile.points + data.points_delta)
    level = level_for_points(db, profile.points)
    if level is not None:
        profile.level_id = level.id
    db.commit()
    db.refresh(user)
    return user


@router.get("/clients")
def list_clients(db: Session = Depends(get_db), _=Depends(admin_only)) -> list[dict]:
    users = db.scalars(select(User).where(User.role == "client")).all()
    result = []
    for user in users:
        profile = db.scalar(select(ClientProfile).where(ClientProfile.user_id == user.id))
        result.append(
            {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "points": profile.points if profile else 0,
                "level": profile.level.name if profile and profile.level else None,
                "phone": profile.phone if profile else "",
            }
        )
    return result
