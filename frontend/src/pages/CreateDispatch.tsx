import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import ProductSelector from "../components/ProductSelector.tsx";
import ClientSelector from "../components/ClientSelector.tsx";
import DriverSelector from "../components/DriverSelector.tsx";
import ArrowBackButton from "../components/ArrowBackButton";
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
  chofer: string; // id del chofer como string
  cliente: string; // nombre del cliente
  numero_paquete?: string; // NUEVO
  productos: Producto[];
}

// NUEVO: Interfaz para el payload del despacho
interface DispatchPayload {
  orden: string;
  cliente: string;
  chofer: string;
  paquete_numero?: string;
  productos: { nombre: string; cantidad: number; unidad: string }[];
  force?: boolean; // Propiedad opcional para forzar creación
}

// NUEVO: Interfaz para errores de la API
interface ApiError {
  error?: string;
  msg?: string;
}

const CreateDispatch = () => {
  const navigate = useNavigate();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [form, setForm] = useState<FormularioDespacho>({
    orden: "",
    chofer: "",
    cliente: "",
    numero_paquete: "",
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
      setForm({ ...form, numero_paquete: value || undefined });
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
      // Verificar si ya existe un despacho con esa orden
      const checkResp = await api.get("/dispatches", { params: { order: form.orden } });
      let payload: DispatchPayload = {
        orden: form.orden,
        cliente: form.cliente,
        chofer: form.chofer,
        paquete_numero: form.numero_paquete,
        productos: form.productos.map((p) => ({
          nombre: p.name,
          cantidad: p.cantidad,
          unidad: p.unidad,
        })),
      };

      // Solo mostrar alerta si hay un despacho con ese orden
      if (checkResp.data.length > 0) {
        if (!window.confirm("Ya existe un despacho registrado con ese número de orden. ¿Desea continuar?")) {
          return; // Usuario cancela: no registrar nada
        }
        // Usuario acepta: agregar force=true
        payload = { ...payload, force: true };
      }

      // Registrar productos NUEVOS (no existentes en la lista inicial)
      const newProducts = form.productos.filter(
        (p) => !productos.some((ep) => ep.id === p.id) // id no coincide con ninguno existente => es “nuevo”
      );

      // Intenta crearlos uno por uno. Si alguno ya existe por nombre, detenemos todo.
      for (const product of newProducts) {
        try {
          await api.post("/products", {
            name: product.name,
            category: product.category || "Otros",
          });
        } catch (err: unknown) {
          const error = err as AxiosError<ApiError>;
          const msg =
            error.response?.data?.error ||
            error.response?.data?.msg ||
            "Error al crear producto";
          // Si es el error de ya-existe por nombre, detenemos y avisamos:
          if (typeof msg === "string" && msg.toLowerCase().includes("ya existe un producto")) {
            setMensaje(`El producto "${product.name}" ya existe. Búscalo en la lista y selecciónalo.`);
            return; // Aborta: NO se crea el despacho
          }
          // Cualquier otro error también aborta
          setMensaje(msg);
          return;
        }
      }

      // Crear despacho y obtener su ID
      const createResp = await api.post("/dispatches", payload);
      const dispatchId: number = createResp.data?.id;

      setMensaje("Despacho creado correctamente");

      // Abrir PDF en pestaña nueva con el layout POS 80 (alto dinámico)
      if (dispatchId) {
        const pdfResp = await api.get(`/print/${dispatchId}`, {
          params: { inline: "1", format: "pos80" },
          responseType: "blob",
        });

        const blob = new Blob([pdfResp.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }

      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiError>;
      console.error("Error en handleSubmit:", error.response ? error.response.data : error.message);
      if (error.response?.status === 409 && error.response?.data?.error === "duplicate_order") {
        // El backend ya maneja el force, pero si llega aquí (raro), mostrar mensaje
        setMensaje(error.response.data?.msg || "Ya existe un despacho con ese número de orden");
      } else {
        setMensaje("Error al crear despacho");
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-12">
        <ArrowBackButton />
      </div>
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
          type="text"
          name="numero_paquete"
          value={form.numero_paquete ?? ""}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          placeholder="Número de paquete (ej. 1/4)"
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