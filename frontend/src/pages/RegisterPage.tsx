import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="section-title text-center">Регистрация</h1>
      <form
        className="card mt-6 space-y-4 p-8"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            await register(email, password, fullName);
            navigate("/cabinet", { replace: true });
          } catch (caught) {
            setError(apiError(caught));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <label className="label" htmlFor="reg-name">
            Имя
          </label>
          <input
            id="reg-name"
            className="input"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Иван Мясоедов"
          />
        </div>
        <div>
          <label className="label" htmlFor="reg-email">
            Email
          </label>
          <input
            id="reg-email"
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="reg-password">
            Пароль
          </label>
          <input
            id="reg-password"
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={4}
            required
          />
        </div>
        {error && <p className="rounded-xl bg-meat-50 p-3 text-sm text-meat-800">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Создаём…" : "Создать аккаунт"}
        </button>
        <p className="text-center text-sm text-meat-600">
          Уже с нами?{" "}
          <Link to="/login" className="font-semibold text-meat-800 underline">
            Войти
          </Link>
        </p>
      </form>
    </div>
  );
}
