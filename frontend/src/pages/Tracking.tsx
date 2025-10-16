import { useEffect, useRef, useState, useCallback, type ChangeEvent } from "react";
import type { AxiosError } from "axios";
import { FiEdit2, FiTrash2, FiSave, FiX, FiPlus, FiMinus } from "react-icons/fi";
import ClientSelector from "../components/ClientSelector";
import DriverSelector from "../components/DriverSelector";
import { useDrivers } from "../context/DriversContext";
import ArrowBackButton from "../components/ArrowBackButton";
import Webcam from "react-webcam";
import { api } from "../services/http";
import * as XLSX from "xlsx";  //para generar Excel

interface DispatchSummary {
  id: number;
  orden: string;
  cliente: string;
  chofer: string;
  created_by: string;
  fecha: string;
  status: string;
  delivered_driver: boolean;
  delivered_client: boolean;
  productos: { nombre: string; cantidad: number; unidad: string }[];
  paquete_numero?: number;
  factura_numero?: string;
  images?: { id: number; image_url: string; uploaded_at?: string }[];
}

interface Product {
  id: number;
  name: string;
  category: string;
  created_by: string;
  stock: number;
}

type ProductoRow = { nombre: string; cantidad: number; unidad: string };
type ApiError = { error?: string; details?: string };

type SearchState = {
  client: string;
  order: string;
  user: string;
  driver: string;
  date: string;
  invoice: string;
  date_from: string;
  date_to: string;
};

const btnIcon = "rounded-full p-2 bg-white/10 text-white border border-white/50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900";

