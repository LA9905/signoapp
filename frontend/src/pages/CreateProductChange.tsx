import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FiUser, FiBox, FiFileText, FiCheckCircle, FiAlertCircle, FiX, FiRepeat } from "react-icons/fi";
import ProductSelector from "../components/ProductSelector.tsx";
import ClientSelector from "../components/ClientSelector.tsx";
import ArrowBackButton from "../components/ArrowBackButton";
import { api } from "../services/http";
import type { AxiosError } from "axios";
import { useTheme } from "../context/ThemeContext";

function getLocalDateString(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  const local = new Date(now.getTime() - offsetMs);
  return local.toISOString().slice(0, 10);
}

interface Producto {
  id: string;
  name: string;
  cantidad: number;
  unidad: string;
  category?: string;
  imageFile?: File;
}

interface Formulario {
  nombre_persona: string;
  cliente: string;
  orden_compra: string;
  factura: string;
  comentario: string;
  fecha: string;
}

const CreateProductChange = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosEntran, setProductosEntran] = useState<Producto[]>([]);
  const [productosSalen, setProductosSalen] = useState<Producto[]>([]);
  const [form, setForm] = useState<Formulario>({
    nombre_persona: "",
    cliente: "",
    orden_compra: "",
    factura: "",
    comentario: "",
    fecha: getLocalDateString(),
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
              usage: p.usage || 0,
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

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.nombre_persona) {
      setMensaje("El nombre de quien trae/se lleva el producto es requerido");
      return;
    }
    if (productosEntran.length === 0 || productosSalen.length === 0) {
      setMensaje("Debes agregar al menos un producto que se queda y al menos un producto que se lleva");
      return;
    }

    try {
      const payload = {
        nombre_persona: form.nombre_persona,
        cliente: form.cliente || null,
        orden_compra: form.orden_compra || null,
        factura: form.factura || null,
        comentario: form.comentario || null,
        fecha: form.fecha,
        productos: [
          ...productosEntran.map((p) => ({ nombre: p.name, cantidad: p.cantidad, unidad: p.unidad, tipo: "entra" })),
          ...productosSalen.map((p) => ({ nombre: p.name, cantidad: p.cantidad, unidad: p.unidad, tipo: "sale" })),
        ],
      };

      const allSelected = [...productosEntran, ...productosSalen];
      const newProducts = allSelected.filter((p) => !productos.some((ep) => ep.id === p.id));

      for (const product of newProducts) {
        try {
          if (product.imageFile) {
            const fd = new FormData();
            fd.append("name", product.name);
            fd.append("category", product.category || "Otros");
            fd.append("image", product.imageFile);
            await api.post("/products", fd, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          } else {
            await api.post("/products", {
              name: product.name,
              category: product.category || "Otros",
            });
          }
        } catch (err: unknown) {
          const axiosErr = err as AxiosError;
          const msg = (axiosErr.response?.data as any)?.error || "Error al crear producto";
          if (msg.toLowerCase().includes("ya existe un producto")) {
            setMensaje(`El producto "${product.name}" ya existe. Búscalo en la lista y selecciónalo.`);
            return;
          }
          setMensaje(msg);
          return;
        }
      }

      await api.post("/product-changes", payload);
      setMensaje("Cambio de producto registrado correctamente");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      const axiosError = err as AxiosError;
      const apiMessage = (axiosError.response?.data as any)?.error || "Error al registrar el cambio de producto";
      setMensaje(apiMessage);
    }
  };

  const isError = !mensaje.toLowerCase().includes("correctamente");

  return (
    <div className="page-shell min-h-screen bg-[#080C14] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .font-display { font-family: 'Syne', sans-serif; }

        .section-card-pc {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 20px;
        }

        .input-pc {
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
        .input-pc::placeholder { color: rgba(255,255,255,0.2); }
        .input-pc:focus {
          border-color: rgba(99,102,241,0.6);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
        }

        .field-label-pc {
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

        .section-title-pc {
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
        .section-title-pc::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(99,102,241,0.15);
        }
        .section-title-pc.entra { color: #34D399; }
        .section-title-pc.entra::after { background: rgba(52,211,153,0.2); }
        .section-title-pc.sale { color: #F87171; }
        .section-title-pc.sale::after { background: rgba(248,113,113,0.2); }

        .btn-submit-pc {
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
        }
        .btn-submit-pc:hover {
          box-shadow: 0 6px 28px rgba(99,102,241,0.5);
          transform: translateY(-1px);
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fade-in .3s ease both; }

        .input-pc-wrapper input,
        .input-pc-wrapper select {
          background: rgba(255,255,255,0.04) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          color: white !important;
          border-radius: 10px !important;
          font-size: 14px !important;
          padding: 10px 14px !important;
          width: 100% !important;
          outline: none !important;
          font-family: 'DM Sans', sans-serif !important;
        }
        .input-pc-wrapper input::placeholder { color: rgba(255,255,255,0.2) !important; }
        .input-pc-wrapper input:focus,
        .input-pc-wrapper select:focus {
          border-color: rgba(99,102,241,0.6) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.08) !important;
        }
        .input-pc-wrapper select option { background: #111827 !important; color: white !important; }

        .error-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          z-index: 10000;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .error-modal {
          background: rgba(15, 23, 42, 0.98);
          border-radius: 16px;
          padding: 24px 28px;
          max-width: 420px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
          animation: modal-pop .3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes modal-pop {
          from { opacity: 0; transform: scale(0.85) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .error-modal-content { display: flex; gap: 16px; align-items: flex-start; }
        .error-modal-icon { flex-shrink: 0; color: #F87171; margin-top: 2px; }
        .error-modal-text { flex: 1; font-size: 15px; line-height: 1.5; word-break: break-word; }
        .error-modal-close {
          margin-top: 4px; color: rgba(255,255,255,0.6);
          background: none; border: none; padding: 4px; cursor: pointer;
          border-radius: 6px; transition: all .15s;
        }
        .error-modal-close:hover { color: white; background: rgba(255,255,255,0.1); }

        /* ─── Modo claro ─── */
        body[data-theme="light"] .section-card-pc {
          background: #FFFFFF;
          border: 1px solid rgba(99,102,241,0.15);
          box-shadow: 0 1px 3px rgba(15,23,42,0.04);
        }
        body[data-theme="light"] .input-pc {
          background: #FFFFFF;
          border: 1px solid rgba(15,23,42,0.12);
          color: #0F172A;
        }
        body[data-theme="light"] .input-pc::placeholder { color: rgba(15,23,42,0.3); }
        body[data-theme="light"] .input-pc:focus {
          border-color: rgba(99,102,241,0.6);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }
        body[data-theme="light"] .field-label-pc { color: rgba(15,23,42,0.5); }
        body[data-theme="light"] .section-title-pc { color: #4338CA; }
        body[data-theme="light"] .section-title-pc.entra { color: #059669; }
        body[data-theme="light"] .section-title-pc.sale { color: #DC2626; }
        body[data-theme="light"] .input-pc-wrapper input,
        body[data-theme="light"] .input-pc-wrapper select {
          background: #FFFFFF !important;
          border: 1px solid rgba(15,23,42,0.12) !important;
          color: #0F172A !important;
        }
        body[data-theme="light"] .input-pc-wrapper input::placeholder { color: rgba(15,23,42,0.3) !important; }
        body[data-theme="light"] .input-pc-wrapper input:focus,
        body[data-theme="light"] .input-pc-wrapper select:focus {
          border-color: rgba(99,102,241,0.6) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important;
        }
        body[data-theme="light"] .input-pc-wrapper select option {
          background: #FFFFFF !important;
          color: #0F172A !important;
        }
      `}</style>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <ArrowBackButton />
        </div>

        <div className="mb-8 fade-in">
          <h1 className="font-display text-3xl font-bold tracking-tight mb-1">
            Cambio de Productos
          </h1>
          <p className="text-sm" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "rgba(15,23,42,0.5)" }}>
            Registra el producto que se queda y el producto que el chofer se lleva
          </p>
        </div>

        {mensaje && (
          <div className="error-modal-overlay" onClick={() => setMensaje("")}>
            <div
              className="error-modal"
              onClick={(e) => e.stopPropagation()}
              style={{ borderColor: isError ? "rgba(248, 113, 113, 0.3)" : "rgba(96, 165, 250, 0.4)" }}
            >
              <div className="error-modal-content">
                <div className="error-modal-icon" style={{ color: isError ? "#F87171" : "#4ADE80" }}>
                  {isError ? <FiAlertCircle size={26} /> : <FiCheckCircle size={26} />}
                </div>
                <div className="error-modal-text" style={{ color: isError ? "#FEE2E2" : "#BFDBFE" }}>
                  {mensaje}
                </div>
                <button className="error-modal-close" onClick={() => setMensaje("")}>
                  <FiX size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ── Sección 1: Persona ── */}
          <div className="section-card-pc fade-in" style={{ animationDelay: "0.05s" }}>
            <div className="section-title-pc">
              <FiUser size={13} />
              Persona
            </div>
            <div className="space-y-4">
              <div>
                <div className="field-label-pc">
                  <FiUser size={11} />
                  Nombre del chofer / persona <span style={{ color: "rgba(248,113,113,0.8)" }}>*</span>
                </div>
                <input
                  name="nombre_persona"
                  value={form.nombre_persona}
                  onChange={handleChange}
                  placeholder="Nombre completo"
                  className="input-pc"
                  required
                />
              </div>
              <div>
                <div className="field-label-pc">
                  <FiFileText size={11} />
                  Fecha del cambio <span style={{ color: "rgba(248,113,113,0.8)" }}>*</span>
                </div>
                <input
                  type="date"
                  name="fecha"
                  value={form.fecha}
                  onChange={handleChange}
                  className="input-pc"
                />
              </div>
            </div>
          </div>

          {/* ── Sección 2: Datos opcionales ── */}
          <div className="section-card-pc fade-in" style={{ animationDelay: "0.08s" }}>
            <div className="section-title-pc">
              <FiFileText size={13} />
              Datos del cliente (opcional)
            </div>
            <div className="space-y-4">
              <div>
                <div className="field-label-pc">Cliente</div>
                <div className="input-pc-wrapper">
                  <ClientSelector
                    value={form.cliente}
                    onChange={(value) => setForm({ ...form, cliente: value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="field-label-pc">N° Orden de compra</div>
                  <input
                    name="orden_compra"
                    value={form.orden_compra}
                    onChange={handleChange}
                    placeholder="Opcional"
                    className="input-pc"
                  />
                </div>
                <div>
                  <div className="field-label-pc">N° Factura</div>
                  <input
                    name="factura"
                    value={form.factura}
                    onChange={handleChange}
                    placeholder="Opcional"
                    className="input-pc"
                  />
                </div>
              </div>
              <div>
                <div className="field-label-pc">Comentario</div>
                <input
                  name="comentario"
                  value={form.comentario}
                  onChange={handleChange}
                  placeholder="Motivo del cambio (opcional)"
                  className="input-pc"
                />
              </div>
            </div>
          </div>

          {/* ── Sección 3: Producto que se queda ── */}
          <div className="section-card-pc fade-in" style={{ animationDelay: "0.12s" }}>
            <div className="section-title-pc entra">
              <FiBox size={13} />
              Producto que trae y se queda (suma al stock)
            </div>
            <div className="input-pc-wrapper">
              <ProductSelector
                productos={productosEntran}
                setProductos={setProductosEntran}
                existingProductos={productos}
              />
            </div>
          </div>

          {/* ── Sección 4: Producto que se lleva ── */}
          <div className="section-card-pc fade-in" style={{ animationDelay: "0.16s" }}>
            <div className="section-title-pc sale">
              <FiRepeat size={13} />
              Producto que se lleva a cambio (resta del stock)
            </div>
            <div className="input-pc-wrapper">
              <ProductSelector
                productos={productosSalen}
                setProductos={setProductosSalen}
                existingProductos={productos}
              />
            </div>
          </div>

          <div className="pt-2 fade-in" style={{ animationDelay: "0.20s" }}>
            <button type="submit" className="btn-submit-pc">
              Guardar Cambio de Producto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProductChange;