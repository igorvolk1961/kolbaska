import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { catalogApi } from "../api";
import ProductCard from "../components/ProductCard";
import type { Category, Product } from "../types";

const SECTIONS: { code: "meat_shop" | "art_object"; label: string; hint: string }[] = [
  { code: "art_object", label: "Арт-объекты", hint: "Формы знакомых объектов: транспорт, замки, фантазия." },
  { code: "meat_shop", label: "Мясная лавка", hint: "Композиции из готовых колбасных изделий." },
];

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const section = (params.get("tab") === "meat_shop" ? "meat_shop" : "art_object") as
    | "meat_shop"
    | "art_object";
  const category = params.get("category") ?? "";
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    catalogApi
      .products({ section })
      .then(({ data }) => setProducts(data))
      .finally(() => setLoading(false));
    catalogApi
      .categories(section)
      .then(({ data }) => setCategories(data))
      .catch(() => setCategories([]));
  }, [section]);

  const filtered = useMemo(() => {
    let list = products;
    if (category) list = list.filter((product) => product.category_slug === category);
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      list = list.filter(
        (product) =>
          product.name.toLowerCase().includes(needle) ||
          product.composition.toLowerCase().includes(needle),
      );
    }
    return list;
  }, [products, category, search]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">Для мясоедов-оригиналов</h1>
          <p className="mt-2 max-w-2xl text-sm text-meat-600">
            Готовые «колбасные торты» с указанием состава, веса, габаритов, стоимости и сроков
            производства. Каждая позиция — с авторским названием и характером.
          </p>
        </div>
        <div className="flex gap-2">
          {SECTIONS.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => {
                updateParam("tab", item.code);
                updateParam("category", "");
              }}
              className={
                section === item.code ? "btn-primary" : "btn-ghost"
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="Поиск по названию или составу…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button
          type="button"
          className={category === "" ? "btn-primary" : "btn-ghost"}
          onClick={() => updateParam("category", "")}
        >
          Все категории
        </button>
        {categories.map((item) => (
          <button
            key={item.slug}
            type="button"
            title={item.description}
            className={category === item.slug ? "btn-primary" : "btn-ghost"}
            onClick={() => updateParam("category", item.slug)}
          >
            {item.name}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs text-meat-500">
        {SECTIONS.find((item) => item.code === section)?.hint}
      </p>

      {loading ? (
        <p className="mt-10 text-center text-meat-600">Загружаем каталог…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-center text-meat-600">Ничего не найдено. Попробуйте изменить фильтры.</p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
