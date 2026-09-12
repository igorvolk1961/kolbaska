import { useEffect, useState } from "react";
import { adminApi } from "../api";
import { apiError } from "../api/client";
import type { ClientRow } from "../types";

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [message, setMessage] = useState("");

  const load = () =>
    adminApi
      .clients()
      .then(({ data }) => setClients(data))
      .catch(() => setClients([]));

  useEffect(() => {
    void load();
  }, []);

  async function adjust(client: ClientRow, delta: number) {
    try {
      await adminApi.adjustPoints(client.id, delta);
      setMessage(`Баллы клиента ${client.email} изменены на ${delta > 0 ? "+" : ""}${delta}`);
      await load();
    } catch (error) {
      setMessage(apiError(error));
    }
  }

  async function toggleActive(client: ClientRow) {
    try {
      await adminApi.updateUser(client.id, { is_active: !client.is_active });
      await load();
    } catch (error) {
      setMessage(apiError(error));
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="section-title">Контроль аккаунтов клиентов</h1>
      <p className="mt-2 text-sm text-meat-600">
        Просмотр клиентов, блокировка, а также корректировка баллов и уровня лояльности.
      </p>

      {message && <p className="mt-4 rounded-xl bg-meat-50 p-3 text-sm text-meat-800">{message}</p>}

      <div className="card mt-6 overflow-x-auto p-4">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-meat-500">
            <tr>
              <th className="p-2">Клиент</th>
              <th className="p-2">Телефон</th>
              <th className="p-2">Уровень</th>
              <th className="p-2">Баллы</th>
              <th className="p-2">Корректировка</th>
              <th className="p-2">Статус</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-t border-meat-50">
                <td className="p-2">
                  <p className="font-semibold text-meat-900">{client.full_name || "—"}</p>
                  <p className="text-xs text-meat-500">{client.email}</p>
                </td>
                <td className="p-2 text-meat-600">{client.phone || "—"}</td>
                <td className="p-2">{client.level ?? "—"}</td>
                <td className="p-2 font-semibold text-meat-800">{client.points}</td>
                <td className="p-2">
                  <div className="flex gap-1">
                    <button type="button" className="btn-ghost px-3 py-1 text-xs" onClick={() => adjust(client, 100)}>
                      +100
                    </button>
                    <button type="button" className="btn-ghost px-3 py-1 text-xs" onClick={() => adjust(client, -100)}>
                      −100
                    </button>
                  </div>
                </td>
                <td className="p-2">
                  <button
                    type="button"
                    className={client.is_active ? "chip" : "chip bg-meat-100 text-meat-500"}
                    onClick={() => toggleActive(client)}
                  >
                    {client.is_active ? "активен" : "заблокирован"}
                  </button>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-meat-500">
                  Клиентов пока нет.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
