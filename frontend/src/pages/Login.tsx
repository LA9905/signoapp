// src/pages/Login.tsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../services/http";

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Si ya hay token, vete al dashboard
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/dashboard", { replace: true });
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  const payload = { email: form.email.trim(), password: form.password };
  if (!payload.email || !payload.password) {
    setError("Completa correo y contraseña");
    return;
  }

  setSubmitting(true);
  let slowTimer: number | undefined;
  try {
    // Si se demora, informa que puede ser “arranque” del servidor
    slowTimer = window.setTimeout(() => {
      setError("El servidor está iniciando, esto puede tardar unos segundos…");
    }, 8000);

    const res = await api.post("/auth/login", payload, { timeout: 15000 });
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("name", res.data.name);
    if (res.data.avatar_url) localStorage.setItem("avatar_url", res.data.avatar_url);
    navigate("/dashboard", { replace: true });
  } catch (err: any) {
    // Si fue timeout, intenta 1 retry rápido (el server probablemente ya despertó)
    const isTimeout = err?.code === "ECONNABORTED";
    if (isTimeout) {
      try {
        const res2 = await api.post("/auth/login", payload, { timeout: 10000 });
        localStorage.setItem("token", res2.data.token);
        localStorage.setItem("name", res2.data.name);
        if (res2.data.avatar_url) localStorage.setItem("avatar_url", res2.data.avatar_url);
        navigate("/dashboard", { replace: true });
        return;
      } catch (err2: any) {
        setError(err2?.response?.data?.msg || "El servidor tardó demasiado. Intenta de nuevo.");
      }
    } else {
      setError(err?.response?.data?.msg || "Error al iniciar sesión");
    }
  } finally {
    if (slowTimer) window.clearTimeout(slowTimer);
    setSubmitting(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] px-4">
      <div className="w-[60%] sm:w-3/4 md:w-1/2 max-w-md bg-[#1e1e1e] p-8 rounded-lg shadow-md text-white">
        <h2 className="text-3xl font-bold mb-6 text-center text-blue-300">Iniciar sesión</h2>

        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm mb-1">Correo electrónico</label>
            <input
              type="email"
              name="email"
              id="email"
              placeholder="correo@ejemplo.com"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded bg-[#2a2a2a] border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm mb-1">Contraseña</label>
            <input
              type="password"
              name="password"
              id="password"
              placeholder="********"
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded bg-[#2a2a2a] border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-blue-400 hover:bg-blue-500 rounded font-semibold transition-colors disabled:opacity-60"
          >
            {submitting ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="mt-6 text-sm text-center space-y-2">
          <div>
            ¿No tienes una cuenta?{" "}
            <Link to="/register" className="text-blue-300 hover:underline">Regístrate</Link>
          </div>
          <div>
            ¿Olvidaste tu contraseña?{" "}
            <Link to="/recover" className="text-blue-300 hover:underline">Recupérala aquí</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
