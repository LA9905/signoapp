import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import ProductSelector from "../components/ProductSelector.tsx";
import ClientSelector from "../components/ClientSelector.tsx";
import axios, { AxiosError } from "axios"; // Importamos AxiosError

interface Chofer {
  id: string;
  name: string;
}

interface Producto {
  id: string;
  name: string;
  cantidad: number;
  unidad: string;
}

interface Cliente {
  id: string;
  name: string;
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
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [form, setForm] = useState<FormularioDespacho>({
    orden: "",
    chofer: "",
    cliente: "",
    productos: [],
  });
  const [mensaje, setMensaje] = useState<string>("");
  const [searchChofer, setSearchChofer] = useState("");
  const [newChofer, setNewChofer] = useState("");
  const [showNewChofer, setShowNewChofer] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found in localStorage");
      return;
    }

    axios
      .get(`${import.meta.env.VITE_API_URL}/api/drivers`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        console.log("Respuesta de /api/drivers:", res.data);
        if (Array.isArray(res.data)) {
          setChoferes(res.data.map((d: any) => ({ id: d.id.toString(), name: d.name })));
        } else {
          console.error("Unexpected data format for drivers:", res.data);
          setChoferes([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching drivers:", err);
        setChoferes([]);
      });

    axios
      .get(`${import.meta.env.VITE_API_URL}/api/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        console.log("Respuesta de /api/clients:", res.data);
        if (Array.isArray(res.data)) {
          setClientes(res.data.map((c: any) => ({ id: c.id.toString(), name: c.name })));
        } else {
          console.error("Unexpected data format for clients:", res.data);
          setClientes([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching clients:", err);
        setClientes([]);
      });

    axios
      .get(`${import.meta.env.VITE_API_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        console.log("Respuesta de /api/products:", res.data);
        if (Array.isArray(res.data)) {
          setProductos(res.data.map((p: any) => ({
            id: p.id.toString(),
            name: p.name,
            cantidad: 0,
            unidad: "unidades",
          })));
        } else {
          console.error("Unexpected data format for products:", res.data);
          setProductos([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching products:", err);
        setProductos([]);
      });
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSearchChofer = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchChofer(e.target.value);
  };

  const handleRegisterChofer = async () => {
    const token = localStorage.getItem("token");
    if (!token || !newChofer) {
      console.error("No token or chofer name provided");
      return;
    }

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/drivers`,
        { name: newChofer },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setChoferes([...choferes, { id: res.data.id.toString(), name: res.data.name }]);
      setForm({ ...form, chofer: res.data.id.toString() });
      setNewChofer("");
      setShowNewChofer(false);
    } catch (err) {
      console.error("Error registering chofer:", err);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");

      const payload = {
        orden: form.orden,
        cliente: form.cliente,
        chofer: form.chofer,
        productos: form.productos.map((p) => ({
          nombre: p.name,
          cantidad: p.cantidad,
          unidad: p.unidad,
        })),
      };
      console.log("Payload enviado a /api/dispatches:", payload);

      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/dispatches`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMensaje("Despacho creado correctamente");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      const error = err as AxiosError; // Tipamos err como AxiosError
      console.error("Error en handleSubmit:", error.response ? error.response.data : error.message);
      setMensaje("Error al crear despacho");
    }
  };

  const filteredChoferes = choferes.filter((ch) =>
    ch && ch.name ? ch.name.toLowerCase().includes(searchChofer.toLowerCase()) : false
  );

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
          required
        />

        <ClientSelector
          value={form.cliente}
          onChange={(cliente: string) => setForm({ ...form, cliente })}
          existingClients={clientes.map((c) => c.name)}
        />

        <div className="space-y-2">
          <input
            type="text"
            placeholder="Buscar chofer..."
            value={searchChofer}
            onChange={handleSearchChofer}
            className="w-full border p-2"
          />
          <select
            name="chofer"
            value={form.chofer}
            onChange={handleChange}
            className="w-full border p-2"
            required
          >
            <option value="">Selecciona chofer</option>
            {filteredChoferes.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.name}
              </option>
            ))}
          </select>
          {showNewChofer && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newChofer}
                onChange={(e) => setNewChofer(e.target.value)}
                placeholder="Nuevo chofer"
                className="w-full border p-2"
              />
              <button
                onClick={handleRegisterChofer}
                className="bg-green-500 text-white px-2 py-1"
              >
                Guardar
              </button>
            </div>
          )}
          {!showNewChofer && (
            <button
              onClick={() => setShowNewChofer(true)}
              className="bg-blue-500 text-white px-2 py-1"
            >
              Nuevo Chofer
            </button>
          )}
        </div>

        <ProductSelector
          productos={form.productos}
          setProductos={(productos: Producto[]) => setForm({ ...form, productos })}
          existingProductos={productos}
        />

        <button type="submit" className="bg-blue-500 text-white px-4 py-2">
          Guardar Despacho
        </button>
      </form>
    </div>
  );
};

export default CreateDispatch;