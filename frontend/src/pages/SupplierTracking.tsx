import { useEffect, useRef, useState, useCallback, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { normalizeSearch } from "../utils/normalizeSearch";
import type { AxiosError } from "axios";
import { FiEdit2, FiTrash2, FiSave, FiX, FiPlus, FiMinus, FiDownload, FiSearch, FiFileText } from "react-icons/fi";
import SupplierSelector from "../components/SupplierSelector";
import ArrowBackButton from "../components/ArrowBackButton";
import { api } from "../services/http";
import * as XLSX from "xlsx";

interface ReceiptSummary {
  id: number;
  orden: string;
  supplier: string;
  created_by: string;
  fecha: string;
  status: string;
  productos: { nombre: string; cantidad: number; unidad: string }[];
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
  supplier: string;
  order: string;
  user: string;
  product: string;
  date_from: string;
  date_to: string;
};

const SupplierTracking = () => {
  const [receipts, setReceipts] = useState<ReceiptSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [mensaje, setMensaje] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{
    orden: string;
    supplier: string;
    status: string;
    productos: ProductoRow[];
  } | null>(null);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [productList, setProductList] = useState<{ name: string; usage: number }[]>([]);
  const [suggestions, setSuggestions] = useState<Record<number, string[]>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<Record<number, { top: number; left: number; width: number }>>({});
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [searchState, setSearchState] = useState<SearchState>({
    supplier: "",
    order: "",
    user: "",
    product: "",
    date_from: "",
    date_to: "",
  });

  const [debouncedSearch, setDebouncedSearch] = useState<SearchState>(searchState);

  const searchStateRef = useRef<SearchState>(searchState);
  useEffect(() => {
    searchStateRef.current = searchState;
  }, [searchState]);

  const fetchControllerRef = useRef<AbortController | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastReceiptRef = useRef<HTMLDivElement | null>(null);

  const fetchProducts = async () => {
    try {
      const res = await api.get<Product[]>("/products");
      setProductNames(res.data.map((p) => p.name));
      setProductList(res.data.map((p) => ({ name: p.name, usage: (p as any).usage || 0 })));
    } catch (err) {
      console.error("Error fetching products:", err);
      setMensaje("Error al cargar lista de productos");
    }
  };

  const fetchReceipts = useCallback(
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
        const response = await api.get<ReceiptSummary[]>("/receipts", {
          params: { ...params, page: pageNum, limit: 10 },
          headers: { "Cache-Control": "no-cache" },
          signal,
        });
        const newReceipts = response.data;
        setReceipts((prev) => (append ? [...prev, ...newReceipts] : newReceipts));
        setHasMore(newReceipts.length === 10);
        setMensaje("");
      } catch (err: any) {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || err?.name === "AbortError") return;
        console.error("Error fetching receipts:", err);
        setMensaje("Error al cargar recepciones");
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
    if (lastReceiptRef.current) {
      observer.current.observe(lastReceiptRef.current);
    }
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [isLoading, hasMore]);

  useEffect(() => {
    if (page > 1) {
      fetchReceipts(debouncedSearch, page, true);
    }
  }, [page, debouncedSearch, fetchReceipts]);

  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(searchState);
    }, 300);
    return () => clearTimeout(id);
  }, [searchState]);

  useEffect(() => {
    fetchReceipts(debouncedSearch, 1, false);
    return () => {
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
    };
  }, [debouncedSearch, fetchReceipts]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
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
        const response = await api.get<ReceiptSummary[]>("/receipts", {
          params: { ...searchState, page: 1, limit: 10 },
          headers: { "Cache-Control": "no-cache" },
          signal: controller.signal,
        });
        setReceipts(response.data);
        setHasMore(response.data.length === 10);
        setMensaje("");
        setPage(1);
        setDebouncedSearch(searchState);
      } catch (err: any) {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || err?.name === "AbortError") return;
        setMensaje("Error al cargar recepciones");
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const startEditRow = (r: ReceiptSummary) => {
    setEditingId(r.id);
    setDraft({
      orden: r.orden,
      supplier: r.supplier,
      status: r.status || "pendiente",
      productos: r.productos.map((p) => ({ ...p })),
    });
  };

  const cancelEditRow = () => {
    setEditingId(null);
    setDraft(null);
    setSuggestions({});
  };

  const saveEditRow = async () => {
    if (!draft || !editingId) return;

    for (const p of draft.productos) {
      if (!p.nombre || !p.nombre.trim()) {
        setValidationError("Hay un producto sin nombre. Por favor selecciona un producto de la lista o elimina la fila vacía.");
        return;
      }
      if (!productNames.map(n => normalizeSearch(n)).includes(normalizeSearch(p.nombre.trim()))) {
        setValidationError(`El producto "${p.nombre}" no existe en el listado. Por favor selecciónalo desde las sugerencias o elimina esa fila.`);
        return;
      }
      if (!p.cantidad || p.cantidad <= 0) {
        setValidationError(`El producto "${p.nombre}" tiene cantidad 0 o vacía. Por favor ingresa una cantidad válida.`);
        return;
      }
    }

    const payload = {
      orden: draft.orden,
      supplier: draft.supplier,
      productos: draft.productos.map((p) => ({
        nombre: p.nombre,
        cantidad: p.cantidad,
        unidad: p.unidad,
      })),
    };

    setIsLoading(true);
    try {
      const response = await api.put<ReceiptSummary>(`/receipts/${editingId}`, payload);
      const updated = response.data;
      setReceipts((prev) =>
        prev.map((r) => (r.id === editingId ? { ...r, ...updated } : r))
      );
      setMensaje("Recepción actualizada correctamente");
      cancelEditRow();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      if (error.response?.status === 409 && (error.response.data as any)?.error === "duplicate_order") {
        if (window.confirm("Ya existe una orden con ese número de factura. ¿Desea continuar de todas formas?")) {
          try {
            const response = await api.put<ReceiptSummary>(`/receipts/${editingId}`, { ...payload, force: true });
            const updated = response.data;
            setReceipts((prev) =>
              prev.map((r) => (r.id === editingId ? { ...r, ...updated } : r))
            );
            setMensaje("Recepción actualizada correctamente");
            cancelEditRow();
          } catch (retryErr) {
            const retryError = retryErr as AxiosError<ApiError>;
            alert(retryError.response?.data?.error || "No se pudo actualizar la recepción");
          }
        }
        return;
      }
      console.error("Error al actualizar recepción:", error.response?.data || error.message);
      alert(error.response?.data?.error || "No se pudo actualizar la recepción");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRow = async (id: number) => {
    if (!window.confirm("¿Eliminar esta recepción? Esta acción es permanente y revertirá el stock.")) return;
    setIsLoading(true);
    try {
      await api.delete(`/receipts/${id}`);
      setReceipts((prev) => prev.filter((r) => r.id !== id));
      if (editingId === id) cancelEditRow();
      setMensaje("Recepción eliminada y stock revertido");
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      console.error("Error eliminando recepción:", error.response?.data || error.message);
      alert(error.response?.data?.error || "No se pudo eliminar la recepción");
    } finally {
      setIsLoading(false);
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

  return (
    <div className="min-h-screen bg-[#080C14] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .font-display { font-family: 'Syne', sans-serif; }

        .glass { background: rgba(30,40,80,0.35); border: 1px solid rgba(99,102,241,0.18); }

        .input-st {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: white; border-radius: 10px;
          transition: border-color .15s, box-shadow .15s;
          font-size: 14px;
        }
        .input-st::placeholder { color: rgba(255,255,255,0.2); }
        .input-st:focus { outline: none; border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }

        .select-st {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.75); border-radius: 10px;
          font-size: 14px; transition: border-color .15s;
        }
        .select-st:focus { outline: none; border-color: rgba(99,102,241,0.5); }
        .select-st option { background: #111827; color: white; }

        .btn-action-st {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 6px; padding: 6px 8px; border-radius: 8px;
          font-size: 13px; font-weight: 500;
          border: 1px solid transparent;
          transition: all .15s; cursor: pointer;
          white-space: nowrap;
        }

        .btn-edit-st { background: rgba(96,165,250,0.08); border-color: rgba(96,165,250,0.25); color: #60A5FA; }
        .btn-edit-st:hover { background: rgba(96,165,250,0.18); border-color: rgba(96,165,250,0.45); color: #93C5FD; }

        .btn-del-st { background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.25); color: #F87171; }
        .btn-del-st:hover { background: rgba(248,113,113,0.18); border-color: rgba(248,113,113,0.45); color: #FCA5A5; }

        .btn-save-st { background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.2); color: #6EE7B7; padding: 6px 12px; }
        .btn-save-st:hover { background: rgba(52,211,153,0.18); border-color: rgba(52,211,153,0.35); }

        .btn-cancel-st { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.25); color: rgba(255,255,255,0.9); padding: 6px 12px; }
        .btn-cancel-st:hover { background: rgba(255,255,255,0.08); color: white; }

        .btn-add-prod-st { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.25); color: #A5B4FC; padding: 6px 10px; }
        .btn-add-prod-st:hover { background: rgba(99,102,241,0.18); }

        .btn-rem-prod-st { background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.2); color: #FCA5A5; padding: 6px 8px; }
        .btn-rem-prod-st:hover { background: rgba(248,113,113,0.15); }

        .btn-primary-search-st {
          background: linear-gradient(135deg, #4F46E5, #6366F1);
          box-shadow: 0 4px 16px rgba(99,102,241,0.3);
          color: white; border: none; border-radius: 10px;
          padding: 10px 22px; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all .15s;
        }
        .btn-primary-search-st:hover { box-shadow: 0 6px 20px rgba(99,102,241,0.4); transform: translateY(-1px); }
        .btn-primary-search-st:disabled { opacity: .5; cursor: not-allowed; transform: none; }

        .btn-excel-st {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 9px; font-size: 13px; font-weight: 500;
          background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.2); color: #6EE7B7;
          cursor: pointer; transition: all .15s;
        }
        .btn-excel-st:hover { background: rgba(52,211,153,0.14); border-color: rgba(52,211,153,0.35); }

        .btn-load-more-st {
          background: rgba(52,211,153,0.6); border: 1px solid rgba(52,211,153,0.35);
          color: rgba(255,255,255,0.9); padding: 10px 30px; border-radius: 10px;
          font-size: 14px; font-weight: 500; cursor: pointer; transition: all .15s;
        }
        .btn-load-more-st:hover { background: rgba(59,130,246,0.35); color: white; }

        .field-label-st { font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: rgba(255,255,255,0.9); margin-bottom: 4px; }

        .meta-chip-st {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 6px; padding: 4px 10px; font-size: 12px; color: rgba(255,255,255,0.9);
        }
        .meta-chip-st strong { color: rgba(255,255,255,0.9); font-weight: 500; }

        .folio-badge-st {
          font-family: 'DM Mono', monospace;
          font-size: 11px; letter-spacing: .08em;
          background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.2);
          color: #A5B4FC; border-radius: 5px; padding: 2px 8px;
        }

        .status-badge-st {
          font-size: 11px; letter-spacing: .05em; text-transform: capitalize;
          background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.2);
          color: #FCD34D; border-radius: 5px; padding: 2px 8px; font-weight: 600;
        }
        .status-badge-st.completado {
          background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.2); color: #6EE7B7;
        }

        .st-card { transition: background .12s; }
        .st-card:hover { background: rgba(99,102,241,0.08); }

        @keyframes fade-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fade-in .25s ease both; }

        .textarea-st { resize: vertical; min-height: 80px; }
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
              Recepciones
            </h1>
            <p className="text-sm text-white/30">Seguimiento de recepciones de proveedores</p>
          </div>

          {receipts.length > 0 && (
            <button
              className="btn-excel-st flex-shrink-0"
              title="Descargar Excel"
              aria-label="Descargar Excel"
              onClick={async () => {
                try {
                  const res = await api.get<ReceiptSummary[]>("/receipts", {
                    params: { ...debouncedSearch, all: 1 },
                  });
                  const fullReceipts = res.data;
                  const totals: Record<string, number> = {};
                  fullReceipts.forEach((r) => {
                    r.productos.forEach((p) => {
                      totals[p.nombre] = (totals[p.nombre] || 0) + p.cantidad;
                    });
                  });
                  const data = fullReceipts.map((r) => ({
                    "Orden": r.orden,
                    "Proveedor": r.supplier,
                    "Ingresado por": r.created_by,
                    "Fecha": new Date(r.fecha).toLocaleString(),
                    "Estado": r.status,
                    "Productos": r.productos.map((p) => `${p.nombre}: ${p.cantidad} ${p.unidad}`).join("; "),
                  }));
                  data.push({ "Orden": "", "Proveedor": "", "Ingresado por": "", "Fecha": "", "Estado": "", "Productos": "" });
                  data.push({ "Orden": "Totales por Producto", "Proveedor": "", "Ingresado por": "", "Fecha": "", "Estado": "", "Productos": "" });
                  Object.entries(totals).forEach(([producto, total]) => {
                    data.push({ "Orden": producto, "Proveedor": "", "Ingresado por": "", "Fecha": "", "Estado": "", "Productos": `Total: ${total}` });
                  });
                  const ws = XLSX.utils.json_to_sheet(data);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Recepciones");
                  XLSX.writeFile(wb, "recepciones_filtradas.xlsx");
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
                { name: "supplier", placeholder: "Proveedor" },
                { name: "order", placeholder: "N° Factura" },
                { name: "user", placeholder: "Usuario que creó" },
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
                    className="input-st w-full pl-8 pr-3 py-2.5"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="field-label-st">Desde</div>
                <input
                  name="date_from"
                  type="date"
                  value={searchState.date_from}
                  onChange={handleSearchChange}
                  className="input-st w-full px-3 py-2.5"
                />
              </div>
              <div>
                <div className="field-label-st">Hasta</div>
                <input
                  name="date_to"
                  type="date"
                  value={searchState.date_to}
                  onChange={handleSearchChange}
                  className="input-st w-full px-3 py-2.5"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="btn-primary-search-st" disabled={isLoading}>
                {isLoading ? "Buscando…" : "Buscar"}
              </button>
            </div>
          </form>
        </div>

        {/* Loading */}
        {isLoading && receipts.length === 0 && (
          <div className="flex items-center gap-3 justify-center py-16 text-white/30 text-sm">
            <div className="w-5 h-5 border-2 border-white/10 border-t-indigo-400 rounded-full animate-spin" />
            Cargando recepciones…
          </div>
        )}

        {/* Empty */}
        {!isLoading && receipts.length === 0 && (
          <div className="glass rounded-2xl p-14 text-center fade-in">
            <span className="flex justify-center mb-3 text-white/15">
              <FiFileText size={30} />
            </span>
            <p className="text-white/30 text-sm">No se encontraron recepciones.</p>
          </div>
        )}

        {/* Cards */}
        {receipts.length > 0 && (
          <div className="space-y-3">
            {receipts.map((r, index) => {
              const isEditingRow = editingId === r.id;
              const refProp = index === receipts.length - 1 ? { ref: lastReceiptRef } : {};

              return (
                <div
                  key={r.id}
                  className="st-card glass rounded-2xl fade-in"
                  style={{ animationDelay: `${Math.min(index, 6) * 0.04}s` }}
                  {...refProp}
                >
                  {!isEditingRow ? (
                    /* ── View mode ── */
                    <div className="p-5">
                      {/* Top row */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="folio-badge-st flex-shrink-0">Folio# {r.id}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button className="btn-action-st btn-edit-st" onClick={() => startEditRow(r)} title="Editar" aria-label="Editar">
                              <FiEdit2 size={13} />
                            </button>
                            <button className="btn-action-st btn-del-st" onClick={() => deleteRow(r.id)} title="Eliminar" aria-label="Eliminar">
                              <FiTrash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <span className="font-display font-semibold text-lg text-white/90 break-words">
                          <span className="text-white/80 font-normal text-sm">Proveedor: </span>{r.supplier}
                        </span>
                      </div>

                      {/* Meta chips */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {r.orden && (
                          <span className="meta-chip-st">
                            <span className="text-blue-400">Factura</span> <strong>{r.orden}</strong>
                          </span>
                        )}
                        <span className="meta-chip-st">
                          <span className="text-white/90">Registrado por:</span> <strong>{r.created_by}</strong>
                        </span>
                        <span className="meta-chip-st">
                          {new Date(r.fecha).toLocaleString("es-CL", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Products */}
                      <div className="border-t border-blue-500/70 pt-3 mb-4">
                        <p className="field-label-st mb-2">Productos</p>
                        <div className="flex flex-col gap-1.5">
                          {r.productos.map((p, i) => (
                            <span key={i} className="meta-chip-st w-fit">
                              <strong>{p.nombre}</strong>
                              <span className="text-white/30">·</span>
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
                        <span className="font-display font-semibold text-base">Editando #{r.id}</span>
                        <div className="flex gap-2">
                          <button className="btn-action-st btn-save-st" onClick={saveEditRow} title="Guardar" aria-label="Guardar">
                            <FiSave size={13} /> Guardar
                          </button>
                          <button className="btn-action-st btn-cancel-st" onClick={cancelEditRow} title="Cancelar" aria-label="Cancelar">
                            <FiX size={13} /> Cancelar
                          </button>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="field-label-st">N° Factura</div>
                          <input
                            value={draft?.orden || ""}
                            onChange={(e) => setDraft((prev) => (prev ? { ...prev, orden: e.target.value } : prev))}
                            className="input-st w-full px-3 py-2.5"
                          />
                        </div>
                        <div>
                          <div className="field-label-st">Proveedor</div>
                          <SupplierSelector
                            value={draft?.supplier || ""}
                            onChange={(supplier) => setDraft((prev) => (prev ? { ...prev, supplier } : prev))}
                          />
                        </div>
                      </div>

                      {/* Products edit */}
                      <div className="border-t border-blue-500/70 pt-3 mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="field-label-st">Productos</p>
                          <button className="btn-action-st btn-add-prod-st" onClick={addRow} title="Agregar producto" aria-label="Agregar producto">
                            <FiPlus size={13} /> Agregar
                          </button>
                        </div>
                        <div className="space-y-2">
                          {draft?.productos.map((row, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                              <div className="relative col-span-6">
                                <input
                                  ref={(el) => { inputRefs.current[idx] = el; }}
                                  className="input-st w-full px-3 py-2"
                                  placeholder="Producto"
                                  value={row.nombre}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    updateRow(idx, { nombre: value });
                                    if (value) {
                                      const filtered = productList
                                        .filter((p) => normalizeSearch(p.name).includes(normalizeSearch(value)))
                                        .sort((a, b) => b.usage - a.usage)
                                        .map((p) => p.name);
                                      setSuggestions((prev) => ({ ...prev, [idx]: filtered }));
                                      const el = inputRefs.current[idx];
                                      if (el) {
                                        const rect = el.getBoundingClientRect();
                                        setDropdownPos((prev) => ({
                                          ...prev,
                                          [idx]: { top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX, width: rect.width },
                                        }));
                                      }
                                    } else {
                                      setSuggestions((prev) => ({ ...prev, [idx]: [] }));
                                    }
                                  }}
                                  onBlur={() => setTimeout(() => setSuggestions((prev) => ({ ...prev, [idx]: [] })), 150)}
                                />
                                {suggestions[idx]?.length > 0 && dropdownPos[idx] && createPortal(
                                  <ul
                                    style={{
                                      position: "absolute",
                                      top: dropdownPos[idx].top,
                                      left: dropdownPos[idx].left,
                                      width: dropdownPos[idx].width,
                                      zIndex: 99999,
                                      background: "#0F172A",
                                      border: "2px solid #6366F1",
                                      borderRadius: "16px",
                                      overflow: "auto",
                                      maxHeight: "240px",
                                      boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.95), 0 10px 15px -3px rgb(99 102 241 / 0.5)",
                                      fontSize: "14px",
                                    }}
                                  >
                                    {suggestions[idx].map((sug, i) => (
                                      <li
                                        key={i}
                                        style={{
                                          padding: "12px 16px",
                                          cursor: "pointer",
                                          color: "white",
                                          borderBottom: "1px solid rgba(255,255,255,0.1)",
                                          transition: "background 0.15s",
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
                                  </ul>,
                                  document.body
                                )}
                              </div>
                              <input
                                type="number"
                                className="input-st col-span-2 px-2 py-2 text-right"
                                placeholder="Cant."
                                value={row.cantidad}
                                onChange={(e) => updateRow(idx, { cantidad: parseFloat(e.target.value) || 0 })}
                              />
                              <select
                                className="select-st col-span-3 px-2 py-2"
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
                                <button className="btn-action-st btn-rem-prod-st" onClick={() => removeRow(idx)} title="Quitar" aria-label="Quitar">
                                  <FiMinus size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
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
            <button className="btn-load-more-st" onClick={() => setPage((prev) => prev + 1)}>
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
    </div>
  );
};

export default SupplierTracking;