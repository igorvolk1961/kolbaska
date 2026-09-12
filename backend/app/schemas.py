from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- auth / users ---
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4)
    full_name: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    email: str


class UserOut(ORMModel):
    id: int
    email: str
    role: str
    full_name: str
    is_active: bool
    created_at: datetime | None = None


class ClientProfileOut(ORMModel):
    id: int
    points: int
    currency_pref: str
    phone: str
    address: str
    latitude: float | None = None
    longitude: float | None = None
    level_id: int | None = None


class LevelOut(ORMModel):
    id: int
    name: str
    min_points: int
    discount_pct: float
    description: str
    sort: int


class MeOut(BaseModel):
    user: UserOut
    profile: ClientProfileOut | None = None
    level: LevelOut | None = None
    next_level: LevelOut | None = None
    points_to_next: int | None = None


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    address: str | None = None
    currency_pref: str | None = None
    latitude: float | None = None
    longitude: float | None = None


# --- catalog ---
class ProductOut(ORMModel):
    id: int
    sku: str
    name: str
    section: str
    category_slug: str
    description: str
    composition: str
    weight_g: int
    price_base: float
    dimensions: str
    production_days: int
    image: str
    image_prompt: str
    is_active: bool


class ProductIn(BaseModel):
    sku: str
    name: str
    section: str
    category_slug: str = ""
    description: str = ""
    composition: str = ""
    weight_g: int = 0
    price_base: float = 0.0
    dimensions: str = ""
    production_days: int = 1
    image: str = ""
    image_prompt: str = ""
    is_active: bool = True


class CategoryOut(ORMModel):
    id: int
    slug: str
    name: str
    section: str
    description: str
    sort: int


# --- gourmet ---
class GourmetOptionOut(ORMModel):
    id: int
    group_id: int
    name: str
    tooltip: str
    unit: str
    price_delta: float
    effect_color: str
    effect_taste: str
    effect_form: str
    emoji: str
    sort: int
    is_active: bool


class GourmetOptionIn(BaseModel):
    name: str
    tooltip: str = ""
    unit: str = ""
    price_delta: float = 0.0
    effect_color: str = ""
    effect_taste: str = ""
    effect_form: str = ""
    emoji: str = ""
    sort: int = 0
    is_active: bool = True


class GourmetGroupOut(ORMModel):
    id: int
    code: str
    title: str
    hint: str
    selector_type: str
    sort: int
    options: list[GourmetOptionOut] = []


class CustomConfigIn(BaseModel):
    type_option_id: int
    technology_option_id: int
    raw_material_option_id: int
    form_option_id: int
    additive_option_ids: list[int] = []
    spice_option_ids: list[int] = []


class CustomConfigOut(ORMModel):
    id: int
    type_option_id: int
    technology_option_id: int
    raw_material_option_id: int
    form_option_id: int
    additives_json: list[int] = []
    spices_json: list[int] = []
    price_base: float
    summary: str


class PriceBreakdown(BaseModel):
    total: float
    lines: list[dict[str, Any]]
    summary: str = ""


# --- cart ---
class CartItemIn(BaseModel):
    product_id: int | None = None
    custom_config_id: int | None = None
    qty: int = 1


class CartItemOut(ORMModel):
    id: int
    product_id: int | None
    custom_config_id: int | None
    name_snapshot: str
    qty: int


class CartOut(BaseModel):
    items: list[CartItemOut]
    total_base: float


# --- orders ---
class OrderItemOut(ORMModel):
    id: int
    product_id: int | None
    custom_config_id: int | None
    name_snapshot: str
    qty: int
    unit_price_base: float


class StatusHistoryOut(ORMModel):
    id: int
    status: str
    comment: str
    changed_by: int | None
    changed_at: datetime | None


class OrderOut(ORMModel):
    id: int
    number: str
    client_id: int
    created_at: datetime | None
    status: str
    currency: str
    total_base: float
    total_display: float
    discount_base: float
    points_earned: int
    paid: bool
    delivery_mode: str
    items: list[OrderItemOut] = []
    history: list[StatusHistoryOut] = []


class OrderCreateIn(BaseModel):
    currency: str = "RUB"
    delivery_mode: str = "pickup"
    promo_id: int | None = None


class StatusUpdateIn(BaseModel):
    status: str
    comment: str = ""


# --- promo ---
class PromoOut(ORMModel):
    id: int
    title: str
    type: str
    scope: str
    target_id: int | None
    category_slug: str
    value: float
    starts_at: datetime | None
    ends_at: datetime | None
    is_active: bool


class PromoIn(BaseModel):
    title: str
    type: str
    scope: str
    target_id: int | None = None
    category_slug: str = ""
    value: float = 0.0
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool = True


# --- admin ---
class CreateUserIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4)
    full_name: str = ""
    role: str


class UpdateUserIn(BaseModel):
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    password: str | None = None


class AdjustPointsIn(BaseModel):
    points_delta: int


# --- assistant ---
class ChatIn(BaseModel):
    session_id: str
    message: str


class ChatOut(BaseModel):
    session_id: str
    reply: str
