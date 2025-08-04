import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import ProductSelector from "../components/ProductSelector.tsx";
import ClientSelector from "../components/ClientSelector.tsx";
import axios from "axios";

interface Chofer {
  id: string;
  nombre: string;
}

interface Producto {
  nombre: string;
  cantidad: number;
  categoria: string;
}

interface FormularioDespacho {
  orden: string;
  chofer: string;
  cliente: string;
  productos: Producto[];
}

const CreateDispatch = () => {
  const navigate = useNavigate();

  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [form, setForm] = useState<FormularioDespacho>({
    orden: "",
    chofer: "",
    cliente: "",
    productos: [],
  });

  const [mensaje, setMensaje] = useState<string>("");

  useEffect(() => {
    axios.get("http://localhost:5000/api/drivers").then(res => {
      setChoferes(res.data);
    });
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:5000/api/dispatches",
        {
          ...form,
          fecha: new Date(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMensaje("Despacho creado correctamente");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      console.error(err);
      setMensaje("Error al crear despacho");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">Crear Despacho</h2>
      {mensaje && <p className="mb-4 text-green-600">{mensaje}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="orden"
          onChange={handleChange}
          placeholder="Número de orden de compra"
          className="w-full border p-2"
        />

        <ClientSelector value={form.cliente} onChange={(cliente: string) => setForm({ ...form, cliente })} />

        <select name="chofer" onChange={handleChange} className="w-full border p-2">
          <option value="">Selecciona chofer</option>
          {choferes.map(ch => (
            <option key={ch.id} value={ch.id}>
              {ch.nombre}
            </option>
          ))}
        </select>

        <ProductSelector
          productos={form.productos}
          setProductos={(productos: Producto[]) => setForm({ ...form, productos })}
        />

        <button type="submit" className="bg-blue-500 text-white px-4 py-2">
          Guardar Despacho
        </button>
      </form>
    </div>
  );
};

export default CreateDispatch;