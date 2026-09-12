import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { analyticsApi } from "../api";
import { useCurrency } from "../settings/CurrencyContext";
import type { AnalyticsOverview } from "../types";

const SEASON_COLORS = ["#7c2822", "#4f772d", "#eabf4b", "#b9831f"];

export default function AnalystPage() {
  const { format } = useCurrency();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [days, setDays] = useState(90);

  useEffect(() => {
    analyticsApi
      .overview(days)
      .then(({ data: payload }) => setData(payload))
      .catch(() => setData(null));
  }, [days]);

  if (!data) {
    return <p className="mx-auto max-w-3xl px-4 py-20 text-center text-meat-600">Загружаем аналитику…</p>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">Бизнес-аналитика</h1>
          <p className="mt-2 text-sm text-meat-600">
            Метрики по ассортименту, стоимости, сезонности и дням недели, а также эффект от акций.
          </p>
        </div>
        <select className="input max-w-[180px]" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={30}>За 30 дней</option>
          <option value={90}>За 90 дней</option>
          <option value={365}>За год</option>
        </select>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Заказов", value: data.summary.orders.toLocaleString("ru-RU") },
          { label: "Выручка", value: format(data.summary.revenue) },
          { label: "Средний чек", value: format(data.summary.avg_check) },
          { label: "Продано позиций", value: data.summary.items_sold.toLocaleString("ru-RU") },
        ].map((card) => (
          <div key={card.label} className="card p-5">
            <p className="text-xs uppercase tracking-widest text-meat-500">{card.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-meat-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-display text-lg font-bold text-meat-900">Выручка по месяцам</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e2dd" />
                <XAxis dataKey="period" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value) => format(Number(value))} />
                <Line type="monotone" dataKey="revenue" stroke="#7c2822" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-lg font-bold text-meat-900">Топ ассортимента</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.top_assortment} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e2dd" />
                <XAxis type="number" fontSize={12} />
                <YAxis type="category" dataKey="name" width={140} fontSize={11} />
                <Tooltip />
                <Bar dataKey="qty" fill="#b53a2c" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-lg font-bold text-meat-900">Заказы по дням недели</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weekday}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e2dd" />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#d9a52c" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-lg font-bold text-meat-900">Сезонность</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.season} dataKey="count" nameKey="label" outerRadius={90} label>
                  {data.season.map((entry, index) => (
                    <Cell key={entry.label} fill={SEASON_COLORS[index % SEASON_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-bold text-meat-900">Эффект от акций</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-meat-50 p-5">
              <p className="text-xs uppercase tracking-widest text-meat-500">Средний чек в дни акций</p>
              <p className="mt-1 font-display text-2xl font-bold text-meat-800">
                {format(data.promo_effect.during_avg)}
              </p>
              <p className="text-xs text-meat-500">Заказов: {data.promo_effect.during_count}</p>
            </div>
            <div className="rounded-2xl bg-cream p-5">
              <p className="text-xs uppercase tracking-widest text-meat-500">Средний чек вне акций</p>
              <p className="mt-1 font-display text-2xl font-bold text-meat-800">
                {format(data.promo_effect.outside_avg)}
              </p>
              <p className="text-xs text-meat-500">Заказов: {data.promo_effect.outside_count}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
