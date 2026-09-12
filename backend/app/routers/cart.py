from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import CartItem, CustomConfig, Product, ROLE_CLIENT, User
from ..schemas import CartItemIn, CartItemOut, CartOut
from ..security import get_current_user

router = APIRouter(prefix="/api/cart", tags=["cart"])


def _client(user: User) -> User:
    if user.role != ROLE_CLIENT:
        raise HTTPException(status_code=403, detail="Корзина доступна только клиентам")
    return user


def _cart(db: Session, user: User) -> CartOut:
    items = list(
        db.scalars(select(CartItem).where(CartItem.client_id == user.id).order_by(CartItem.id))
    )
    total = 0.0
    for item in items:
        if item.product is not None:
            total += item.product.price_base * item.qty
        elif item.custom_config is not None:
            total += item.custom_config.price_base * item.qty
    return CartOut(items=[CartItemOut.model_validate(i) for i in items], total_base=round(total, 2))


@router.get("", response_model=CartOut)
def get_cart(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> CartOut:
    _client(user)
    return _cart(db, user)


@router.post("/items", response_model=CartOut, status_code=201)
def add_item(
    data: CartItemIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> CartOut:
    _client(user)
    if (data.product_id is None) == (data.custom_config_id is None):
        raise HTTPException(status_code=400, detail="Укажите ровно один товар или конфигурацию")
    name = ""
    if data.product_id is not None:
        product = db.get(Product, data.product_id)
        if product is None:
            raise HTTPException(status_code=404, detail="Товар не найден")
        name = product.name
    else:
        config = db.get(CustomConfig, data.custom_config_id)
        if config is None:
            raise HTTPException(status_code=404, detail="Конфигурация не найдена")
        name = f"Изделие по рецепту: {config.summary}"
    existing = db.scalar(
        select(CartItem).where(
            CartItem.client_id == user.id,
            CartItem.product_id == data.product_id,
            CartItem.custom_config_id == data.custom_config_id,
        )
    )
    if existing is not None:
        existing.qty += data.qty
    else:
        db.add(
            CartItem(
                client_id=user.id,
                product_id=data.product_id,
                custom_config_id=data.custom_config_id,
                name_snapshot=name,
                qty=max(data.qty, 1),
            )
        )
    db.commit()
    return _cart(db, user)


@router.patch("/items/{item_id}", response_model=CartOut)
def update_item(
    item_id: int, qty: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> CartOut:
    _client(user)
    item = db.get(CartItem, item_id)
    if item is None or item.client_id != user.id:
        raise HTTPException(status_code=404, detail="Позиция не найдена")
    if qty <= 0:
        db.delete(item)
    else:
        item.qty = qty
    db.commit()
    return _cart(db, user)


@router.delete("/items/{item_id}", response_model=CartOut)
def delete_item(
    item_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> CartOut:
    _client(user)
    item = db.get(CartItem, item_id)
    if item is not None and item.client_id == user.id:
        db.delete(item)
        db.commit()
    return _cart(db, user)


@router.delete("", response_model=CartOut)
def clear_cart(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> CartOut:
    _client(user)
    for item in db.scalars(select(CartItem).where(CartItem.client_id == user.id)):
        db.delete(item)
    db.commit()
    return _cart(db, user)
