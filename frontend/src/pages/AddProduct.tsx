import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { useEffect, useState } from "react";

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
    formState: { errors },
    reset,
  } = useForm<ProductForm>({
    resolver: zodResolver(schema),
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    console.log("AddProduct montado");
  }, []);

  const onSubmit = async (data: ProductForm) => {
    try {
      const token = localStorage.getItem("token");
      console.log("Token:", token);
      const { subject, ...dataToSend } = data;
      console.log("Data enviada (objeto):", dataToSend);

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/products`, dataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Respuesta del servidor:", response.data);
      setMessage("Producto agregado exitosamente");
      reset();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.msg || err.message || "Error desconocido";
      setMessage(errorMessage);
      console.error("Error detallado:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        stack: err.stack,
      });
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4 text-blue-600">Agregar Producto</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label>Nombre del producto</label>
          <input {...register("name")} className="w-full border p-2 rounded" />
          {errors.name && <p className="text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label>Categoría</label>
          <select {...register("category")} className="w-full border p-2 rounded">
            <option value="">Seleccionar</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.category && <p className="text-red-500">{errors.category.message}</p>}
        </div>

        <div>
          <label>Subject (opcional para pruebas)</label>
          <input {...register("subject")} className="w-full border p-2 rounded" placeholder="Dejar vacío" />
          {errors.subject && <p className="text-red-500">{errors.subject.message}</p>}
        </div>

        <button
          type="submit"
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Agregar
        </button>

        {message && <p className="mt-2 text-center text-sm">{message}</p>}
      </form>
    </div>
  );
}