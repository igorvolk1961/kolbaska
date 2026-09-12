import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { cartApi, catalogApi } from "../api";
import { apiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useCurrency } from "../settings/CurrencyContext";
import type { Product } from "../types";

export default function ProductPage() {
  const { id } = useParams();
  const { format } = useCurrency();
  const { me } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState("");
  const isStaff = me?.user.role === "technologist" || me?.user.role === "admin";

  useEffect(() => {
    if (!id) return;
    catalogApi
      .product(Number(id))
      .then(({ data }) => setProduct(data))
      .catch(() => setProduct(null));
  }, [id]);

  if (!product) {
    return <p className="mx-auto max-w-3xl px-4 py-20 text-center text-meat-600">Загружаем товар…</p>;
  }

  async function addToCart() {
    if (!product) return;
    try {
      await cartApi.add({ product_id: product.id, qty });
      window.dispatchEvent(new Event("cart-updated"));
      setMessage("Добавлено в корзину");
    } catch (error) {
      setMessage(apiError(error));
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Link to="/originals" className="text-sm text-meat-600 underline">
        ← Назад в каталог
      </Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <img src={product.image} alt={product.name} className="w-full rounded-3xl shadow-card" />
        <div>
          <span className="chip">{product.section === "meat_shop" ? "Мясная лавка" : "Арт-объект"}</span>
          <h1 className="mt-3 font-display text-4xl font-bold text-meat-900">{product.name}</h1>
          <p className="mt-3 text-meat-600">{product.description}</p>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <dt className="text-meat-500">Состав</dt>
              <dd className="mt-1 font-semibold text-meat-900">{product.composition}</dd>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <dt className="text-meat-500">Вес</dt>
              <dd className="mt-1 font-semibold text-meat-900">{(product.weight_g / 1000).toFixed(2)} кг</dd>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <dt className="text-meat-500">Габариты</dt>
              <dd className="mt-1 font-semibold text-meat-900">{product.dimensions}</dd>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <dt className="text-meat-500">Срок производства</dt>
              <dd className="mt-1 font-semibold text-meat-900">{product.production_days} дн.</dd>
            </div>
          </dl>

          <p className="mt-6 font-display text-3xl font-bold text-meat-800">{format(product.price_base)}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-meat-200 bg-white px-3 py-1">
              <button type="button" className="px-2 text-lg" onClick={() => setQty((v) => Math.max(1, v - 1))}>
                −
              </button>
              <span className="w-8 text-center font-semibold">{qty}</span>
              <button type="button" className="px-2 text-lg" onClick={() => setQty((v) => v + 1)}>
                +
              </button>
            </div>
            {me?.user.role === "client" ? (
              <button type="button" className="btn-primary" onClick={addToCart}>
                Добавить в корзину
              </button>
            ) : (
              <Link to="/login" className="btn-ghost">
                Войти, чтобы заказать
              </Link>
            )}
          </div>
          {message && <p className="mt-3 text-sm text-meat-600">{message}</p>}

          {isStaff && (
            <details className="mt-6 rounded-2xl bg-meat-50 p-4 text-sm">
              <summary className="cursor-pointer font-semibold text-meat-800">
                Промпт генерации изображения (для технолога)
              </summary>
              <p className="mt-2 text-meat-600">{product.image_prompt}</p>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
