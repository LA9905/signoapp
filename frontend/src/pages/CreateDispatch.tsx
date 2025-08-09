import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import ProductSelector from "../components/ProductSelector.tsx";
import ClientSelector from "../components/ClientSelector.tsx";
import DriverSelector from "../components/DriverSelector.tsx";
import axios, { AxiosError } from "axios";

interface Producto {
  id: string;
  name: string;
  cantidad: number;
  unidad: string;
  category?: string; // categoría opcional para productos nuevos
}

interface FormularioDespacho {
  orden: string;
  chofer: string;   // ← id del chofer como string
  cliente: string;  // ← nombre del cliente
  productos: Producto[];
}

const CreateDispatch = () => {
  const navigate = useNavigate();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [form, setForm] = useState<FormularioDespacho>({
    orden: "",
    chofer: "",
    cliente: "",
    productos: [],
  });
  const [mensaje, setMensaje] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found in localStorage");
      return;
    }

    axios
      .get(`${import.meta.env.VITE_API_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (Array.isArray(res.data)) {
          setProductos(
            res.data.map((p: any) => ({
              id: p.id.toString(),
              name: p.name,
              cantidad: 0,
              unidad: "unidades",
              category: p.category,
            }))
          );
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.orden || !form.cliente || !form.chofer || form.productos.length === 0) {
      setMensaje("Todos los campos (orden, cliente, chofer y al menos un producto) son requeridos");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");

      const payload = {
        orden: form.orden,
        cliente: form.cliente,   // nombre del cliente
        chofer: form.chofer,     // id del chofer (string)
        productos: form.productos.map((p) => ({
          nombre: p.name,
          cantidad: p.cantidad,
          unidad: p.unidad,
        })),
      };
      console.log("Payload enviado a /api/dispatches:", payload);

      // Registrar productos NUEVOS (no existentes)
      const newProducts = form.productos.filter(
        (p) => !productos.some((ep: Producto) => ep.id === p.id)
      );

      for (const product of newProducts) {
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/products`,
          {
            name: product.name,
            category: product.category || "Otros",
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // Crear despacho y obtener su ID
      const createResp = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/dispatches`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const dispatchId: number = createResp.data?.id;
      setMensaje("Despacho creado correctamente");

      // Abrir PDF en pestaña nueva
      if (dispatchId) {
        const pdfResp = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/print/${dispatchId}?inline=1`,
          {
            headers: { Authorization: `Bearer ${token}` },
            responseType: "blob",
          }
        );
        const blob = new Blob([pdfResp.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }

      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      const error = err as AxiosError;
      console.error("Error en handleSubmit:", error.response ? error.response.data : error.message);
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
          className="w-full border p-2 rounded"
          required
        />

        {/* Cliente (como antes) */}
        <ClientSelector
          value={form.cliente}
          onChange={(cliente: string) => setForm({ ...form, cliente })}
        />

        {/* Chofer (global con contexto) */}
        <DriverSelector
          value={form.chofer}
          onChange={(id: string) => setForm({ ...form, chofer: id })}
        />

        {/* Productos (como antes) */}
        <ProductSelector
          productos={form.productos}
          setProductos={(productos: Producto[]) => setForm({ ...form, productos })}
          existingProductos={productos}
        />

        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          Guardar Despacho
        </button>
      </form>
    </div>
  );
};

export default CreateDispatch;
