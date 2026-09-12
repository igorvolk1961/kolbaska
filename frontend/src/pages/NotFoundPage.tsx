import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl">🥓</p>
      <h1 className="mt-4 text-3xl font-bold text-meat-900">Страница не найдена</h1>
      <p className="mt-3 text-meat-600">Кажется, эта колбаска потерялась по дороге.</p>
      <Link to="/" className="btn-primary mt-6">
        На главную
      </Link>
    </div>
  );
}
