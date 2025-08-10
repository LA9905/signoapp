import { useState, type FormEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="p-8 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Recuperar contraseña</h2>
      {msg && <p className="text-green-500 mb-2">{msg}</p>}
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full p-2 border"
          placeholder="Correo"
          type="email"
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          required
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Enviar código
        </button>
      </form>
    </div>
  );
};

export default Recover;
