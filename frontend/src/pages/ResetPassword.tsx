import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/http";

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<{ email: string; code: string; new_password: string }>({
    email: "",
    code: "",
    new_password: "",
  });
  const [msg, setMsg] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setMsg("");
    try {
      await api.post("/auth/reset-password", form);
      setMsg("Contraseña actualizada");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      console.error("Error al actualizar contraseña:", err);
      setError(err?.response?.data?.msg || "Error al actualizar");
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "#080C14", color: "white", fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .rp-font-display { font-family: 'Syne', sans-serif; }

        .rp-glass {
          background: rgba(30,40,80,0.35);
          border: 1px solid rgba(99,102,241,0.18);
          border-radius: 16px;
        }

        .rp-input {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: white;
          border-radius: 10px;
          transition: border-color .15s, box-shadow .15s;
          font-size: 14px;
          width: 100%;
          padding: 11px 14px;
          box-sizing: border-box;
          font-family: 'DM Sans', sans-serif;
        }
        .rp-input::placeholder { color: rgba(255,255,255,0.2); }
        .rp-input:focus { outline: none; border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }

        .rp-input-code {
          letter-spacing: 0.15em;
          font-size: 18px;
          text-align: center;
        }

        .rp-field-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin-bottom: 6px;
        }

        .rp-btn {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; border: none; border-radius: 10px;
          padding: 11px 22px; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all .15s;
          font-family: 'DM Sans', sans-serif;
          width: 100%;
        }

        .rp-btn-indigo {
          background: linear-gradient(135deg, #4F46E5, #6366F1);
          box-shadow: 0 4px 14px rgba(99,102,241,0.3);
          color: white;
        }
        .rp-btn-indigo:hover { box-shadow: 0 6px 20px rgba(99,102,241,0.4); transform: translateY(-1px); }

        .rp-msg-success {
          background: rgba(52,211,153,0.08);
          border: 1px solid rgba(52,211,153,0.18);
          color: #6EE7B7;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .rp-msg-error {
          background: rgba(248,113,113,0.08);
          border: 1px solid rgba(248,113,113,0.18);
          color: #F87171;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .rp-divider {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.06);
          margin: 20px 0;
        }

        .rp-field-hint {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          margin-top: 5px;
        }

        @keyframes rp-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rp-fade-in { animation: rp-fade-in .28s ease both; }

        .rp-container {
          max-width: 440px;
          margin: 0 auto;
          padding: 32px 16px;
          box-sizing: border-box;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
      `}</style>

      <div className="rp-container">

        {/* Ícono decorativo */}
        <div
          className="rp-fade-in"
          style={{
            width: 56, height: 56,
            borderRadius: 16,
            background: "rgba(99,102,241,0.12)",
            border: "1px solid rgba(99,102,241,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26,
            marginBottom: 20,
          }}
        >
          🔒
        </div>

        {/* Título */}
        <div className="rp-fade-in" style={{ marginBottom: 28 }}>
          <h1
            className="rp-font-display"
            style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", margin: "0 0 6px" }}
          >
            Cambiar contraseña
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: 0, lineHeight: 1.6 }}>
            Ingresa tu correo, el código recibido y tu nueva contraseña.
          </p>
        </div>

        {/* Mensajes */}
        {error && <div className="rp-msg-error rp-fade-in">{error}</div>}
        {msg && <div className="rp-msg-success rp-fade-in">{msg}</div>}

        {/* Formulario */}
        <div className="rp-glass rp-fade-in" style={{ padding: "24px" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Email */}
              <div>
                <label className="rp-field-label">Correo electrónico</label>
                <input
                  className="rp-input"
                  type="email"
                  name="email"
                  placeholder="tucorreo@ejemplo.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Código */}
              <div>
                <label className="rp-field-label">Código de verificación</label>
                <input
                  className="rp-input rp-input-code"
                  name="code"
                  placeholder="· · · · · ·"
                  value={form.code}
                  onChange={handleChange}
                  required
                />
                <p className="rp-field-hint">Revisa tu bandeja de entrada o spam.</p>
              </div>

              {/* Nueva contraseña */}
              <div>
                <label className="rp-field-label">Nueva contraseña</label>
                <input
                  className="rp-input"
                  type="password"
                  name="new_password"
                  placeholder="Mínimo 8 caracteres"
                  value={form.new_password}
                  onChange={handleChange}
                  required
                />
              </div>

              <hr className="rp-divider" style={{ margin: "4px 0" }} />

              <button type="submit" className="rp-btn rp-btn-indigo">
                Actualizar contraseña
              </button>

            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default ResetPassword;