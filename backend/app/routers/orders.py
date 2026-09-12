from __future__ import annotations

import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    CartItem,
    CurrencyRate,
    Order,
    OrderItem,
    OrderStatusHistory,
    Product,
    ROLE_ADMIN,
    ROLE_CLIENT,
    ROLE_TECHNOLOGIST,
    STATUS_LABELS,
    User,
)
from ..schemas import OrderCreateIn, OrderOut, StatusUpdateIn
from ..security import get_current_user, require_roles
from ..services import level_for_points, points_multiplier, resolve_discount

router = APIRouter(prefix="/api/orders", tags=["orders"])

tech_or_admin = require_roles(ROLE_TECHNOLOGIST, ROLE_ADMIN)


def _convert(db: Session, amount: float, currency: str) -> float:
    rate = db.scalar(select(CurrencyRate).where(CurrencyRate.code == currency))
    if rate is None:
        return amount
    return round(amount * rate.rate_to_base, 2)


def _points_for(db: Session, total: float, product: Product | None, category_slug: str, level) -> int:
    base = int(total / 100)
    multiplier = points_multiplier(db, product, category_slug)
    level_bonus = 1 + (level.sort - 1) * 0.1 if level is not None else 1.0
    return int(round(base * multiplier * level_bonus))


@router.post("/checkout", response_model=OrderOut, status_code=201)
def checkout(
    data: OrderCreateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> Order:
    if user.role != ROLE_CLIENT:
        raise HTTPException(status_code=403, detail="Оформление доступно только клиентам")
    cart_items = list(db.scalars(select(CartItem).where(CartItem.client_id == user.id)))
    if not cart_items:
        raise HTTPException(status_code=400, detail="Корзина пуста")

    order = Order(
        number=f"KB-{int(datetime.utcnow().timestamp())}",
        client_id=user.id,
        status="new",
        currency=data.currency,
        delivery_mode=data.delivery_mode,
        promo_id=data.promo_id,
    )
    db.add(order)
    db.flush()

    total_base = 0.0
    discount_total = 0.0
    points_total = 0
    profile = user.profile
    level = profile.level if profile is not None else None

    for cart_item in cart_items:
        if cart_item.product is not None:
            product = cart_item.product
            unit = product.price_base
            category_slug = product.category_slug
            name = product.name
        else:
            config = cart_item.custom_config
            unit = config.price_base if config is not None else 0.0
            category_slug = ""
            name = f"Изделие по рецепту: {config.summary if config else ''}"
            product = None
        line_total = unit * cart_item.qty
        discount, _promo = resolve_discount(db, product, category_slug)
        line_discount = discount * cart_item.qty
        total_base += line_total
        discount_total += line_discount
        points_total += _points_for(db, line_total - line_discount, product, category_slug, level)
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=cart_item.product_id,
                custom_config_id=cart_item.custom_config_id,
                name_snapshot=name,
                qty=cart_item.qty,
                unit_price_base=unit,
            )
        )
        db.delete(cart_item)

    level_discount_pct = level.discount_pct if level is not None else 0.0
    level_discount = (total_base - discount_total) * level_discount_pct / 100.0
    discount_total += level_discount
    final_base = max(total_base - discount_total, 0.0)

    order.total_base = round(total_base, 2)
    order.discount_base = round(discount_total, 2)
    order.total_display = _convert(db, final_base, data.currency)
    order.points_earned = points_total
    db.add(
        OrderStatusHistory(
            order_id=order.id, status="new", comment="Заказ создан", changed_by=user.id
        )
    )
    db.commit()
    db.refresh(order)
    return order


@router.get("", response_model=list[OrderOut])
def list_orders(
    status: str | None = None,
    mine: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Order]:
    query = select(Order)
    if user.role == ROLE_CLIENT or mine:
        query = query.where(Order.client_id == user.id)
    if status:
        query = query.where(Order.status == status)
    return list(db.scalars(query.order_by(Order.created_at.desc())))


