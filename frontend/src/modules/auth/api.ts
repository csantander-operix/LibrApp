import { api } from "@/lib/api";
import type { Usuario } from "@/shared/types";

export interface LoginResponse {
  access_token: string;
  token_type: string;
  usuario: Usuario;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", { username, password });
  return data;
}

export async function fetchMe(): Promise<Usuario> {
  const { data } = await api.get<Usuario>("/auth/me");
  return data;
}
