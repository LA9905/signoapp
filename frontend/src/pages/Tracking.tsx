import { useEffect, useRef, useState, useCallback, type ChangeEvent } from "react";
import { normalizeSearch } from "../utils/normalizeSearch";
import type { AxiosError, AxiosResponse } from "axios";
import { FiEdit2, FiTrash2, FiSave, FiX, FiPlus, FiMinus, FiDownload, FiSearch, FiFileText, FiPrinter, FiTruck, FiCheckCircle } from "react-icons/fi";
import ClientSelector from "../components/ClientSelector";
import DriverSelector from "../components/DriverSelector";
import { useDrivers } from "../context/DriversContext";
import ArrowBackButton from "../components/ArrowBackButton";
import Webcam from "react-webcam";
import { api } from "../services/http";
import { me } from "../services/authService";
import * as XLSX from "xlsx";
import type { MeResp } from "../types";

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
type ApiError = { error?: string; details?: string; msg?: string };

type SearchState = {
  client: string;
  order: string;
  user: string;
  driver: string;
  date: string;
  invoice: string;
  date_from: string;
  date_to: string;
  product: string;
};

const Tracking = () => {
  const [dispatches, setDispatches] = useState<DispatchSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
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
  const [isLimited, setIsLimited] = useState(false);

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
    product: "",
  });

  const [debouncedSearch, setDebouncedSearch] = useState<SearchState>(searchState);

  const searchStateRef = useRef<SearchState>(searchState);
  useEffect(() => {
    searchStateRef.current = searchState;
  }, [searchState]);

  useEffect(() => {
    me()
      .then((res: AxiosResponse<MeResp>) => {
        setIsLimited(!!res.data.is_limited);
        setIsLoadingUser(false);
      })
      .catch(() => {
        setIsLimited(false);
        setIsLoadingUser(false);
      });
  }, []);

  const fetchControllerRef = useRef<AbortController | null>(null);

  const [existingImages, setExistingImages] = useState<{ id: number; image_url: string }[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [deleteImageIds, setDeleteImageIds] = useState<number[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  const [scrollToId, setScrollToId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

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
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

    for (const p of draft.productos) {
      if (!p.nombre || !p.nombre.trim()) {
        setValidationError("Hay un producto sin nombre. Por favor selecciona un producto de la lista o elimina la fila vacía.");
        return;
      }
      if (!productNames.map((n) => normalizeSearch(n)).includes(normalizeSearch(p.nombre.trim()))) {
        setValidationError(`El producto "${p.nombre}" no existe en el listado. Por favor selecciónalo desde las sugerencias o elimina esa fila.`);
        return;
      }
      if (!p.cantidad || p.cantidad <= 0) {
        setValidationError(`El producto "${p.nombre}" tiene cantidad 0 o vacía. Por favor ingresa una cantidad válida.`);
        return;
      }
    }

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
      formData.append("data", JSON.stringify(payload));
      newImages.forEach((img) => formData.append("new_images", img));

      const resp = await api.put<DispatchSummary>(`/dispatches/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updated = resp.data;
      const choferName = drivers.find((d) => d.id === parseInt(draft.chofer))?.name || updated.chofer;
      setDispatches((prev) =>
        prev.map((d) =>
          d.id === id
            ? { ...d, ...updated, chofer: choferName, cliente: draft.cliente, factura_numero: updated.factura_numero ?? draft.factura_numero }
            : d
        )
      );
      setMensaje("Despacho actualizado.");
      cancelEditRow();
      setScrollToId(id);
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      const errCode = error.response?.data?.error;
      const errMsg = error.response?.data?.msg || "";
      if (error.response?.status === 409 && (errCode === "duplicate_order" || errCode === "duplicate_invoice" || errCode === "duplicate_both")) {
        if (window.confirm(errMsg)) {
          try {
            const payload = {
              orden: draft.orden,
              cliente: draft.cliente,
              chofer: draft.chofer,
              status: draft.status,
              factura_numero: draft.factura_numero,
              force: true,
              productos: draft.productos.map((p) => ({
                nombre: p.nombre,
                cantidad: p.cantidad,
                unidad: p.unidad,
              })),
              delete_image_ids: deleteImageIds,
            };
            const formData = new FormData();
            formData.append("data", JSON.stringify(payload));
            newImages.forEach((img) => formData.append("new_images", img));
            const resp = await api.put<DispatchSummary>(`/dispatches/${id}`, formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            const updated = resp.data;
            const choferName = drivers.find((d) => d.id === parseInt(draft.chofer))?.name || updated.chofer;
            setDispatches((prev) =>
              prev.map((d) =>
                d.id === id
                  ? { ...d, ...updated, chofer: choferName, cliente: draft.cliente, factura_numero: updated.factura_numero ?? draft.factura_numero }
                  : d
              )
            );
            setMensaje("Despacho actualizado.");
            cancelEditRow();
            setScrollToId(id);
          } catch {
            alert("No se pudo actualizar el despacho");
          }
        }
      } else {
        alert(error.response?.data?.error || "No se pudo actualizar");
      }
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

  const humanStatus = (s: string) => {
    if (s === "entregado_chofer") return "Entregado a Chofer";
    if (s === "entregado_cliente") return "Pedido Entregado";
    return s;
  };

  const statusStyle = (s: string) => {
    if (s === "entregado_cliente") return "status-badge-tr completado";
    if (s === "entregado_chofer") return "status-badge-tr chofer";
    return "status-badge-tr";
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-[#080C14] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/10 border-t-indigo-400 rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-white/30 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080C14] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .font-display { font-family: 'Syne', sans-serif; }

        .glass { background: rgba(30,40,80,0.35); border: 1px solid rgba(99,102,241,0.18); }
        .glass-hover:hover { background: rgba(30,40,80,0.45); border-color: rgba(99,102,241,0.28); }

        .input-tr {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: white; border-radius: 10px;
          transition: border-color .15s, box-shadow .15s;
          font-size: 14px;
        }
        .input-tr::placeholder { color: rgba(255,255,255,0.2); }
        .input-tr:focus { outline: none; border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }

        .select-tr {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.75); border-radius: 10px;
          font-size: 14px; transition: border-color .15s;
        }
        .select-tr:focus { outline: none; border-color: rgba(99,102,241,0.5); }
        .select-tr option { background: #111827; color: white; }

        .btn-action-tr {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 6px; padding: 6px 10px; border-radius: 8px;
          font-size: 12px; font-weight: 500;
          border: 1px solid transparent;
          transition: all .15s; cursor: pointer;
          white-space: nowrap;
        }

        .btn-pdf-tr { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.2); color: #93C5FD; }
        .btn-pdf-tr:hover { background: rgba(59,130,246,0.18); border-color: rgba(59,130,246,0.35); }

        .btn-print-tr { background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.2); color: #6EE7B7; }
        .btn-print-tr:hover { background: rgba(52,211,153,0.18); border-color: rgba(52,211,153,0.35); }

        .btn-edit-tr { background: rgba(96,165,250,0.08); border-color: rgba(96,165,250,0.25); color: #60A5FA; }
        .btn-edit-tr:hover { background: rgba(96,165,250,0.18); border-color: rgba(96,165,250,0.45); color: #93C5FD; }

        .btn-del-tr { background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.25); color: #F87171; }
        .btn-del-tr:hover { background: rgba(248,113,113,0.18); border-color: rgba(248,113,113,0.45); color: #FCA5A5; }

        .btn-save-tr { background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.2); color: #6EE7B7; padding: 6px 12px; }
        .btn-save-tr:hover { background: rgba(52,211,153,0.18); border-color: rgba(52,211,153,0.35); }

        .btn-cancel-tr { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.25); color: rgba(255,255,255,0.9); padding: 6px 12px; }
        .btn-cancel-tr:hover { background: rgba(255,255,255,0.08); color: white; }

        .btn-add-prod-tr { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.25); color: #A5B4FC; padding: 6px 10px; }
        .btn-add-prod-tr:hover { background: rgba(99,102,241,0.18); }

        .btn-rem-prod-tr { background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.2); color: #FCA5A5; padding: 6px 8px; }
        .btn-rem-prod-tr:hover { background: rgba(248,113,113,0.15); }

        .btn-mark-driver-tr {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 500;
          border: 1px solid rgba(251,191,36,0.25); background: rgba(251,191,36,0.08); color: #FCD34D;
          cursor: pointer; transition: all .15s; white-space: nowrap;
        }
        .btn-mark-driver-tr:hover { background: rgba(251,191,36,0.15); border-color: rgba(251,191,36,0.4); }
        .btn-mark-driver-tr:disabled { opacity: .45; cursor: not-allowed; }
        .btn-mark-driver-tr.done { background: rgba(52,211,153,0.08); border-color: rgba(52,211,153,0.2); color: #6EE7B7; cursor: default; }

        .btn-mark-client-tr {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 500;
          border: 1px solid rgba(52,211,153,0.25); background: rgba(52,211,153,0.08); color: #6EE7B7;
          cursor: pointer; transition: all .15s; white-space: nowrap;
        }
        .btn-mark-client-tr:hover { background: rgba(52,211,153,0.15); border-color: rgba(52,211,153,0.4); }
        .btn-mark-client-tr:disabled { opacity: .45; cursor: not-allowed; }
        .btn-mark-client-tr.done { opacity: .6; cursor: default; }

        .btn-primary-search-tr {
          background: linear-gradient(135deg, #4F46E5, #6366F1);
          box-shadow: 0 4px 16px rgba(99,102,241,0.3);
          color: white; border: none; border-radius: 10px;
          padding: 10px 22px; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all .15s;
        }
        .btn-primary-search-tr:hover { box-shadow: 0 6px 20px rgba(99,102,241,0.4); transform: translateY(-1px); }
        .btn-primary-search-tr:disabled { opacity: .5; cursor: not-allowed; transform: none; }

        .btn-excel-tr {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 9px; font-size: 13px; font-weight: 500;
          background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.2); color: #6EE7B7;
          cursor: pointer; transition: all .15s;
        }
        .btn-excel-tr:hover { background: rgba(52,211,153,0.14); border-color: rgba(52,211,153,0.35); }

        .btn-load-more-tr {
          background: rgba(52,211,153,0.6); border: 1px solid rgba(52,211,153,0.35);
          color: rgba(255,255,255,0.9); padding: 10px 30px; border-radius: 10px;
          font-size: 14px; font-weight: 500; cursor: pointer; transition: all .15s;
        }
        .btn-load-more-tr:hover { background: rgba(59,130,246,0.35); color: white; }

        .field-label-tr { font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: rgba(255,255,255,0.9); margin-bottom: 4px; }

        .meta-chip-tr {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 6px; padding: 3px 8px; font-size: 12px; color: rgba(255,255,255,0.75);
        }
        .meta-chip-tr strong { color: rgba(255,255,255,0.9); font-weight: 500; }

        .folio-badge-tr {
          font-family: 'DM Mono', monospace;
          font-size: 11px; letter-spacing: .08em;
          background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.2);
          color: #A5B4FC; border-radius: 5px; padding: 2px 8px;
        }

        .status-badge-tr {
          font-size: 11px; letter-spacing: .05em; text-transform: capitalize;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5); border-radius: 5px; padding: 2px 8px; font-weight: 600;
        }
        .status-badge-tr.chofer {
          background: rgba(251,191,36,0.1); border-color: rgba(251,191,36,0.2); color: #FCD34D;
        }
        .status-badge-tr.completado {
          background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.2); color: #6EE7B7;
        }

        .tr-card { transition: background .12s; }
        .tr-card:hover { background: rgba(99,102,241,0.06); }

        .img-thumb-tr {
          width: 72px; height: 72px; object-fit: cover;
          border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer; transition: border-color .15s;
        }
        .img-thumb-tr:hover { border-color: rgba(99,102,241,0.5); }

        .btn-img-del-tr {
          font-size: 11px; color: #F87171; background: none; border: none;
          cursor: pointer; padding: 2px 0; display: block; text-align: center;
          transition: color .15s;
        }
        .btn-img-del-tr:hover { color: #FCA5A5; }

        .btn-camera-tr {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 9px; font-size: 13px; font-weight: 500;
          background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.2); color: #6EE7B7;
          cursor: pointer; transition: all .15s;
        }
        .btn-camera-tr:hover { background: rgba(52,211,153,0.14); }

        .btn-capture-tr {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 9px; font-size: 13px; font-weight: 500;
          background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); color: #93C5FD;
          cursor: pointer; transition: all .15s; margin-top: 8px;
        }
        .btn-capture-tr:hover { background: rgba(59,130,246,0.18); }

        @keyframes fade-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fade-in .25s ease both; }
      `}</style>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Back */}
        <div className="mb-8">
          <ArrowBackButton />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 fade-in">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight mb-1">
              Despachos
            </h1>
            <p className="text-sm text-white/30">Seguimiento y gestión de despachos</p>
          </div>

          {!isLimited && dispatches.length > 0 && (
            <button
              className="btn-excel-tr flex-shrink-0"
              title="Descargar Excel"
              aria-label="Descargar Excel"
              onClick={async () => {
                try {
                  const res = await api.get<DispatchSummary[]>("/dispatches", {
                    params: { ...debouncedSearch, all: 1 },
                  });
                  const fullDispatches = res.data;

                  const totals: Record<string, number> = {};
                  fullDispatches.forEach((d) => {
                    d.productos.forEach((p) => {
                      totals[p.nombre] = (totals[p.nombre] || 0) + p.cantidad;
                    });
                  });

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

                  data.push({ "Orden de Compra": "", "Número de Factura": "", "Centro de Costo": "", "Chofer": "", "Usuario que Despachó": "", "Fecha y Hora": "", "Estado": "", "Productos": "" });
                  data.push({ "Orden de Compra": "Totales por producto", "Número de Factura": "", "Centro de Costo": "", "Chofer": "", "Usuario que Despachó": "", "Fecha y Hora": "", "Estado": "", "Productos": "" });
                  Object.entries(totals).forEach(([producto, total]) => {
                    data.push({ "Orden de Compra": producto, "Número de Factura": "", "Centro de Costo": "", "Chofer": "", "Usuario que Despachó": "", "Fecha y Hora": "", "Estado": "", "Productos": `Total: ${total}` });
                  });

                  data.push({ "Orden de Compra": "", "Número de Factura": "", "Centro de Costo": "", "Chofer": "", "Usuario que Despachó": "", "Fecha y Hora": "", "Estado": "", "Productos": "" });
                  data.push({ "Orden de Compra": "Conteo por Chofer", "Número de Factura": "", "Centro de Costo": "", "Chofer": "", "Usuario que Despachó": "", "Fecha y Hora": "", "Estado": "", "Productos": "" });
                  Object.entries(driverCounts).forEach(([chofer, counts]) => {
                    data.push({ "Orden de Compra": chofer, "Número de Factura": "", "Centro de Costo": "", "Chofer": "", "Usuario que Despachó": "", "Fecha y Hora": "", "Estado": "", "Productos": `Total despachos: ${counts.total}, Pedido Entregado: ${counts.entregados}, Pendientes: ${counts.pendientes}` });
                  });

                  const ws = XLSX.utils.json_to_sheet(data);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Despachos");
                  XLSX.writeFile(wb, "despachos_filtrados.xlsx");
                } catch (err) {
                  console.error("Error al cargar datos completos:", err);
                  alert("Error al cargar los datos completos para la exportación.");
                }
              }}
            >
              <FiDownload size={14} />
              Exportar Excel
            </button>
          )}
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div
            className="mb-5 px-4 py-3 rounded-xl text-sm text-emerald-300 fade-in"
            style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.18)" }}
          >
            {mensaje}
          </div>
        )}

        {/* Search form */}
        <div className="mb-6">
          <form onSubmit={handleSearchSubmit} className="glass rounded-2xl p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { name: "client", placeholder: "Centro de costo" },
                { name: "order", placeholder: "N° Orden" },
                { name: "invoice", placeholder: "N° Factura" },
                { name: "user", placeholder: "Usuario que creó" },
                { name: "driver", placeholder: "Chofer" },
                { name: "product", placeholder: "Producto" },
              ].map((f) => (
                <div key={f.name} className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none flex">
                    <FiSearch size={12} />
                  </span>
                  <input
                    name={f.name}
                    value={(searchState as any)[f.name]}
                    onChange={handleSearchChange}
                    placeholder={f.placeholder}
                    className="input-tr w-full pl-8 pr-3 py-2.5"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="field-label-tr">Desde</div>
                <input
                  name="date_from"
                  type="date"
                  value={searchState.date_from}
                  onChange={handleSearchChange}
                  className="input-tr w-full px-3 py-2.5"
                />
              </div>
              <div>
                <div className="field-label-tr">Hasta</div>
                <input
                  name="date_to"
                  type="date"
                  value={searchState.date_to}
                  onChange={handleSearchChange}
                  className="input-tr w-full px-3 py-2.5"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="btn-primary-search-tr" disabled={isLoading}>
                {isLoading ? "Buscando…" : "Buscar"}
              </button>
            </div>
          </form>
        </div>

        {/* Loading */}
        {isLoading && dispatches.length === 0 && (
          <div className="flex items-center gap-3 justify-center py-16 text-white/30 text-sm">
            <div className="w-5 h-5 border-2 border-white/10 border-t-indigo-400 rounded-full animate-spin" />
            Cargando despachos…
          </div>
        )}

        {/* Empty */}
        {!isLoading && dispatches.length === 0 && (
          <div className="glass rounded-2xl p-14 text-center fade-in">
            <span className="flex justify-center mb-3 text-white/15">
              <FiFileText size={30} />
            </span>
            <p className="text-white/30 text-sm">No se encontraron despachos.</p>
          </div>
        )}

        {/* Cards */}
        {dispatches.length > 0 && (
          <div className="space-y-3">
            {dispatches.map((d, index) => {
              const isDriverDone = d.delivered_driver || d.delivered_client;
              const isClientDone = d.delivered_client;
              const isEditingRow = editingId === d.id;
              const refProp = index === dispatches.length - 1 ? { ref: lastDispatchRef } : {};

              return (
                <div
                  key={d.id}
                  id={`dispatch-${d.id}`}
                  className="tr-card glass rounded-2xl fade-in"
                  style={{ animationDelay: `${Math.min(index, 6) * 0.04}s` }}
                  {...refProp}
                >
                  {!isEditingRow ? (
                    /* ── View mode ── */
                    <div className="p-5">
                      {/* Top row */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="folio-badge-tr flex-shrink-0">Folio# {d.id}</span>
                            <span className={statusStyle(d.status)}>{humanStatus(d.status)}</span>
                          </div>
                          {!isLimited && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button className="btn-action-tr btn-pdf-tr" onClick={() => downloadPDF(d.id)} title="Descargar PDF" aria-label="Descargar PDF">
                                <FiDownload size={12} /> <span className="hidden sm:inline">PDF</span>
                              </button>
                              <button className="btn-action-tr btn-print-tr" onClick={() => printPDF(d.id)} title="Imprimir PDF" aria-label="Imprimir PDF">
                                <FiPrinter size={12} /> <span className="hidden sm:inline">Imprimir</span>
                              </button>
                              <button className="btn-action-tr btn-edit-tr" onClick={() => startEditRow(d)} title="Editar" aria-label="Editar">
                                <FiEdit2 size={12} />
                              </button>
                              <button className="btn-action-tr btn-del-tr" onClick={() => deleteRow(d.id)} title="Eliminar" aria-label="Eliminar">
                                <FiTrash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Botones de marcar */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {!isLimited && (
                            <button
                              className={`btn-mark-driver-tr ${isDriverDone ? "done" : ""}`}
                              disabled={isDriverDone || isLoading}
                              onClick={() => markToDriver(d.id)}
                              title={isDriverDone ? "Entregado a Chofer (bloqueado)" : "Marcar como Entregado a Chofer"}
                            >
                              <FiTruck size={12} />
                              {d.delivered_driver ? "Entregado a Chofer" : "Marcar Entregado a Chofer"}
                            </button>
                          )}
                          <button
                            className={`btn-mark-client-tr ${isClientDone ? "done" : ""}`}
                            disabled={isClientDone || isLoading}
                            onClick={() => markToClient(d.id)}
                            title={isClientDone ? "Pedido Entregado (finalizado)" : "Marcar como Pedido Entregado"}
                          >
                            <FiCheckCircle size={12} />
                            {d.delivered_client ? "Pedido Entregado" : "Marcar Pedido Entregado"}
                          </button>
                        </div>
                        <span className="font-display font-semibold text-lg text-white/90 break-words">
                          <span className="text-white/80 font-normal text-sm">Centro de Costo: </span>{d.cliente}
                        </span>
                      </div>

                      {/* Meta chips */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {d.orden && (
                          <span className="meta-chip-tr">
                            <span className="text-blue-400">Orden</span> <strong>{d.orden}</strong>
                          </span>
                        )}
                        {d.factura_numero && (
                          <span className="meta-chip-tr">
                            <span className="text-blue-400">Factura</span> <strong>{d.factura_numero}</strong>
                          </span>
                        )}
                        {d.paquete_numero && (
                          <span className="meta-chip-tr">
                            <span className="text-white/40">Paquete</span> <strong>#{d.paquete_numero}</strong>
                          </span>
                        )}
                        <span className="meta-chip-tr">
                          <span className="text-white/90">Chofer:</span> <strong>{d.chofer}</strong>
                        </span>
                        <span className="meta-chip-tr">
                          <span className="text-white/90">Despachado por:</span> <strong>{d.created_by}</strong>
                        </span>
                        <span className="meta-chip-tr">
                          {new Date(d.fecha).toLocaleString("es-CL", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Products */}
                      <div className="border-t border-blue-500/70 pt-3 mb-4">
                        <p className="field-label-tr mb-2">Productos</p>
                        <div className="flex flex-col gap-1.5">
                          {d.productos.map((p, i) => (
                            <span key={i} className="meta-chip-tr w-fit">
                              <strong>{p.nombre}</strong>
                              <span className="text-white/50">·</span>
                              <span>{p.cantidad} {p.unidad}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ── Edit mode ── */
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-5">
                        <span className="font-display font-semibold text-base">Editando #{d.id}</span>
                        <div className="flex gap-2">
                          <button className="btn-action-tr btn-save-tr" onClick={() => saveRow(d.id)} title="Guardar" aria-label="Guardar">
                            <FiSave size={13} /> Guardar
                          </button>
                          <button className="btn-action-tr btn-cancel-tr" onClick={cancelEditRow} title="Cancelar" aria-label="Cancelar">
                            <FiX size={13} /> Cancelar
                          </button>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="field-label-tr">Orden</div>
                          <input
                            value={draft?.orden || ""}
                            onChange={(e) => setDraft((prev) => (prev ? { ...prev, orden: e.target.value } : prev))}
                            className="input-tr w-full px-3 py-2.5"
                          />
                        </div>
                        <div>
                          <div className="field-label-tr">N° Factura</div>
                          <input
                            value={draft?.factura_numero || ""}
                            onChange={(e) => setDraft((prev) => (prev ? { ...prev, factura_numero: e.target.value } : prev))}
                            placeholder="Ej: 12345"
                            className="input-tr w-full px-3 py-2.5"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <div className="field-label-tr">Centro de Costo</div>
                          <ClientSelector
                            value={draft?.cliente || ""}
                            onChange={(cliente) => setDraft((prev) => (prev ? { ...prev, cliente } : prev))}
                          />
                        </div>
                        <div>
                          <div className="field-label-tr">Chofer</div>
                          <DriverSelector
                            value={draft?.chofer || ""}
                            onChange={(choferId) => setDraft((prev) => (prev ? { ...prev, chofer: choferId } : prev))}
                          />
                        </div>
                        <div>
                          <div className="field-label-tr">Estado</div>
                          <select
                            value={draft?.status || "pendiente"}
                            onChange={(e) => setDraft((prev) => (prev ? { ...prev, status: e.target.value } : prev))}
                            className="select-tr w-full px-3 py-2.5"
                          >
                            <option value="pendiente">pendiente</option>
                            <option value="entregado_chofer">entregado_chofer</option>
                            <option value="entregado_cliente">entregado_cliente</option>
                          </select>
                        </div>
                      </div>

                      {/* Products edit */}
                      <div className="border-t border-white/5 pt-4 mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="field-label-tr">Productos</p>
                          <button className="btn-action-tr btn-add-prod-tr" onClick={addRow} title="Agregar producto" aria-label="Agregar producto">
                            <FiPlus size={13} /> Agregar
                          </button>
                        </div>
                        <div className="space-y-2">
                          {draft?.productos.map((row, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                              <div className="relative col-span-6">
                                <input
                                  className="input-tr w-full px-3 py-2"
                                  placeholder="Producto"
                                  value={row.nombre}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    updateRow(idx, { nombre: value });
                                    if (value) {
                                      const filtered = productNames.filter((n) =>
                                        normalizeSearch(n).includes(normalizeSearch(value))
                                      );
                                      setSuggestions((prev) => ({ ...prev, [idx]: filtered }));
                                    } else {
                                      setSuggestions((prev) => ({ ...prev, [idx]: [] }));
                                    }
                                  }}
                                  onBlur={() => setSuggestions((prev) => ({ ...prev, [idx]: [] }))}
                                />
                                {suggestions[idx]?.length > 0 && (
                                  <ul
                                    style={{
                                      background: "rgb(15, 23, 42)",
                                      border: "2px solid #6366F1",
                                      borderRadius: "12px",
                                      overflow: "auto",
                                      maxHeight: "200px",
                                      width: "100%",
                                      marginTop: "4px",
                                      boxShadow: "0 20px 40px -8px rgb(0 0 0 / 0.9)",
                                      fontSize: "13px",
                                      isolation: "isolate",
                                      backdropFilter: "none",
                                    }}
                                  >
                                    {suggestions[idx].map((sug, i) => (
                                      <li
                                        key={i}
                                        style={{
                                          padding: "10px 14px",
                                          cursor: "pointer",
                                          color: "white",
                                          borderBottom: "1px solid rgba(255,255,255,0.07)",
                                          transition: "background 0.12s",
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = "#1E40AF")}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
                                className="input-tr col-span-2 px-2 py-2 text-right"
                                placeholder="Cant."
                                value={row.cantidad}
                                onChange={(e) => updateRow(idx, { cantidad: parseFloat(e.target.value) || 0 })}
                              />
                              <select
                                className="select-tr col-span-3 px-2 py-2"
                                value={row.unidad}
                                onChange={(e) => updateRow(idx, { unidad: e.target.value })}
                              >
                                <option value="unidades">Unidades</option>
                                <option value="kg">Kilogramos</option>
                                <option value="lt">Litros</option>
                                <option value="cajas">Cajas</option>
                                <option value="PQT">Paquetes</option>
                              </select>
                              <div className="col-span-1 flex justify-end">
                                <button className="btn-action-tr btn-rem-prod-tr" onClick={() => removeRow(idx)} title="Quitar" aria-label="Quitar">
                                  <FiMinus size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Images edit */}
                      <div className="border-t border-white/5 pt-4">
                        <p className="field-label-tr mb-3">Imágenes</p>

                        {/* Existing images */}
                        {existingImages.length > 0 && (
                          <div className="flex flex-wrap gap-3 mb-4">
                            {existingImages.map((img) => (
                              <div key={img.id} className="flex flex-col items-center gap-1">
                                <img
                                  src={img.image_url}
                                  alt="existing"
                                  className="img-thumb-tr"
                                  onClick={() => setSelectedImage(img.image_url)}
                                />
                                <button className="btn-img-del-tr" onClick={() => removeExistingImage(img.id)}>
                                  Eliminar
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {newImages.length > 0 && (
                          <div className="flex flex-wrap gap-3 mb-4">
                            {newImages.map((img, idx) => (
                              <div key={idx} className="flex flex-col items-center gap-1">
                                <img
                                  src={URL.createObjectURL(img)}
                                  alt="new"
                                  className="img-thumb-tr"
                                  onClick={() => setSelectedImage(URL.createObjectURL(img))}
                                />
                                <button className="btn-img-del-tr" onClick={() => removeNewImage(idx)}>
                                  Eliminar
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-3 items-center">
                          <label
                            className="btn-camera-tr cursor-pointer"
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                          >
                            <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
                              <FiDownload size={13} />
                            </span>
                            Subir imagen
                            <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                          </label>
                          <button type="button" className="btn-camera-tr" onClick={() => setShowCamera(!showCamera)}>
                            {showCamera ? "Cerrar Cámara" : "Tomar Foto"}
                          </button>
                        </div>

                        {showCamera && (
                          <div className="mt-4">
                            <Webcam
                              audio={false}
                              screenshotFormat="image/jpeg"
                              ref={webcamRef}
                              videoConstraints={{ facingMode: "environment" }}
                              style={{ borderRadius: "12px", width: "100%", maxWidth: "400px" }}
                            />
                            <button type="button" className="btn-capture-tr" onClick={capturePhoto}>
                              Capturar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Load more */}
        {hasMore && !isLoading && (
          <div className="text-center mt-6">
            <button className="btn-load-more-tr" onClick={() => setPage((prev) => prev + 1)}>
              Cargar más
            </button>
          </div>
        )}

      </div>

      {/* Validation error modal */}
      {validationError && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="rounded-2xl p-6 max-w-md w-full fade-in"
            style={{ background: "#111827", border: "1px solid rgba(248,113,113,0.2)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(248,113,113,0.15)" }}>
                <span className="text-red-400 flex"><FiX size={14} /></span>
              </div>
              <h3 className="font-display font-semibold text-red-400">Error al guardar</h3>
            </div>
            <p className="text-sm text-white/55 mb-5 leading-relaxed">{validationError}</p>
            <button
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: "linear-gradient(135deg, #4F46E5, #6366F1)", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}
              onClick={() => setValidationError(null)}
            >
              Entendido, voy a corregirlo
            </button>
          </div>
        </div>
      )}

      {/* Image lightbox */}
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
              style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: "16px" }}
            />
            <button
              className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full"
              style={{ background: "rgba(248,113,113,0.9)", minWidth: "32px", minHeight: "32px" }}
              onClick={() => setSelectedImage(null)}
            >
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "white", lineHeight: 0 }}>
                <FiX size={18} color="white" />
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tracking;