import os
import sys
import tempfile
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

_db_fd, _db_path = tempfile.mkstemp(suffix=".db")
os.close(_db_fd)
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"
os.environ["SECRET_KEY"] = "test-secret"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def tokens(client):
    result = {}
    for role, email, password in (
        ("client", "client@kolbaska.ru", "client123"),
        ("technologist", "technolog@kolbaska.ru", "techno123"),
        ("analyst", "analyst@kolbaska.ru", "analyst123"),
        ("admin", "admin@kolbaska.ru", "admin123"),
    ):
        response = client.post("/api/auth/login", json={"email": email, "password": password})
        assert response.status_code == 200, response.text
        result[role] = response.json()["access_token"]
    return result


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
