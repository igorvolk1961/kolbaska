from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ChatMessage, LoyaltyLevel
from ..schemas import ChatIn, ChatOut
from ..security import get_optional_user

router = APIRouter(prefix="/api/assistant", tags=["assistant"])

QUICK_REPLIES = [
    "Что такое колбасный торт?",
    "Какие есть уровни лояльности?",
    "Как оформить заказ по своему рецепту?",
    "Какие сейчас акции?",
    "Как оплатить заказ?",
    "Как связаться с цехом?",
]


def _reply(message: str, db: Session) -> str:
    text = message.lower()
    if any(word in text for word in ("привет", "здравств", "добрый")):
        return (
            "Здравствуйте! Я Роберт ИИчкин, ваш колбасный консультант. Помогу выбрать "
            "колбасный торт, собрать изделие по вашему рецепту или разобраться с баллами и акциями."
        )
    if any(word in text for word in ("торт", "оригинал", "мясная лавка", "арт-объект")):
        return (
            "«Колбасные торты» — это готовые художественные композиции из продукции мясокомбината. "
            "В разделе «Мясная лавка» собраны композиции из готовых колбас, а в «Арт-объектах» — "
            "изделия в форме самолётов, кораблей, замков и других объектов. Откройте страницу "
            "«Для мясоедов-оригиналов», чтобы выбрать торт."
        )
    if any(word in text for word in ("рецепт", "гурман", "свой", "собрать", "конструктор")):
        return (
            "На странице «Для мясоедов-гурманов» работает пошаговый конструктор: выберите тип изделия, "
            "технологию, основное сырьё, добавки, специи и форму. Цена пересчитывается автоматически, "
            "а подсказки объясняют, как каждая составляющая влияет на цвет, вкус и форму."
        )
    if any(word in text for word in ("уровен", "балл", "лояльн", "скидк")):
        levels = list(db.scalars(select(LoyaltyLevel).order_by(LoyaltyLevel.min_points)))
        lines = [
            f"• {level.name} — от {level.min_points} баллов, скидка {level.discount_pct:g}%"
            for level in levels
        ]
        return "Уровни лояльности:\n" + "\n".join(lines) + "\nБаллы начисляются за покупки, а акции могут их умножать."
    if any(word in text for word in ("акци", "промо", "распродаж")):
        return (
            "Текущие акции показаны на главной странице: скидки на отдельные товары, категории или всё меню, "
            "а также повышенные баллы. Следите за блоком «Текущие акции»."
        )
    if any(word in text for word in ("оплат", "плат", "карт", "деньг")):
        return (
            "В прототипе платёжная страница демонстрационная: реальные платежи не проводятся. "
            "Она показывает, как будет выглядеть оплата у партнёров после запуска."
        )
    if any(word in text for word in ("доставк", "логист", "курьер")):
        return (
            "Отслеживание доставки в прототипе не выполняется. Здесь демонстрируется только интерфейс: "
            "выбор способа получения и статусы заказа «Новый → Подтверждён → В производстве → Готов»."
        )
    if any(word in text for word in ("контакт", "связ", "телефон", "адрес", "почт")):
        return (
            "Связаться с цехом можно по телефону +7 (495) 000-00-00, по почте hello@kolbaska.ru "
            "или через форму на странице «Контакты». Мы работаем ежедневно с 9:00 до 20:00."
        )
    if any(word in text for word in ("цена", "стоим", "сколько", "рубл", "валют")):
        return (
            "Цены в каталоге зависят от состава, веса и сложности изделия. Валюту можно переключить "
            "на главной странице: ₽, $, € или ¥. В конструкторе цена пересчитывается сразу при выборе."
        )
    if any(word in text for word in ("веган", "мясо", "колбас", "сосиск")):
        return (
            "Наш цех специализируется на мясных изделиях: варёные, полукопчёные, сырокопчёные колбасы, "
            "паштеты и композиции из них. Для вегетарианцев пока позиций нет — но есть остроумный "
            "торт «Кошмар вегана» из копчёностей."
        )
    return (
        "Я Роберт ИИчкин и отвечаю по сценариям прототипа. Спросите меня про колбасные торты, "
        "конструктор рецепта, уровни лояльности, акции, оплату или контакты."
    )


@router.get("/quick-replies")
def quick_replies() -> list[str]:
    return QUICK_REPLIES


@router.post("/chat", response_model=ChatOut)
def chat(data: ChatIn, db: Session = Depends(get_db), user=Depends(get_optional_user)) -> ChatOut:
    db.add(ChatMessage(session_id=data.session_id, client_id=user.id if user else None, role="user", text=data.message))
    reply = _reply(data.message, db)
    db.add(ChatMessage(session_id=data.session_id, client_id=user.id if user else None, role="assistant", text=reply))
    db.commit()
    return ChatOut(session_id=data.session_id, reply=reply)


@router.get("/history/{session_id}")
def history(session_id: str, db: Session = Depends(get_db)) -> list[dict]:
    messages = db.scalars(
        select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.id)
    )
    return [{"role": m.role, "text": m.text} for m in messages]
