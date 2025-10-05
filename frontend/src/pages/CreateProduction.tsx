import { useEffect, useState, type FormEvent } from "react";
import ProductSelector from "../components/ProductSelector.tsx";
import OperatorSelector from "../components/OperatorSelector.tsx";
import ArrowBackButton from "../components/ArrowBackButton";
import { api } from "../services/http";
import { AxiosError } from "axios"; 

interface Producto {
  id: string;
  name: string;
  cantidad: number;
  unidad: string;
  category?: string;
}

interface FormularioProduccion {
  operator: string;
  productos: Producto[];
}

interface Payload {
  operator: string;
  productos: { nombre: string; cantidad: number; unidad: string }[];
}

const CreateProduction = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [form, setForm] = useState<FormularioProduccion>({
    operator: "",
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
      .catch(() => {
        setProductos([]);
      });
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.operator || form.productos.length === 0) {
      setMensaje("Todos los campos (operario y al menos un producto) son requeridos");
      return;
    }

    try {
      const payload: Payload = {
        operator: form.operator,
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
        try {
          await api.post("/products", {
            name: product.name,
            category: product.category || "Otros",
          });
        } catch (err: unknown) {
          if (err instanceof AxiosError) {
            const msg = err.response?.data?.error || "Error al crear producto";
            if (msg.toLowerCase().includes("ya existe un producto")) {
              setMensaje(`El producto "${product.name}" ya existe. Búscalo en la lista y selecciónalo.`);
              return;
            }
            setMensaje(msg);
            return;
          } else {
            setMensaje("Error desconocido al crear producto");
            return;
          }
        }
      }

      await api.post("/productions", payload);
      setMensaje("Producción registrada satisfactoriamente");
      setForm({ ...form, productos: [] }); // Limpiar productos
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setMensaje(err.response?.data?.error || "Error al registrar producción");
      } else {
        setMensaje("Error desconocido al registrar producción");
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-12">
        <ArrowBackButton />
      </div>
      <h2 className="text-xl font-bold mb-4">Ingreso de Producción Diaria</h2>
      {mensaje && <p className="mb-4 text-green-600">{mensaje}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <OperatorSelector
          value={form.operator}
          onChange={(operator: string) => setForm({ ...form, operator })}
        />

        <ProductSelector
          productos={form.productos}
          setProductos={(prods: Producto[]) => setForm({ ...form, productos: prods })}
          existingProductos={productos}
        />

        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          Guardar Producción
        </button>
      </form>
    </div>
  );
};

export default CreateProduction;