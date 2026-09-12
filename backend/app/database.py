from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings

settings = get_settings()

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


# Лёгкие миграции для SQLite: create_all не добавляет новые столбцы в существующие таблицы.
_COLUMN_MIGRATIONS: dict[str, dict[str, str]] = {
    "client_profiles": {
        "latitude": "FLOAT",
        "longitude": "FLOAT",
    },
}


def ensure_schema(bind=engine) -> None:
    if not settings.database_url.startswith("sqlite"):
        return
    with bind.begin() as connection:
        for table, columns in _COLUMN_MIGRATIONS.items():
            existing = {
                row[1] for row in connection.execute(text(f"PRAGMA table_info({table})"))
            }
            if not existing:
                continue
            for name, ddl_type in columns.items():
                if name not in existing:
                    connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl_type}"))


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
