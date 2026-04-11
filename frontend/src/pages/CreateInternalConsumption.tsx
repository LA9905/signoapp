import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FiUser, FiBox, FiGrid, FiFileText, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
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

const areas = [
  "Administración",
  "Producción",
  "Extrusión",
  "Facturación",
  "Atención al Cliente",
  "Recursos Humanos",
  "Almacén",
  "Ventas",
  "Mantenimiento",
  "Impresión",
  "Despacho - Choferes",
  "Otros",
];

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

      if (window.confirm("¿Desea imprimir el registro?")) {
        if (consumptionId) {
          const pdfResp = await api.get(`/print-internal/${consumptionId}`, {
            params: { inline: "1", format: "pos80" },
            responseType: "blob",
          });
          const blob = new Blob([pdfResp.data], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const w = window.open(url, "_blank");
          if (w) {
            w.focus();
            setTimeout(() => {
              try {
                w.print();
              } catch (printErr) {
                console.warn("No se pudo lanzar print() automáticamente", printErr);
              }
            }, 500);
          } else {
            window.location.href = url;
          }
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
      }

      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      const axiosError = err as AxiosError;
      const apiMessage = (axiosError.response?.data as any)?.error || "Error al registrar consumo interno";
      setMensaje(apiMessage);
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

        .section-card-ic {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 20px;
        }

        .input-ic {
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
        .input-ic::placeholder { color: rgba(255,255,255,0.2); }
        .input-ic:focus {
          border-color: rgba(99,102,241,0.6);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
        }

        .select-ic {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.75);
          border-radius: 10px;
          transition: border-color .15s, box-shadow .15s;
          font-size: 14px;
          width: 100%;
          padding: 10px 14px;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          appearance: none;
          cursor: pointer;
        }
        .select-ic:focus {
          border-color: rgba(99,102,241,0.6);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
          color: white;
        }
        .select-ic option { background: #111827; color: white; }
        .select-ic option[value=""] { color: rgba(255,255,255,0.3); }

        .select-ic-wrapper {
          position: relative;
        }
        .select-ic-wrapper::after {
          content: '';
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 5px solid rgba(255,255,255,0.3);
          pointer-events: none;
        }

        .field-label-ic {
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

        .section-title-ic {
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
        .section-title-ic::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(99,102,241,0.15);
        }

        .btn-submit-ic {
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
        .btn-submit-ic:hover {
          box-shadow: 0 6px 28px rgba(99,102,241,0.5);
          transform: translateY(-1px);
        }
        .btn-submit-ic:active { transform: translateY(0); }

        .mensaje-success-ic {
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
        .mensaje-error-ic {
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

        .input-ic-wrapper input,
        .input-ic-wrapper select {
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
        .input-ic-wrapper input::placeholder,
        .input-ic-wrapper select::placeholder { color: rgba(255,255,255,0.2) !important; }
        .input-ic-wrapper input:focus,
        .input-ic-wrapper select:focus {
          border-color: rgba(99,102,241,0.6) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.08) !important;
        }
        .input-ic-wrapper select option { background: #111827 !important; color: white !important; }
      `}</style>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Back */}
        <div className="mb-8">
          <ArrowBackButton />
        </div>

        {/* Header */}
        <div className="mb-8 fade-in">
          <h1 className="font-display text-3xl font-bold tracking-tight mb-1">
            Consumo Interno
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            Registra el retiro de productos para uso interno
          </p>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={isError ? "mensaje-error-ic fade-in" : "mensaje-success-ic fade-in"}>
            <span style={{ flexShrink: 0, display: "flex" }}>
              {isError ? <FiAlertCircle size={15} /> : <FiCheckCircle size={15} />}
            </span>
            <span>{mensaje}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Sección 1: Retiro ── */}
          <div className="section-card-ic fade-in" style={{ animationDelay: "0.05s" }}>
            <div className="section-title-ic">
              <FiUser size={13} />
              Retiro
            </div>
            <div className="space-y-4">
              <div>
                <div className="field-label-ic">
                  <FiUser size={11} />
                  Nombre de quien retira <span style={{ color: "rgba(248,113,113,0.8)" }}>*</span>
                </div>
                <input
                  name="nombre_retira"
                  value={form.nombre_retira}
                  onChange={handleChange}
                  placeholder="Nombre completo"
                  className="input-ic"
                  required
                />
              </div>
              <div>
                <div className="field-label-ic">
                  <FiGrid size={11} />
                  Área <span style={{ color: "rgba(248,113,113,0.8)" }}>*</span>
                </div>
                <div className="select-ic-wrapper">
                  <select
                    name="area"
                    value={form.area}
                    onChange={handleChange}
                    className="select-ic"
                    required
                  >
                    <option value="">Seleccione área</option>
                    {areas.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ── Sección 2: Motivo ── */}
          <div className="section-card-ic fade-in" style={{ animationDelay: "0.10s" }}>
            <div className="section-title-ic">
              <FiFileText size={13} />
              Motivo
            </div>
            <div>
              <div className="field-label-ic">
                <FiFileText size={11} />
                Motivo del retiro <span style={{ color: "rgba(248,113,113,0.8)" }}>*</span>
              </div>
              <input
                name="motivo"
                value={form.motivo}
                onChange={handleChange}
                placeholder="Describe el motivo del retiro"
                className="input-ic"
                required
              />
            </div>
          </div>

          {/* ── Sección 3: Productos ── */}
          <div className="section-card-ic fade-in" style={{ animationDelay: "0.15s" }}>
            <div className="section-title-ic">
              <FiBox size={13} />
              Productos <span style={{ color: "rgba(248,113,113,0.8)" }}>*</span>
            </div>
            <div className="input-ic-wrapper">
              <ProductSelector
                productos={form.productos}
                setProductos={(prods: Producto[]) => setForm({ ...form, productos: prods })}
                existingProductos={productos}
              />
            </div>
          </div>

          {/* ── Botón submit ── */}
          <div className="pt-2 fade-in" style={{ animationDelay: "0.20s" }}>
            <button type="submit" className="btn-submit-ic">
              Guardar Consumo Interno
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateInternalConsumption;