from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

ROLE_CLIENT = "client"
ROLE_TECHNOLOGIST = "technologist"
ROLE_ANALYST = "analyst"
ROLE_ADMIN = "admin"

ROLES = (ROLE_CLIENT, ROLE_TECHNOLOGIST, ROLE_ANALYST, ROLE_ADMIN)

SECTION_MEAT_SHOP = "meat_shop"
SECTION_ART_OBJECT = "art_object"
SECTIONS = (SECTION_MEAT_SHOP, SECTION_ART_OBJECT)

STATUS_FLOW = (
    "new",
    "confirmed",
    "in_production",
    "packing",
    "ready",
    "shipped",
    "done",
)
STATUS_LABELS = {
    "new": "Новый",
    "confirmed": "Подтверждён",
    "in_production": "В производстве",
    "packing": "Упаковка",
    "ready": "Готов",
    "shipped": "Отправлен",
    "done": "Завершён",
    "cancelled": "Отменён",
}

PROMO_DISCOUNT = "discount"
PROMO_POINTS = "points_multiplier"
SCOPE_PRODUCT = "product"
SCOPE_CATEGORY = "category"
SCOPE_ALL = "all"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default=ROLE_CLIENT)
    full_name: Mapped[str] = mapped_column(String(255), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    profile: Mapped[ClientProfile | None] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


class ClientProfile(Base):
    __tablename__ = "client_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    level_id: Mapped[int | None] = mapped_column(ForeignKey("loyalty_levels.id"), nullable=True)
    points: Mapped[int] = mapped_column(Integer, default=0)
    currency_pref: Mapped[str] = mapped_column(String(8), default="RUB")
    phone: Mapped[str] = mapped_column(String(64), default="")
    address: Mapped[str] = mapped_column(String(512), default="")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    user: Mapped[User] = relationship(back_populates="profile")
    level: Mapped[LoyaltyLevel | None] = relationship()


class LoyaltyLevel(Base):
    __tablename__ = "loyalty_levels"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    min_points: Mapped[int] = mapped_column(Integer, default=0)
    discount_pct: Mapped[float] = mapped_column(Float, default=0.0)
    description: Mapped[str] = mapped_column(Text, default="")
    sort: Mapped[int] = mapped_column(Integer, default=0)


class CurrencyRate(Base):
    __tablename__ = "currency_rates"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(8), unique=True)
    symbol: Mapped[str] = mapped_column(String(8))
    rate_to_base: Mapped[float] = mapped_column(Float, default=1.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(128))
    section: Mapped[str] = mapped_column(String(32))
    description: Mapped[str] = mapped_column(Text, default="")
    sort: Mapped[int] = mapped_column(Integer, default=0)


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    section: Mapped[str] = mapped_column(String(32))
    category_slug: Mapped[str] = mapped_column(String(64), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    composition: Mapped[str] = mapped_column(Text, default="")
    weight_g: Mapped[int] = mapped_column(Integer, default=0)
    price_base: Mapped[float] = mapped_column(Float, default=0.0)
    dimensions: Mapped[str] = mapped_column(String(128), default="")
    production_days: Mapped[int] = mapped_column(Integer, default=1)
    image: Mapped[str] = mapped_column(String(512), default="")
    image_prompt: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class GourmetOptionGroup(Base):
    __tablename__ = "gourmet_option_groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True)
    title: Mapped[str] = mapped_column(String(128))
    hint: Mapped[str] = mapped_column(Text, default="")
    selector_type: Mapped[str] = mapped_column(String(32), default="select")
    sort: Mapped[int] = mapped_column(Integer, default=0)

    options: Mapped[list[GourmetOption]] = relationship(
        back_populates="group", cascade="all, delete-orphan"
    )


class GourmetOption(Base):
    __tablename__ = "gourmet_options"

    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("gourmet_option_groups.id"))
    name: Mapped[str] = mapped_column(String(128))
    tooltip: Mapped[str] = mapped_column(Text, default="")
    unit: Mapped[str] = mapped_column(String(32), default="")
    price_delta: Mapped[float] = mapped_column(Float, default=0.0)
    effect_color: Mapped[str] = mapped_column(String(255), default="")
    effect_taste: Mapped[str] = mapped_column(String(255), default="")
    effect_form: Mapped[str] = mapped_column(String(255), default="")
    emoji: Mapped[str] = mapped_column(String(16), default="")
    sort: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    group: Mapped[GourmetOptionGroup] = relationship(back_populates="options")


