import React, { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/http";
import ArrowBackButton from "../components/ArrowBackButton";
import { deleteAccount } from "../services/authService";

type Profile = { id: number; name: string; email: string; avatar_url?: string | null };

const EditProfile: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="mx-auto w-full max-w-xl p-4 sm:p-6">
      <div className="mb-12">
        <ArrowBackButton />
      </div>  
      <h2 className="text-xl font-bold mb-4">Editar perfil</h2>
      {err && <p className="text-red-500 mb-2">{err}</p>}
      {msg && <p className="text-green-500 mb-2">{msg}</p>}

      {!profile ? (
        <p>Cargando...</p>
      ) : step === "edit" ? (
        <>
          <form onSubmit={requestCode} className="space-y-5">
            {/* AVATAR + INPUT ARCHIVO */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="shrink-0">
                <img
                  src={preview || "/avatar3.png"}
                  alt="avatar"
                  className="h-28 w-28 sm:h-32 sm:w-32 rounded-full object-cover ring-1 ring-black/20"
                />
              </div>

              <div className="text-sm">
                <label className="block">
                  <span className="mb-1 block text-neutral-300">Seleccionar archivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onPickAvatar}
                    className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-white file:font-medium hover:file:bg-blue-500"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Nombre</label>
              <input
                className="w-full border p-2 rounded bg-white/5 border-white/10"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Correo</label>
              <input
                className="w-full border p-2 rounded bg-white/5 border-white/10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Si cambias el correo, el código llegará al nuevo correo.
              </p>
            </div>

            <div>
              <label className="block text-sm mb-1">Nueva contraseña (opcional)</label>
              <input
                type="password"
                className="w-full border p-2 rounded bg-white/5 border-white/10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* BOTONES */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Enviar código y continuar
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="w-full sm:w-auto bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Eliminar cuenta
              </button>
            </div>
          </form>
        </>
      ) : step === "code" ? (
        <form onSubmit={submitChanges} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Código recibido</label>
            <input
              className="w-full border p-2 rounded bg-white/5 border-white/10"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              className="w-full sm:w-auto bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700"
            >
              Confirmar cambios
            </button>
            <button
              type="button"
              onClick={() => setStep("edit")}
              className="w-full sm:w-auto bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Volver
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          <p>Listo. Tus cambios han sido guardados.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Ir al dashboard
          </button>
        </div>
      )}
    </div>
  );
};

export default EditProfile;