import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import type { Role } from "../types";

export default function ProtectedRoute({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { me, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-10 text-center text-meat-700">Загрузка…</div>;
  }
  if (!me) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (!roles.includes(me.user.role)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-meat-800">Доступ запрещён</h1>
        <p className="mt-3 text-meat-600">
          Раздел доступен только ролям: {roles.join(", ")}. Ваша роль: {me.user.role}.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
