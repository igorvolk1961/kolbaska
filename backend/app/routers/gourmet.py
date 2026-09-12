from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import GourmetOption, GourmetOptionGroup
from ..schemas import (
    CustomConfigIn,
    CustomConfigOut,
    GourmetGroupOut,
    GourmetOptionIn,
    GourmetOptionOut,
    PriceBreakdown,
)
from ..security import require_technologist
from ..services import build_custom_config, price_breakdown

router = APIRouter(prefix="/api/gourmet", tags=["gourmet"])


@router.get("/groups", response_model=list[GourmetGroupOut])
def groups(db: Session = Depends(get_db)) -> list[GourmetOptionGroup]:
    return list(db.scalars(select(GourmetOptionGroup).order_by(GourmetOptionGroup.sort)))


@router.post("/price", response_model=PriceBreakdown)
def price(data: CustomConfigIn, db: Session = Depends(get_db)) -> dict:
    return price_breakdown(db, data)


@router.post("/configs", response_model=CustomConfigOut, status_code=201)
def create_config(data: CustomConfigIn, db: Session = Depends(get_db)):
    for field in ("type_option_id", "technology_option_id", "raw_material_option_id", "form_option_id"):
        if db.get(GourmetOption, getattr(data, field)) is None:
            raise HTTPException(status_code=400, detail=f"Некорректный выбор: {field}")
    return build_custom_config(db, data)


@router.put("/options/{option_id}", response_model=GourmetOptionOut)
def update_option(
    option_id: int,
    data: GourmetOptionIn,
    db: Session = Depends(get_db),
    _=Depends(require_technologist),
) -> GourmetOption:
    option = db.get(GourmetOption, option_id)
    if option is None:
        raise HTTPException(status_code=404, detail="Опция не найдена")
    for key, value in data.model_dump().items():
        setattr(option, key, value)
    db.commit()
    db.refresh(option)
    return option


@router.post("/options", response_model=GourmetOptionOut, status_code=201)
def create_option(
    group_id: int,
    data: GourmetOptionIn,
    db: Session = Depends(get_db),
    _=Depends(require_technologist),
) -> GourmetOption:
    if db.get(GourmetOptionGroup, group_id) is None:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    option = GourmetOption(group_id=group_id, **data.model_dump())
    db.add(option)
    db.commit()
    db.refresh(option)
    return option
