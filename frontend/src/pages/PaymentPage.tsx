import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ordersApi } from "../api";
import { apiError } from "../api/client";
import { useCurrency } from "../settings/CurrencyContext";
import type { Order } from "../types";

export default function PaymentPage() {
  const { orderId } = useParams();
  const { format } = useCurrency();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    ordersApi
      .get(Number(orderId))
      .then(({ data }) => setOrder(data))
      .catch(() => setOrder(null));
  }, [orderId]);

  if (!order) {
    return <p className="mx-auto max-w-3xl px-4 py-20 text-center text-meat-600">Загружаем заказ…</p>;
  }

  async function pay() {
    if (!order) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await ordersApi.pay(order.id);
      setOrder(data);
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="section-title">Платёжная страница</h1>
      <p className="mt-2 text-sm text-meat-600">
        Демонстрационный экран. В продакшене эту страницу предоставляют платёжные партнёры; реальные
        платежи и транзакции в прототипе не выполняются.
      </p>

      <div className="card mt-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-meat-500">Заказ</p>
            <p className="font-display text-2xl font-bold text-meat-900">{order.number}</p>
          </div>
          <span className="chip">{order.paid ? "Оплачен (демо)" : "Ожидает оплаты"}</span>
        </div>

        <ul className="mt-5 space-y-2 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 border-b border-meat-50 pb-2">
              <span className="text-meat-700">
                {item.name_snapshot} × {item.qty}
              </span>
              <span className="font-semibold text-meat-900">{format(item.unit_price_base * item.qty)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between text-meat-600">
            <span>Сумма без скидки</span>
            <span>{format(order.total_base)}</span>
          </div>
          <div className="flex justify-between text-meat-600">
            <span>Скидка</span>
            <span>−{format(order.discount_base)}</span>
          </div>
          <div className="flex justify-between border-t border-meat-100 pt-2 font-display text-xl font-bold text-meat-800">
            <span>К оплате</span>
            <span>{format(order.total_base - order.discount_base)}</span>
          </div>
          <p className="text-xs text-meat-500">Будет начислено баллов: {order.points_earned}</p>
        </div>

        {error && <p className="mt-3 rounded-xl bg-meat-50 p-3 text-sm text-meat-800">{error}</p>}

        {order.paid ? (
          <div className="mt-6 rounded-2xl bg-meat-50 p-5 text-center">
            <p className="text-4xl">✅</p>
            <p className="mt-2 font-semibold text-meat-900">Демо-оплата выполнена</p>
            <p className="text-sm text-meat-600">Баллы начислены, заказ передан со статусом «Подтверждён».</p>
            <div className="mt-4 flex justify-center gap-3">
              <Link to="/cabinet" className="btn-primary">
                В личный кабинет
              </Link>
              <Link to="/originals" className="btn-ghost">
                Продолжить покупки
              </Link>
            </div>
          </div>
        ) : (
          <button type="button" className="btn-gold mt-6 w-full" onClick={pay} disabled={busy}>
            {busy ? "Обрабатываем…" : "Оплатить (демо)"}
          </button>
        )}
      </div>
    </div>
  );
}
