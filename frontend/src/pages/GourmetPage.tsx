import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cartApi, gourmetApi } from "../api";
import { apiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useCurrency } from "../settings/CurrencyContext";
import type { GourmetGroup, GourmetOption, PriceBreakdown } from "../types";

type SingleKey = "type" | "technology" | "raw_material" | "form";

const STEP_ORDER: SingleKey[] = ["type", "technology", "raw_material", "form"];

function OptionTooltip({ option }: { option: GourmetOption }) {
  return (
    <span className="tooltip-bubble -top-2 left-1/2 w-72 -translate-x-1/2 -translate-y-full text-left">
      <span className="block font-semibold text-gold-300">{option.name}</span>
      <span className="mt-1 block">{option.tooltip}</span>
      <span className="mt-2 block text-[11px] text-meat-100">
        Цвет: {option.effect_color || "—"} · Вкус: {option.effect_taste || "—"} · Форма:{" "}
        {option.effect_form || "—"}
      </span>
      <span className="mt-1 block text-[11px] text-gold-300">
        {option.price_delta === 0 ? "Без надбавки" : `+${option.price_delta} ₽`}
        {option.unit ? ` / ${option.unit}` : ""}
      </span>
    </span>
  );
}

export default function GourmetPage() {
  const { me } = useAuth();
  const { format } = useCurrency();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GourmetGroup[]>([]);
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<Record<SingleKey, number | null>>({
    type: null,
    technology: null,
    raw_material: null,
    form: null,
  });
  const [additives, setAdditives] = useState<number[]>([]);
  const [spices, setSpices] = useState<number[]>([]);
  const [price, setPrice] = useState<PriceBreakdown | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    gourmetApi
      .groups()
      .then(({ data }) => setGroups([...data].sort((a, b) => a.sort - b.sort)))
      .catch(() => setGroups([]));
  }, []);

  const groupByCode = useMemo(() => {
    const map: Record<string, GourmetGroup> = {};
    groups.forEach((group) => (map[group.code] = group));
    return map;
  }, [groups]);

  const steps: { key: string; title: string }[] = [
    ...STEP_ORDER.filter((key) => groupByCode[key]).map((key) => ({
      key,
      title: groupByCode[key].title,
    })),
    ...(["additives", "spices"] as const)
      .filter((key) => groupByCode[key])
      .map((key) => ({ key, title: groupByCode[key].title })),
    { key: "summary", title: "Итог и заказ" },
  ];

  const singleReady =
    selections.type !== null &&
    selections.technology !== null &&
    selections.raw_material !== null &&
    selections.form !== null;

  useEffect(() => {
    if (!singleReady) {
      setPrice(null);
      return;
    }
    gourmetApi
      .price({
        type_option_id: selections.type!,
        technology_option_id: selections.technology!,
        raw_material_option_id: selections.raw_material!,
        form_option_id: selections.form!,
        additive_option_ids: additives,
        spice_option_ids: spices,
      })
      .then(({ data }) => setPrice(data))
      .catch(() => setPrice(null));
  }, [selections, additives, spices, singleReady]);

  const previewEmoji = useMemo(() => {
    const formOption = groupByCode.form?.options.find((option) => option.id === selections.form);
    const typeOption = groupByCode.type?.options.find((option) => option.id === selections.type);
    return formOption?.emoji || typeOption?.emoji || "🌭";
  }, [groupByCode, selections]);

  function selectSingle(key: SingleKey, optionId: number) {
    setSelections((prev) => ({ ...prev, [key]: optionId }));
  }

  function toggleMulti(list: number[], setList: (value: number[]) => void, optionId: number) {
    setList(list.includes(optionId) ? list.filter((item) => item !== optionId) : [...list, optionId]);
  }

  async function addToCart() {
    if (!singleReady) {
      setMessage("Сначала выберите тип, технологию, сырьё и форму.");
      return;
    }
    if (me?.user.role !== "client") {
      setMessage("Оформить заказ может только клиент. Войдите как клиент.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { data } = await gourmetApi.saveConfig({
        type_option_id: selections.type!,
        technology_option_id: selections.technology!,
        raw_material_option_id: selections.raw_material!,
        form_option_id: selections.form!,
        additive_option_ids: additives,
        spice_option_ids: spices,
      });
      await cartApi.add({ custom_config_id: data.id, qty: 1 });
      window.dispatchEvent(new Event("cart-updated"));
      setMessage("Изделие добавлено в корзину. Можно перейти к оформлению.");
    } catch (error) {
      setMessage(apiError(error));
    } finally {
      setBusy(false);
    }
  }

  function renderSelector(group: GourmetGroup) {
    const isMulti = group.selector_type === "checks";
    const multiList = group.code === "additives" ? additives : spices;
    const setMultiList = group.code === "additives" ? setAdditives : setSpices;

    return (
      <div>
        <p className="text-sm text-meat-600">{group.hint}</p>
        <div
          className={
            group.selector_type === "cards"
              ? "mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              : "mt-4 grid gap-2"
          }
        >
          {group.options
            .filter((option) => option.is_active)
            .map((option) => {
              const singleKey = group.code as SingleKey;
              const selected = isMulti
                ? multiList.includes(option.id)
                : selections[singleKey] === option.id;
              return (
                <div key={option.id} className="group relative">
                  <button
                    type="button"
                    onClick={() =>
                      isMulti ? toggleMulti(multiList, setMultiList, option.id) : selectSingle(singleKey, option.id)
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selected
                        ? "border-meat-500 bg-meat-50 shadow-card"
                        : "border-meat-100 bg-white hover:border-meat-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-semibold text-meat-900">
                        <span className="text-xl">{option.emoji}</span>
                        {option.name}
                      </span>
                      <span className="text-xs font-semibold text-meat-600">
                        {option.price_delta === 0 ? "0 ₽" : `+${option.price_delta} ₽`}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-meat-500">{option.tooltip}</p>
                    {selected && <span className="mt-2 inline-block text-xs font-bold text-meat-700">✓ Выбрано</span>}
                  </button>
                  <OptionTooltip option={option} />
                </div>
              );
            })}
        </div>
        {isMulti && (
          <p className="mt-3 text-xs text-meat-500">
            Можно выбрать несколько. Наведите курсор на вариант, чтобы увидеть подсказку.
          </p>
        )}
      </div>
    );
  }

  if (groups.length === 0) {
    return <p className="mx-auto max-w-3xl px-4 py-20 text-center text-meat-600">Загружаем конструктор…</p>;
  }

  const current = steps[Math.min(step, steps.length - 1)];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="section-title">Для мясоедов-гурманов</h1>
      <p className="mt-2 max-w-3xl text-sm text-meat-600">
        Соберите изделие по своему рецепту: мы изготовим его малым объёмом по выбранной технологии.
        Наведите курсор на любой вариант — появится подсказка о его роли и влиянии на цвет, вкус и форму.
      </p>

      <ol className="mt-8 flex flex-wrap gap-2">
        {steps.map((item, index) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => setStep(index)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                index === step
                  ? "bg-meat-700 text-white"
                  : index < step
                    ? "bg-gold-400 text-meat-950"
                    : "bg-white text-meat-600 border border-meat-100"
              }`}
            >
              {index + 1}. {item.title}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
        <div className="card p-6">
          <h2 className="font-display text-2xl font-bold text-meat-900">{current.title}</h2>
          <div className="mt-4">
            {current.key === "summary" ? (
              <div className="space-y-3 text-sm text-meat-700">
                <p>
                  <span className="font-semibold text-meat-900">Изделие:</span>{" "}
                  {[selections.type, selections.technology, selections.raw_material, selections.form]
                    .map((optionId) =>
                      groups
                        .flatMap((group) => group.options)
                        .find((option) => option.id === optionId)?.name,
                    )
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
                <p>
                  <span className="font-semibold text-meat-900">Добавки:</span>{" "}
                  {groupByCode.additives?.options
                    .filter((option) => additives.includes(option.id))
                    .map((option) => option.name)
                    .join(", ") || "нет"}
                </p>
                <p>
                  <span className="font-semibold text-meat-900">Специи:</span>{" "}
                  {groupByCode.spices?.options
                    .filter((option) => spices.includes(option.id))
                    .map((option) => option.name)
                    .join(", ") || "нет"}
                </p>
                <button type="button" className="btn-primary mt-2" onClick={addToCart} disabled={busy}>
                  {busy ? "Сохраняем…" : "Добавить в корзину"}
                </button>
                {message && <p className="text-sm text-meat-700">{message}</p>}
              </div>
            ) : (
              renderSelector(groupByCode[current.key])
            )}
          </div>

          <div className="mt-8 flex justify-between">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setStep((value) => Math.max(0, value - 1))}
              disabled={step === 0}
            >
              ← Назад
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}
              disabled={step === steps.length - 1}
            >
              Далее →
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card p-6 text-center">
            <p className="text-xs uppercase tracking-widest text-meat-500">Предпросмотр изделия</p>
            <div className="mx-auto mt-3 grid h-40 w-40 place-items-center rounded-full bg-gradient-to-br from-meat-700 to-meat-950 text-6xl">
              {previewEmoji}
            </div>
            <p className="mt-3 text-sm text-meat-600">
              {groupByCode.form?.options.find((option) => option.id === selections.form)?.name ?? "Форма не выбрана"}
            </p>
          </div>

          <div className="card p-6">
            <p className="text-xs uppercase tracking-widest text-meat-500">Стоимость изделия</p>
            <p className="mt-1 font-display text-3xl font-bold text-meat-800">
              {price ? format(price.total) : format(0)}
            </p>
            {price && (
              <ul className="mt-3 space-y-1 text-xs text-meat-600">
                {price.lines.map((line, index) => (
                  <li key={index} className="flex justify-between gap-2">
                    <span className="truncate">{line.name}</span>
                    <span className="whitespace-nowrap font-semibold">
                      {line.price === 0 ? "0 ₽" : `+${format(line.price)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-meat-400">
              Цена автоматически пересчитывается при каждом изменении выбора. Итоговая сумма зависит от
              валюты в шапке сайта.
            </p>
          </div>

          <button
            type="button"
            className="btn-ghost w-full"
            onClick={() => navigate("/cart")}
          >
            Перейти в корзину
          </button>
        </aside>
      </div>
    </div>
  );
}
