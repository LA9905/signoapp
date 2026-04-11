import { useEffect, useState, type ChangeEvent, type FormEvent, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiCamera, FiUpload, FiPackage, FiFileText, FiUser, FiTruck, FiBox, FiTrash2 } from "react-icons/fi";
import ProductSelector from "../components/ProductSelector.tsx";
import ClientSelector from "../components/ClientSelector.tsx";
import DriverSelector from "../components/DriverSelector.tsx";
import ArrowBackButton from "../components/ArrowBackButton";
import Webcam from "react-webcam";
import { api } from "../services/http";
import type { AxiosError } from "axios";

interface Producto {
  id: string;
  name: string;
  cantidad: number;
  unidad: string;
  category?: string;
}
interface FormularioDespacho {
  orden: string;
  chofer: string;
  cliente: string;
  numero_paquete?: string;
  numero_factura?: string;
  productos: Producto[];
}
interface DispatchPayload {
  orden: string;
  cliente: string;
  chofer: string;
  paquete_numero?: string;
  factura_numero?: string;
  productos: { nombre: string; cantidad: number; unidad: string }[];
  force?: boolean;
}
interface ApiError {
  error?: string;
  msg?: string;
}

const CreateDispatch = () => {
  const navigate = useNavigate();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [form, setForm] = useState<FormularioDespacho>({
    orden: "",
    chofer: "",
    cliente: "",
    numero_paquete: undefined,
    numero_factura: undefined,
    productos: [],
  });
  const [mensaje, setMensaje] = useState<string>("");
  const [images, setImages] = useState<File[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);

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
              usage: p.usage,
            }))
          );
        } else {
          setProductos([]);
        }
      })
      .catch(() => setProductos([]));
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "numero_paquete" || name === "numero_factura") {
      setForm({ ...form, [name]: value || undefined });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from<File>(e.target.files);
      setImages((prev) => [...prev, ...files]);
    }
  };

  const capturePhoto = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      fetch(imageSrc)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
          setImages((prev) => [...prev, file]);
          setShowCamera(false);
        });
    }
  };

  const removeImage = (idx: number) => {
    setImages(images.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.orden || !form.cliente || !form.chofer || form.productos.length === 0) {
      setMensaje("Todos los campos requeridos");
      return;
    }

    const dispatchData: DispatchPayload = {
      orden: form.orden,
      cliente: form.cliente,
      chofer: form.chofer,
      paquete_numero: form.numero_paquete,
      factura_numero: form.numero_factura,
      productos: form.productos.map((p) => ({
        nombre: p.name,
        cantidad: p.cantidad,
        unidad: p.unidad,
      })),
    };

    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify(dispatchData));
      images.forEach((img) => formData.append('images', img));
      const newProducts = form.productos.filter((p) => !productos.some((ep) => ep.id === p.id));
      for (const product of newProducts) {
        try {
          await api.post("/products", { name: product.name, category: product.category || "Otros" });
        } catch (err: unknown) {
          const error = err as AxiosError<ApiError>;
          const msg = error.response?.data?.error || error.response?.data?.msg || "Error al crear producto";
          if (msg.toLowerCase().includes("ya existe un producto")) {
            setMensaje(`El producto "${product.name}" ya existe.`);
            return;
          }
          setMensaje(msg);
          return;
        }
      }

      const createResp = await api.post("/dispatches", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const dispatchId: number = createResp.data?.id;
      setMensaje("Despacho creado correctamente");
      if (dispatchId) {
        const pdfResp = await api.get(`/print/${dispatchId}`, {
          params: { inline: "1", format: "pos80" },
          responseType: "blob",
        });
        const blob = new Blob([pdfResp.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiError>;
      console.log("Error response:", error.response?.data);
      const errCode = error.response?.data?.error;
      const errMsg = error.response?.data?.msg || "";
      if (error.response?.status === 409 && (errCode === "duplicate_order" || errCode === "duplicate_invoice" || errCode === "duplicate_both")) {
        if (window.confirm(errMsg)) {
          try {
            const formData = new FormData();
            formData.append('data', JSON.stringify({ ...dispatchData, force: true }));
            images.forEach((img) => formData.append('images', img));
            const createResp = await api.post("/dispatches", formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            const dispatchId: number = createResp.data?.id;
            setMensaje("Despacho creado correctamente");
            if (dispatchId) {
              const pdfResp = await api.get(`/print/${dispatchId}`, {
                params: { inline: "1", format: "pos80" },
                responseType: "blob",
              });
              const blob = new Blob([pdfResp.data], { type: "application/pdf" });
              const url = URL.createObjectURL(blob);
              window.open(url, "_blank");
            }
            setTimeout(() => navigate("/dashboard"), 2000);
          } catch {
            setMensaje("Error al crear despacho");
          }
        }
      } else {
        setMensaje("Error al crear despacho");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#080C14] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .font-display { font-family: 'Syne', sans-serif; }

        .glass-card {
          background: rgba(30,40,80,0.35);
          border: 1px solid rgba(99,102,241,0.18);
          border-radius: 20px;
        }

        .section-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 20px;
        }

        .input-cd {
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
        .input-cd::placeholder { color: rgba(255,255,255,0.2); }
        .input-cd:focus {
          border-color: rgba(99,102,241,0.6);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
        }

        .field-label-cd {
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
        .field-label-cd svg { opacity: 0.6; }

        .section-title-cd {
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
        .section-title-cd::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(99,102,241,0.15);
        }

        .btn-submit-cd {
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
        .btn-submit-cd:hover {
          box-shadow: 0 6px 28px rgba(99,102,241,0.5);
          transform: translateY(-1px);
        }
        .btn-submit-cd:active { transform: translateY(0); }

        .btn-camera-cd {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 16px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 500;
          background: rgba(52,211,153,0.08);
          border: 1px solid rgba(52,211,153,0.2);
          color: #6EE7B7;
          cursor: pointer;
          transition: all .15s;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-camera-cd:hover { background: rgba(52,211,153,0.14); border-color: rgba(52,211,153,0.35); }

        .btn-upload-cd {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 16px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 500;
          background: rgba(99,102,241,0.08);
          border: 1px solid rgba(99,102,241,0.2);
          color: #A5B4FC;
          cursor: pointer;
          transition: all .15s;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-upload-cd:hover { background: rgba(99,102,241,0.14); border-color: rgba(99,102,241,0.35); }

        .btn-capture-cd {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 16px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 500;
          background: rgba(59,130,246,0.1);
          border: 1px solid rgba(59,130,246,0.2);
          color: #93C5FD;
          cursor: pointer;
          transition: all .15s;
          font-family: 'DM Sans', sans-serif;
          margin-top: 10px;
        }
        .btn-capture-cd:hover { background: rgba(59,130,246,0.18); }

        .img-thumb-cd {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          transition: border-color .15s, transform .15s;
          display: block;
        }
        .img-thumb-cd:hover {
          border-color: rgba(99,102,241,0.5);
          transform: scale(1.04);
        }

        .btn-del-img-cd {
          font-size: 11px;
          color: #F87171;
          background: none;
          border: none;
          cursor: pointer;
          padding: 3px 0 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          transition: color .15s;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-del-img-cd:hover { color: #FCA5A5; }

        .mensaje-success {
          background: rgba(52,211,153,0.08);
          border: 1px solid rgba(52,211,153,0.18);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          color: #6EE7B7;
          margin-bottom: 20px;
        }
        .mensaje-error {
          background: rgba(248,113,113,0.08);
          border: 1px solid rgba(248,113,113,0.18);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          color: #F87171;
          margin-bottom: 20px;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fade-in .3s ease both; }

        /* Override child component styles to inherit the dark theme */
        .input-cd-wrapper input,
        .input-cd-wrapper select {
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
        .input-cd-wrapper input::placeholder,
        .input-cd-wrapper select::placeholder { color: rgba(255,255,255,0.2) !important; }
        .input-cd-wrapper input:focus,
        .input-cd-wrapper select:focus {
          border-color: rgba(99,102,241,0.6) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.08) !important;
        }
        .input-cd-wrapper select option { background: #111827 !important; color: white !important; }
      `}</style>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Back */}
        <div className="mb-8">
          <ArrowBackButton />
        </div>

        {/* Header */}
        <div className="mb-8 fade-in">
          <h1 className="font-display text-3xl font-bold tracking-tight mb-1">
            Crear Despacho
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            Completa los datos para registrar un nuevo despacho
          </p>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={mensaje.toLowerCase().includes("error") || mensaje.toLowerCase().includes("requerido") || mensaje.toLowerCase().includes("existe") ? "mensaje-error fade-in" : "mensaje-success fade-in"}>
            {mensaje}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Sección 1: Identificación ── */}
          <div className="section-card fade-in" style={{ animationDelay: "0.05s" }}>
            <div className="section-title-cd">
              <FiFileText size={13} />
              Identificación
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="field-label-cd">
                  <FiFileText size={11} />
                  Orden de compra <span style={{ color: "rgba(248,113,113,0.8)" }}>*</span>
                </div>
                <input
                  name="orden"
                  value={form.orden}
                  onChange={handleChange}
                  placeholder="Ej: OC-2024-001"
                  className="input-cd"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="field-label-cd">
                    <FiPackage size={11} />
                    N° Paquete
                  </div>
                  <input
                    type="text"
                    name="numero_paquete"
                    value={form.numero_paquete ?? ""}
                    onChange={handleChange}
                    className="input-cd"
                    placeholder="Ej: 1/4"
                  />
                </div>
                <div>
                  <div className="field-label-cd">
                    <FiFileText size={11} />
                    N° Factura
                  </div>
                  <input
                    type="text"
                    name="numero_factura"
                    value={form.numero_factura ?? ""}
                    onChange={handleChange}
                    className="input-cd"
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Sección 2: Destino ── */}
          <div className="section-card fade-in" style={{ animationDelay: "0.10s" }}>
            <div className="section-title-cd">
              <FiUser size={13} />
              Destino
            </div>
            <div className="space-y-4">
              <div>
                <div className="field-label-cd">
                  <FiUser size={11} />
                  Centro de Costo <span style={{ color: "rgba(248,113,113,0.8)" }}>*</span>
                </div>
                <div className="input-cd-wrapper">
                  <ClientSelector
                    value={form.cliente}
                    onChange={(cliente: string) => setForm({ ...form, cliente })}
                  />
                </div>
              </div>

              <div>
                <div className="field-label-cd">
                  <FiTruck size={11} />
                  Chofer <span style={{ color: "rgba(248,113,113,0.8)" }}>*</span>
                </div>
                <div className="input-cd-wrapper">
                  <DriverSelector
                    value={form.chofer}
                    onChange={(id: string) => setForm({ ...form, chofer: id })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Sección 3: Productos ── */}
          <div className="section-card fade-in" style={{ animationDelay: "0.15s" }}>
            <div className="section-title-cd">
              <FiBox size={13} />
              Productos <span style={{ color: "rgba(248,113,113,0.8)" }}>*</span>
            </div>
            <div className="input-cd-wrapper">
              <ProductSelector
                productos={form.productos}
                setProductos={(prods: Producto[]) => setForm({ ...form, productos: prods })}
                existingProductos={productos}
              />
            </div>
          </div>

          {/* ── Sección 4: Imágenes ── */}
          <div className="section-card fade-in" style={{ animationDelay: "0.20s" }}>
            <div className="section-title-cd">
              <FiCamera size={13} />
              Imágenes
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textTransform: "none", letterSpacing: "normal", fontWeight: 400 }}>
                opcional
              </span>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
              <label className="btn-upload-cd">
                <FiUpload size={13} />
                Subir imagen
                <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
              <button
                type="button"
                onClick={() => setShowCamera(!showCamera)}
                className="btn-camera-cd"
              >
                <FiCamera size={13} />
                {showCamera ? "Cerrar cámara" : "Tomar foto"}
              </button>
            </div>

            {showCamera && (
              <div className="mb-4">
                <Webcam
                  audio={false}
                  screenshotFormat="image/jpeg"
                  ref={webcamRef}
                  videoConstraints={{ facingMode: "environment" }}
                  style={{ borderRadius: "12px", width: "100%", maxWidth: "400px", display: "block" }}
                />
                <button type="button" onClick={capturePhoto} className="btn-capture-cd">
                  Capturar foto
                </button>
              </div>
            )}

            {images.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1.5">
                    <img
                      src={URL.createObjectURL(img)}
                      alt="preview"
                      className="img-thumb-cd"
                      onClick={() => setSelectedImage(URL.createObjectURL(img))}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="btn-del-img-cd"
                    >
                      <FiTrash2 size={10} />
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {images.length === 0 && !showCamera && (
              <div
                style={{
                  border: "1px dashed rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  padding: "24px",
                  textAlign: "center",
                  color: "rgba(255,255,255,0.2)",
                  fontSize: "13px",
                }}
              >
                Sin imágenes adjuntas
              </div>
            )}
          </div>

          {/* ── Botón submit ── */}
          <div className="pt-2 fade-in" style={{ animationDelay: "0.25s" }}>
            <button type="submit" className="btn-submit-cd">
              Guardar Despacho
            </button>
          </div>

        </form>
      </div>

      {/* Lightbox modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={selectedImage}
              alt="Imagen en grande"
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: "16px",
              }}
            />
            <button
              className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full text-white"
              style={{ background: "rgba(248,113,113,0.8)" }}
              onClick={() => setSelectedImage(null)}
            >
              <FiX size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateDispatch;