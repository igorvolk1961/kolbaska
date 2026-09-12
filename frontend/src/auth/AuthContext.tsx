import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api";
import { TOKEN_KEY } from "../api/client";
import type { Me, Role } from "../types";

interface AuthContextValue {
  me: Me | null;
  loading: boolean;
  role: Role | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.me();
      setMe(data);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await authApi.login({ email, password });
      localStorage.setItem(TOKEN_KEY, data.access_token);
      await refresh();
    },
    [refresh],
  );

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      const { data } = await authApi.register({ email, password, full_name: fullName });
      localStorage.setItem(TOKEN_KEY, data.access_token);
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setMe(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      me,
      loading,
      role: me?.user.role ?? null,
      isAuthenticated: Boolean(me),
      login,
      register,
      logout,
      refresh,
    }),
    [me, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
