from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Promo, ROLE_ADMIN, ROLE_ANALYST
from ..schemas import PromoIn, PromoOut
from ..security import require_roles
from ..services import active_promos

router = APIRouter(prefix="/api/promos", tags=["promos"])

analyst_or_admin = require_roles(ROLE_ANALYST, ROLE_ADMIN)


@router.get("", response_model=list[PromoOut])
def list_promos(
    only_active: bool = False,
    user=Depends(require_roles(ROLE_ANALYST, ROLE_ADMIN)),
    db: Session = Depends(get_db),
) -> list[Promo]:
    if only_active:
        return active_promos(db)
    return list(db.scalars(select(Promo).order_by(Promo.id.desc())))


@router.get("/public")
def public_promos(db: Session = Depends(get_db)) -> list[dict]:
    result = []
    for promo in active_promos(db):
        result.append(
            {
                "id": promo.id,
                "title": promo.title,
                "type": promo.type,
                "scope": promo.scope,
                "value": promo.value,
                "category_slug": promo.category_slug,
                "ends_at": promo.ends_at.isoformat() if promo.ends_at else None,
            }
        )
    return result


@router.post("", response_model=PromoOut, status_code=201)
def create_promo(
    data: PromoIn, db: Session = Depends(get_db), _=Depends(analyst_or_admin)
) -> Promo:
    promo = Promo(**data.model_dump())
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return promo


@router.put("/{promo_id}", response_model=PromoOut)
def update_promo(
    promo_id: int, data: PromoIn, db: Session = Depends(get_db), _=Depends(analyst_or_admin)
) -> Promo:
    promo = db.get(Promo, promo_id)
    if promo is None:
        raise HTTPException(status_code=404, detail="Акция не найдена")
    for key, value in data.model_dump().items():
        setattr(promo, key, value)
    db.commit()
    db.refresh(promo)
    return promo


@router.delete("/{promo_id}")
def delete_promo(
    promo_id: int, db: Session = Depends(get_db), _=Depends(analyst_or_admin)
) -> dict:
    promo = db.get(Promo, promo_id)
    if promo is not None:
        db.delete(promo)
        db.commit()
    return {"ok": True}
