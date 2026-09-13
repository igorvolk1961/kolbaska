"""Сжатие изображений товаров в WebP.

Читает оригиналы из каталога (по умолчанию images/products), уменьшает их по большей стороне
и сохраняет лёгкие WebP-версии с тем же именем (по SKU): MS-001.png -> MS-001.webp.
Бэкенд предпочитает WebP, поэтому оригиналы можно не коммитить.

Примеры:
    python backend/scripts/optimize_images.py
    python backend/scripts/optimize_images.py --max-size 1000 --quality 80 --force
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from PIL import Image

ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DIR = ROOT_DIR / "images" / "products"
SOURCE_SUFFIXES = {".png", ".jpg", ".jpeg"}
SKU_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]*$")


def human(size: int) -> str:
    value = float(size)
    for unit in ("Б", "КБ", "МБ", "ГБ"):
        if value < 1024 or unit == "ГБ":
            return f"{value:.0f} {unit}" if unit == "Б" else f"{value:.1f} {unit}"
        value /= 1024
    return f"{value:.1f} ГБ"


def optimize(source: Path, max_size: int, quality: int, force: bool) -> tuple[int, int] | None:
    target = source.with_suffix(".webp")
    if target.exists() and not force and target.stat().st_mtime >= source.stat().st_mtime:
        return None
    with Image.open(source) as image:
        image = image.convert("RGBA") if image.mode in ("RGBA", "LA", "P") else image.convert("RGB")
        image.thumbnail((max_size, max_size))
        image.save(target, format="WEBP", quality=quality, method=6)
    return source.stat().st_size, target.stat().st_size


def main() -> None:
    parser = argparse.ArgumentParser(description="Сжать изображения товаров в WebP")
    parser.add_argument("--dir", type=Path, default=DEFAULT_DIR, help="каталог с изображениями")
    parser.add_argument("--max-size", type=int, default=1200, help="максимальная сторона, px")
    parser.add_argument("--quality", type=int, default=82, help="качество WebP")
    parser.add_argument("--force", action="store_true", help="пересоздать даже свежие WebP")
    args = parser.parse_args()

    sources = sorted(
        path
        for path in args.dir.iterdir()
        if path.is_file() and path.suffix.lower() in SOURCE_SUFFIXES and SKU_RE.match(path.stem)
    )
    if not sources:
        print(f"В {args.dir} нет исходных изображений (png/jpg/jpeg).")
        return

    total_before = total_after = 0
    skipped = 0
    for source in sources:
        result = optimize(source, args.max_size, args.quality, args.force)
        if result is None:
            skipped += 1
            continue
        before, after = result
        total_before += before
        total_after += after
        print(f"{source.name} -> {source.stem}.webp  {human(before)} -> {human(after)}")

    print(
        f"\nГотово: {len(sources) - skipped} файлов, пропущено {skipped}. "
        f"Итого {human(total_before)} -> {human(total_after)}."
    )


if __name__ == "__main__":
    main()
