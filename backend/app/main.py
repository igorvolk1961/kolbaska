from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .database import Base, SessionLocal, engine
from .models import STATUS_FLOW, STATUS_LABELS
from .routers import (
    admin,
    analytics,
    assistant,
    auth,
    cart,
    catalog,
    gourmet,
    orders,
    promos,
)
from .seed import seed

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (
    auth.router,
    catalog.router,
    gourmet.router,
    cart.router,
    orders.router,
    promos.router,
    analytics.router,
    admin.router,
    assistant.router,
):
    app.include_router(router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": settings.app_name}


@app.get("/api/meta/statuses")
def statuses() -> list[dict]:
    return [{"code": code, "label": STATUS_LABELS[code]} for code in STATUS_FLOW] + [
        {"code": "cancelled", "label": STATUS_LABELS["cancelled"]}
    ]


# Раздача собранного SPA (используется в Docker-образе и при локальной сборке frontend).
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
if STATIC_DIR.is_dir():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str) -> FileResponse:
        candidate = (STATIC_DIR / full_path).resolve()
        if full_path and candidate.is_file() and STATIC_DIR in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
else:

    @app.get("/", include_in_schema=False)
    def root() -> dict:
        return {
            "service": settings.app_name,
            "docs": "/docs",
            "note": "SPA не собран: выполните `npm run build` во frontend или используйте Docker.",
        }
