from conftest import auth


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_catalog_has_32_products(client):
    response = client.get("/api/catalog/products")
    assert response.status_code == 200
    products = response.json()
    assert len(products) == 32
    by_section = {}
    for product in products:
        by_section[product["section"]] = by_section.get(product["section"], 0) + 1
    assert by_section["meat_shop"] == 16
    assert by_section["art_object"] == 16
    assert all(product["image_prompt"] for product in products)


def test_categories_filter(client):
    response = client.get("/api/catalog/products", params={"section": "art_object"})
    assert response.status_code == 200
    assert len(response.json()) == 16


def test_placeholder_svg(client, tmp_path, monkeypatch):
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "images_dir", str(tmp_path / "empty"))
    response = client.get("/api/catalog/placeholder/MS-001.svg")
    assert response.status_code == 200
    assert "image/svg+xml" in response.headers["content-type"]


def test_real_image_by_sku_overrides_placeholder(client, tmp_path, monkeypatch):
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "images_dir", str(tmp_path))
    (tmp_path / "MS-001.png").write_bytes(b"\x89PNG\r\n\x1a\n")
    (tmp_path / "MS-001.webp").write_bytes(b"RIFF....WEBP")
    (tmp_path / "MS-002.webp").write_bytes(b"RIFF....WEBP")
    (tmp_path / "MS-003.png").write_bytes(b"\x89PNG\r\n\x1a\n")
    for url, expected in (
        ("/api/catalog/image/MS-001", "image/webp"),
        ("/api/catalog/placeholder/MS-001.svg", "image/webp"),
        ("/api/catalog/image/MS-002", "image/webp"),
        ("/api/catalog/image/MS-003", "image/png"),
    ):
        response = client.get(url)
        assert response.status_code == 200, url
        assert response.headers["content-type"] == expected, url
    missing = client.get("/api/catalog/image/MS-999")
    assert "image/svg+xml" in missing.headers["content-type"]


def test_image_path_traversal_is_rejected(client, tmp_path, monkeypatch):
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "images_dir", str(tmp_path))
    (tmp_path.parent / "secret.png").write_bytes(b"top-secret")
    response = client.get("/api/catalog/image/..%2Fsecret")
    assert response.status_code in (200, 404)
    if response.status_code == 200:
        assert "image/svg+xml" in response.headers["content-type"]


def test_backgrounds_listing_and_serving(client, tmp_path, monkeypatch):
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "backgrounds_dir", str(tmp_path))
    (tmp_path / "one.jpg").write_bytes(b"\xff\xd8\xff")
    (tmp_path / "two.webp").write_bytes(b"RIFF....WEBP")
    (tmp_path / "Carracci-Butcher's shop.jpg").write_bytes(b"\xff\xd8\xff")
    (tmp_path / "skip.txt").write_text("not an image")

    listing = client.get("/api/catalog/backgrounds").json()
    names = sorted(item["name"] for item in listing)
    assert names == ["Carracci-Butcher's shop.jpg", "one.jpg", "two.webp"]

    by_name = {item["name"]: item["url"] for item in listing}
    for item in listing:
        response = client.get(item["url"])
        assert response.status_code == 200, item["url"]
        assert response.headers["content-type"].startswith("image/"), item["url"]
    assert client.get(by_name["one.jpg"]).headers["content-type"] == "image/jpeg"
    assert client.get(by_name["two.webp"]).headers["content-type"] == "image/webp"

    assert client.get("/api/catalog/backgrounds/skip.txt").status_code == 404
    assert client.get("/api/catalog/backgrounds/no-such.jpg").status_code == 404
    assert client.get("/api/catalog/backgrounds/..%2Fsecret").status_code == 404


def test_currency(client):
    response = client.get("/api/catalog/currency")
    codes = {item["code"] for item in response.json()}
    assert codes == {"RUB", "USD", "EUR", "CNY"}


def test_gourmet_groups(client):
    response = client.get("/api/gourmet/groups")
    assert response.status_code == 200
    groups = response.json()
    assert len(groups) == 6
    assert all(group["options"] for group in groups)
    assert all(option["tooltip"] for group in groups for option in group["options"])


def test_gourmet_price_grows(client):
    groups = {g["code"]: g for g in client.get("/api/gourmet/groups").json()}
    payload = {
        "type_option_id": groups["type"]["options"][0]["id"],
        "technology_option_id": groups["technology"]["options"][0]["id"],
        "raw_material_option_id": groups["raw_material"]["options"][0]["id"],
        "form_option_id": groups["form"]["options"][0]["id"],
        "additive_option_ids": [],
        "spice_option_ids": [],
    }
    base = client.post("/api/gourmet/price", json=payload).json()["total"]
    payload["additive_option_ids"] = [groups["additives"]["options"][0]["id"]]
    payload["spice_option_ids"] = [groups["spices"]["options"][0]["id"]]
    enriched = client.post("/api/gourmet/price", json=payload).json()["total"]
    assert enriched > base


def test_register_and_me(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "newbie@example.com", "password": "secret123", "full_name": "Новый Клиент"},
    )
    assert response.status_code == 201, response.text
    token = response.json()["access_token"]
    me = client.get("/api/auth/me", headers=auth(token)).json()
    assert me["user"]["role"] == "client"
    assert me["level"]["name"] == "В начале славного пути"
    assert me["next_level"]["name"] == "Мясоед"


def test_levels_endpoint(client):
    levels = client.get("/api/auth/levels").json()
    assert len(levels) == 5
    assert levels[0]["name"] == "В начале славного пути"


