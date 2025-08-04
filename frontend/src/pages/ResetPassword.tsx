import { useState, type ChangeEvent, type FormEvent } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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
    try {
      await axios.post("http://localhost:5000/api/auth/reset-password", form);
      setMsg("Contraseña actualizada");
      setError("");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.msg || "Error al actualizar");
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Cambiar contraseña</h2>
      {msg && <p className="text-green-500 mb-2">{msg}</p>}
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full p-2 border"
          name="email"
          placeholder="Correo"
          value={form.email}
          onChange={handleChange}
        />
        <input
          className="w-full p-2 border"
          name="code"
          placeholder="Código recibido"
          value={form.code}
          onChange={handleChange}
        />
        <input
          className="w-full p-2 border"
          type="password"
          name="new_password"
          placeholder="Nueva contraseña"
          value={form.new_password}
          onChange={handleChange}
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2">
          Actualizar
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;