@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    if user.role == ROLE_CLIENT and order.client_id != user.id:
        raise HTTPException(status_code=403, detail="Доступ к чужому заказу запрещён")
    return order


@router.post("/{order_id}/pay", response_model=OrderOut)
def pay_order(
    order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> Order:
    order = db.get(Order, order_id)
    if order is None or (user.role == ROLE_CLIENT and order.client_id != user.id):
        raise HTTPException(status_code=404, detail="Заказ не найден")
    order.paid = True
    order.status = "confirmed"
    db.add(
        OrderStatusHistory(
            order_id=order.id,
            status="confirmed",
            comment="Демо-оплата выполнена (mock)",
            changed_by=user.id,
        )
    )
    if order.client_id is not None:
        client = db.get(User, order.client_id)
        if client is not None and client.profile is not None:
            client.profile.points += order.points_earned
            new_level = level_for_points(db, client.profile.points)
            if new_level is not None:
                client.profile.level_id = new_level.id
    db.commit()
    db.refresh(order)
    return order


@router.patch("/{order_id}/status", response_model=OrderOut)
def update_status(
    order_id: int,
    data: StatusUpdateIn,
    user: User = Depends(tech_or_admin),
    db: Session = Depends(get_db),
) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    if data.status not in STATUS_LABELS:
        raise HTTPException(status_code=400, detail="Неизвестный статус")
    order.status = data.status
    db.add(
        OrderStatusHistory(
            order_id=order.id,
            status=data.status,
            comment=data.comment or STATUS_LABELS.get(data.status, ""),
            changed_by=user.id,
        )
    )
    db.commit()
    db.refresh(order)
    return order


def _order_to_dict(order: Order) -> dict:
    return {
        "number": order.number,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "status": order.status,
        "status_label": STATUS_LABELS.get(order.status, order.status),
        "currency": order.currency,
        "total_base": order.total_base,
        "discount_base": order.discount_base,
        "total_display": order.total_display,
        "points_earned": order.points_earned,
        "delivery_mode": order.delivery_mode,
        "items": [
            {
                "name": item.name_snapshot,
                "qty": item.qty,
                "unit_price_base": item.unit_price_base,
                "product_id": item.product_id,
            }
            for item in order.items
        ],
    }


@router.get("/{order_id}/export")
def export_order(
    order_id: int,
    format: str = Query("md", pattern="^(md|json)$"),
    message: str = "",
    user: User = Depends(tech_or_admin),
    db: Session = Depends(get_db),
) -> PlainTextResponse:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    payload = _order_to_dict(order)
    if format == "json":
        body = json.dumps(payload, ensure_ascii=False, indent=2)
        return PlainTextResponse(
            body,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="order-{order.number}.json"'},
        )
    lines = [
        f"# Заказ {order.number}",
        "",
        f"- **Статус:** {payload['status_label']}",
        f"- **Создан:** {payload['created_at']}",
        f"- **Валюта:** {order.currency}",
        f"- **Сумма без скидки:** {order.total_base:.2f} ₽",
        f"- **Скидка:** {order.discount_base:.2f} ₽",
        f"- **Итого:** {order.total_display:.2f} {order.currency}",
        f"- **Баллы:** {order.points_earned}",
        "",
        "## Состав заказа",
        "",
        "| Позиция | Кол-во | Цена, ₽ | Сумма, ₽ |",
        "| --- | ---: | ---: | ---: |",
    ]
    for item in order.items:
        lines.append(
            f"| {item.name_snapshot} | {item.qty} | {item.unit_price_base:.2f} | "
            f"{item.unit_price_base * item.qty:.2f} |"
        )
    if message:
        lines += ["", "## Примечание технолога", "", message]
    return PlainTextResponse(
        "\n".join(lines),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="order-{order.number}.md"'},
    )
