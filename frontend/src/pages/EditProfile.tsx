import React, { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/http";
import ArrowBackButton from "../components/ArrowBackButton";
import { deleteAccount } from "../services/authService";

type Profile = { id: number; name: string; email: string; avatar_url?: string | null; gender?: "m" | "f" | null };

const EditProfile: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<"m" | "f" | "">("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [step, setStep] = useState<"edit" | "code" | "done">("edit");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get<Profile>("/auth/me");
        const p = res.data;
        setProfile(p);
        setName(p.name);
        setEmail(p.email);
        setPreview(p.avatar_url || null);
        setGender((p.gender as "m" | "f") || "");
      } catch (e: any) {
        setErr(e?.response?.data?.msg || "No se pudo cargar el perfil");
      }
    };
    fetchMe();
  }, []);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const onPickAvatar = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAvatar(file);
    if (file) {
      const url = URL.createObjectURL(file);
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview(url);
    } else {
      setPreview(profile?.avatar_url || null);
    }
  };

  const requestCode = async (e: FormEvent) => {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      await api.post("/auth/profile/request-code", {
        target_email: email && email !== profile?.email ? email : undefined,
      });
      setMsg("Código enviado. Revisa tu correo.");
      setStep("code");
    } catch (error: any) {
      setErr(error?.response?.data?.msg || "No se pudo enviar el código");
    }
  };

  const submitChanges = async (e: FormEvent) => {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      const formData = new FormData();
      formData.append("name", name);
      if (gender) formData.append("gender", gender);
      formData.append("email", email);
      if (password) formData.append("password", password);
      if (avatar) formData.append("avatar", avatar);
      formData.append("code", code);

      const res = await api.put<Profile>("/auth/profile/update", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updated = res.data;
      setProfile(updated);
      localStorage.setItem("name", updated.name);
      setMsg("Perfil actualizado");
      setStep("done");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (error: any) {
      setErr(error?.response?.data?.msg || "No se pudo actualizar el perfil");
    }
  };

  const handleDeleteAccount = async () => {
    const first = window.confirm(
      "Esta acción eliminará tu cuenta. Los despachos, clientes y choferes que creaste seguirán visibles de forma global, pero ya no estarán asociados a ti. ¿Deseas continuar?"
    );
    if (!first) return;
    const typed = window.prompt('Escribe "ELIMINAR" para confirmar:');
    if (typed !== "ELIMINAR") return;

    try {
      await deleteAccount();
      localStorage.removeItem("token");
      localStorage.removeItem("name");
      alert("Tu cuenta ha sido eliminada.");
      navigate("/login", { replace: true });
    } catch (e: any) {
      alert(e?.response?.data?.msg || "No se pudo eliminar la cuenta");
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "#080C14", color: "white", fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .ep-font-display { font-family: 'Syne', sans-serif; }

        .ep-glass {
          background: rgba(30,40,80,0.35);
          border: 1px solid rgba(99,102,241,0.18);
          border-radius: 16px;
        }

        .ep-input {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: white;
          border-radius: 10px;
          transition: border-color .15s, box-shadow .15s;
          font-size: 14px;
          width: 100%;
          padding: 10px 13px;
          box-sizing: border-box;
          font-family: 'DM Sans', sans-serif;
        }
        .ep-input::placeholder { color: rgba(255,255,255,0.2); }
        .ep-input:focus { outline: none; border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }

        .ep-select {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.75);
          border-radius: 10px;
          font-size: 14px;
          width: 100%;
          padding: 10px 13px;
          box-sizing: border-box;
          font-family: 'DM Sans', sans-serif;
          transition: border-color .15s;
          appearance: none;
          cursor: pointer;
        }
        .ep-select:focus { outline: none; border-color: rgba(99,102,241,0.5); }
        .ep-select option { background: #111827; color: white; }

        .ep-field-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin-bottom: 5px;
        }

        .ep-btn {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; border: none; border-radius: 10px;
          padding: 10px 22px; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all .15s;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
          width: 100%;
        }
        .ep-btn:disabled { opacity: .45; cursor: not-allowed; }

        .ep-btn-indigo {
          background: linear-gradient(135deg, #4F46E5, #6366F1);
          box-shadow: 0 4px 14px rgba(99,102,241,0.3);
          color: white;
        }
        .ep-btn-indigo:hover { box-shadow: 0 6px 20px rgba(99,102,241,0.4); transform: translateY(-1px); }

        .ep-btn-danger {
          background: rgba(248,113,113,0.12);
          border: 1px solid rgba(248,113,113,0.3);
          color: #F87171;
        }
        .ep-btn-danger:hover { background: rgba(248,113,113,0.2); border-color: rgba(248,113,113,0.5); }

        .ep-btn-success {
          background: linear-gradient(135deg, #059669, #10B981);
          box-shadow: 0 4px 14px rgba(16,185,129,0.25);
          color: white;
        }
        .ep-btn-success:hover { box-shadow: 0 6px 20px rgba(16,185,129,0.35); transform: translateY(-1px); }

        .ep-btn-ghost {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.7);
        }
        .ep-btn-ghost:hover { background: rgba(255,255,255,0.1); color: white; }

        .ep-avatar-ring {
          width: 96px; height: 96px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(99,102,241,0.4);
          box-shadow: 0 0 0 4px rgba(99,102,241,0.1);
          flex-shrink: 0;
        }

        .ep-avatar-upload {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 16px; border-radius: 9px; font-size: 13px; font-weight: 500;
          background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25);
          color: #A5B4FC; cursor: pointer; transition: all .15s;
          font-family: 'DM Sans', sans-serif;
        }
        .ep-avatar-upload:hover { background: rgba(99,102,241,0.18); border-color: rgba(99,102,241,0.4); }

        .ep-msg-success {
          background: rgba(52,211,153,0.08);
          border: 1px solid rgba(52,211,153,0.18);
          color: #6EE7B7;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .ep-msg-error {
          background: rgba(248,113,113,0.08);
          border: 1px solid rgba(248,113,113,0.18);
          color: #F87171;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .ep-divider {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.06);
          margin: 20px 0;
        }

        .ep-hint {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          margin-top: 4px;
        }

        .ep-step-icon {
          width: 48px; height: 48px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.2);
          margin-bottom: 12px;
        }

        @keyframes ep-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ep-fade-in { animation: ep-fade-in .28s ease both; }

        .ep-container { max-width: 560px; margin: 0 auto; padding: 32px 16px; box-sizing: border-box; }

        .ep-field-grid {
          display: grid;
          gap: 16px;
        }
      `}</style>

      <div className="ep-container">

        {/* Volver */}
        <div style={{ marginBottom: 32 }}>
          <ArrowBackButton />
        </div>

        {/* Título */}
        <div className="ep-fade-in" style={{ marginBottom: 28 }}>
          <h1
            className="ep-font-display"
            style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", margin: "0 0 4px" }}
          >
            Editar Perfil
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: 0 }}>
            Actualiza tu información personal
          </p>
        </div>

        {/* Mensajes */}
        {err && <div className="ep-msg-error ep-fade-in">{err}</div>}
        {msg && <div className="ep-msg-success ep-fade-in">{msg}</div>}

        {!profile ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", padding: "64px 0", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
            <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#6366F1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            Cargando perfil...
          </div>
        ) : step === "edit" ? (
          <form onSubmit={requestCode} className="ep-fade-in">
            <div className="ep-glass" style={{ padding: "24px" }}>

              {/* Avatar */}
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
                <img
                  src={preview || "/avatar3.png"}
                  alt="avatar"
                  className="ep-avatar-ring"
                />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 8 }}>
                    Foto de perfil
                  </p>
                  <label className="ep-avatar-upload">
                    ↑ Cambiar foto
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onPickAvatar}
                      style={{ display: "none" }}
                    />
                  </label>
                  <p className="ep-hint" style={{ marginTop: 6 }}>JPG, PNG o WebP</p>
                </div>
              </div>

              <hr className="ep-divider" />

              <div className="ep-field-grid">

                {/* Nombre */}
                <div>
                  <label className="ep-field-label">Nombre</label>
                  <input
                    className="ep-input"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {/* Género */}
                <div>
                  <label className="ep-field-label">Género</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "m" | "f" | "")}
                    className="ep-select"
                  >
                    <option value="">Prefiero no decirlo</option>
                    <option value="m">Masculino</option>
                    <option value="f">Femenino</option>
                  </select>
                </div>

                {/* Email */}
                <div>
                  <label className="ep-field-label">Correo electrónico</label>
                  <input
                    className="ep-input"
                    type="email"
                    placeholder="tucorreo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="ep-hint">Si cambias el correo, el código llegará al nuevo correo.</p>
                </div>

                {/* Contraseña */}
                <div>
                  <label className="ep-field-label">Nueva contraseña <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400, textTransform: "none", fontSize: 11 }}>(opcional)</span></label>
                  <input
                    type="password"
                    className="ep-input"
                    placeholder="Dejar en blanco para no cambiar"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <hr className="ep-divider" />

              {/* Botones */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button type="submit" className="ep-btn ep-btn-indigo">
                  Enviar código y continuar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="ep-btn ep-btn-danger"
                >
                  Eliminar cuenta
                </button>
              </div>

            </div>
          </form>

        ) : step === "code" ? (
          <form onSubmit={submitChanges} className="ep-fade-in">
            <div className="ep-glass" style={{ padding: "28px 24px" }}>
              <div className="ep-step-icon">📬</div>
              <h2
                className="ep-font-display"
                style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}
              >
                Revisa tu correo
              </h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 24 }}>
                Ingresa el código de verificación que enviamos a tu correo para confirmar los cambios.
              </p>

              <div style={{ marginBottom: 24 }}>
                <label className="ep-field-label">Código de verificación</label>
                <input
                  className="ep-input"
                  placeholder="Ej: 123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={{ letterSpacing: "0.15em", fontSize: 18, textAlign: "center" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button type="submit" className="ep-btn ep-btn-success">
                  Confirmar cambios
                </button>
                <button
                  type="button"
                  onClick={() => setStep("edit")}
                  className="ep-btn ep-btn-ghost"
                >
                  Volver
                </button>
              </div>
            </div>
          </form>

        ) : (
          <div className="ep-glass ep-fade-in" style={{ padding: "32px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h2 className="ep-font-display" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              ¡Perfil actualizado!
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 24 }}>
              Tus cambios han sido guardados correctamente.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="ep-btn ep-btn-indigo"
              style={{ maxWidth: 240, margin: "0 auto" }}
            >
              Ir al dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default EditProfile;