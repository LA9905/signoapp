import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../services/http";
import { NavBar, Footer } from "./Home";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", gender: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/auth/register", form);
      navigate("/login");
    } catch (err: any) {
      console.error("Error al registrar:", err);
      setError(err?.response?.data?.msg || "Error al registrar");
    } finally {
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
        .select-field {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.2s ease;
          -webkit-appearance: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
        }
        .select-field:focus {
          outline: none;
          background-color: rgba(255,255,255,0.06);
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

      <NavBar hideRegister />

      <div className="flex-1 flex items-center justify-center px-4 py-16 relative">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-600/8 blur-[100px]" />
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
                Crear cuenta
              </h1>
              <p className="text-white/40 text-sm mt-1">Empieza gratis, sin tarjeta</p>
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
                <label className="block text-xs font-medium text-white/50 mb-1.5">Nombre</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Tu nombre"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="input-field w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Género</label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="select-field w-full px-4 py-2.5 rounded-xl text-sm text-white/70"
                >
                  <option value="" style={{ background: "#111827" }}>Prefiero no decirlo</option>
                  <option value="m" style={{ background: "#111827" }}>Masculino</option>
                  <option value="f" style={{ background: "#111827" }}>Femenino</option>
                </select>
              </div>

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
                  required
                  className="input-field w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Contraseña</label>
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="input-field w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/20"
                />
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
                    Creando cuenta...
                  </span>
                ) : "Crear cuenta"}
              </button>
            </form>

            <p className="text-center text-sm text-white/35 mt-6">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                Inicia sesión
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

export default Register;