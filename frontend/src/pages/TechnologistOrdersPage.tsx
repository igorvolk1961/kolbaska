import { useEffect, useMemo, useState } from "react";
import { api, apiError } from "../api/client";
import { metaApi, ordersApi } from "../api";
import { useCurrency } from "../settings/CurrencyContext";
import type { Order } from "../types";

export default function TechnologistOrdersPage() {
  const { format } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statuses, setStatuses] = useState<{ code: string; label: string }[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [message, setMessage] = useState("");

  const load = () =>
    ordersApi
      .list()
      .then(({ data }) => setOrders(data))
      .catch(() => setOrders([]));

  useEffect(() => {
    void load();
    metaApi
      .statuses()
      .then(({ data }) => setStatuses(data))
      .catch(() => setStatuses([]));
  }, []);

  const filtered = useMemo(
    () => (filter ? orders.filter((order) => order.status === filter) : orders),
    [orders, filter],
  );

  async function updateStatus(order: Order, status: string) {
    try {
      const { data } = await ordersApi.setStatus(order.id, status, `Статус изменён технологом: ${status}`);
      setOrders((prev) => prev.map((item) => (item.id === data.id ? data : item)));
      if (selected?.id === data.id) setSelected(data);
      setMessage(`Заказ ${data.number}: статус обновлён`);
    } catch (error) {
      setMessage(apiError(error));
    }
  }

  async function download(order: Order, formatName: "md" | "json") {
    try {
      const response = await api.get(ordersApi.exportUrl(order.id, formatName), { responseType: "blob" });
      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `order-${order.number}.${formatName}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(apiError(error));
    }
  }

  function printOrder(order: Order) {
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;
    const rows = order.items
      .map(
        (item) =>
          `<tr><td>${item.name_snapshot}</td><td style="text-align:right">${item.qty}</td>` +
          `<td style="text-align:right">${item.unit_price_base.toFixed(2)}</td>` +
          `<td style="text-align:right">${(item.unit_price_base * item.qty).toFixed(2)}</td></tr>`,
      )
      .join("");
    win.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8">
      <title>Заказ ${order.number}</title>
      <style>body{font-family:Georgia,serif;padding:32px;color:#221310}h1{margin:0 0 8px}
      table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}
      .muted{color:#777;font-size:13px}</style></head><body>
      <h1>Заказ ${order.number}</h1>
      <p class="muted">Статус: ${order.status} · Создан: ${order.created_at ?? ""} · Валюта: ${order.currency}</p>
      <table><thead><tr><th>Позиция</th><th style="text-align:right">Кол-во</th>
      <th style="text-align:right">Цена</th><th style="text-align:right">Сумма</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="muted">Итого: ${order.total_base.toFixed(2)} · Скидка: ${order.discount_base.toFixed(2)} · К оплате: ${(order.total_base - order.discount_base).toFixed(2)} · Баллы: ${order.points_earned}</p>
      <p class="muted">Демонстрационный прототип — документ не является производственным заданием.</p>
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="section-title">Заказы и статусы</h1>
      <p className="mt-2 text-sm text-meat-600">
        Просмотр, печать, выгрузка в Markdown и JSON, отправка в производство и отслеживание статусов.
        Отправка в производство здесь эмулируется сменой статуса.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" className={filter === "" ? "btn-primary" : "btn-ghost"} onClick={() => setFilter("")}>
          Все
        </button>
        {statuses.map((status) => (
          <button
            key={status.code}
            type="button"
            className={filter === status.code ? "btn-primary" : "btn-ghost"}
            onClick={() => setFilter(status.code)}
          >
            {status.label}
          </button>
        ))}
      </div>

      {message && <p className="mt-4 rounded-xl bg-meat-50 p-3 text-sm text-meat-800">{message}</p>}

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="card overflow-x-auto p-4">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-meat-500">
              <tr>
                <th className="p-2">Номер</th>
                <th className="p-2">Дата</th>
                <th className="p-2">Статус</th>
                <th className="p-2">Сумма</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-t border-meat-50">
                  <td className="p-2 font-semibold text-meat-900">{order.number}</td>
                  <td className="p-2 text-meat-600">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString("ru-RU") : ""}
                  </td>
                  <td className="p-2">
                    <select
                      className="input py-1"
                      value={order.status}
                      onChange={(event) => updateStatus(order, event.target.value)}
                    >
                      {statuses.map((status) => (
                        <option key={status.code} value={status.code}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 font-semibold text-meat-800">
                    {format(order.total_base - order.discount_base)}
                  </td>
                  <td className="p-2">
                    <button type="button" className="text-xs text-meat-700 underline" onClick={() => setSelected(order)}>
                      Детали
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-meat-500">
                    Заказов с этим статусом нет.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <aside className="card h-fit p-6">
          {!selected ? (
            <p className="text-sm text-meat-600">Выберите заказ, чтобы увидеть состав и действия.</p>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-meat-900">{selected.number}</h2>
                <span className="chip">{selected.status}</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {selected.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3 border-b border-meat-50 pb-2">
                    <span className="text-meat-700">
                      {item.name_snapshot} × {item.qty}
                    </span>
                    <span className="font-semibold text-meat-900">{format(item.unit_price_base * item.qty)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 space-y-1 text-xs text-meat-600">
                <p>Сумма: {format(selected.total_base)}</p>
                <p>Скидка: {format(selected.discount_base)}</p>
                <p>Баллы: {selected.points_earned}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn-primary px-3 py-2 text-xs" onClick={() => printOrder(selected)}>
                  🖨 Печать
                </button>
                <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={() => download(selected, "md")}>
                  ⬇ Markdown
                </button>
                <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={() => download(selected, "json")}>
                  ⬇ JSON
                </button>
                <button
                  type="button"
                  className="btn-gold px-3 py-2 text-xs"
                  onClick={() => updateStatus(selected, "in_production")}
                >
                  🏭 Отправить в производство
                </button>
              </div>

              <h3 className="mt-5 text-sm font-semibold text-meat-900">История статусов</h3>
              <ol className="mt-2 space-y-1 text-xs text-meat-600">
                {selected.history.map((entry) => (
                  <li key={entry.id}>
                    • {entry.status} — {entry.comment}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
