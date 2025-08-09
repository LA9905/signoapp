// src/services/authService.ts
import { api } from "./http";

export type LoginResp = { token: string; name: string };
export type MeResp = { id: number; name: string; email: string; avatar_url?: string | null };

export const register = (data: { name: string; email: string; password: string }) =>
  api.post<{ msg: string }>("/auth/register", data);

export const login = (email: string, password: string) =>
  api.post<LoginResp>("/auth/login", { email, password });

export const recover = (email: string) =>
  api.post<{ msg: string }>("/auth/recover", { email });

export const resetPassword = (email: string, code: string, new_password: string) =>
  api.post<{ msg: string }>("/auth/reset-password", { email, code, new_password });

export const me = () => api.get<MeResp>("/auth/me");

// --- Perfil (código y actualización con multipart) ---
export const requestUpdateCode = (target_email?: string) =>
  api.post<{ msg: string }>("/auth/profile/request-code", { target_email });

export type UpdateProfilePayload = {
  code: string;            // requerido
  name?: string;
  email?: string;
  password?: string;
  avatarFile?: File;       // opcional
};

export const updateProfile = (payload: UpdateProfilePayload) => {
  const fd = new FormData();
  fd.append("code", payload.code);
  if (payload.name) fd.append("name", payload.name);
  if (payload.email) fd.append("email", payload.email);
  if (payload.password) fd.append("password", payload.password);
  if (payload.avatarFile) fd.append("avatar", payload.avatarFile);

  return api.put<MeResp>("/auth/profile/update", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
