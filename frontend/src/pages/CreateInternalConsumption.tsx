import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import ProductSelector from "../components/ProductSelector.tsx";
import ArrowBackButton from "../components/ArrowBackButton";
import { api } from "../services/http";
import type { AxiosError } from "axios";

interface Producto {
  id: string;
  name: string;
  cantidad: number;
  unidad: string;
  category?: string;
}

interface FormularioConsumo {
  nombre_retira: string;
  area: string;
  motivo: string;
  productos: Producto[];
}

const areas = ["Administración", "Producción", "Almacén", "Ventas", "Mantenimiento", "Extrusión", "Impresión", "Despacho", "Otros"];

const CreateInternalConsumption = () => {
  const navigate = useNavigate();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [form, setForm] = useState<FormularioConsumo>({
    nombre_retira: "",
    area: "",
    motivo: "",
    productos: [],
  });
  const [mensaje, setMensaje] = useState<string>("");

  useEffect(() => {
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
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.nombre_retira || !form.area || !form.motivo || form.productos.length === 0) {
      setMensaje("Todos los campos son requeridos");
      return;
    }

    try {
      const payload = {
        nombre_retira: form.nombre_retira,
        area: form.area,
        motivo: form.motivo,
        productos: form.productos.map((p) => ({
          nombre: p.name,
          cantidad: p.cantidad,
          unidad: p.unidad,
        })),
      };

      const newProducts = form.productos.filter(
        (p) => !productos.some((ep) => ep.id === p.id)
      );

      for (const product of newProducts) {
        await api.post("/products", {
          name: product.name,
          category: product.category || "Otros",
        });
      }

      const createResp = await api.post("/internal-consumptions", payload);
      const consumptionId: number = createResp.data?.id;

      setMensaje("Consumo interno registrado correctamente");

      // Confirmación para imprimir
      if (window.confirm("¿Desea imprimir el registro?")) {
        if (consumptionId) {
          const pdfResp = await api.get(`/print-internal/${consumptionId}`, {
            params: { inline: "1", format: "pos80" },
            responseType: "blob",
          });
          const blob = new Blob([pdfResp.data], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const w = window.open(url, "_blank");
          // Intenta imprimir al cargar la nueva ventana; revoca el URL pasado un rato después
          if (w) {
            // algunos navegadores no permiten .print() desde aquí si la ventana no ha terminado de cargar,
            // este intento es lo más razonable sin control total del contenido
            w.focus();
            // Intentamos imprimir con un pequeño delay
            setTimeout(() => {
              try {
                w.print();
              } catch (printErr) {
                // silencioso; el usuario puede imprimir manualmente
                console.warn("No se pudo lanzar print() automáticamente", printErr);
              }
            }, 500);
          } else {
            // fallback: abrir en la misma pestaña
            window.location.href = url;
          }
          // revocar el objectURL después de 60s para dar tiempo al usuario a visualizar/imprimir
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
      }

      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      const axiosError = err as AxiosError;
      // CAST controlado: muchos backends devuelven { error: "mensaje" } en response.data
      const apiMessage = (axiosError.response?.data as any)?.error || "Error al registrar consumo interno";
      setMensaje(apiMessage);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-12">
        <ArrowBackButton />
      </div>
      <h2 className="text-xl font-bold mb-4">Registrar Consumo Interno</h2>
      {mensaje && <p className="mb-4 text-green-600">{mensaje}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="nombre_retira"
          value={form.nombre_retira}
          onChange={handleChange}
          placeholder="Nombre de quien retira"
          className="w-full border p-2 rounded"
          required
        />

        <select
          name="area"
          value={form.area}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        >
          <option value="">Seleccione área</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <input
          name="motivo"
          value={form.motivo}
          onChange={handleChange}
          placeholder="Motivo del retiro"
          className="w-full border p-2 rounded"
          required
        />

        <ProductSelector
          productos={form.productos}
          setProductos={(prods: Producto[]) => setForm({ ...form, productos: prods })}
          existingProductos={productos}
        />

        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          Guardar Consumo Interno
        </button>
      </form>
    </div>
  );
};

export default CreateInternalConsumption;