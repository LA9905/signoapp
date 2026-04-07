import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import ArrowBackButton from "../components/ArrowBackButton";
import { api } from "../services/http";
import { Package, Tag, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  category: z.string().min(1, "Seleccione una categoría"),
  subject: z.string().optional(),
});

type ProductForm = z.infer<typeof schema>;

const categories = [
  "Bolsas de Basura Negras",
  "Bolsas Transparente Recuperada",
  "Bolsas Camisetas",
  "Bolsas Virgen Transparente",
  "Bolsas PEAD de Alta Densidad",
  "Bolsas Recuperada de Color",
  "Bolsas con Impresión",
  "Bolsas de Lavandería",
  "Bolsas de Polipropileno",
  "Bolsas de Cubierto",
  "Bolsas de Papel Kraft o Blancas",
  "Productos de limpieza, aseo, cocina y higiene",
  "Vasos plásticos",
  "Vasos de Poli-papel",
  "Vasos Espumados",
  "Vasos PET",
  "Tapas",
  "Envases Bowl de Alimento",
  "Porta-colaciones o envases Plumavit",
  "Film",
  "Prepicados",
  "Guantes",
  "Utensilios y platos",
  "Brochetas",
  "Pocillos de Degustación",
  "Gorros y Cofias",
  "Productos de Protección y seguridad",
  "Envases contenedores de aluminio",
  "Blondas redondas, rectangulares y capsulas",
  "Servilletas",
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
    if (import.meta.env.PROD) {
      console.log("AddProduct montado");
    }
  }, []);

  const onSubmit = async (data: ProductForm) => {
    setMessage("");
    setError("");
    try {
      const { subject, ...dataToSend } = data;
      const res = await api.post("/products", dataToSend);
      console.log("Respuesta del servidor:", res.data);
      setMessage("Producto agregado exitosamente");
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
    <div
      className="min-h-screen bg-[#080C14] text-white flex flex-col"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .ap-input {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: white;
          transition: all 0.2s ease;
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.75rem;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .ap-input::placeholder { color: rgba(255,255,255,0.2); }
        .ap-input:focus {
          background: rgba(255,255,255,0.06);
          border-color: rgba(59,130,246,0.5);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }
        .ap-input.has-error {
          border-color: rgba(239,68,68,0.5);
          box-shadow: 0 0 0 3px rgba(239,68,68,0.08);
        }

        .ap-select {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.7);
          transition: all 0.2s ease;
          width: 100%;
          padding: 0.75rem 2.5rem 0.75rem 2.75rem;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          outline: none;
          appearance: none;
          -webkit-appearance: none;
          cursor: pointer;
        }
        .ap-select:focus {
          background: rgba(255,255,255,0.06);
          border-color: rgba(59,130,246,0.5);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
          color: white;
        }
        .ap-select.has-error {
          border-color: rgba(239,68,68,0.5);
          box-shadow: 0 0 0 3px rgba(239,68,68,0.08);
        }
        .ap-select option { background: #111827; color: white; }

        .btn-submit {
          background: linear-gradient(135deg, #2563EB, #3B82F6);
          box-shadow: 0 4px 20px rgba(59,130,246,0.3);
          transition: all 0.2s ease;
          width: 100%;
          padding: 0.875rem;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .btn-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(59,130,246,0.45);
        }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.45s ease both; }
        .fade-up-1 { animation-delay: 0.05s; }
        .fade-up-2 { animation-delay: 0.12s; }
        .fade-up-3 { animation-delay: 0.19s; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>

      {/* Top bar */}
      <div className="mb-12">
        <ArrowBackButton />
      </div>

      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-[100px]" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-10 relative">
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="text-center mb-8 fade-up">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
              style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <Package size={26} className="text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
              Nuevo producto
            </h1>
            <p className="text-sm text-white/40">Completa los datos para agregar al catálogo</p>
          </div>

          {/* Card */}
          <div
            className="rounded-2xl p-7"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Alerts */}
            {error && (
              <div
                className="mb-5 rounded-xl px-4 py-3 text-sm text-red-300 flex items-center gap-2.5"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <AlertCircle size={16} className="shrink-0 text-red-400" />
                {error}
              </div>
            )}
            {message && (
              <div
                className="mb-5 rounded-xl px-4 py-3 text-sm text-emerald-300 flex items-center gap-2.5"
                style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}
              >
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* Nombre */}
              <div className="fade-up fade-up-1">
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Nombre del producto
                </label>
                <div className="relative">
                  <Package size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                  <input
                    {...register("name")}
                    placeholder="Ej: Bolsa 50x70"
                    className={`ap-input ${errors.name ? "has-error" : ""}`}
                    autoComplete="off"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.name.message}
                  </p>
                )}
              </div>

              {/* Categoría */}
              <div className="fade-up fade-up-2">
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Categoría
                </label>
                <div className="relative">
                  <Tag size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none z-10" />
                  <select
                    {...register("category")}
                    className={`ap-select ${errors.category ? "has-error" : ""}`}
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                </div>
                {errors.category && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.category.message}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-white/5" />

              {/* Submit */}
              <div className="fade-up fade-up-3">
                <button type="submit" disabled={isSubmitting} className="btn-submit">
                  {isSubmitting ? (
                    <>
                      <svg className="spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Package size={16} />
                      Agregar producto
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer hint */}
          <p className="text-center text-xs text-white/20 mt-5">
            El producto quedará disponible en el inventario inmediatamente.
          </p>
        </div>
      </div>
    </div>
  );
}