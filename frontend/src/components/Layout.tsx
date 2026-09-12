import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { cartApi } from "../api";
import { useAuth } from "../auth/AuthContext";
import { useCurrency } from "../settings/CurrencyContext";
import AssistantChat from "./AssistantChat";

const ROLE_LABEL: Record<string, string> = {
  client: "Клиент",
  technologist: "Технолог",
  analyst: "Аналитик",
  admin: "Администратор",
};

export default function Layout({ children }: { children: ReactNode }) {
  const { me, isAuthenticated, logout } = useAuth();
  const { rates, currency, setCurrency } = useCurrency();
  const [cartCount, setCartCount] = useState(0);

  const isClient = me?.user.role === "client";

  useEffect(() => {
    if (!isClient) {
      setCartCount(0);
      return;
    }
    const refreshCart = () =>
      cartApi
        .get()
        .then(({ data }) => setCartCount(data.items.reduce((sum, item) => sum + item.qty, 0)))
        .catch(() => setCartCount(0));
    void refreshCart();
    window.addEventListener("cart-updated", refreshCart);
    return () => window.removeEventListener("cart-updated", refreshCart);
  }, [isClient, me]);

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3 py-2 text-sm font-medium transition ${
      isActive ? "bg-meat-700 text-white" : "text-meat-800 hover:bg-meat-50"
    }`;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-meat-100 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" className="mr-2 flex items-center gap-2">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-meat-800 text-2xl">🥩</span>
            <span className="leading-tight">
              <span className="block font-display text-lg font-bold text-meat-900">Колбасный цех</span>
              <span className="block text-[11px] uppercase tracking-widest text-meat-500">
                заказное производство
              </span>
            </span>
          </Link>

          <nav className="order-3 flex w-full flex-wrap items-center gap-1 md:order-none md:w-auto">
            <NavLink to="/" className={navLink} end>
              Главная
            </NavLink>
            <NavLink to="/originals" className={navLink}>
              Для мясоедов-оригиналов
            </NavLink>
            <NavLink to="/gourmet" className={navLink}>
              Для мясоедов-гурманов
            </NavLink>
            <NavLink to="/about" className={navLink}>
              О нас
            </NavLink>
            <NavLink to="/contacts" className={navLink}>
              Контакты
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <select
              className="rounded-full border border-meat-200 bg-white px-3 py-2 text-sm font-semibold text-meat-800"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              aria-label="Валюта"
            >
              {rates.map((rate) => (
                <option key={rate.code} value={rate.code}>
                  {rate.symbol} {rate.code}
                </option>
              ))}
            </select>

            {isClient && (
              <Link to="/cart" className="relative rounded-full border border-meat-200 bg-white px-3 py-2 text-sm">
                🛒
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-meat-700 text-[11px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            {isAuthenticated && me ? (
              <div className="flex items-center gap-2">
                <Link
                  to={
                    me.user.role === "technologist"
                      ? "/technologist"
                      : me.user.role === "analyst"
                        ? "/analyst"
                        : me.user.role === "admin"
                          ? "/admin"
                          : "/cabinet"
                  }
                  className="hidden rounded-full bg-meat-50 px-3 py-2 text-xs font-semibold text-meat-800 sm:block"
                >
                  {me.user.full_name || me.user.email} · {ROLE_LABEL[me.user.role]}
                </Link>
                <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={logout}>
                  Выйти
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-ghost px-3 py-2 text-xs">
                  Вход
                </Link>
                <Link to="/register" className="btn-primary px-3 py-2 text-xs">
                  Регистрация
                </Link>
              </div>
            )}
          </div>
        </div>

        {me?.user.role === "technologist" && (
          <div className="mx-auto flex max-w-7xl gap-1 px-4 pb-2">
            <Link to="/technologist/options" className="chip">
              ⚙️ Справочники и цены
            </Link>
            <Link to="/technologist/orders" className="chip">
              📋 Заказы и статусы
            </Link>
          </div>
        )}
        {me?.user.role === "analyst" && (
          <div className="mx-auto flex max-w-7xl gap-1 px-4 pb-2">
            <Link to="/analyst" className="chip">
              📈 Дашборды
            </Link>
            <Link to="/analyst/promos" className="chip">
              🎁 Акции
            </Link>
          </div>
        )}
        {me?.user.role === "admin" && (
          <div className="mx-auto flex max-w-7xl gap-1 px-4 pb-2">
            <Link to="/admin/users" className="chip">
              👥 Пользователи и роли
            </Link>
            <Link to="/admin/clients" className="chip">
              🧾 Клиенты
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-meat-100 bg-meat-950 text-meat-100">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-3">
          <div>
            <p className="font-display text-xl font-bold text-white">Колбасный цех</p>
            <p className="mt-2 text-sm text-meat-200">
              Прототип интернет-магазина заказного производства мясокомбината. Демонстрационный режим:
              платежи и производство не выполняются по-настоящему.
            </p>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-white">Разделы</p>
            <ul className="mt-2 space-y-1 text-meat-200">
              <li>
                <Link to="/originals">Колбасные торты</Link>
              </li>
              <li>
                <Link to="/gourmet">Свой рецепт</Link>
              </li>
              <li>
                <Link to="/about">О нас</Link>
              </li>
              <li>
                <Link to="/contacts">Контакты</Link>
              </li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-white">Контакты</p>
            <p className="mt-2 text-meat-200">+7 (495) 000-00-00</p>
            <p className="text-meat-200">hello@kolbaska.ru</p>
            <p className="text-meat-200">Ежедневно 9:00–20:00</p>
          </div>
        </div>
      </footer>

      <AssistantChat />
    </div>
  );
}
