import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { FiUser, FiFileText, FiBox, FiMessageSquare, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
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

interface ApiError {
  error?: string;
  msg?: string;
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

    try {
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

      setForm({ ...form, productos: [] });
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        const errCode = (err.response?.data as ApiError)?.error;
        const errMsg = (err.response?.data as ApiError)?.msg || "";
        const duplicateCodes = ["duplicate_order", "duplicate_invoice", "duplicate_credit", "duplicate_order_invoice", "duplicate_order_credit", "duplicate_invoice_credit", "duplicate_all"];
        if (err.response?.status === 409 && errCode && duplicateCodes.includes(errCode)) {
          if (window.confirm(errMsg)) {
            try {
              const createResp = await api.post("/credit-notes", { ...payload, force: true });
              const creditNoteId: number = createResp.data?.id;
              setMensaje("Nota de crédito registrada satisfactoriamente");
              if (window.confirm("¿Desea imprimir la nota de crédito?")) {
                if (creditNoteId) {
                  const pdfResp = await api.get(`/print-credit-note/${creditNoteId}`, { params: { inline: "1", format: "pos80" }, responseType: "blob" });
                  const blob = new Blob([pdfResp.data], { type: "application/pdf" });
                  const url = URL.createObjectURL(blob);
                  const w = window.open(url, "_blank");
                  if (w) { setTimeout(() => { try { w.print(); } catch {} }, 500); } else { window.location.href = url; }
                  setTimeout(() => URL.revokeObjectURL(url), 60000);
                }
              }
              setForm({ ...form, productos: [] });
            } catch {
              setMensaje("Error al registrar nota de crédito");
            }
          }
        } else {
          setMensaje(err.response?.data?.error || "Error al registrar nota de crédito");
        }
      } else {
        setMensaje("Error desconocido al registrar nota de crédito");
      }
    }
  };

  const isError =
    mensaje.toLowerCase().includes("error") ||
    mensaje.toLowerCase().includes("requerido") ||
    mensaje.toLowerCase().includes("existe") ||
    mensaje.toLowerCase().includes("desconocido");

  return (
    <div className="min-h-screen bg-[#080C14] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .font-display { font-family: 'Syne', sans-serif; }

        .section-card-cn {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 20px;
        }

        .input-cn {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: white;
          border-radius: 10px;
          transition: border-color .15s, box-shadow .15s;
          font-size: 14px;
          width: 100%;
          padding: 10px 14px;
          outline: none;
          font-family: 'DM Sans', sans-serif;
        }
        .input-cn::placeholder { color: rgba(255,255,255,0.2); }
        .input-cn:focus {
          border-color: rgba(99,102,241,0.6);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
        }

        .textarea-cn {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: white;
          border-radius: 10px;
          transition: border-color .15s, box-shadow .15s;
          font-size: 14px;
          width: 100%;
          padding: 10px 14px;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          resize: vertical;
          min-height: 96px;
        }
        .textarea-cn::placeholder { color: rgba(255,255,255,0.2); }
        .textarea-cn:focus {
          border-color: rgba(99,102,241,0.6);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
        }

        .field-label-cn {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.4);
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .section-title-cn {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: rgba(99,102,241,0.9);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .section-title-cn::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(99,102,241,0.15);
        }

        .btn-submit-cn {
          background: linear-gradient(135deg, #4F46E5, #6366F1);
          box-shadow: 0 4px 20px rgba(99,102,241,0.35);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 13px 32px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all .2s;
          font-family: 'DM Sans', sans-serif;
          width: 100%;
          letter-spacing: 0.01em;
        }
        .btn-submit-cn:hover {
          box-shadow: 0 6px 28px rgba(99,102,241,0.5);
          transform: translateY(-1px);
        }
        .btn-submit-cn:active { transform: translateY(0); }

        .mensaje-success-cn {
          background: rgba(52,211,153,0.08);
          border: 1px solid rgba(52,211,153,0.18);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          color: #6EE7B7;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .mensaje-error-cn {
          background: rgba(248,113,113,0.08);
          border: 1px solid rgba(248,113,113,0.18);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          color: #F87171;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fade-in .3s ease both; }

        .input-cn-wrapper input,
        .input-cn-wrapper select {
          background: rgba(255,255,255,0.04) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          color: white !important;
          border-radius: 10px !important;
          font-size: 14px !important;
          padding: 10px 14px !important;
          width: 100% !important;
          outline: none !important;
          font-family: 'DM Sans', sans-serif !important;
          transition: border-color .15s, box-shadow .15s !important;
        }
        .input-cn-wrapper input::placeholder,
        .input-cn-wrapper select::placeholder { color: rgba(255,255,255,0.2) !important; }
        .input-cn-wrapper input:focus,
        .input-cn-wrapper select:focus {
          border-color: rgba(99,102,241,0.6) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.08) !important;
        }
        .input-cn-wrapper select option { background: #111827 !important; color: white !important; }
      `}</style>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Back */}
        <div className="mb-8">
          <ArrowBackButton />
        </div>

        {/* Header */}
        <div className="mb-8 fade-in">
          <h1 className="font-display text-3xl font-bold tracking-tight mb-1">
            Crear Nota de Crédito
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            Registra una nota de crédito asociada a un cliente
          </p>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={isError ? "mensaje-error-cn fade-in" : "mensaje-success-cn fade-in"}>
            <span style={{ flexShrink: 0, display: "flex" }}>
              {isError ? <FiAlertCircle size={15} /> : <FiCheckCircle size={15} />}
            </span>
            <span>{mensaje}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Sección 1: Cliente ── */}
          <div className="section-card-cn fade-in" style={{ animationDelay: "0.05s" }}>
            <div className="section-title-cn">
              <FiUser size={13} />
              Cliente
            </div>
            <div>
              <div className="field-label-cn">
                <FiUser size={11} />
                Cliente <span style={{ color: "rgba(248,113,113,0.8)" }}>*</span>
              </div>
              <div className="input-cn-wrapper">
                <ClientSelector
                  value={form.client}
                  onChange={(client: string) => setForm({ ...form, client })}
                />
              </div>
            </div>
          </div>

          {/* ── Sección 2: Identificación ── */}
          <div className="section-card-cn fade-in" style={{ animationDelay: "0.10s" }}>
            <div className="section-title-cn">
              <FiFileText size={13} />
              Identificación
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="field-label-cn">
                  <FiFileText size={11} />
                  Número de orden de compra <span style={{ color: "rgba(248,113,113,0.8)" }}>*</span>
                </div>
                <input
                  name="order_number"
                  value={form.order_number}
                  onChange={handleChange}
                  placeholder="Ej: OC-2024-001"
                  className="input-cn"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="field-label-cn">
                    <FiFileText size={11} />
                    N° Factura <span style={{ color: "rgba(248,113,113,0.8)" }}>*</span>
                  </div>
                  <input
                    name="invoice_number"
                    value={form.invoice_number}
                    onChange={handleChange}
                    placeholder="Ej: FAC-001"
                    className="input-cn"
                    required
                  />
                </div>
                <div>
                  <div className="field-label-cn">
                    <FiFileText size={11} />
                    N° Nota de crédito <span style={{ color: "rgba(248,113,113,0.8)" }}>*</span>
                  </div>
                  <input
                    name="credit_note_number"
                    value={form.credit_note_number}
                    onChange={handleChange}
                    placeholder="Ej: NC-001"
                    className="input-cn"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Sección 3: Motivo ── */}
          <div className="section-card-cn fade-in" style={{ animationDelay: "0.15s" }}>
            <div className="section-title-cn">
              <FiMessageSquare size={13} />
              Motivo
            </div>
            <div>
              <div className="field-label-cn">
                <FiMessageSquare size={11} />
                Motivo de la nota de crédito <span style={{ color: "rgba(248,113,113,0.8)" }}>*</span>
              </div>
              <textarea
                name="reason"
                value={form.reason}
                onChange={handleChange}
                placeholder="Describe el motivo de la nota de crédito..."
                className="textarea-cn"
                required
              />
            </div>
          </div>

          {/* ── Sección 4: Productos ── */}
          <div className="section-card-cn fade-in" style={{ animationDelay: "0.20s" }}>
            <div className="section-title-cn">
              <FiBox size={13} />
              Productos <span style={{ color: "rgba(248,113,113,0.8)" }}>*</span>
            </div>
            <div className="input-cn-wrapper">
              <ProductSelector
                productos={form.productos}
                setProductos={(prods: Producto[]) => setForm({ ...form, productos: prods })}
                existingProductos={productos}
              />
            </div>
          </div>

          {/* ── Botón submit ── */}
          <div className="pt-2 fade-in" style={{ animationDelay: "0.25s" }}>
            <button type="submit" className="btn-submit-cn">
              Guardar Nota de Crédito
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateCreditNote;