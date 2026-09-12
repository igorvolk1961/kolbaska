import { useEffect, useState } from "react";
import { gourmetApi } from "../api";
import { apiError } from "../api/client";
import { useCurrency } from "../settings/CurrencyContext";
import type { GourmetGroup, GourmetOption } from "../types";

export default function TechnologistOptionsPage() {
  const { format } = useCurrency();
  const [groups, setGroups] = useState<GourmetGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<string>("");
  const [draft, setDraft] = useState<Record<number, GourmetOption>>({});
  const [message, setMessage] = useState("");

  const load = () =>
    gourmetApi.groups().then(({ data }) => {
      const sorted = [...data].sort((a, b) => a.sort - b.sort);
      setGroups(sorted);
      setActiveGroup((current) => current || sorted[0]?.code || "");
    });

  useEffect(() => {
    load().catch(() => setGroups([]));
  }, []);

  const group = groups.find((item) => item.code === activeGroup);

  function edit(option: GourmetOption, patch: Partial<GourmetOption>) {
    setDraft((prev) => ({ ...prev, [option.id]: { ...(prev[option.id] ?? option), ...patch } }));
  }

  async function save(option: GourmetOption) {
    const updated = draft[option.id] ?? option;
    try {
      await gourmetApi.updateOption(option.id, {
        name: updated.name,
        tooltip: updated.tooltip,
        unit: updated.unit,
        price_delta: updated.price_delta,
        effect_color: updated.effect_color,
        effect_taste: updated.effect_taste,
        effect_form: updated.effect_form,
        emoji: updated.emoji,
        sort: updated.sort,
        is_active: updated.is_active,
      });
      setMessage(`Сохранено: ${updated.name}`);
      setDraft((prev) => {
        const next = { ...prev };
        delete next[option.id];
        return next;
      });
      await load();
    } catch (error) {
      setMessage(apiError(error));
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="section-title">Справочники и цены</h1>
      <p className="mt-2 text-sm text-meat-600">
        Управляйте списками выбора, которые видит клиент в конструкторе, и назначайте цены. Изменения
        сразу влияют на расчёт стоимости изделия.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {groups.map((item) => (
          <button
            key={item.code}
            type="button"
            className={item.code === activeGroup ? "btn-primary" : "btn-ghost"}
            onClick={() => setActiveGroup(item.code)}
          >
            {item.title}
          </button>
        ))}
      </div>

      {message && <p className="mt-4 rounded-xl bg-meat-50 p-3 text-sm text-meat-800">{message}</p>}

      {group && (
        <div className="card mt-5 overflow-x-auto p-4">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-meat-500">
              <tr>
                <th className="p-2">Название</th>
                <th className="p-2">Подсказка клиенту</th>
                <th className="p-2">Цена, ₽</th>
                <th className="p-2">Ед.</th>
                <th className="p-2">Активно</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {group.options.map((option) => {
                const row = draft[option.id] ?? option;
                return (
                  <tr key={option.id} className="border-t border-meat-50 align-top">
                    <td className="p-2">
                      <input
                        className="input"
                        value={row.name}
                        onChange={(e) => edit(option, { name: e.target.value })}
                      />
                    </td>
                    <td className="p-2">
                      <textarea
                        className="input h-20 min-w-[260px]"
                        value={row.tooltip}
                        onChange={(e) => edit(option, { tooltip: e.target.value })}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        className="input w-28"
                        value={row.price_delta}
                        onChange={(e) => edit(option, { price_delta: Number(e.target.value) })}
                      />
                      <p className="mt-1 text-[11px] text-meat-400">≈ {format(row.price_delta)}</p>
                    </td>
                    <td className="p-2">
                      <input
                        className="input w-20"
                        value={row.unit}
                        onChange={(e) => edit(option, { unit: e.target.value })}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={row.is_active}
                        onChange={(e) => edit(option, { is_active: e.target.checked })}
                      />
                    </td>
                    <td className="p-2">
                      <button type="button" className="btn-primary px-3 py-2 text-xs" onClick={() => save(option)}>
                        Сохранить
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
