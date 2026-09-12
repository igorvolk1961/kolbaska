"""Экспорт промптов генерации изображений каталога в docs/product-prompts.md.

Запуск: python backend/scripts/export_prompts.py
"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
ROOT_DIR = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.content.catalog import (  # noqa: E402
    ART_OBJECT_PRODUCTS,
    MEAT_SHOP_PRODUCTS,
)

SECTIONS = [
    ("Раздел «Мясная лавка»", MEAT_SHOP_PRODUCTS),
    ("Раздел «Арт-объекты»", ART_OBJECT_PRODUCTS),
]


def render() -> str:
    lines = [
        "# Промпты генерации изображений для каталога",
        "",
        "Документ сгенерирован скриптом `backend/scripts/export_prompts.py` из "
        "`backend/app/content/catalog.py`. Для каждого изделия указаны состав, вес, габариты, "
        "ориентировочная стоимость в рублях, срок производства и детальный промпт.",
        "",
    ]
    for title, products in SECTIONS:
        lines.append(f"## {title}")
        lines.append("")
        for product in products:
            lines += [
                f"### {product['name']} ({product['sku']})",
                "",
                f"- **Состав:** {product['composition']}",
                f"- **Вес:** {product['weight_g'] / 1000:.2f} кг",
                f"- **Габариты:** {product['dimensions']}",
                f"- **Стоимость:** {product['price_base']:.0f} ₽",
                f"- **Срок производства:** {product['production_days']} дн.",
                "",
                f"**Промпт:** {product['prompt']}",
                "",
            ]
    return "\n".join(lines)


def main() -> None:
    output = ROOT_DIR / "docs" / "product-prompts.md"
    output.write_text(render(), encoding="utf-8")
    print(f"Записано: {output}")


if __name__ == "__main__":
    main()
