import { Link } from "react-router-dom";
import { useState } from "react";
import { cartApi } from "../api";
import { apiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useCurrency } from "../settings/CurrencyContext";
import type { Product } from "../types";

export default function ProductCard({ product, onAdded }: { product: Product; onAdded?: () => void }) {
  const { format } = useCurrency();
  const { me } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const isClient = me?.user.role === "client";

  async function addToCart() {
    if (!isClient) return;
    setBusy(true);
    setMessage("");
    try {
      await cartApi.add({ product_id: product.id, qty: 1 });
      window.dispatchEvent(new Event("cart-updated"));
      setMessage("Добавлено в корзину");
      onAdded?.();
    } catch (error) {
      setMessage(apiError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card group flex flex-col overflow-hidden transition hover:-translate-y-1">
      <Link to={`/originals/${product.id}`} className="block">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-48 w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <span className="chip">{product.section === "meat_shop" ? "Мясная лавка" : "Арт-объект"}</span>
        <h3 className="mt-3 font-display text-xl font-bold text-meat-900">
          <Link to={`/originals/${product.id}`}>{product.name}</Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-meat-600">{product.description}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-meat-600">
          <div>
            <dt className="inline text-meat-400">Вес: </dt>
            <dd className="inline font-semibold text-meat-800">{(product.weight_g / 1000).toFixed(2)} кг</dd>
          </div>
          <div>
            <dt className="inline text-meat-400">Габариты: </dt>
            <dd className="inline font-semibold text-meat-800">{product.dimensions}</dd>
          </div>
          <div>
            <dt className="inline text-meat-400">Срок: </dt>
            <dd className="inline font-semibold text-meat-800">{product.production_days} дн.</dd>
          </div>
        </dl>
        <p className="mt-4 font-display text-2xl font-bold text-meat-800">{format(product.price_base)}</p>
        <div className="mt-4 flex items-center gap-2">
          {isClient ? (
            <button type="button" className="btn-primary flex-1" onClick={addToCart} disabled={busy}>
              {busy ? "Добавляем…" : "В корзину"}
            </button>
          ) : (
            <Link to="/login" className="btn-ghost flex-1">
              Войти, чтобы заказать
            </Link>
          )}
        </div>
        {message && <p className="mt-2 text-xs text-meat-600">{message}</p>}
      </div>
    </article>
  );
}
