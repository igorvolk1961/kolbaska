from __future__ import annotations

import hashlib
import re
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..models import Category, CurrencyRate, Product
from ..schemas import CategoryOut, ProductOut
from ..security import require_technologist
from ..schemas import ProductIn

router = APIRouter(prefix="/api/catalog", tags=["catalog"])

_PALETTES = [
    ("#3b0d0c", "#a4231f", "#f2c14e"),
    ("#1f2d1a", "#4f772d", "#e9c46a"),
    ("#2b1a10", "#8c4a1f", "#f4a261"),
    ("#241023", "#7b2cbf", "#ffd166"),
    ("#0d1b2a", "#1b4965", "#f9c74f"),
    ("#3d0b12", "#9e2a2b", "#ffdda1"),
]


def _palette_for(sku: str) -> tuple[str, str, str]:
    digest = int(hashlib.sha256(sku.encode()).hexdigest(), 16)
    return _PALETTES[digest % len(_PALETTES)]


@router.get("/products", response_model=list[ProductOut])
def list_products(
    section: str | None = None,
    category: str | None = None,
    search: str | None = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
) -> list[Product]:
    query = select(Product)
    if not include_inactive:
        query = query.where(Product.is_active.is_(True))
    if section:
        query = query.where(Product.section == section)
    if category:
        query = query.where(Product.category_slug == category)
    if search:
        query = query.where(Product.name.ilike(f"%{search}%"))
    return list(db.scalars(query.order_by(Product.id)))


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return product


@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(
    data: ProductIn, db: Session = Depends(get_db), _=Depends(require_technologist)
) -> Product:
    if db.scalar(select(Product).where(Product.sku == data.sku)) is not None:
        raise HTTPException(status_code=400, detail="SKU уже существует")
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    data: ProductIn,
    db: Session = Depends(get_db),
    _=Depends(require_technologist),
) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Товар не найден")
    for key, value in data.model_dump().items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(section: str | None = None, db: Session = Depends(get_db)) -> list[Category]:
    query = select(Category)
    if section:
        query = query.where(Category.section == section)
    return list(db.scalars(query.order_by(Category.section, Category.sort)))


@router.get("/currency")
def list_currency(db: Session = Depends(get_db)) -> list[dict]:
    rates = db.scalars(select(CurrencyRate).where(CurrencyRate.is_active.is_(True)))
    return [
        {"code": r.code, "symbol": r.symbol, "rate_to_base": r.rate_to_base} for r in rates
    ]


_SKU_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]*$")
_IMAGE_EXTENSIONS = (".webp", ".png", ".jpg", ".jpeg", ".gif")
_BACKGROUND_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"}
_MEDIA_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif",
}


def _media_type_for(path: Path) -> str:
    return _MEDIA_TYPES.get(path.suffix.lower(), "application/octet-stream")


def _backgrounds_dir() -> Path:
    return Path(get_settings().backgrounds_dir)


@router.get("/backgrounds")
def list_backgrounds() -> list[dict]:
    """Список фонов главной страницы из каталога backgrounds_dir."""
    directory = _backgrounds_dir()
    if not directory.is_dir():
        return []
    files = sorted(
        (
            item
            for item in directory.iterdir()
            if item.is_file() and item.suffix.lower() in _BACKGROUND_EXTENSIONS
        ),
        key=lambda item: item.name,
    )
    return [{"name": item.name, "url": f"/api/catalog/backgrounds/{quote(item.name)}"} for item in files]


@router.get("/backgrounds/{filename}")
def background_image(filename: str) -> Response:
    directory = _backgrounds_dir().resolve()
    target = (directory / filename).resolve()
    if (
        target.is_file()
        and target.suffix.lower() in _BACKGROUND_EXTENSIONS
        and directory in target.parents
    ):
        return FileResponse(target, media_type=_media_type_for(target))
    raise HTTPException(status_code=404, detail="Фон не найден")



def _find_real_image(sku: str) -> Path | None:
    """Ищет реальное изображение товара по артикулу (SKU) в каталоге images_dir."""
    if not _SKU_RE.match(sku):
        return None
    images_dir = Path(get_settings().images_dir)
    try:
        base = images_dir.resolve()
    except OSError:
        return None
    for extension in _IMAGE_EXTENSIONS:
        candidate = base / f"{sku}{extension}"
        if candidate.is_file():
            return candidate
    return None


def _placeholder_svg(db: Session, sku: str) -> Response:
    product = db.scalar(select(Product).where(Product.sku == sku))
    label = product.name if product is not None else sku
    emoji = "🥩" if sku.startswith("MS") else "🎂"
    c1, c2, accent = _palette_for(sku)
    initials = "".join(word[0] for word in label.split()[:3]).upper()
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360" role="img" aria-label="{label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{c1}"/>
      <stop offset="100%" stop-color="{c2}"/>
    </linearGradient>
  </defs>
  <rect width="480" height="360" fill="url(#bg)"/>
  <circle cx="240" cy="150" r="88" fill="none" stroke="{accent}" stroke-width="6" opacity="0.85"/>
  <text x="240" y="178" font-size="86" text-anchor="middle" dominant-baseline="middle">{emoji}</text>
  <text x="240" y="286" font-size="40" font-family="Georgia, serif" fill="{accent}" text-anchor="middle" letter-spacing="4">{initials}</text>
  <text x="240" y="326" font-size="20" font-family="Georgia, serif" fill="#ffffff" opacity="0.8" text-anchor="middle">{sku}</text>
</svg>"""
    return Response(content=svg, media_type="image/svg+xml")


@router.get("/image/{filename}")
def product_image(filename: str, db: Session = Depends(get_db)) -> Response:
    """Реальное изображение по артикулу, иначе — сгенерированный SVG-плейсхолдер."""
    sku = filename.rsplit(".", 1)[0]
    real = _find_real_image(sku)
    if real is not None:
        return FileResponse(real, media_type=_media_type_for(real))
    return _placeholder_svg(db, sku)


@router.get("/placeholder/{filename}")
def placeholder(filename: str, db: Session = Depends(get_db)) -> Response:
    sku = filename.rsplit(".", 1)[0]
    real = _find_real_image(sku)
    if real is not None:
        return FileResponse(real, media_type=_media_type_for(real))
    return _placeholder_svg(db, sku)
