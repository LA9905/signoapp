import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../services/http";
import { NavBar, Footer } from "./Home";

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      slowTimer = window.setTimeout(() => {
        setError("El servidor está iniciando, esto puede tardar unos segundos…");
      }, 8000);

      const res = await api.post("/auth/login", payload, { timeout: 15000 });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("name", res.data.name);
      if (res.data.avatar_url) localStorage.setItem("avatar_url", res.data.avatar_url);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
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
    <div className="min-h-screen flex flex-col bg-[#080C14] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
        .input-field {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.2s ease;
        }
        .input-field:focus {
          outline: none;
          background: rgba(255,255,255,0.06);
          border-color: rgba(59,130,246,0.5);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }
        .btn-submit {
          background: linear-gradient(135deg, #2563EB, #3B82F6);
          box-shadow: 0 4px 20px rgba(59,130,246,0.3);
          transition: all 0.2s ease;
        }
        .btn-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(59,130,246,0.4);
        }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-primary {
          background: linear-gradient(135deg, #2563EB, #3B82F6);
          box-shadow: 0 4px 24px rgba(59,130,246,0.35);
          transition: all 0.2s ease;
        }
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(59,130,246,0.45);
        }
        .btn-ghost {
          border: 1px solid rgba(255,255,255,0.12);
          transition: all 0.2s ease;
        }
        .btn-ghost:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.25);
        }
      `}</style>

      <NavBar hideLogin />

      <div className="flex-1 flex items-center justify-center px-4 py-16 relative">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative w-full max-w-sm"
        >
          {/* Card */}
          <div className="rounded-2xl p-8" style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)"
          }}>
            {/* Logo */}
            <div className="text-center mb-8">
              <img src="/SignoApp.png" alt="SignoApp" className="h-10 w-auto object-contain mx-auto mb-4" />
              <h1 className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
                Bienvenido de vuelta
              </h1>
              <p className="text-white/40 text-sm mt-1">Ingresa a tu cuenta</p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 rounded-xl px-4 py-3 text-sm text-red-300"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="correo@ejemplo.com"
                  value={form.email}
                  onChange={handleChange}
                  className="input-field w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/20"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Contraseña
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  className="input-field w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/20"
                  autoComplete="current-password"
                />
              </div>

              <div className="flex justify-end">
                <Link to="/recover" className="text-xs text-blue-400/70 hover:text-blue-400 transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-submit w-full py-3 rounded-xl text-sm font-semibold text-white mt-2"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Ingresando...
                  </span>
                ) : "Ingresar"}
              </button>
            </form>

            <p className="text-center text-sm text-white/35 mt-6">
              ¿No tienes cuenta?{" "}
              <Link to="/register" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                Regístrate
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

export default Login;