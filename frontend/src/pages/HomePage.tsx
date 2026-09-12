import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { authApi, promosApi } from "../api";
import { useAuth } from "../auth/AuthContext";
import type { Level, Promo } from "../types";

const PAINTING_GRADIENTS = [
  "linear-gradient(135deg, rgba(30,12,8,0.85), rgba(90,30,20,0.7)), radial-gradient(circle at 70% 40%, rgba(242,193,78,0.35), transparent 55%), linear-gradient(160deg, #2c120c, #6b2a1c 55%, #1c0d09)",
  "linear-gradient(135deg, rgba(20,20,10,0.85), rgba(70,60,25,0.7)), radial-gradient(circle at 30% 30%, rgba(233,196,106,0.35), transparent 55%), linear-gradient(200deg, #1d1a0e, #4f4520 55%, #14120a)",
  "linear-gradient(135deg, rgba(25,10,14,0.85), rgba(80,25,40,0.7)), radial-gradient(circle at 60% 60%, rgba(244,162,97,0.35), transparent 55%), linear-gradient(160deg, #26101a, #5c2338 55%, #170a12)",
];

export default function HomePage() {
  const { me } = useAuth();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [bgIndex, setBgIndex] = useState(0);
  const [tab, setTab] = useState<"original" | "gourmet">("original");

  useEffect(() => {
    promosApi
      .public()
      .then(({ data }) => setPromos(data))
      .catch(() => setPromos([]));
    authApi
      .levels()
      .then(({ data }) => setLevels(data as Level[]))
      .catch(() => setLevels([]));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setBgIndex((value) => (value + 1) % PAINTING_GRADIENTS.length), 7000);
    return () => clearInterval(timer);
  }, []);

  const profile = me?.profile;
  const level = me?.level;
  const nextLevel = me?.next_level;
  const progress = useMemo(() => {
    if (!profile || !level || !nextLevel) return 100;
    const span = nextLevel.min_points - level.min_points;
    if (span <= 0) return 100;
    return Math.min(100, Math.round(((profile.points - level.min_points) / span) * 100));
  }, [profile, level, nextLevel]);

  return (
    <div>
      <section
        className="relative overflow-hidden text-white transition-all duration-1000"
        style={{ backgroundImage: PAINTING_GRADIENTS[bgIndex] }}
      >
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:py-24">
          <div className="animate-fade-in">
            <span className="chip bg-white/15 text-gold-300">Гастрономическое ателье мясокомбината</span>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              Колбасные торты и изделия по вашему рецепту
            </h1>
            <p className="mt-5 max-w-xl text-lg text-meat-100">
              Новый цех мясокомбината работает на заказ: соберём художественный колбасный торт из готовой
              продукции или изготовим изделие малым тиражом по вашему рецепту и выбранной технологии.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/originals" className="btn-gold">
                🥩 Для мясоедов-оригиналов
              </Link>
              <Link to="/gourmet" className="btn-ghost border-white/30 bg-white/10 text-white hover:bg-white/20">
                🧪 Для мясоедов-гурманов
              </Link>
            </div>
            <p className="mt-6 text-xs text-meat-200">
              Фон вдохновлён натюрмортами мясных лавок голландских и фламандских мастеров Возрождения.
            </p>
          </div>

          <div className="card animate-fade-in bg-white/95 p-6 text-ink">
            {me ? (
              <div>
                <p className="text-sm text-meat-600">Ваш уровень</p>
                <p className="font-display text-2xl font-bold text-meat-900">{level?.name ?? "—"}</p>
                <p className="mt-1 text-sm text-meat-600">
                  Баллов накоплено: <span className="font-bold text-meat-800">{profile?.points ?? 0}</span>
                </p>
                <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-meat-100">
                  <div className="h-full rounded-full bg-gold-400" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-2 text-xs text-meat-600">
                  {nextLevel
                    ? `До уровня «${nextLevel.name}» осталось ${me.points_to_next ?? 0} баллов.`
                    : "Вы достигли максимального уровня. Браво!"}
                </p>
                <p className="mt-4 text-xs text-meat-500">
                  Скидка уровня: {level?.discount_pct ?? 0}%. Балл начисляется за каждые 100 ₽ покупки.
                </p>
                <Link to="/cabinet" className="btn-primary mt-5 w-full">
                  В личный кабинет
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-sm text-meat-600">Личный кабинет</p>
                <p className="font-display text-2xl font-bold text-meat-900">Войдите или зарегистрируйтесь</p>
                <p className="mt-2 text-sm text-meat-600">
                  Копите баллы, получайте скидки за уровень и следите за акциями.
                </p>
                <div className="mt-5 flex gap-2">
                  <Link to="/register" className="btn-primary flex-1">
                    Регистрация
                  </Link>
                  <Link to="/login" className="btn-ghost flex-1">
                    Вход
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="section-title">Куда направим ваш аппетит?</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab("original")}
              className={tab === "original" ? "btn-primary" : "btn-ghost"}
            >
              Для мясоедов-оригиналов
            </button>
            <button
              type="button"
              onClick={() => setTab("gourmet")}
              className={tab === "gourmet" ? "btn-primary" : "btn-ghost"}
            >
              Для мясоедов-гурманов
            </button>
          </div>
        </div>

        {tab === "original" ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <article className="card p-6">
              <span className="chip">Мясная лавка</span>
              <h3 className="mt-3 font-display text-2xl font-bold text-meat-900">Композиции из готовых изделий</h3>
              <p className="mt-2 text-sm text-meat-600">
                Художественные колбасные торты, собранные из массовой продукции комбината. Быстро, эффектно,
                без приготовления. 16 авторских композиций с характером.
              </p>
              <Link to="/originals?tab=meat_shop" className="btn-primary mt-4">
                Смотреть «Мясную лавку»
              </Link>
            </article>
            <article className="card p-6">
              <span className="chip">Арт-объекты</span>
              <h3 className="mt-3 font-display text-2xl font-bold text-meat-900">Формы знакомых объектов</h3>
              <p className="mt-2 text-sm text-meat-600">
                Самолёты, корабли, автомобили, замки и даже колбасный домик. 16 скульптурных изделий,
                которые становятся центром любого праздника.
              </p>
              <Link to="/originals?tab=art_object" className="btn-primary mt-4">
                Смотреть «Арт-объекты»
              </Link>
            </article>
          </div>
        ) : (
          <div className="card mt-6 grid gap-6 p-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <h3 className="font-display text-2xl font-bold text-meat-900">Пошаговый конструктор рецепта</h3>
              <p className="mt-2 text-sm text-meat-600">
                Выберите тип изделия и технологию, основное сырьё, добавки, специи и форму. Подсказки
                объяснят влияние каждого элемента на цвет, вкус и форму, а цена пересчитается автоматически.
              </p>
              <ul className="mt-4 grid gap-2 text-sm text-meat-700 sm:grid-cols-2">
                <li>• Тип изделия</li>
                <li>• Технология производства</li>
                <li>• Основное сырьё</li>
                <li>• Добавки и начинки</li>
                <li>• Специи и пряности</li>
                <li>• Форма и подача</li>
              </ul>
              <Link to="/gourmet" className="btn-primary mt-5">
                Собрать своё изделие
              </Link>
            </div>
            <div className="grid place-items-center rounded-3xl bg-gradient-to-br from-meat-800 to-meat-950 p-8 text-center text-white">
              <div>
                <p className="text-6xl">🧪🌭</p>
                <p className="mt-3 text-sm text-meat-100">Малые объёмы, ваш рецепт, технология комбината</p>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="bg-white/70 py-14">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="section-title">Текущие акции</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {promos.length === 0 && <p className="text-sm text-meat-600">Сейчас активных акций нет.</p>}
            {promos.map((promo) => (
              <article key={promo.id} className="card p-5">
                <span className="chip">
                  {promo.type === "discount" ? "🎁 Скидка" : "✨ Баллы"} ·{" "}
                  {promo.scope === "all" ? "всё меню" : promo.scope === "category" ? "категория" : "товар"}
                </span>
                <h3 className="mt-3 font-semibold text-meat-900">{promo.title}</h3>
                <p className="mt-2 text-sm text-meat-600">
                  {promo.type === "discount"
                    ? `Скидка ${promo.value}%`
                    : `Баллы ×${promo.value} за покупку`}
                  {promo.ends_at ? ` · до ${new Date(promo.ends_at).toLocaleDateString("ru-RU")}` : ""}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="section-title">Программа лояльности</h2>
        <p className="mt-2 text-sm text-meat-600">
          Чем больше заказов — тем выше уровень, скидка и скорость начисления баллов.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {levels.map((item) => (
            <article
              key={item.id}
              className={`card p-5 ${me?.level?.id === item.id ? "ring-2 ring-gold-400" : ""}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-meat-500">
                от {item.min_points} баллов
              </p>
              <h3 className="mt-1 font-display text-lg font-bold text-meat-900">{item.name}</h3>
              <p className="mt-2 text-xs text-meat-600">{item.description}</p>
              <p className="mt-3 font-semibold text-meat-800">Скидка {item.discount_pct}%</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
