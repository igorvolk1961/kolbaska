import { useEffect, useState } from "react";
import { adminApi } from "../api";
import { apiError } from "../api/client";
import type { User } from "../types";

const ROLE_LABEL: Record<string, string> = {
  client: "Клиент",
  technologist: "Технолог производства",
  analyst: "Бизнес-аналитик",
  admin: "Администратор сервиса",
};

const EMPTY = { email: "", password: "", full_name: "", role: "technologist" };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [draft, setDraft] = useState(EMPTY);
  const [message, setMessage] = useState("");

  const load = () =>
    adminApi
      .users()
      .then(({ data }) => setUsers(data))
      .catch(() => setUsers([]));

  useEffect(() => {
    void load();
  }, []);

  async function createUser() {
    try {
      await adminApi.createUser(draft);
      setDraft(EMPTY);
      setMessage("Пользователь создан");
      await load();
    } catch (error) {
      setMessage(apiError(error));
    }
  }

  async function patch(user: User, payload: Record<string, unknown>) {
    try {
      await adminApi.updateUser(user.id, payload);
      await load();
    } catch (error) {
      setMessage(apiError(error));
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="section-title">Пользователи и роли</h1>
      <p className="mt-2 text-sm text-meat-600">
        Предоставление и управление доступом с ролями Технолог производства, Бизнес-аналитик,
        Администратор сервиса, а также контроль клиентов.
      </p>

      {message && <p className="mt-4 rounded-xl bg-meat-50 p-3 text-sm text-meat-800">{message}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <section className="card h-fit p-6">
          <h2 className="font-display text-xl font-bold text-meat-900">Новый пользователь</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label className="label" htmlFor="u-name">
                Имя
              </label>
              <input
                id="u-name"
                className="input"
                value={draft.full_name}
                onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="u-email">
                Email
              </label>
              <input
                id="u-email"
                className="input"
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="u-pass">
                Пароль
              </label>
              <input
                id="u-pass"
                className="input"
                value={draft.password}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="u-role">
                Роль
              </label>
              <select
                id="u-role"
                className="input"
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
              >
                <option value="technologist">Технолог производства</option>
                <option value="analyst">Бизнес-аналитик</option>
                <option value="admin">Администратор сервиса</option>
                <option value="client">Клиент</option>
              </select>
            </div>
            <button type="button" className="btn-primary w-full" onClick={createUser}>
              Создать пользователя
            </button>
          </div>
        </section>

        <section className="card overflow-x-auto p-4">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-meat-500">
              <tr>
                <th className="p-2">Пользователь</th>
                <th className="p-2">Роль</th>
                <th className="p-2">Статус</th>
                <th className="p-2">Сброс пароля</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-meat-50">
                  <td className="p-2">
                    <p className="font-semibold text-meat-900">{user.full_name || "—"}</p>
                    <p className="text-xs text-meat-500">{user.email}</p>
                  </td>
                  <td className="p-2">
                    <select
                      className="input py-1"
                      value={user.role}
                      onChange={(e) => patch(user, { role: e.target.value })}
                    >
                      {Object.entries(ROLE_LABEL).map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      className={user.is_active ? "chip" : "chip bg-meat-100 text-meat-500"}
                      onClick={() => patch(user, { is_active: !user.is_active })}
                    >
                      {user.is_active ? "активен" : "заблокирован"}
                    </button>
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      className="text-xs text-meat-700 underline"
                      onClick={() => {
                        const password = window.prompt("Новый пароль для " + user.email);
                        if (password) void patch(user, { password });
                      }}
                    >
                      Задать пароль
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
