from __future__ import annotations

import random
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .content.catalog import (
    ART_OBJECT_CATEGORIES,
    ART_OBJECT_PRODUCTS,
    MEAT_SHOP_CATEGORIES,
    MEAT_SHOP_PRODUCTS,
)
from .content.gourmet import CURRENCY_RATES, GOURMET_GROUPS, LOYALTY_LEVELS
from .models import (
    SECTION_ART_OBJECT,
    SECTION_MEAT_SHOP,
    Category,
    CurrencyRate,
    GourmetOption,
    GourmetOptionGroup,
    LoyaltyLevel,
    Order,
    OrderItem,
    OrderStatusHistory,
    Product,
    Promo,
    ROLE_ADMIN,
    ROLE_ANALYST,
    ROLE_CLIENT,
    ROLE_TECHNOLOGIST,
    User,
    ClientProfile,
)
from .security import hash_password

DEMO_USERS = [
    ("client@kolbaska.ru", "client123", "Иван Мясоедов", ROLE_CLIENT),
    ("gourmet@kolbaska.ru", "client123", "Пётр Гурманов", ROLE_CLIENT),
    ("technolog@kolbaska.ru", "techno123", "Анна Технологова", ROLE_TECHNOLOGIST),
    ("analyst@kolbaska.ru", "analyst123", "Борис Аналитиков", ROLE_ANALYST),
    ("admin@kolbaska.ru", "admin123", "Администратор Сервиса", ROLE_ADMIN),
]


def _assign_categories(products: list[dict], categories: list[dict]) -> None:
    slugs = [c["slug"] for c in categories]
    for index, product in enumerate(products):
        product.setdefault("category_slug", slugs[index % len(slugs)])


def seed(db: Session) -> None:
    if db.scalar(select(User).limit(1)) is not None:
        return

    for level in LOYALTY_LEVELS:
        db.add(LoyaltyLevel(**level))

    for rate in CURRENCY_RATES:
        db.add(CurrencyRate(**rate))

    for slug, name, section, description, sort in (
        ("classic", "Классика", SECTION_MEAT_SHOP, "Проверенные временем мясные композиции.", 1),
        ("romantic", "Романтика", SECTION_MEAT_SHOP, "Композиции для свиданий и семейных праздников.", 2),
        ("provocation", "Провокации", SECTION_MEAT_SHOP, "Ироничные и дерзкие названия с характером.", 3),
        ("transport", "Транспорт", SECTION_ART_OBJECT, "Самолёты, корабли, автомобили и поезда из колбас.", 1),
        ("architecture", "Архитектура", SECTION_ART_OBJECT, "Домики, замки и башни из колбасных изделий.", 2),
        ("fantasy", "Фантастика и фольклор", SECTION_ART_OBJECT, "Драконы, космонавты, троны и сказочные объекты.", 3),
    ):
        db.add(Category(slug=slug, name=name, section=section, description=description, sort=sort))

    _assign_categories(MEAT_SHOP_PRODUCTS, MEAT_SHOP_CATEGORIES)
    _assign_categories(ART_OBJECT_PRODUCTS, ART_OBJECT_CATEGORIES)

    for product in MEAT_SHOP_PRODUCTS + ART_OBJECT_PRODUCTS:
        image = f"/api/catalog/placeholder/{product['sku']}.svg"
        db.add(
            Product(
                section=SECTION_MEAT_SHOP if product["sku"].startswith("MS") else SECTION_ART_OBJECT,
                image=image,
                image_prompt=product["prompt"],
                is_active=True,
                **{k: v for k, v in product.items() if k != "prompt"},
            )
        )

    for group in GOURMET_GROUPS:
        options = group.pop("options")
        orm_group = GourmetOptionGroup(**group)
        db.add(orm_group)
        db.flush()
        for index, option in enumerate(options):
            db.add(GourmetOption(group_id=orm_group.id, sort=index + 1, **option))
        group["options"] = options

    db.flush()

    levels = list(db.scalars(select(LoyaltyLevel).order_by(LoyaltyLevel.min_points)))
    users: list[User] = []
    for email, password, full_name, role in DEMO_USERS:
        user = User(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            role=role,
        )
        db.add(user)
        db.flush()
        if role == ROLE_CLIENT:
            points = random.choice([120, 800, 2600])
            level = max((l for l in levels if l.min_points <= points), key=lambda l: l.min_points)
            db.add(
                ClientProfile(
                    user_id=user.id,
                    level_id=level.id,
                    points=points,
                    phone="+7 (900) 000-00-00",
                    address="г. Москва, ул. Колбасная, д. 1",
                )
            )
        users.append(user)

    db.flush()

    admin = next(u for u in users if u.role == ROLE_ADMIN)
    products = list(db.scalars(select(Product)))
    clients = [u for u in users if u.role == ROLE_CLIENT]

    promos = [
        Promo(
            title="Мясная неделя: скидка 10% на «Мясную лавку»",
            type="discount",
            scope="category",
            category_slug="classic",
            value=10,
            starts_at=datetime.utcnow() - timedelta(days=2),
            ends_at=datetime.utcnow() + timedelta(days=7),
            is_active=True,
        ),
        Promo(
            title="Двойные баллы на «Арт-объекты»",
            type="points_multiplier",
            scope="category",
            category_slug="transport",
            value=2,
            starts_at=datetime.utcnow() - timedelta(days=1),
            ends_at=datetime.utcnow() + timedelta(days=14),
            is_active=True,
        ),
        Promo(
            title="3× баллы на всё меню",
            type="points_multiplier",
            scope="all",
            value=3,
            starts_at=datetime.utcnow() - timedelta(days=3),
            ends_at=datetime.utcnow() + timedelta(days=3),
            is_active=True,
        ),
    ]
    for promo in promos:
        db.add(promo)
    db.flush()

    statuses = ["new", "confirmed", "in_production", "packing", "ready", "shipped", "done"]
    for i in range(12):
        client = clients[i % len(clients)]
        created = datetime.utcnow() - timedelta(days=random.randint(0, 45), hours=random.randint(0, 23))
        status = statuses[min(i % len(statuses), len(statuses) - 1)]
        product = random.choice(products)
        qty = random.randint(1, 3)
        total = product.price_base * qty
        order = Order(
            number=f"KB-{1000 + i}",
            client_id=client.id,
            created_at=created,
            status=status,
            currency="RUB",
            total_base=total,
            total_display=total,
            points_earned=int(total / 100),
            paid=status != "new",
        )
        db.add(order)
        db.flush()
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                name_snapshot=product.name,
                qty=qty,
                unit_price_base=product.price_base,
            )
        )
        db.add(
            OrderStatusHistory(
                order_id=order.id,
                status="new",
                comment="Заказ создан",
                changed_by=client.id,
                changed_at=created,
            )
        )
        if status != "new":
            db.add(
                OrderStatusHistory(
                    order_id=order.id,
                    status=status,
                    comment="Демо-статус",
                    changed_by=admin.id,
                    changed_at=created + timedelta(days=1),
                )
            )

    db.commit()