const Tracking = () => {
  const [dispatches, setDispatches] = useState<DispatchSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [mensaje, setMensaje] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{
    orden: string;
    cliente: string;
    chofer: string;
    status: string;
    productos: ProductoRow[];
    factura_numero?: string;
  } | null>(null);

  const [productNames, setProductNames] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Record<number, string[]>>({});

  const { drivers } = useDrivers();
  const observer = useRef<IntersectionObserver | null>(null);
  const lastDispatchRef = useRef<HTMLDivElement | null>(null);

  const [searchState, setSearchState] = useState<SearchState>({
    client: "",
    order: "",
    user: "",
    driver: "",
    date: "",
    invoice: "",
    date_from: "",
    date_to: "",
  });

  const [debouncedSearch, setDebouncedSearch] = useState<SearchState>(searchState);

  const searchStateRef = useRef<SearchState>(searchState);
  useEffect(() => {
    searchStateRef.current = searchState;
  }, [searchState]);

  const fetchControllerRef = useRef<AbortController | null>(null);

  const [existingImages, setExistingImages] = useState<{ id: number; image_url: string }[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [deleteImageIds, setDeleteImageIds] = useState<number[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  const [scrollToId, setScrollToId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      const res = await api.get<Product[]>("/products");
      setProductNames(res.data.map((p) => p.name));
    } catch (err) {
      console.error("Error fetching products:", err);
      setMensaje("Error al cargar lista de productos");
    }
  };

  const fetchDispatches = useCallback(
    async (params: SearchState, pageNum: number, append: boolean = false, signal?: AbortSignal) => {
      let scrollPosition = 0;
      if (!append) {
        scrollPosition = window.pageYOffset;
        if (fetchControllerRef.current) {
          fetchControllerRef.current.abort();
        }
        if (!signal) {
          const c = new AbortController();
          fetchControllerRef.current = c;
          signal = c.signal;
        } else {
          fetchControllerRef.current = null;
        }
      }

      setIsLoading(true);
      try {
        const response = await api.get<DispatchSummary[]>("/dispatches", {
          params: { ...params, page: pageNum, limit: 10 },
          headers: { "Cache-Control": "no-cache" },
          signal,
        });
        const newDispatches = response.data;
        setDispatches((prev) => (append ? [...prev, ...newDispatches] : newDispatches));
        setHasMore(newDispatches.length === 10);
        setMensaje("");
      } catch (err: any) {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || err?.name === "AbortError") return;
        console.error("Error fetching dispatches:", err);
        setMensaje("Error al cargar despachos");
      } finally {
        setIsLoading(false);
        if (!append) {
          window.scrollTo(0, scrollPosition);
        }
      }
    },
    []
  );

  useEffect(() => {
    fetchProducts();
    setDebouncedSearch(searchState);

    const onFocus = () => {
      fetchProducts();
      setDebouncedSearch(searchStateRef.current);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    if (isLoading || !hasMore) return;

    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (lastDispatchRef.current) {
      observer.current.observe(lastDispatchRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [isLoading, hasMore]);

  useEffect(() => {
    if (page > 1) {
      fetchDispatches(debouncedSearch, page, true);
    }
  }, [page, debouncedSearch, fetchDispatches]);

  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(searchState);
    }, 300);
    return () => clearTimeout(id);
  }, [searchState]);

  useEffect(() => {
    fetchDispatches(debouncedSearch, 1, false);
    return () => {
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
    };
  }, [debouncedSearch, fetchDispatches]);

  useEffect(() => {
    if (scrollToId !== null) {
      const element = document.getElementById(`dispatch-${scrollToId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      setScrollToId(null);
    }
  }, [scrollToId]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSearchState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    (async () => {
      const controller = new AbortController();
      fetchControllerRef.current = controller;
      setIsLoading(true);
      try {
        const response = await api.get<DispatchSummary[]>("/dispatches", {
          params: { ...searchState, page: 1, limit: 10 },
          headers: { "Cache-Control": "no-cache" },
          signal: controller.signal,
        });
        setDispatches(response.data);
        setHasMore(response.data.length === 10);
        setMensaje("");
        setPage(1);
        setDebouncedSearch(searchState);
      } catch (err: any) {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || err?.name === "AbortError") return;
        setMensaje("Error al cargar despachos");
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const startEditRow = (d: DispatchSummary) => {
    const choferId = drivers.find((x) => x.name === d.chofer)?.id;
    setEditingId(d.id);
    setDraft({
      orden: d.orden,
      cliente: d.cliente,
      chofer: choferId ? String(choferId) : "",
      status: d.status || "pendiente",
      productos: d.productos.map((p) => ({ ...p })),
      factura_numero: d.factura_numero || "",
    });
    setExistingImages(d.images || []);
    setNewImages([]);
    setDeleteImageIds([]);
    setScrollToId(d.id);
  };

  const cancelEditRow = () => {
    const currentId = editingId;
    setEditingId(null);
    setDraft(null);
    setSuggestions({});
    setExistingImages([]);
    setNewImages([]);
    setDeleteImageIds([]);
    setShowCamera(false);
    if (currentId !== null) {
      setScrollToId(currentId);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from<File>(e.target.files);
      setNewImages((prev) => [...prev, ...files]);
      if (editingId !== null) {
        setScrollToId(editingId);
      }
    }
  };

  const capturePhoto = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      fetch(imageSrc)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
          setNewImages((prev) => [...prev, file]);
          setShowCamera(false);
          if (editingId !== null) {
            setScrollToId(editingId);
          }
        });
    }
  };

  const removeExistingImage = (id: number) => {
    setExistingImages(existingImages.filter((img) => img.id !== id));
    setDeleteImageIds([...deleteImageIds, id]);
  };

  const removeNewImage = (idx: number) => {
    setNewImages(newImages.filter((_, i) => i !== idx));
  };

  const saveRow = async (id: number) => {
    if (!draft) return;
    setIsLoading(true);
    try {
      const payload = {
        orden: draft.orden,
        cliente: draft.cliente,
        chofer: draft.chofer,
        status: draft.status,
        factura_numero: draft.factura_numero,
        productos: draft.productos.map((p) => ({
          nombre: p.nombre,
          cantidad: p.cantidad,
          unidad: p.unidad,
        })),
        delete_image_ids: deleteImageIds,
      };

      const formData = new FormData();
      formData.append('data', JSON.stringify(payload));
      newImages.forEach((img) => formData.append('new_images', img));

      const resp = await api.put<DispatchSummary>(`/dispatches/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const updated = resp.data;
      setDispatches((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
      setMensaje("Despacho actualizado.");
      cancelEditRow();
      setScrollToId(id);
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      alert(error.response?.data?.error || "No se pudo actualizar");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRow = async (id: number) => {
    if (!window.confirm("¿Eliminar este despacho? Esta acción es permanente.")) return;
    setIsLoading(true);
    try {
      await api.delete(`/dispatches/${id}`);
      setDispatches((prev) => prev.filter((d) => d.id !== id));
      if (editingId === id) cancelEditRow();
      setMensaje("Despacho eliminado");
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      alert(error.response?.data?.error || "No se pudo eliminar");
    } finally {
      setIsLoading(false);
    }
  };

  const markToDriver = async (id: number) => {
    setIsLoading(true);
    try {
      const resp = await api.post<DispatchSummary>(`/dispatches/${id}/mark-driver`, {});
      const updated = resp.data;
      setDispatches((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
      setMensaje("Despacho marcado como 'Entregado a Chofer'.");
    } catch (err) {
      setMensaje("No se pudo marcar 'Entregado a Chofer'.");
    } finally {
      setIsLoading(false);
    }
  };

  const markToClient = async (id: number) => {
    setIsLoading(true);
    try {
      const resp = await api.post<DispatchSummary>(`/dispatches/${id}/mark-client`, {});
      const updated = resp.data;
      setDispatches((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
      setMensaje("Despacho marcado como 'Pedido Entregado'.");
    } catch (err) {
      setMensaje("No se pudo marcar 'Pedido Entregado'.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPDF = async (id: number) => {
    try {
      const resp = await api.get(`/print/${id}`, {
        responseType: "blob",
        params: { format: "pos80" },
      });
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `despacho_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMensaje("No se pudo descargar el PDF");
    }
  };

  const printPDF = async (id: number) => {
    try {
      const resp = await api.get(`/print/${id}`, {
        responseType: "blob",
        params: { inline: "1", format: "pos80" },
      });
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      w?.addEventListener("load", () => {
        try {
          w.focus();
          w.print();
        } catch {}
      });
    } catch (err) {
      setMensaje("No se pudo abrir el PDF para imprimir");
    }
  };

  const addRow = () => {
    if (!draft) return;
    setDraft({
      ...draft,
      productos: [...draft.productos, { nombre: "", cantidad: 0, unidad: "unidades" }],
    });
  };

  const removeRow = (idx: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      productos: draft.productos.filter((_, i) => i !== idx),
    });
    setSuggestions((prev) => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });
  };

  const updateRow = (idx: number, patch: Partial<ProductoRow>) => {
    if (!draft) return;
    setDraft({
      ...draft,
      productos: draft.productos.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    });
  };

  const DownloadIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );

  const PrinterIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 9V2h12v7" />
      <path d="M6 18h12v4H6z" />
      <path d="M6 14H5a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3h-1" />
    </svg>
  );

  const humanStatus = (s: string) => {
    if (s === "entregado_chofer") return "Entregado a Chofer";
    if (s === "entregado_cliente") return "Pedido Entregado";
    return s;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-12">
        <ArrowBackButton />
      </div>
      <h2 className="text-xl font-bold mb-4">Seguimiento de Despachos</h2>
      {mensaje && <p className="mb-4 text-emerald-400">{mensaje}</p>}

      <form onSubmit={handleSearchSubmit} className="space-y-4 mb-6">
        <input
          name="client"
          value={searchState.client}
          onChange={handleSearchChange}
          placeholder="Buscar por nombre del centro de costo"
          className="w-full border p-2 rounded"
        />
        <input
          name="order"
          value={searchState.order}
          onChange={handleSearchChange}
          placeholder="Buscar por número de orden"
          className="w-full border p-2 rounded"
        />
        <input
          name="invoice"
          value={searchState.invoice}
          onChange={handleSearchChange}
          placeholder="Buscar por número de factura"
          className="w-full border p-2 rounded"
        />
        <input
          name="user"
          value={searchState.user}
          onChange={handleSearchChange}
          placeholder="Buscar por usuario que creó"
          className="w-full border p-2 rounded"
        />
        <input
          name="driver"
          value={searchState.driver}
          onChange={handleSearchChange}
          placeholder="Buscar por nombre del chofer"
          className="w-full border p-2 rounded"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Desde</label>
            <input
              name="date_from"
              type="date"
              value={searchState.date_from}
              onChange={handleSearchChange}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Hasta</label>
            <input
              name="date_to"
              type="date"
              value={searchState.date_to}
              onChange={handleSearchChange}
              className="w-full border p-2 rounded"
            />
          </div>
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400"
          disabled={isLoading}
        >
          Buscar
        </button>
      </form>

      {/* Botón de descarga de busqueda filtrada*/}
      {dispatches.length > 0 && (
        <div className="flex justify-end mb-4">
          <button
            className="flex items-center gap-2 px-3 py-2 rounded text-white bg-emerald-600 hover:bg-emerald-700"
            title="Descargar Excel de despachos filtrados"
            aria-label="Descargar Excel"
            onClick={async () => {
              try {
                const res = await api.get<DispatchSummary[]>("/dispatches", {
                  params: { ...debouncedSearch, all: 1 },
                });
                const fullDispatches = res.data;

                // Calcular totales por producto (agrupado por nombre, sumando cantidades)
                const totals: Record<string, number> = {};
                fullDispatches.forEach((d) => {
                  d.productos.forEach((p) => {
                    totals[p.nombre] = (totals[p.nombre] || 0) + p.cantidad;
                  });
                });

                // Calcular conteos por chofer
                const driverCounts: Record<string, { total: number; entregados: number; pendientes: number }> = {};
                fullDispatches.forEach((d) => {
                  const chofer = d.chofer;
                  if (!driverCounts[chofer]) {
                    driverCounts[chofer] = { total: 0, entregados: 0, pendientes: 0 };
                  }
                  driverCounts[chofer].total++;
                  if (d.delivered_client) {
                    driverCounts[chofer].entregados++;
                  } else {
                    driverCounts[chofer].pendientes++;
                  }
                });

                // Datos de despachos con esquema consistente
                const data = fullDispatches.map((d) => ({
                  "Orden de Compra": d.orden,
                  "Número de Factura": d.factura_numero || "",
                  "Centro de Costo": d.cliente,
                  "Chofer": d.chofer,
                  "Usuario que Despachó": d.created_by,
                  "Fecha y Hora": new Date(d.fecha).toLocaleString(),
                  "Estado": humanStatus(d.status),
                  "Productos": d.productos.map((p) => `${p.nombre}: ${p.cantidad} ${p.unidad}`).join("; "),
                }));

                // Agregar fila vacía y luego totales por producto con todas las columnas
                data.push({
                  "Orden de Compra": "",
                  "Número de Factura": "",
                  "Centro de Costo": "",
                  "Chofer": "",
                  "Usuario que Despachó": "",
                  "Fecha y Hora": "",
                  "Estado": "",
                  "Productos": "",
                }); // Fila vacía para separar
                data.push({
                  "Orden de Compra": "Totales por producto",
                  "Número de Factura": "",
                  "Centro de Costo": "",
                  "Chofer": "",
                  "Usuario que Despachó": "",
                  "Fecha y Hora": "",
                  "Estado": "",
                  "Productos": "",
                }); // Encabezado de totales
                Object.entries(totals).forEach(([producto, total]) => {
                  data.push({
                    "Orden de Compra": producto,
                    "Número de Factura": "",
                    "Centro de Costo": "",
                    "Chofer": "",
                    "Usuario que Despachó": "",
                    "Fecha y Hora": "",
                    "Estado": "",
                    "Productos": `Total: ${total}`,
                  });
                });

                // Agregar fila vacía y luego conteos por chofer
                data.push({
                  "Orden de Compra": "",
                  "Número de Factura": "",
                  "Centro de Costo": "",
                  "Chofer": "",
                  "Usuario que Despachó": "",
                  "Fecha y Hora": "",
                  "Estado": "",
                  "Productos": "",
                }); // Fila vacía para separar
                data.push({
                  "Orden de Compra": "Conteo por Chofer",
                  "Número de Factura": "",
                  "Centro de Costo": "",
                  "Chofer": "",
                  "Usuario que Despachó": "",
                  "Fecha y Hora": "",
                  "Estado": "",
                  "Productos": "",
                }); // Encabezado de conteos por chofer
                Object.entries(driverCounts).forEach(([chofer, counts]) => {
                  data.push({
                    "Orden de Compra": chofer,
                    "Número de Factura": "",
                    "Centro de Costo": "",
                    "Chofer": "",
                    "Usuario que Despachó": "",
                    "Fecha y Hora": "",
                    "Estado": "",
                    "Productos": `Total despachos: ${counts.total}, Pedido Entregado: ${counts.entregados}, Pendientes: ${counts.pendientes}`,
                  });
                });

                // Crear hoja y libro
                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Despachos");

                // Descargar
                XLSX.writeFile(wb, "despachos_filtrados.xlsx");
              } catch (err) {
                console.error("Error al cargar datos completos:", err);
                alert("Error al cargar los datos completos para la exportación.");
              }
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 3v12" />
              <path d="M7 10l5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            <span className="text-xs font-medium">Descargar Excel</span>
          </button>
        </div>
      )}


      {isLoading && dispatches.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-400">Cargando despachos...</p>
        </div>
      ) : dispatches.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No se encontraron despachos.</p>
      ) : (
        <div className="space-y-4">
          {dispatches.map((d, index) => {
            const isDriverDone = d.delivered_driver || d.delivered_client;
            const isClientDone = d.delivered_client;
            const isEditingRow = editingId === d.id;
            const refProp = index === dispatches.length - 1 ? { ref: lastDispatchRef } : {};

            return (
              <div key={d.id} id={`dispatch-${d.id}`} className="border p-4 hover:bg-gray-900/20 rounded" {...refProp}>
                <div className="flex items-start justify-between gap-4">
                  {!isEditingRow ? (
                    <div>
                      <p><strong>Orden:</strong> {d.orden}</p>
                      {d.paquete_numero ? <p><strong>Paquete N°:</strong> {d.paquete_numero}</p> : null}
                      {d.factura_numero ? <p><strong>Factura N°:</strong> {d.factura_numero}</p> : null}
                      <p><strong>Centro de Costo:</strong> {d.cliente}</p>
                      <p><strong>Chofer:</strong> {d.chofer}</p>
                      <p><strong>Despachado por:</strong> {d.created_by}</p>
                      <p><strong>Fecha:</strong> {new Date(d.fecha).toLocaleString()}</p>
                      <p><strong>Estado:</strong> {humanStatus(d.status)}</p>
                    </div>
                  ) : (
                    <div className="w-full">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm mb-1">Orden</label>
                          <input
                            value={draft?.orden || ""}
                            onChange={(e) => setDraft((prev) => (prev ? { ...prev, orden: e.target.value } : prev))}
                            className="w-full border p-2 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Centro de Costo</label>
                          <ClientSelector
                            value={draft?.cliente || ""}
                            onChange={(cliente) => setDraft((prev) => (prev ? { ...prev, cliente } : prev))}
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Chofer</label>
                          <DriverSelector
                            value={draft?.chofer || ""}
                            onChange={(choferId) => setDraft((prev) => (prev ? { ...prev, chofer: choferId } : prev))}
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Estado</label>
                          <select
                            value={draft?.status || "pendiente"}
                            onChange={(e) => setDraft((prev) => (prev ? { ...prev, status: e.target.value } : prev))}
                            className="w-full border p-2 rounded"
                          >
                            <option value="pendiente">pendiente</option>
                            <option value="entregado_chofer">entregado_chofer</option>
                            <option value="entregado_cliente">entregado_cliente</option>
                            <option value="cancelado">cancelado</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm mb-1">N° Factura asociada</label>
                          <input
                            className="w-full border p-2 rounded"
                            value={draft?.factura_numero || ""}
                            onChange={(e) =>
                              setDraft((prev) => (prev ? { ...prev, factura_numero: e.target.value } : prev))
                            }
                            placeholder="Ej: 12345"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold">Productos</h4>
                          <button
                            className={`${btnIcon} hover:bg-blue-600`}
                            onClick={addRow}
                            title="Agregar producto"
                            aria-label="Agregar producto"
                          >
                            <FiPlus size={18} />
                          </button>
                        </div>
                        <div className="space-y-2">
                          {draft?.productos.map((row, idx) => (
                            <div key={idx} className="grid sm:grid-cols-12 gap-2 items-center">
                              <div className="relative sm:col-span-6">
                                <input
                                  className="border p-2 rounded w-full"
                                  placeholder="Nombre del producto"
                                  value={row.nombre}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    updateRow(idx, { nombre: value });
                                    if (value) {
                                      const filtered = productNames.filter((n) =>
                                        n.toLowerCase().includes(value.toLowerCase())
                                      );
                                      setSuggestions((prev) => ({ ...prev, [idx]: filtered }));
                                    } else {
                                      setSuggestions((prev) => ({ ...prev, [idx]: [] }));
                                    }
                                  }}
                                  onBlur={() => setSuggestions((prev) => ({ ...prev, [idx]: [] }))}
                                />
                                {suggestions[idx]?.length > 0 && (
                                  <ul className="absolute z-10 bg-neutral-800 border border-gray-600 rounded mt-1 w-full max-h-40 overflow-auto text-white">
                                    {suggestions[idx].map((sug, i) => (
                                      <li
                                        key={i}
                                        className="p-2 hover:bg-neutral-700 cursor-pointer"
                                        onMouseDown={() => {
                                          updateRow(idx, { nombre: sug });
                                          setSuggestions((prev) => ({ ...prev, [idx]: [] }));
                                        }}
                                      >
                                        {sug}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <input
                                type="number"
                                className="border p-2 rounded sm:col-span-2"
                                placeholder="Cantidad"
                                value={row.cantidad}
                                onChange={(e) => updateRow(idx, { cantidad: parseFloat(e.target.value) || 0 })}
                              />
                              <select
                                className="border p-2 rounded sm:col-span-3"
                                value={row.unidad}
                                onChange={(e) => updateRow(idx, { unidad: e.target.value })}
                              >
                                <option value="unidades">Unidades</option>
                                <option value="kg">Kilogramos</option>
                                <option value="lt">Litros</option>
                                <option value="cajas">Cajas</option>
                                <option value="PQT">Paquetes</option>
                              </select>
                              <div className="sm:col-span-1 flex justify-end">
                                <button
                                  className={`${btnIcon} hover:bg-red-600`}
                                  title="Quitar"
                                  aria-label="Quitar"
                                  onClick={() => removeRow(idx)}
                                >
                                  <FiMinus size={18} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4 border p-4 rounded">
                        <h4 className="font-bold mb-2">Imágenes</h4>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {existingImages.map((img) => (
                            <div key={img.id}>
                              <img 
                                src={img.image_url} 
                                alt="existing" 
                                className="w-20 h-20 object-cover cursor-pointer"  // Agrega cursor-pointer para indicar click
                                onClick={() => setSelectedImage(img.image_url)}  // Abre el modal con la imagen
                              />
                              <button onClick={() => removeExistingImage(img.id)} className="text-red-500">Eliminar</button>
                            </div>
                          ))}
                        </div>
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
                          {newImages.map((img, idx) => (
                            <div key={idx}>
                              <img 
                                src={URL.createObjectURL(img)} 
                                alt="new" 
                                className="w-20 h-20 object-cover cursor-pointer"  // Agrega cursor-pointer para indicar click
                                onClick={() => setSelectedImage(URL.createObjectURL(img))}  // Abre el modal con la imagen
                              />
                              <button onClick={() => removeNewImage(idx)} className="text-red-500">Eliminar</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="flex items-center gap-2 px-3 py-2 rounded text-white bg-blue-600 hover:bg-blue-700"
                      title="Descargar PDF"
                      aria-label="Descargar PDF"
                      onClick={() => downloadPDF(d.id)}
                    >
                      <DownloadIcon />
                      <span className="text-xs font-medium">PDF</span>
                    </button>
                    <button
                      className="flex items-center gap-2 px-3 py-2 rounded text-white bg-indigo-600 hover:bg-indigo-700"
                      title="Imprimir PDF"
                      aria-label="Imprimir PDF"
                      onClick={() => printPDF(d.id)}
                    >
                      <PrinterIcon />
                      <span className="text-xs font-medium">Imprimir</span>
                    </button>
                    {!isEditingRow ? (
                      <>
                        <button
                          className={`${btnIcon} hover:bg-blue-600`}
                          title="Editar"
                          aria-label="Editar"
                          onClick={() => startEditRow(d)}
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          className={`${btnIcon} hover:bg-red-600`}
                          title="Eliminar"
                          aria-label="Eliminar"
                          onClick={() => deleteRow(d.id)}
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className={`${btnIcon} hover:bg-emerald-600`}
                          title="Guardar"
                          aria-label="Guardar"
                          onClick={() => saveRow(d.id)}
                        >
                          <FiSave size={18} />
                        </button>
                        <button
                          className={`${btnIcon} hover:bg-gray-600`}
                          title="Cancelar"
                          aria-label="Cancelar"
                          onClick={cancelEditRow}
                        >
                          <FiX size={18} />
                        </button>
                      </>
                    )}
                    <button
                      className={
                        "px-3 py-2 rounded text-white " +
                        (isDriverDone ? "bg-emerald-600 cursor-default" : "bg-green-600 hover:bg-green-700")
                      }
                      disabled={isDriverDone || isLoading}
                      onClick={() => markToDriver(d.id)}
                      title={isDriverDone ? "Entregado a Chofer (bloqueado)" : "Marcar como Entregado a Chofer"}
                    >
                      {d.delivered_driver ? "Entregado a Chofer" : "Marcar como Entregado a Chofer"}
                    </button>
                    <button
                      className={
                        "px-3 py-2 rounded text-white " +
                        (isClientDone ? "bg-emerald-600 cursor-default" : "bg-green-600 hover:bg-green-700")
                      }
                      disabled={isClientDone || isLoading}
                      onClick={() => markToClient(d.id)}
                      title={isClientDone ? "Pedido Entregado (finalizado)" : "Marcar como Pedido Entregado"}
                    >
                      {d.delivered_client ? "Pedido Entregado" : "Marcar como Pedido Entregado"}
                    </button>
                  </div>
                </div>
                {!isEditingRow && (
                  <>
                    <p className="mt-3"><strong>Productos:</strong></p>
                    <ul className="list-disc pl-5">
                      {d.productos.map((p, i) => (
                        <li key={i}>
                          {p.nombre} - {p.cantidad} {p.unidad}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      {hasMore && !isLoading && (
        <div className="text-center mt-6">
          <button
            onClick={() => setPage((prev) => prev + 1)}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Cargar más
          </button>
        </div>
      )}

      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" 
          onClick={() => setSelectedImage(null)}  // Cierra al click fuera
        >
          <div className="relative max-w-full max-h-full p-4">
            <img 
              src={selectedImage} 
              alt="Imagen en grande" 
              className="max-w-screen-lg max-h-screen object-contain"  // Zoomed, ajustado a pantalla
            />
            <button 
              className="absolute top-2 right-2 text-white bg-red-600 p-1 rounded-full" 
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

export default Tracking;