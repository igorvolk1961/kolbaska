import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authApi, ordersApi } from "../api";
import { apiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useCurrency } from "../settings/CurrencyContext";
import type { Order } from "../types";

const STATUS_LABEL: Record<string, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  in_production: "В производстве",
  packing: "Упаковка",
  ready: "Готов",
  shipped: "Отправлен",
  done: "Завершён",
  cancelled: "Отменён",
};

export default function CabinetPage() {
  const { me, refresh } = useAuth();
  const { format } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    ordersApi
      .list({ mine: true })
      .then(({ data }) => setOrders(data))
      .catch(() => setOrders([]));
  }, []);

  useEffect(() => {
    if (me) {
      setPhone(me.profile?.phone ?? "");
      setAddress(me.profile?.address ?? "");
      setFullName(me.user.full_name);
    }
  }, [me]);

  if (!me) return null;

  const profile = me.profile;
  const level = me.level;
  const nextLevel = me.next_level;
  const progress =
    profile && level && nextLevel && nextLevel.min_points > level.min_points
      ? Math.min(100, Math.round(((profile.points - level.min_points) / (nextLevel.min_points - level.min_points)) * 100))
      : 100;

  async function saveProfile() {
    try {
      await authApi.updateMe({ full_name: fullName, phone, address });
      await refresh();
      setMessage("Профиль сохранён");
    } catch (error) {
      setMessage(apiError(error));
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="section-title">Личный кабинет</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="space-y-4">
          <div className="card p-6">
            <p className="text-xs uppercase tracking-widest text-meat-500">Уровень</p>
            <p className="font-display text-2xl font-bold text-meat-900">{level?.name ?? "—"}</p>
            <p className="mt-1 text-sm text-meat-600">
              Накоплено баллов: <span className="font-bold text-meat-800">{profile?.points ?? 0}</span>
            </p>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-meat-100">
              <div className="h-full rounded-full bg-gold-400" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-meat-600">
              {nextLevel
                ? `До «${nextLevel.name}» — ещё ${me.points_to_next ?? 0} баллов.`
                : "Максимальный уровень достигнут!"}
            </p>
            <p className="mt-3 text-xs text-meat-500">Ваша скидка: {level?.discount_pct ?? 0}%</p>
          </div>

          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-meat-900">Профиль</h2>
            <div className="mt-3 space-y-3">
              <div>
                <label className="label" htmlFor="cab-name">
                  Имя
                </label>
                <input id="cab-name" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="cab-phone">
                  Телефон
                </label>
                <input id="cab-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="cab-address">
                  Адрес
                </label>
                <input id="cab-address" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <button type="button" className="btn-primary w-full" onClick={saveProfile}>
                Сохранить
              </button>
              {message && <p className="text-xs text-meat-600">{message}</p>}
            </div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-xl font-bold text-meat-900">Мои заказы</h2>
          {orders.length === 0 ? (
            <p className="mt-4 text-sm text-meat-600">
              Заказов пока нет. Начните с{" "}
              <Link to="/originals" className="underline">
                колбасных тортов
              </Link>{" "}
              или{" "}
              <Link to="/gourmet" className="underline">
                своего рецепта
              </Link>
              .
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-meat-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-meat-900">{order.number}</p>
                      <p className="text-xs text-meat-500">
                        {order.created_at ? new Date(order.created_at).toLocaleString("ru-RU") : ""}
                      </p>
                    </div>
                    <span className="chip">{STATUS_LABEL[order.status] ?? order.status}</span>
                    <span className="font-display text-lg font-bold text-meat-800">
                      {format(order.total_base - order.discount_base)}
                    </span>
                  </div>
                  <ul className="mt-2 text-xs text-meat-600">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.name_snapshot} × {item.qty}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center gap-3">
                    {!order.paid && (
                      <Link to={`/payment/${order.id}`} className="btn-gold px-4 py-2 text-xs">
                        Оплатить (демо)
                      </Link>
                    )}
                    <span className="text-xs text-meat-500">Баллов: {order.points_earned}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
