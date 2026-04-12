import { useEffect, useState, type FormEvent } from "react";
import { FiUser, FiBox, FiCheckCircle, FiAlertCircle, FiX } from "react-icons/fi";
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
      setForm({ ...form, productos: [] });
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setMensaje(err.response?.data?.error || "Error al registrar producción");
      } else {
        setMensaje("Error desconocido al registrar producción");
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

        .section-card-cp {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 20px;
        }

        .field-label-cp {
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

        .section-title-cp {
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
        .section-title-cp::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(99,102,241,0.15);
        }

        .btn-submit-cp {
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
        .btn-submit-cp:hover {
          box-shadow: 0 6px 28px rgba(99,102,241,0.5);
          transform: translateY(-1px);
        }
        .btn-submit-cp:active { transform: translateY(0); }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fade-in .3s ease both; }

        .input-cp-wrapper input,
        .input-cp-wrapper select {
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
        .input-cp-wrapper input::placeholder,
        .input-cp-wrapper select::placeholder { color: rgba(255,255,255,0.2) !important; }
        .input-cp-wrapper input:focus,
        .input-cp-wrapper select:focus {
          border-color: rgba(99,102,241,0.6) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.08) !important;
        }
        .input-cp-wrapper select option { background: #111827 !important; color: white !important; }

        /* ===== MODAL DE ERROR CENTRADO ===== */
        .error-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .error-modal {
          background: rgba(15, 23, 42, 0.98);
          border: 1px solid rgba(248, 113, 113, 0.3);
          border-radius: 16px;
          padding: 24px 28px;
          max-width: 420px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
          animation: modal-pop .3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes modal-pop {
          from {
            opacity: 0;
            transform: scale(0.85) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .error-modal-content {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .error-modal-icon {
          flex-shrink: 0;
          color: #F87171;
          margin-top: 2px;
        }

        .error-modal-text {
          flex: 1;
          font-size: 15px;
          line-height: 1.5;
          color: #FEE2E2;
          word-break: break-word;
        }

        .error-modal-close {
          margin-top: 4px;
          color: rgba(255,255,255,0.6);
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          border-radius: 6px;
          transition: all .15s;
        }

        .error-modal-close:hover {
          color: white;
          background: rgba(255,255,255,0.1);
        }
      `}</style>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Back */}
        <div className="mb-8">
          <ArrowBackButton />
        </div>

        {/* Header */}
        <div className="mb-8 fade-in">
          <h1 className="font-display text-3xl font-bold tracking-tight mb-1">
            Ingreso de Producción Diaria
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            Registra los productos producidos en el día
          </p>
        </div>

        {/* Modal de Error */}
        {mensaje && (
          <div className="error-modal-overlay" onClick={() => setMensaje("")}>
            <div 
              className="error-modal" 
              onClick={e => e.stopPropagation()}
            >
              <div className="error-modal-content">
                <div className="error-modal-icon">
                  {isError ? <FiAlertCircle size={26} /> : <FiCheckCircle size={26} />}
                </div>
                <div className="error-modal-text">
                  {mensaje}
                </div>
                <button 
                  className="error-modal-close" 
                  onClick={() => setMensaje("")}
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Sección 1: Operario ── */}
          <div className="section-card-cp fade-in" style={{ animationDelay: "0.05s" }}>
            <div className="section-title-cp">
              <FiUser size={13} />
              Operario
            </div>
            <div>
              <div className="field-label-cp">
                <FiUser size={11} />
                Operario <span style={{ color: "rgba(248,113,113,0.8)" }}>*</span>
              </div>
              <div className="input-cp-wrapper">
                <OperatorSelector
                  value={form.operator}
                  onChange={(operator: string) => setForm({ ...form, operator })}
                />
              </div>
            </div>
          </div>

          {/* ── Sección 2: Productos ── */}
          <div className="section-card-cp fade-in" style={{ animationDelay: "0.10s" }}>
            <div className="section-title-cp">
              <FiBox size={13} />
              Productos <span style={{ color: "rgba(248,113,113,0.8)" }}>*</span>
            </div>
            <div className="input-cp-wrapper">
              <ProductSelector
                productos={form.productos}
                setProductos={(prods: Producto[]) => setForm({ ...form, productos: prods })}
                existingProductos={productos}
              />
            </div>
          </div>

          {/* ── Botón submit ── */}
          <div className="pt-2 fade-in" style={{ animationDelay: "0.15s" }}>
            <button type="submit" className="btn-submit-cp">
              Guardar Producción
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateProduction;