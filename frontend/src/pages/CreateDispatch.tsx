import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import ProductSelector from "../components/ProductSelector.tsx";
import ClientSelector from "../components/ClientSelector.tsx";
import DriverSelector from "../components/DriverSelector.tsx";
import { api } from "../services/http";
import type { AxiosError } from "axios";

interface Producto {
  id: string;
  name: string;
  cantidad: number;
  unidad: string;
  category?: string; // categoría opcional para productos nuevos
}

interface FormularioDespacho {
  orden: string;
  chofer: string;   // id del chofer como string
  cliente: string;  // nombre del cliente
  numero_paquete?: number; // NUEVO
  productos: Producto[];
}

const CreateDispatch = () => {
  const navigate = useNavigate();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [form, setForm] = useState<FormularioDespacho>({
    orden: "",
    chofer: "",
    cliente: "",
    numero_paquete: 1, // por defecto 1
    productos: [],
  });
  const [mensaje, setMensaje] = useState<string>("");

  useEffect(() => {
    // Carga inicial de productos existentes
    api
      .get("/products")
      .then((res) => {
        if (Array.isArray(res.data)) {
          setProductos(
            res.data.map((p: any) => ({
              id: String(p.id),
              name: p.name,
              cantidad: 0,
              unidad: "unidades",
              category: p.category,
            }))
          );
        } else {
          console.error("Formato inesperado al obtener productos:", res.data);
          setProductos([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching products:", err);
        setProductos([]);
      });
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "numero_paquete") {
      setForm({ ...form, numero_paquete: value ? Number(value) : undefined });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.orden || !form.cliente || !form.chofer || form.productos.length === 0) {
      setMensaje("Todos los campos (orden, cliente, chofer y al menos un producto) son requeridos");
      return;
    }

    try {
      const payload = {
        orden: form.orden,
        cliente: form.cliente, // nombre del cliente
        chofer: form.chofer,   // id del chofer (string)
        paquete_numero: form.numero_paquete, // NUEVO
        productos: form.productos.map((p) => ({
          nombre: p.name,
          cantidad: p.cantidad,
          unidad: p.unidad,
        })),
      };
      console.log("Payload enviado a /api/dispatches:", payload);

      // Registrar productos NUEVOS (no existentes en la lista inicial)
      const newProducts = form.productos.filter(
        (p) => !productos.some((ep: Producto) => ep.id === p.id)
      );

      for (const product of newProducts) {
        await api.post("/products", {
          name: product.name,
          category: product.category || "Otros",
        });
      }

      // Crear despacho y obtener su ID
      const createResp = await api.post("/dispatches", payload);
      const dispatchId: number = createResp.data?.id;

      setMensaje("Despacho creado correctamente");

      // Abrir PDF en pestaña nueva en formato etiqueta 4x6
      if (dispatchId) {
        const pdfResp = await api.get(`/print/${dispatchId}`, {
          params: { inline: "1", format: "label", size: "4x6" },
          responseType: "blob",
        });

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
          value={form.orden}
          onChange={handleChange}
          placeholder="Número de orden de compra"
          className="w-full border p-2 rounded"
          required
        />

        <input
          type="number"
          name="numero_paquete"
          value={form.numero_paquete ?? 1}
          min={1}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          placeholder="Número de paquete (ej. 1)"
        />

        {/* Cliente (nombre) */}
        <ClientSelector
          value={form.cliente}
          onChange={(cliente: string) => setForm({ ...form, cliente })}
        />

        {/* Chofer (id como string) */}
        <DriverSelector
          value={form.chofer}
          onChange={(id: string) => setForm({ ...form, chofer: id })}
        />

        {/* Productos */}
        <ProductSelector
          productos={form.productos}
          setProductos={(prods: Producto[]) => setForm({ ...form, productos: prods })}
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