from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ClientProfile, LoyaltyLevel, ROLE_CLIENT, User
from ..schemas import (
    LevelOut,
    LoginRequest,
    MeOut,
    ProfileUpdate,
    RegisterRequest,
    TokenResponse,
    UserOut,
)
from ..security import create_access_token, get_current_user, hash_password, verify_password
from ..services import level_for_points, next_level_for

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    existing = db.scalar(select(User).where(User.email == data.email.lower()))
    if existing is not None:
        raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")
    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=ROLE_CLIENT,
    )
    db.add(user)
    db.flush()
    db.add(ClientProfile(user_id=user.id))
    db.commit()
    db.refresh(user)
    return TokenResponse(
        access_token=create_access_token(user),
        role=user.role,
        full_name=user.full_name,
        email=user.email,
    )


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Аккаунт заблокирован")
    return TokenResponse(
        access_token=create_access_token(user),
        role=user.role,
        full_name=user.full_name,
        email=user.email,
    )


def _me(db: Session, user: User) -> MeOut:
    profile = db.scalar(select(ClientProfile).where(ClientProfile.user_id == user.id))
    level = None
    next_level = None
    points_to_next = None
    if profile is not None:
        if profile.level_id is None:
            profile.level = level_for_points(db, profile.points)
            profile.level_id = profile.level.id if profile.level else None
            db.commit()
        level = profile.level or level_for_points(db, profile.points)
        next_level = next_level_for(db, level)
        if next_level is not None:
            points_to_next = max(next_level.min_points - profile.points, 0)
    return MeOut(
        user=UserOut.model_validate(user),
        profile=profile,
        level=level,
        next_level=next_level,
        points_to_next=points_to_next,
    )


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> MeOut:
    return _me(db, user)


@router.patch("/me", response_model=MeOut)
def update_me(
    data: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> MeOut:
    if data.full_name is not None:
        user.full_name = data.full_name
    if user.role == ROLE_CLIENT:
        profile = db.scalar(select(ClientProfile).where(ClientProfile.user_id == user.id))
        if profile is None:
            profile = ClientProfile(user_id=user.id)
            db.add(profile)
        if data.phone is not None:
            profile.phone = data.phone
        if data.address is not None:
            profile.address = data.address
        if data.currency_pref is not None:
            profile.currency_pref = data.currency_pref
    db.commit()
    db.refresh(user)
    return _me(db, user)


@router.get("/levels", response_model=list[LevelOut])
def levels(db: Session = Depends(get_db)) -> list[LoyaltyLevel]:
    return list(db.scalars(select(LoyaltyLevel).order_by(LoyaltyLevel.min_points)))
