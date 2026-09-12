import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cartApi, ordersApi } from "../api";
import { apiError } from "../api/client";
import { useCurrency } from "../settings/CurrencyContext";
import type { Cart } from "../types";

export default function CartPage() {
  const { format, currency } = useCurrency();
  const navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null);
  const [delivery, setDelivery] = useState("pickup");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => cartApi.get().then(({ data }) => setCart(data)).catch(() => setCart(null));

  useEffect(() => {
    void load();
  }, []);

  async function changeQty(itemId: number, qty: number) {
    const { data } = await cartApi.update(itemId, qty);
    setCart(data);
    window.dispatchEvent(new Event("cart-updated"));
  }

  async function removeItem(itemId: number) {
    const { data } = await cartApi.remove(itemId);
    setCart(data);
    window.dispatchEvent(new Event("cart-updated"));
  }

  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const { data } = await ordersApi.checkout({ currency, delivery_mode: delivery });
      window.dispatchEvent(new Event("cart-updated"));
      navigate(`/payment/${data.id}`);
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!cart) {
    return <p className="mx-auto max-w-4xl px-4 py-20 text-center text-meat-600">Загружаем корзину…</p>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="section-title">Корзина</h1>
      {cart.items.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="text-5xl">🛒</p>
          <p className="mt-3 text-meat-600">Корзина пуста. Выберите колбасный торт или соберите своё изделие.</p>
          <div className="mt-5 flex justify-center gap-3">
            <Link to="/originals" className="btn-primary">
              Колбасные торты
            </Link>
            <Link to="/gourmet" className="btn-ghost">
              Свой рецепт
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="space-y-3">
            {cart.items.map((item) => (
              <div key={item.id} className="card flex items-center gap-4 p-4">
                <div className="flex-1">
                  <p className="font-semibold text-meat-900">{item.name_snapshot}</p>
                  <p className="text-xs text-meat-500">
                    {item.product_id ? "Готовый колбасный торт" : "Изделие по вашему рецепту"}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-meat-200 px-2 py-1">
                  <button type="button" onClick={() => changeQty(item.id, item.qty - 1)}>
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                  <button type="button" onClick={() => changeQty(item.id, item.qty + 1)}>
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="text-sm text-meat-500 underline"
                  onClick={() => removeItem(item.id)}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>

          <aside className="card h-fit p-6">
            <h2 className="font-display text-xl font-bold text-meat-900">Оформление</h2>
            <div className="mt-4">
              <label className="label" htmlFor="delivery">
                Способ получения
              </label>
              <select
                id="delivery"
                className="input"
                value={delivery}
                onChange={(event) => setDelivery(event.target.value)}
              >
                <option value="pickup">Самовывоз с цеха</option>
                <option value="courier">Доставка курьером (демо)</option>
              </select>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-meat-100 pt-4">
              <span className="text-meat-600">Итого</span>
              <span className="font-display text-2xl font-bold text-meat-800">{format(cart.total_base)}</span>
            </div>
            <p className="mt-2 text-xs text-meat-500">
              Скидки уровня и акции применяются при оформлении. Баллы начислятся после демо-оплаты.
            </p>
            {error && <p className="mt-3 rounded-xl bg-meat-50 p-3 text-sm text-meat-800">{error}</p>}
            <button type="button" className="btn-primary mt-4 w-full" onClick={checkout} disabled={busy}>
              {busy ? "Оформляем…" : "Перейти к оплате"}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
