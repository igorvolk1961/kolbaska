import { useEffect, useState } from "react";
import { promosApi } from "../api";
import { apiError } from "../api/client";
import type { Promo } from "../types";

interface Draft {
  title: string;
  type: Promo["type"];
  scope: Promo["scope"];
  category_slug: string;
  value: number;
  ends_at: string;
  is_active: boolean;
}

const EMPTY: Draft = {
  title: "",
  type: "discount",
  scope: "all",
  category_slug: "",
  value: 5,
  ends_at: "",
  is_active: true,
};

export default function PromosPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const load = () =>
    promosApi
      .list()
      .then(({ data }) => setPromos(data))
      .catch(() => setPromos([]));

  useEffect(() => {
    void load();
  }, []);

  async function submit() {
    const payload = {
      ...draft,
      target_id: null,
      starts_at: null,
      ends_at: draft.ends_at ? new Date(draft.ends_at).toISOString() : null,
      category_slug: draft.scope === "category" ? draft.category_slug : "",
    };
    try {
      if (editingId) await promosApi.update(editingId, payload);
      else await promosApi.create(payload);
      setDraft(EMPTY);
      setEditingId(null);
      setMessage("Акция сохранена");
      await load();
    } catch (error) {
      setMessage(apiError(error));
    }
  }

  async function remove(promo: Promo) {
    try {
      await promosApi.remove(promo.id);
      await load();
    } catch (error) {
      setMessage(apiError(error));
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="section-title">Акции</h1>
      <p className="mt-2 text-sm text-meat-600">
        Временные скидки и повышенные баллы на отдельные товары, категории или все товары.
      </p>

      {message && <p className="mt-4 rounded-xl bg-meat-50 p-3 text-sm text-meat-800">{message}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <section className="card h-fit p-6">
          <h2 className="font-display text-xl font-bold text-meat-900">
            {editingId ? "Редактирование акции" : "Новая акция"}
          </h2>
          <div className="mt-4 space-y-3">
            <div>
              <label className="label" htmlFor="promo-title">
                Название
              </label>
              <input
                id="promo-title"
                className="input"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Например: Мясная неделя"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="promo-type">
                  Тип
                </label>
                <select
                  id="promo-type"
                  className="input"
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value as Promo["type"] })}
                >
                  <option value="discount">Скидка, %</option>
                  <option value="points_multiplier">Множитель баллов</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="promo-scope">
                  Охват
                </label>
                <select
                  id="promo-scope"
                  className="input"
                  value={draft.scope}
                  onChange={(e) => setDraft({ ...draft, scope: e.target.value as Promo["scope"] })}
                >
                  <option value="all">Все товары</option>
                  <option value="category">Категория</option>
                </select>
              </div>
            </div>
            {draft.scope === "category" && (
              <div>
                <label className="label" htmlFor="promo-category">
                  Код категории
                </label>
                <input
                  id="promo-category"
                  className="input"
                  value={draft.category_slug}
                  onChange={(e) => setDraft({ ...draft, category_slug: e.target.value })}
                  placeholder="classic, romantic, transport…"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="promo-value">
                  {draft.type === "discount" ? "Скидка, %" : "Множитель баллов"}
                </label>
                <input
                  id="promo-value"
                  type="number"
                  className="input"
                  value={draft.value}
                  onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label" htmlFor="promo-ends">
                  Действует до
                </label>
                <input
                  id="promo-ends"
                  type="date"
                  className="input"
                  value={draft.ends_at}
                  onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-meat-700">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
              />
              Активна
            </label>
            <div className="flex gap-2">
              <button type="button" className="btn-primary flex-1" onClick={submit}>
                {editingId ? "Сохранить" : "Создать акцию"}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setEditingId(null);
                    setDraft(EMPTY);
                  }}
                >
                  Отмена
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {promos.map((promo) => (
            <article key={promo.id} className="card flex flex-wrap items-center gap-3 p-5">
              <div className="flex-1">
                <p className="font-semibold text-meat-900">{promo.title}</p>
                <p className="text-xs text-meat-500">
                  {promo.type === "discount" ? `Скидка ${promo.value}%` : `Баллы ×${promo.value}`} ·{" "}
                  {promo.scope === "all" ? "все товары" : `категория ${promo.category_slug}`}
                  {promo.ends_at ? ` · до ${new Date(promo.ends_at).toLocaleDateString("ru-RU")}` : ""}
                </p>
              </div>
              <span className={promo.is_active ? "chip" : "chip bg-meat-100 text-meat-500"}>
                {promo.is_active ? "активна" : "выключена"}
              </span>
              <button
                type="button"
                className="text-xs text-meat-700 underline"
                onClick={() => {
                  setEditingId(promo.id);
                  setDraft({
                    title: promo.title,
                    type: promo.type,
                    scope: promo.scope,
                    category_slug: promo.category_slug,
                    value: promo.value,
                    ends_at: promo.ends_at ? promo.ends_at.slice(0, 10) : "",
                    is_active: promo.is_active,
                  });
                }}
              >
                Изменить
              </button>
              <button type="button" className="text-xs text-meat-500 underline" onClick={() => remove(promo)}>
                Удалить
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
