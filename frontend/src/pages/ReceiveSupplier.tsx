import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import ProductSelector from "../components/ProductSelector.tsx";
import SupplierSelector from "../components/SupplierSelector.tsx";
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

interface FormularioRecepcion {
  orden: string;
  supplier: string;
  productos: Producto[];
}

interface Payload {
  orden: string;
  supplier: string;
  productos: { nombre: string; cantidad: number; unidad: string }[];
  force?: boolean;
}

const ReceiveSupplier = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [form, setForm] = useState<FormularioRecepcion>({
    orden: "",
    supplier: "",
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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.orden || !form.supplier || form.productos.length === 0) {
      setMensaje("Todos los campos (orden, proveedor y al menos un producto) son requeridos");
      return;
    }

    try {
      const checkResp = await api.get("/receipts", { params: { order: form.orden } });
      let payload: Payload = {
        orden: form.orden,
        supplier: form.supplier,
        productos: form.productos.map((p) => ({
          nombre: p.name,
          cantidad: p.cantidad,
          unidad: p.unidad,
        })),
      };

      // Solo mostrar alerta si hay una recepción con ese orden y no es un caso de fuerza
      if (checkResp.data.length > 0) {
        // Verificar si alguna de las recepciones existentes tiene un ID diferente (no es la misma que se está editando)
        const isDuplicate = checkResp.data.some((r: any) => r.orden === form.orden && !payload.force);
        if (isDuplicate && !window.confirm("Ya existe una orden con ese número. ¿Desea continuar?")) {
          return;
        }
        // Añadir force=true si el usuario confirma
        if (isDuplicate) {
          payload = { ...payload, force: true };
        }
      }

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

      await api.post("/receipts", payload);
      setMensaje("Recepción registrada satisfactoriamente");
      setForm({ ...form, orden: "", productos: [] }); // Limpiar solo orden y productos
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setMensaje(err.response?.data?.error || "Error al registrar recepción");
      } else {
        setMensaje("Error desconocido al registrar recepción");
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-12">
        <ArrowBackButton />
      </div>
      <h2 className="text-xl font-bold mb-4">Recepción de Proveedores</h2>
      {mensaje && <p className="mb-4 text-green-600">{mensaje}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="orden"
          value={form.orden}
          onChange={handleChange}
          placeholder="Número de factura"
          className="w-full border p-2 rounded"
          required
        />

        <SupplierSelector
          value={form.supplier}
          onChange={(supplier: string) => setForm({ ...form, supplier })}
        />

        <ProductSelector
          productos={form.productos}
          setProductos={(prods: Producto[]) => setForm({ ...form, productos: prods })}
          existingProductos={productos}
        />

        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          Guardar Recepción
        </button>
      </form>
    </div>
  );
};

export default ReceiveSupplier;