import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const DEMO = [
  { label: "Клиент", email: "client@kolbaska.ru", password: "client123" },
  { label: "Технолог", email: "technolog@kolbaska.ru", password: "techno123" },
  { label: "Аналитик", email: "analyst@kolbaska.ru", password: "analyst123" },
  { label: "Администратор", email: "admin@kolbaska.ru", password: "admin123" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(nextEmail = email, nextPassword = password) {
    setBusy(true);
    setError("");
    try {
      await login(nextEmail, nextPassword);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? "/", { replace: true });
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="section-title text-center">Вход</h1>
      <form
        className="card mt-6 space-y-4 p-8"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div>
          <label className="label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="login-password">
            Пароль
          </label>
          <input
            id="login-password"
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        {error && <p className="rounded-xl bg-meat-50 p-3 text-sm text-meat-800">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Входим…" : "Войти"}
        </button>
        <p className="text-center text-sm text-meat-600">
          Нет аккаунта?{" "}
          <Link to="/register" className="font-semibold text-meat-800 underline">
            Зарегистрироваться
          </Link>
        </p>
      </form>

      <div className="card mt-6 p-6">
        <p className="text-sm font-semibold text-meat-900">Демо-доступы (нажмите, чтобы войти)</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DEMO.map((item) => (
            <button
              key={item.email}
              type="button"
              className="btn-ghost justify-start px-3 py-2 text-xs"
              onClick={() => {
                setEmail(item.email);
                setPassword(item.password);
                void submit(item.email, item.password);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
