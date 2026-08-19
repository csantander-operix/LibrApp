import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getToken, setToken } from "@/lib/api";
import type { Usuario } from "@/shared/types";
import * as authApi from "./api";

interface AuthState {
  usuario: Usuario | null;
  cargando: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  // Al montar: si hay token guardado, rehidratamos la sesión con /auth/me.
  useEffect(() => {
    if (!getToken()) {
      setCargando(false);
      return;
    }
    authApi
      .fetchMe()
      .then(setUsuario)
      .catch(() => setToken(null))
      .finally(() => setCargando(false));
  }, []);

  async function login(username: string, password: string) {
    const res = await authApi.login(username, password);
    setToken(res.access_token);
    setUsuario(res.usuario);
  }

  function logout() {
    setToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
