import axios from "axios";

let isHandlingAuthError = false;

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if ((status === 401 || status === 422 || status === 403) && !isHandlingAuthError) {
      isHandlingAuthError = true;
      // limpiar sesión y mandar a login
      localStorage.removeItem("token");
      localStorage.removeItem("name");
      // redirección fuerte para evitar estados inconsistentes
      window.location.replace("/login");
    }

    if (status === 402 && !isHandlingAuthError) {
      // Redirige a cualquier ruta protegida; ProtectedShell mostrará el paywall
      window.location.replace("/dashboard");
    }
    return Promise.reject(error);
  }
);