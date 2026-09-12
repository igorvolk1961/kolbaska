from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from .content.gourmet import BASE_PRICE
from .models import (
    CustomConfig,
    GourmetOption,
    LoyaltyLevel,
    Product,
    Promo,
    SCOPE_ALL,
    SCOPE_CATEGORY,
    SCOPE_PRODUCT,
    PROMO_DISCOUNT,
    PROMO_POINTS,
)


def option_price(db: Session, option_id: int) -> tuple[float, str]:
    option = db.get(GourmetOption, option_id)
    if option is None:
        return 0.0, ""
    return option.price_delta, option.name


def build_custom_config(db: Session, data) -> CustomConfig:
    lines: list[str] = []
    total = BASE_PRICE
    for field in ("type_option_id", "technology_option_id", "raw_material_option_id", "form_option_id"):
        price, name = option_price(db, getattr(data, field))
        total += price
        if name:
            lines.append(name)
    for option_id in list(data.additive_option_ids):
        price, name = option_price(db, option_id)
        total += price
        if name:
            lines.append(name)
    for option_id in list(data.spice_option_ids):
        price, name = option_price(db, option_id)
        total += price
        if name:
            lines.append(name)
    config = CustomConfig(
        type_option_id=data.type_option_id,
        technology_option_id=data.technology_option_id,
        raw_material_option_id=data.raw_material_option_id,
        form_option_id=data.form_option_id,
        additives_json=list(data.additive_option_ids),
        spices_json=list(data.spice_option_ids),
        price_base=round(total, 2),
        summary=", ".join(lines),
    )
    db.add(config)
    db.flush()
    return config


def price_breakdown(db: Session, data) -> dict:
    lines = [{"name": "Базовое изделие", "price": BASE_PRICE, "group": "base"}]
    total = BASE_PRICE
    groups = (
        ("type_option_id", "Тип"),
        ("technology_option_id", "Технология"),
        ("raw_material_option_id", "Сырьё"),
        ("form_option_id", "Форма"),
    )
    for field, label in groups:
        option = db.get(GourmetOption, getattr(data, field))
        if option is not None:
            total += option.price_delta
            lines.append({"name": f"{label}: {option.name}", "price": option.price_delta, "group": field})
    for label, ids in (("Добавка", data.additive_option_ids), ("Специя", data.spice_option_ids)):
        for option_id in ids:
            option = db.get(GourmetOption, option_id)
            if option is not None:
                total += option.price_delta
                lines.append({"name": f"{label}: {option.name}", "price": option.price_delta, "group": label})
    summary = ", ".join(line["name"] for line in lines[1:])
    return {"total": round(total, 2), "lines": lines, "summary": summary}


def _promo_applies(promo: Promo, product: Product | None, category_slug: str, now: datetime) -> bool:
    if not promo.is_active:
        return False
    if promo.starts_at and promo.starts_at > now:
        return False
    if promo.ends_at and promo.ends_at < now:
        return False
    if promo.scope == SCOPE_ALL:
        return True
    if promo.scope == SCOPE_PRODUCT:
        return product is not None and promo.target_id == product.id
    if promo.scope == SCOPE_CATEGORY:
        return bool(category_slug) and promo.category_slug == category_slug
    return False


def resolve_discount(
    db: Session, product: Product | None, category_slug: str, now: datetime | None = None
) -> tuple[float, Promo | None]:
    """Возвращает (скидка_в_базовой_валюте, промо) для одной позиции по её цене."""
    now = now or datetime.utcnow()
    price = product.price_base if product is not None else 0.0
    best_pct = 0.0
    best_promo: Promo | None = None
    for promo in db.scalars(select(Promo).where(Promo.type == PROMO_DISCOUNT, Promo.is_active.is_(True))):
        if _promo_applies(promo, product, category_slug, now) and promo.value > best_pct:
            best_pct = promo.value
            best_promo = promo
    return round(price * best_pct / 100.0, 2), best_promo


def points_multiplier(
    db: Session, product: Product | None, category_slug: str, now: datetime | None = None
) -> float:
    now = now or datetime.utcnow()
    best = 1.0
    for promo in db.scalars(select(Promo).where(Promo.type == PROMO_POINTS, Promo.is_active.is_(True))):
        if _promo_applies(promo, product, category_slug, now) and promo.value > best:
            best = promo.value
    return best


def level_for_points(db: Session, points: int) -> LoyaltyLevel | None:
    levels = list(db.scalars(select(LoyaltyLevel).order_by(LoyaltyLevel.min_points)))
    if not levels:
        return None
    return max((l for l in levels if l.min_points <= points), key=lambda l: l.min_points, default=levels[0])


def next_level_for(db: Session, level: LoyaltyLevel | None) -> LoyaltyLevel | None:
    if level is None:
        return None
    return db.scalar(
        select(LoyaltyLevel)
        .where(LoyaltyLevel.min_points > level.min_points)
        .order_by(LoyaltyLevel.min_points)
        .limit(1)
    )


def active_promos(db: Session, now: datetime | None = None) -> list[Promo]:
    now = now or datetime.utcnow()
    result = []
    for promo in db.scalars(select(Promo).order_by(Promo.id.desc())):
        if not promo.is_active:
            continue
        if promo.starts_at and promo.starts_at > now:
            continue
        if promo.ends_at and promo.ends_at < now:
            continue
        result.append(promo)
    return result
