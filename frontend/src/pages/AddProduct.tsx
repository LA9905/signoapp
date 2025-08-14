// src/pages/AddProduct.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import ArrowBackButton from "../components/ArrowBackButton";
import { api } from "../services/http";

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  category: z.string().min(1, "Seleccione una categoría"),
  subject: z.string().optional(),
});

type ProductForm = z.infer<typeof schema>;

const categories = [
  "Bolsas Negras",
  "Bolsas Transparente Recuperada",
  "Bolsas Camisetas",
  "Bolsas Virgen Transparente",
  "Productos de limpieza, aseo y cocina",
  "Vasos plásticos",
  "Vasos de Poli-papel",
  "Vasos Espumados",
  "Vasos PET",
  "Envases de Alimento",
  "Porta-colaciones",
  "Otros",
];

export default function AddProduct() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProductForm>({
    resolver: zodResolver(schema),
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // sólo para debug: confirma la baseURL en prod/dev
    if (import.meta.env.PROD) {
      console.log("AddProduct montado");
    }
  }, []);

  const onSubmit = async (data: ProductForm) => {
    setMessage("");
    setError("");

    try {
      const { subject, ...dataToSend } = data;
      // El interceptor añade el token desde localStorage si existe
      const res = await api.post("/products", dataToSend);
      console.log("Respuesta del servidor:", res.data);
      setMessage("✅ Producto agregado exitosamente");
      reset();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.msg ||
        err?.message ||
        "Error desconocido";
      setError(msg);
      console.error("Error detallado:", {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
        stack: err?.stack,
      });
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-gray-700 shadow rounded">
      <div className="mb-12">
        <ArrowBackButton />
      </div>
      <h2 className="text-xl font-bold mb-4 text-blue-600">Agregar Producto</h2>

      {error && <p className="mb-3 text-red-600">{error}</p>}
      {message && <p className="mb-3 text-emerald-600">{message}</p>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block mb-1">Nombre del producto</label>
          <input
            {...register("name")}
            className="w-full border p-2 rounded"
            placeholder="Ej: Bolsa 50x70"
          />
          {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block mb-1">Categoría</label>
          <select {...register("category")} className="w-full border p-2 rounded">
            <option value="">Seleccionar</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="text-red-500 text-sm">{errors.category.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-60"
        >
          {isSubmitting ? "Guardando..." : "Agregar"}
        </button>
      </form>
    </div>
  );
}
