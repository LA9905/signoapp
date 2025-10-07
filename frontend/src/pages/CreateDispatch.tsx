import { useEffect, useState, type ChangeEvent, type FormEvent, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  productos: Producto[];
}

interface DispatchPayload {
  orden: string;
  cliente: string;
  chofer: string;
  paquete_numero?: string;
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
    numero_paquete: "",
    productos: [],
  });
  const [mensaje, setMensaje] = useState<string>("");
  const [images, setImages] = useState<File[]>([]);
  const [showCamera, setShowCamera] = useState(false);
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
    if (name === "numero_paquete") {
      setForm({ ...form, numero_paquete: value || undefined });
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

    try {
      const checkResp = await api.get("/dispatches", { params: { order: form.orden } });
      const dispatchData: DispatchPayload = {
        orden: form.orden,
        cliente: form.cliente,
        chofer: form.chofer,
        paquete_numero: form.numero_paquete,
        productos: form.productos.map((p) => ({
          nombre: p.name,
          cantidad: p.cantidad,
          unidad: p.unidad,
        })),
      };

      if (checkResp.data.length > 0) {
        if (!window.confirm("Ya existe un despacho con ese número de orden. ¿Desea continuar?")) {
          return;
        }
        dispatchData.force = true;
      }

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
      if (error.response?.status === 409 && error.response?.data?.error === "duplicate_order") {
        setMensaje(error.response.data?.msg || "Ya existe un despacho");
      } else {
        setMensaje("Error al crear despacho");
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-12">
        <ArrowBackButton />
      </div>
      <h2 className="text-xl font-bold mb-4">Crear Despacho</h2>
      {mensaje && <p className="mb-4 text-green-600">{mensaje}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="orden"
          value={form.orden}
          onChange={handleChange}
          placeholder="Número de orden de compra"
          className="w-full border p-2 rounded"
          required
        />

        <input
          type="text"
          name="numero_paquete"
          value={form.numero_paquete ?? ""}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          placeholder="Número de paquete (ej. 1/4)"
        />

        <ClientSelector
          value={form.cliente}
          onChange={(cliente: string) => setForm({ ...form, cliente })}
        />

        <DriverSelector
          value={form.chofer}
          onChange={(id: string) => setForm({ ...form, chofer: id })}
        />

        <ProductSelector
          productos={form.productos}
          setProductos={(prods: Producto[]) => setForm({ ...form, productos: prods })}
          existingProductos={productos}
        />

        <div className="border p-4 rounded">
          <h3 className="font-bold mb-2">Imágenes (opcional, múltiples)</h3>
          <input type="file" multiple accept="image/*" onChange={handleFileChange} className="mb-2" />
          <button type="button" onClick={() => setShowCamera(!showCamera)} className="bg-green-500 text-white px-4 py-2 rounded mb-2">
            {showCamera ? "Cerrar Cámara" : "Tomar Foto"}
          </button>
          {showCamera && (
            <div>
              <Webcam 
                audio={false} 
                screenshotFormat="image/jpeg" 
                ref={webcamRef} 
                videoConstraints={{ facingMode: "environment" }}  // Fuerza cámara trasera
              />
              <button type="button" onClick={capturePhoto} className="bg-blue-500 text-white px-4 py-2 rounded">
                Capturar
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {images.map((img, idx) => (
              <div key={idx}>
                <img src={URL.createObjectURL(img)} alt="preview" className="w-20 h-20 object-cover" />
                <button type="button" onClick={() => removeImage(idx)} className="text-red-500">Eliminar</button>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          Guardar Despacho
        </button>
      </form>
    </div>
  );
};

export default CreateDispatch;