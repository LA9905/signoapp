import axios from "axios";

const root = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
if (!root) throw new Error("VITE_API_URL no está definida");

// siempre agregamos /api aquí
const baseURL = `${root}/api`;

export const api = axios.create({
  baseURL,                   // p.ej. https://signoapp.onrender.com/api
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// (opcional) log para verificar en prod
if (import.meta.env.PROD) {
  console.log("API baseURL:", baseURL);
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});