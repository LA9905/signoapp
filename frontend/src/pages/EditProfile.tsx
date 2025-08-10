import React, { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/http";
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
    const first = window.confirm("Esta acción eliminará tu cuenta. Los despachos, clientes y choferes que creaste seguirán visibles de forma global, pero ya no estarán asociados a ti. ¿Deseas continuar?");
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
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">Editar perfil</h2>
      {err && <p className="text-red-500 mb-2">{err}</p>}
      {msg && <p className="text-green-500 mb-2">{msg}</p>}

      {!profile ? (
        <p>Cargando...</p>
      ) : step === "edit" ? (
        <>
          <form onSubmit={requestCode} className="space-y-5">
            <div className="flex items-center gap-5">
              <div className="avatar-lg">
                <img src={preview || "/avatar3.png"} alt="avatar" />
              </div>
              <div className="text-sm">
                <input type="file" accept="image/*" onChange={onPickAvatar} />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Nombre</label>
              <input className="w-full border p-2 rounded" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm mb-1">Correo</label>
              <input className="w-full border p-2 rounded" value={email} onChange={(e) => setEmail(e.target.value)} />
              <p className="text-xs text-gray-500">Si cambias el correo, el código llegará al nuevo correo.</p>
            </div>

            <div>
              <label className="block text-sm mb-1">Nueva contraseña (opcional)</label>
              <input type="password" className="w-full border p-2 rounded" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <div className="flex items-center gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Enviar código y continuar</button>
              <button type="button" onClick={handleDeleteAccount} className="bg-red-600 text-white px-4 py-2 rounded">Eliminar cuenta</button>
            </div>
          </form>
        </>
      ) : step === "code" ? (
        <form onSubmit={submitChanges} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Código recibido</label>
            <input className="w-full border p-2 rounded" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded">Confirmar cambios</button>
            <button type="button" onClick={() => setStep("edit")} className="bg-gray-600 text-white px-4 py-2 rounded">Volver</button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          <p>Listo. Tus cambios han sido guardados.</p>
          <button onClick={() => navigate("/dashboard")} className="bg-blue-600 text-white px-4 py-2 rounded">Ir al dashboard</button>
        </div>
      )}
    </div>
  );
};

export default EditProfile;