class CustomConfig(Base):
    __tablename__ = "custom_configs"

    id: Mapped[int] = mapped_column(primary_key=True)
    type_option_id: Mapped[int] = mapped_column(ForeignKey("gourmet_options.id"))
    technology_option_id: Mapped[int] = mapped_column(ForeignKey("gourmet_options.id"))
    raw_material_option_id: Mapped[int] = mapped_column(ForeignKey("gourmet_options.id"))
    form_option_id: Mapped[int] = mapped_column(ForeignKey("gourmet_options.id"))
    additives_json: Mapped[list] = mapped_column(JSON, default=list)
    spices_json: Mapped[list] = mapped_column(JSON, default=list)
    price_base: Mapped[float] = mapped_column(Float, default=0.0)
    summary: Mapped[str] = mapped_column(Text, default="")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(32), unique=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    status: Mapped[str] = mapped_column(String(32), default="new")
    currency: Mapped[str] = mapped_column(String(8), default="RUB")
    total_base: Mapped[float] = mapped_column(Float, default=0.0)
    total_display: Mapped[float] = mapped_column(Float, default=0.0)
    discount_base: Mapped[float] = mapped_column(Float, default=0.0)
    promo_id: Mapped[int | None] = mapped_column(ForeignKey("promos.id"), nullable=True)
    points_earned: Mapped[int] = mapped_column(Integer, default=0)
    paid: Mapped[bool] = mapped_column(Boolean, default=False)
    delivery_mode: Mapped[str] = mapped_column(String(32), default="pickup")

    client: Mapped[User] = relationship()
    items: Mapped[list[OrderItem]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )
    history: Mapped[list[OrderStatusHistory]] = relationship(
        back_populates="order", cascade="all, delete-orphan", order_by="OrderStatusHistory.id"
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), nullable=True)
    custom_config_id: Mapped[int | None] = mapped_column(
        ForeignKey("custom_configs.id"), nullable=True
    )
    name_snapshot: Mapped[str] = mapped_column(String(255))
    qty: Mapped[int] = mapped_column(Integer, default=1)
    unit_price_base: Mapped[float] = mapped_column(Float, default=0.0)

    order: Mapped[Order] = relationship(back_populates="items")
    product: Mapped[Product | None] = relationship()
    custom_config: Mapped[CustomConfig | None] = relationship()


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    status: Mapped[str] = mapped_column(String(32))
    comment: Mapped[str] = mapped_column(String(512), default="")
    changed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    order: Mapped[Order] = relationship(back_populates="history")


class Promo(Base):
    __tablename__ = "promos"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(32))
    scope: Mapped[str] = mapped_column(String(32))
    target_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    category_slug: Mapped[str] = mapped_column(String(64), default="")
    value: Mapped[float] = mapped_column(Float, default=0.0)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class CartItem(Base):
    __tablename__ = "cart_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), nullable=True)
    custom_config_id: Mapped[int | None] = mapped_column(
        ForeignKey("custom_configs.id"), nullable=True
    )
    name_snapshot: Mapped[str] = mapped_column(String(255), default="")
    qty: Mapped[int] = mapped_column(Integer, default=1)

    product: Mapped[Product | None] = relationship()
    custom_config: Mapped[CustomConfig | None] = relationship()


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    client_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    role: Mapped[str] = mapped_column(String(16))
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
