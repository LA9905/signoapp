import { useState, type FormEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import ArrowBackLogin from "../components/ArrowBackLogin";
import { api } from "../services/http";

const Recover: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [msg, setMsg] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/auth/recover", { email });
      setMsg("Código enviado al correo");
      setError("");
      setTimeout(() => navigate("/reset-password"), 1500);
    } catch (err: any) {
      console.error("Error al enviar código:", err);
      setError(err.response?.data?.msg || "Error al enviar código");
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "#080C14", color: "white", fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .rc-font-display { font-family: 'Syne', sans-serif; }

        .rc-glass {
          background: rgba(30,40,80,0.35);
          border: 1px solid rgba(99,102,241,0.18);
          border-radius: 16px;
        }

        .rc-input {
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
        .rc-input::placeholder { color: rgba(255,255,255,0.2); }
        .rc-input:focus { outline: none; border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }

        .rc-field-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin-bottom: 6px;
        }

        .rc-btn {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; border: none; border-radius: 10px;
          padding: 11px 22px; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all .15s;
          font-family: 'DM Sans', sans-serif;
          width: 100%;
        }

        .rc-btn-indigo {
          background: linear-gradient(135deg, #4F46E5, #6366F1);
          box-shadow: 0 4px 14px rgba(99,102,241,0.3);
          color: white;
        }
        .rc-btn-indigo:hover { box-shadow: 0 6px 20px rgba(99,102,241,0.4); transform: translateY(-1px); }

        .rc-msg-success {
          background: rgba(52,211,153,0.08);
          border: 1px solid rgba(52,211,153,0.18);
          color: #6EE7B7;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .rc-msg-error {
          background: rgba(248,113,113,0.08);
          border: 1px solid rgba(248,113,113,0.18);
          color: #F87171;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        @keyframes rc-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rc-fade-in { animation: rc-fade-in .28s ease both; }

        .rc-container {
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

      <div className="rc-container">

        {/* Volver */}
        <div style={{ marginBottom: 40 }}>
          <ArrowBackLogin />
        </div>

        {/* Ícono decorativo */}
        <div
          className="rc-fade-in"
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
          🔑
        </div>

        {/* Título */}
        <div className="rc-fade-in" style={{ marginBottom: 28 }}>
          <h1
            className="rc-font-display"
            style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", margin: "0 0 6px" }}
          >
            Recuperar contraseña
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: 0, lineHeight: 1.6 }}>
            Ingresa tu correo y te enviaremos un código para restablecer tu contraseña.
          </p>
        </div>

        {/* Mensajes */}
        {error && <div className="rc-msg-error rc-fade-in">{error}</div>}
        {msg && <div className="rc-msg-success rc-fade-in">{msg}</div>}

        {/* Formulario */}
        <div className="rc-glass rc-fade-in" style={{ padding: "24px" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label className="rc-field-label">Correo electrónico</label>
              <input
                className="rc-input"
                placeholder="tucorreo@ejemplo.com"
                type="email"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="rc-btn rc-btn-indigo">
              Enviar código
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Recover;