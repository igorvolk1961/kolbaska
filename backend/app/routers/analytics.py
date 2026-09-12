from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Order,
    OrderItem,
    OrderStatusHistory,
    Product,
    Promo,
    ROLE_ADMIN,
    ROLE_ANALYST,
    STATUS_LABELS,
)
from ..security import require_roles

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

analyst_or_admin = require_roles(ROLE_ANALYST, ROLE_ADMIN)

WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
SEASONS = {
    12: "Зима", 1: "Зима", 2: "Зима",
    3: "Весна", 4: "Весна", 5: "Весна",
    6: "Лето", 7: "Лето", 8: "Лето",
    9: "Осень", 10: "Осень", 11: "Осень",
}


@router.get("/overview")
def overview(days: int = 90, db: Session = Depends(get_db), _=Depends(analyst_or_admin)) -> dict:
    since = datetime.utcnow() - timedelta(days=days)
    orders = list(db.scalars(select(Order).where(Order.created_at >= since).order_by(Order.created_at)))
    products = {p.id: p for p in db.scalars(select(Product))}
    items = list(db.scalars(select(OrderItem)))

    status_counts = Counter(order.status for order in orders)
    revenue = sum(order.total_base - order.discount_base for order in orders)
    avg_check = revenue / len(orders) if orders else 0

    by_assortment: Counter[str] = Counter()
    revenue_by_product: Counter[str] = Counter()
    item_by_order: dict[int, list[OrderItem]] = defaultdict(list)
    order_map = {order.id: order for order in orders}
    for item in items:
        if item.order_id not in order_map:
            continue
        by_assortment[item.name_snapshot] += item.qty
        revenue_by_product[item.name_snapshot] += item.unit_price_base * item.qty
        item_by_order[item.order_id].append(item)

    weekday: Counter[str] = Counter()
    season: Counter[str] = Counter()
    for order in orders:
        if order.created_at is None:
            continue
        weekday[WEEKDAYS[order.created_at.weekday()]] += 1
        season[SEASONS[order.created_at.month]] += 1

    # эффект акций: сравнение средней выручки в дни акций и вне
    promos = list(db.scalars(select(Promo)))
    promo_days: set = set()
    for promo in promos:
        if promo.starts_at is None or promo.ends_at is None:
            continue
        day = promo.starts_at.date()
        while day <= promo.ends_at.date():
            promo_days.add(day)
            day += timedelta(days=1)
    during, outside = [], []
    for order in orders:
        if order.created_at is None:
            continue
        (during if order.created_at.date() in promo_days else outside).append(
            order.total_base - order.discount_base
        )
    promo_effect = {
        "during_avg": round(sum(during) / len(during), 2) if during else 0,
        "outside_avg": round(sum(outside) / len(outside), 2) if outside else 0,
        "during_count": len(during),
        "outside_count": len(outside),
    }

    timeline: dict[str, float] = defaultdict(float)
    for order in orders:
        if order.created_at is None:
            continue
        key = order.created_at.strftime("%Y-%m")
        timeline[key] += order.total_base - order.discount_base

    return {
        "summary": {
            "orders": len(orders),
            "revenue": round(revenue, 2),
            "avg_check": round(avg_check, 2),
            "items_sold": sum(by_assortment.values()),
        },
        "status_counts": [
            {"status": s, "label": STATUS_LABELS.get(s, s), "count": c}
            for s, c in status_counts.most_common()
        ],
        "top_assortment": [
            {"name": name, "qty": qty, "revenue": round(revenue_by_product[name], 2)}
            for name, qty in by_assortment.most_common(10)
        ],
        "weekday": [{"label": day, "count": weekday.get(day, 0)} for day in WEEKDAYS],
        "season": [{"label": s, "count": season.get(s, 0)} for s in ["Зима", "Весна", "Лето", "Осень"]],
        "promo_effect": promo_effect,
        "timeline": [{"period": p, "revenue": round(v, 2)} for p, v in sorted(timeline.items())],
    }
