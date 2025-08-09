// src/services/http.ts
import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
  // Evita errores silenciosos si faltan variables
  throw new Error("VITE_API_URL no está definida");
}

export const api = axios.create({
  baseURL, // ej: http://localhost:5000/api  o  https://signoapp.onrender.com/api
  withCredentials: true, // si usas cookies
  headers: { "Content-Type": "application/json" },
});

// Interceptor opcional para JWT (si usas token)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // o desde tu store
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});