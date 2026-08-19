import axios from "axios";

/**
 * Base URL del backend. En dev se deriva del host desde el que se abre la app
 * (localhost en la PC, o la IP de la PC desde otro dispositivo en la misma red),
 * apuntando al puerto 8000. En prod se fija con VITE_API_URL.
 */
function resolveBaseURL(): string {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined;
  if (fromEnv) return fromEnv;
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:8000/api/v1`;
}

export const api = axios.create({ baseURL: resolveBaseURL() });

const TOKEN_KEY = "librapp_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Adjunta el Bearer token en cada request si hay sesión.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 → sesión inválida/expirada: limpia el token (el guard redirige al login).
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) setToken(null);
    return Promise.reject(error);
  },
);