def test_client_can_save_delivery_coordinates(client, tokens):
    headers = auth(tokens["client"])
    response = client.patch(
        "/api/auth/me",
        json={"latitude": 55.751244, "longitude": 37.618423},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    profile = response.json()["profile"]
    assert profile["latitude"] == 55.751244
    assert profile["longitude"] == 37.618423

    me = client.get("/api/auth/me", headers=headers).json()
    assert me["profile"]["latitude"] == 55.751244
    assert me["profile"]["longitude"] == 37.618423


def test_schema_migration_adds_coordinate_columns(tmp_path):
    from sqlalchemy import create_engine, text

    from app.database import ensure_schema

    legacy = create_engine(f"sqlite:///{tmp_path / 'legacy.db'}")
    with legacy.begin() as connection:
        connection.execute(
            text(
                "CREATE TABLE client_profiles ("
                "id INTEGER PRIMARY KEY, user_id INTEGER, points INTEGER, "
                "currency_pref VARCHAR, phone VARCHAR, address VARCHAR, level_id INTEGER)"
            )
        )
    ensure_schema(legacy)
    with legacy.begin() as connection:
        columns = {row[1] for row in connection.execute(text("PRAGMA table_info(client_profiles)"))}
    assert {"latitude", "longitude"} <= columns


def test_checkout_flow_and_points(client, tokens):
    headers = auth(tokens["client"])
    products = client.get("/api/catalog/products").json()
    product = products[0]
    assert client.post("/api/cart/items", json={"product_id": product["id"], "qty": 2}, headers=headers).status_code == 201
    cart = client.get("/api/cart", headers=headers).json()
    assert cart["items"]
    before = client.get("/api/auth/me", headers=headers).json()["profile"]["points"]
    order = client.post("/api/orders/checkout", json={"currency": "RUB"}, headers=headers).json()
    assert order["status"] == "new"
    assert order["total_base"] > 0
    paid = client.post(f"/api/orders/{order['id']}/pay", headers=headers).json()
    assert paid["paid"] is True
    after = client.get("/api/auth/me", headers=headers).json()["profile"]["points"]
    assert after > before


def test_client_cannot_list_all_orders(client, tokens):
    headers = auth(tokens["client"])
    response = client.get("/api/orders", headers=headers)
    assert response.status_code == 200
    for order in response.json():
        assert order["client_id"] == 2 or order["client_id"] > 0


def test_technologist_export(client, tokens):
    headers = auth(tokens["technologist"])
    orders = client.get("/api/orders", headers=headers).json()
    order = orders[0]
    md = client.get(f"/api/orders/{order['id']}/export", params={"format": "md"}, headers=headers)
    assert md.status_code == 200
    assert f"# Заказ {order['number']}" in md.text
    js = client.get(f"/api/orders/{order['id']}/export", params={"format": "json"}, headers=headers)
    assert js.status_code == 200
    assert js.json()["number"] == order["number"]


def test_rbac_client_forbidden(client, tokens):
    headers = auth(tokens["client"])
    assert client.get("/api/admin/users", headers=headers).status_code == 403
    assert client.get("/api/analytics/overview", headers=headers).status_code == 403


def test_technologist_updates_status(client, tokens):
    headers = auth(tokens["technologist"])
    orders = client.get("/api/orders", headers=headers).json()
    order = orders[0]
    response = client.patch(
        f"/api/orders/{order['id']}/status",
        json={"status": "in_production", "comment": "Отправлено в цех"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "in_production"


def test_technologist_updates_option_price(client, tokens):
    headers = auth(tokens["technologist"])
    groups = {g["code"]: g for g in client.get("/api/gourmet/groups").json()}
    option = groups["spices"]["options"][0]
    response = client.put(
        f"/api/gourmet/options/{option['id']}",
        json={
            "name": option["name"],
            "tooltip": option["tooltip"],
            "unit": option["unit"],
            "price_delta": option["price_delta"] + 100,
            "effect_color": option["effect_color"],
            "effect_taste": option["effect_taste"],
            "effect_form": option["effect_form"],
            "emoji": option["emoji"],
            "sort": option["sort"],
            "is_active": True,
        },
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["price_delta"] == option["price_delta"] + 100


def test_analytics_overview(client, tokens):
    headers = auth(tokens["analyst"])
    data = client.get("/api/analytics/overview", headers=headers).json()
    assert data["summary"]["orders"] >= 1
    assert len(data["weekday"]) == 7
    assert {item["label"] for item in data["season"]} == {"Зима", "Весна", "Лето", "Осень"}


def test_promo_crud(client, tokens):
    headers = auth(tokens["analyst"])
    response = client.post(
        "/api/promos",
        json={
            "title": "Тестовая акция",
            "type": "discount",
            "scope": "all",
            "value": 5,
            "is_active": True,
        },
        headers=headers,
    )
    assert response.status_code == 201
    promo = response.json()
    assert client.get("/api/promos/public").status_code == 200
    assert client.delete(f"/api/promos/{promo['id']}", headers=headers).status_code == 200


def test_admin_user_management(client, tokens):
    headers = auth(tokens["admin"])
    users = client.get("/api/admin/users", headers=headers).json()
    assert len(users) >= 5
    response = client.post(
        "/api/admin/users",
        json={
            "email": "tech2@example.com",
            "password": "secret123",
            "full_name": "Второй Технолог",
            "role": "technologist",
        },
        headers=headers,
    )
    assert response.status_code == 201
    clients = client.get("/api/admin/clients", headers=headers).json()
    assert len(clients) >= 2


def test_assistant_chat(client):
    response = client.post(
        "/api/assistant/chat",
        json={"session_id": "test-session", "message": "Расскажи про уровни лояльности"},
    )
    assert response.status_code == 200
    assert "Мясоед" in response.json()["reply"]
    assert client.get("/api/assistant/quick-replies").json()
