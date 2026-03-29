import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import ProductSelector from "../components/ProductSelector.tsx";
import ClientSelector from "../components/ClientSelector.tsx";
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

interface FormularioCreditNote {
  client: string;
  order_number: string;
  invoice_number: string;
  credit_note_number: string;
  reason: string;
  productos: Producto[];
}

interface Payload {
  client: string;
  order_number: string;
  invoice_number: string;
  credit_note_number: string;
  reason: string;
  productos: { nombre: string; cantidad: number; unidad: string }[];
}

const CreateCreditNote = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [form, setForm] = useState<FormularioCreditNote>({
    client: "",
    order_number: "",
    invoice_number: "",
    credit_note_number: "",
    reason: "",
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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.client || !form.order_number || !form.invoice_number || !form.credit_note_number || !form.reason || form.productos.length === 0) {
      setMensaje("Todos los campos son requeridos");
      return;
    }

    try {
      const payload: Payload = {
        client: form.client,
        order_number: form.order_number,
        invoice_number: form.invoice_number,
        credit_note_number: form.credit_note_number,
        reason: form.reason,
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

      const createResp = await api.post("/credit-notes", payload);
      const creditNoteId: number = createResp.data?.id;

      setMensaje("Nota de crédito registrada satisfactoriamente");

      // Confirmación para imprimir
      if (window.confirm("¿Desea imprimir la nota de crédito?")) {
        if (creditNoteId) {
          const pdfResp = await api.get(`/print-credit-note/${creditNoteId}`, {
            params: { inline: "1", format: "pos80" },
            responseType: "blob",
          });
          const blob = new Blob([pdfResp.data], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const w = window.open(url, "_blank");
          if (w) {
            setTimeout(() => {
              try {
                w.print();
              } catch (printErr) {
                console.warn("No se pudo lanzar print()", printErr);
              }
            }, 500);
          } else {
            window.location.href = url;
          }
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
      }

      setForm({ ...form, productos: [] }); // Limpiar productos
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setMensaje(err.response?.data?.error || "Error al registrar nota de crédito");
      } else {
        setMensaje("Error desconocido al registrar nota de crédito");
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-12">
        <ArrowBackButton />
      </div>
      <h2 className="text-xl font-bold mb-4">Crear Nota de Crédito</h2>
      {mensaje && <p className="mb-4 text-green-600">{mensaje}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <ClientSelector
          value={form.client}
          onChange={(client: string) => setForm({ ...form, client })}
        />

        <input
          name="order_number"
          value={form.order_number}
          onChange={handleChange}
          placeholder="Número de orden de compra"
          className="w-full border p-2 rounded"
          required
        />

        <input
          name="invoice_number"
          value={form.invoice_number}
          onChange={handleChange}
          placeholder="Número de factura"
          className="w-full border p-2 rounded"
          required
        />

        <input
          name="credit_note_number"
          value={form.credit_note_number}
          onChange={handleChange}
          placeholder="Número de nota de crédito"
          className="w-full border p-2 rounded"
          required
        />

        <textarea
          name="reason"
          value={form.reason}
          onChange={handleChange}
          placeholder="Motivo de la nota de crédito"
          className="w-full border p-2 rounded h-24"
          required
        />

        <ProductSelector
          productos={form.productos}
          setProductos={(prods: Producto[]) => setForm({ ...form, productos: prods })}
          existingProductos={productos}
        />

        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          Guardar Nota de Crédito
        </button>
      </form>
    </div>
  );
};

export default CreateCreditNote;