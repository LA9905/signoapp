import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { normalizeSearch } from "../utils/normalizeSearch";
import { detectUnit } from "../utils/detectUnit";
import type { AxiosError } from "axios";
import { FiEdit2, FiTrash2, FiSave, FiX, FiPlus, FiMinus, FiDownload, FiSearch, FiFileText } from "react-icons/fi";
import ArrowBackButton from "../components/ArrowBackButton";
import { api } from "../services/http";
import * as XLSX from "xlsx";

interface ProductChangeSummary {
  id: number;
  nombre_persona: string;
  cliente: string | null;
  orden_compra: string | null;
  factura: string | null;
  comentario: string | null;
  created_by: string;
  fecha: string;
  productos: { nombre: string; cantidad: number; unidad: string; tipo: "entra" | "sale" }[];
}

interface Product {
  id: number;
  name: string;
}

type ProductoRow = { nombre: string; cantidad: number; unidad: string; tipo: "entra" | "sale" };
type ApiError = { error?: string };

type SearchState = {
  nombre_persona: string;
  cliente: string;
  user: string;
  product: string;
  date_from: string;
  date_to: string;
};

const ProductChangeTracking = () => {
  const [changes, setChanges] = useState<ProductChangeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [mensaje, setMensaje] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{
    nombre_persona: string;
    cliente: string;
    orden_compra: string;
    factura: string;
    comentario: string;
    productos: ProductoRow[];
    fecha: string;
  } | null>(null);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [productList, setProductList] = useState<{ name: string; usage: number }[]>([]);
  const [suggestions, setSuggestions] = useState<Record<number, string[]>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<Record<number, { top: number; left: number; width: number }>>({});
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [searchState, setSearchState] = useState<SearchState>({
    nombre_persona: "",
    cliente: "",
    user: "",
    product: "",
    date_from: "",
    date_to: "",
  });
  const [debouncedSearch, setDebouncedSearch] = useState<SearchState>(searchState);
  const searchStateRef = useRef<SearchState>(searchState);
  useEffect(() => { searchStateRef.current = searchState; }, [searchState]);

  const fetchControllerRef = useRef<AbortController | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastRef = useRef<HTMLDivElement | null>(null);

  const fetchProducts = async () => {
    try {
      const res = await api.get<Product[]>("/products");
      setProductNames(res.data.map((p) => p.name));
      setProductList(res.data.map((p) => ({ name: p.name, usage: (p as any).usage || 0 })));
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const fetchChanges = useCallback(
    async (params: SearchState, pageNum: number, append: boolean = false, signal?: AbortSignal) => {
      let scrollPosition = 0;
      if (!append) {
        scrollPosition = window.pageYOffset;
        if (fetchControllerRef.current) fetchControllerRef.current.abort();
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
        const response = await api.get<ProductChangeSummary[]>("/product-changes", {
          params: { ...params, page: pageNum, limit: 10 },
          headers: { "Cache-Control": "no-cache" },
          signal,
        });
        const newItems = response.data;
        setChanges((prev) => (append ? [...prev, ...newItems] : newItems));
        setHasMore(newItems.length === 10);
        setMensaje("");
      } catch (err: any) {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || err?.name === "AbortError") return;
        console.error("Error fetching product changes:", err);
        setMensaje("Error al cargar los cambios de producto");
      } finally {
        setIsLoading(false);
        if (!append) window.scrollTo(0, scrollPosition);
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
      (entries) => { if (entries[0].isIntersecting) setPage((prev) => prev + 1); },
      { threshold: 0.1 }
    );
    if (lastRef.current) observer.current.observe(lastRef.current);
    return () => { if (observer.current) observer.current.disconnect(); };
  }, [isLoading, hasMore]);

  useEffect(() => {
    if (page > 1) fetchChanges(debouncedSearch, page, true);
  }, [page, debouncedSearch, fetchChanges]);

  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(searchState);
    }, 300);
    return () => clearTimeout(id);
  }, [searchState]);

  useEffect(() => {
    fetchChanges(debouncedSearch, 1, false);
    return () => { if (fetchControllerRef.current) fetchControllerRef.current.abort(); };
  }, [debouncedSearch, fetchChanges]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setDebouncedSearch(searchState);
  };

  const startEditRow = (c: ProductChangeSummary) => {
    setEditingId(c.id);
    setDraft({
      nombre_persona: c.nombre_persona,
      cliente: c.cliente || "",
      orden_compra: c.orden_compra || "",
      factura: c.factura || "",
      comentario: c.comentario || "",
      productos: c.productos.map((p) => ({ ...p })),
      fecha: c.fecha.slice(0, 10),
    });
  };

  const cancelEditRow = () => {
    setEditingId(null);
    setDraft(null);
    setSuggestions({});
  };

  const saveRow = async (id: number) => {
    if (!draft) return;

    if (draft.productos.length === 0) {
      setValidationError("Debes tener al menos un producto (el que se queda o el que se lleva).");
      return;
    }
    for (const p of draft.productos) {
      if (!p.nombre || !p.nombre.trim()) {
        setValidationError("Hay un producto sin nombre. Selecciónalo de la lista o elimina la fila vacía.");
        return;
      }
      if (!productNames.map((n) => normalizeSearch(n)).includes(normalizeSearch(p.nombre.trim()))) {
        setValidationError(`El producto "${p.nombre}" no existe en el listado. Selecciónalo desde las sugerencias.`);
        return;
      }
      if (!p.cantidad || p.cantidad <= 0) {
        setValidationError(`El producto "${p.nombre}" tiene cantidad 0 o vacía.`);
        return;
      }
    }

    setIsLoading(true);
    try {
      const payload = {
        nombre_persona: draft.nombre_persona,
        cliente: draft.cliente || null,
        orden_compra: draft.orden_compra || null,
        factura: draft.factura || null,
        comentario: draft.comentario || null,
        fecha: draft.fecha,
        productos: draft.productos.map((p) => ({
          nombre: p.nombre, cantidad: p.cantidad, unidad: p.unidad, tipo: p.tipo,
        })),
      };
      const resp = await api.put<ProductChangeSummary>(`/product-changes/${id}`, payload);
      setChanges((prev) => prev.map((c) => (c.id === id ? { ...c, ...resp.data } : c)));
      setMensaje("Registro actualizado.");
      cancelEditRow();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      alert(error.response?.data?.error || "No se pudo actualizar");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRow = async (id: number) => {
    if (!window.confirm("¿Eliminar este registro? Esta acción es permanente.")) return;
    setIsLoading(true);
    try {
      await api.delete(`/product-changes/${id}`);
      setChanges((prev) => prev.filter((c) => c.id !== id));
      if (editingId === id) cancelEditRow();
      setMensaje("Registro eliminado");
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      alert(error.response?.data?.error || "No se pudo eliminar");
    } finally {
      setIsLoading(false);
    }
  };

  const addRow = (tipo: "entra" | "sale") => {
    if (!draft) return;
    setDraft({ ...draft, productos: [...draft.productos, { nombre: "", cantidad: 0, unidad: "unidades", tipo }] });
  };

  const removeRow = (idx: number) => {
    if (!draft) return;
    setDraft({ ...draft, productos: draft.productos.filter((_, i) => i !== idx) });
    setSuggestions((prev) => { const c = { ...prev }; delete c[idx]; return c; });
  };

  const updateRow = (idx: number, patch: Partial<ProductoRow>) => {
    if (!draft) return;
    setDraft({ ...draft, productos: draft.productos.map((r, i) => (i === idx ? { ...r, ...patch } : r)) });
  };

  return (
    <div className="page-shell min-h-screen bg-[#080C14] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        .font-display { font-family: 'Syne', sans-serif; }
        .glass { background: rgba(30,40,80,0.35); border: 1px solid rgba(99,102,241,0.18); }

        .input-pt2 {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          color: white; border-radius: 10px; font-size: 14px;
        }
        .input-pt2::placeholder { color: rgba(255,255,255,0.2); }
        .input-pt2:focus { outline: none; border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }

        .select-pt2 {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.75); border-radius: 10px; font-size: 14px;
        }
        .select-pt2 option { background: #111827; color: white; }

        .btn-action-pt {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 500;
          border: 1px solid transparent; transition: all .15s; cursor: pointer; white-space: nowrap;
        }
        .btn-edit-pt { background: rgba(96,165,250,0.08); border-color: rgba(96,165,250,0.25); color: #60A5FA; }
        .btn-edit-pt:hover { background: rgba(96,165,250,0.18); }
        .btn-del-pt { background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.25); color: #F87171; }
        .btn-del-pt:hover { background: rgba(248,113,113,0.18); }
        .btn-save-pt { background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.2); color: #6EE7B7; }
        .btn-save-pt:hover { background: rgba(52,211,153,0.18); }
        .btn-cancel-pt { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.25); color: rgba(255,255,255,0.9); }
        .btn-cancel-pt:hover { background: rgba(255,255,255,0.08); }
        .btn-add-prod-pt { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.25); color: #A5B4FC; padding: 6px 10px; }
        .btn-rem-prod-pt { background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.2); color: #FCA5A5; padding: 6px 8px; }

        .btn-primary-search-pt {
          background: linear-gradient(135deg, #4F46E5, #6366F1); color: white; border: none; border-radius: 10px;
          padding: 10px 22px; font-size: 14px; font-weight: 600; cursor: pointer;
        }

        .btn-excel-pt {
          display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 9px;
          font-size: 13px; font-weight: 500; background: rgba(52,211,153,0.08);
          border: 1px solid rgba(52,211,153,0.2); color: #6EE7B7; cursor: pointer;
        }

        .btn-load-more-pt {
          background: rgba(52,211,153,0.6); border: 1px solid rgba(52,211,153,0.35); color: white;
          padding: 10px 30px; border-radius: 10px; font-size: 14px; cursor: pointer;
        }

        .field-label-pt { font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: rgba(255,255,255,0.9); margin-bottom: 4px; }

        .meta-chip-pt {
          display: inline-flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07); border-radius: 6px; padding: 4px 10px; font-size: 12px; color: rgba(255,255,255,0.9);
        }
        .meta-chip-pt strong { font-weight: 500; }

        .folio-badge-pt {
          font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: .08em;
          background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.2);
          color: #A5B4FC; border-radius: 5px; padding: 2px 8px;
        }

        .tipo-chip-entra {
          font-size: 11px; font-weight: 600; background: rgba(52,211,153,0.1);
          border: 1px solid rgba(52,211,153,0.25); color: #6EE7B7; border-radius: 5px; padding: 2px 8px;
        }
        .tipo-chip-sale {
          font-size: 11px; font-weight: 600; background: rgba(248,113,113,0.1);
          border: 1px solid rgba(248,113,113,0.25); color: #F87171; border-radius: 5px; padding: 2px 8px;
        }

        .pt-card { transition: background .12s; }
        .pt-card:hover { background: rgba(99,102,241,0.08); }

        @keyframes fade-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fade-in .25s ease both; }

        /* ─── Modo claro ─── */
        body[data-theme="light"] .glass { background: #FFFFFF; border: 1px solid rgba(99,102,241,0.15); box-shadow: 0 1px 3px rgba(15,23,42,0.04); }
        body[data-theme="light"] .input-pt2 { background: #FFFFFF; border: 1px solid rgba(15,23,42,0.12); color: #0F172A; }
        body[data-theme="light"] .input-pt2::placeholder { color: rgba(15,23,42,0.3); }
        body[data-theme="light"] .select-pt2 { background: #FFFFFF; border: 1px solid rgba(15,23,42,0.12); color: rgba(15,23,42,0.75); }
        body[data-theme="light"] .select-pt2 option { background: #FFFFFF; color: #0F172A; }
        body[data-theme="light"] .field-label-pt { color: rgba(15,23,42,0.5); }
        body[data-theme="light"] .meta-chip-pt { background: rgba(15,23,42,0.03); border: 1px solid rgba(15,23,42,0.08); color: rgba(15,23,42,0.7); }
        body[data-theme="light"] .folio-badge-pt { background: rgba(99,102,241,0.08); border-color: rgba(99,102,241,0.22); color: #4338CA; }
        body[data-theme="light"] .tipo-chip-entra { background: rgba(5,150,105,0.08); border-color: rgba(5,150,105,0.22); color: #059669; }
        body[data-theme="light"] .tipo-chip-sale { background: rgba(220,38,38,0.08); border-color: rgba(220,38,38,0.22); color: #DC2626; }
        body[data-theme="light"] .pt-card:hover { background: rgba(99,102,241,0.05); }
        body[data-theme="light"] .btn-edit-pt { background: rgba(37,99,235,0.06); border-color: rgba(37,99,235,0.3); color: #2563EB; }
        body[data-theme="light"] .btn-del-pt { background: rgba(220,38,38,0.06); border-color: rgba(220,38,38,0.3); color: #DC2626; }
        body[data-theme="light"] .btn-save-pt { background: rgba(5,150,105,0.08); border-color: rgba(5,150,105,0.25); color: #059669; }
        body[data-theme="light"] .btn-cancel-pt { background: rgba(15,23,42,0.04); border-color: rgba(15,23,42,0.12); color: rgba(15,23,42,0.7); }
        body[data-theme="light"] .btn-add-prod-pt { background: rgba(99,102,241,0.08); border-color: rgba(99,102,241,0.25); color: #4338CA; }
        body[data-theme="light"] .btn-rem-prod-pt { background: rgba(220,38,38,0.06); border-color: rgba(220,38,38,0.2); color: #DC2626; }
        body[data-theme="light"] .btn-excel-pt { background: rgba(5,150,105,0.08); border-color: rgba(5,150,105,0.2); color: #059669; }
      `}</style>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8"><ArrowBackButton /></div>

        <div className="flex items-start justify-between gap-4 mb-8 fade-in">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Cambios de Productos</h1>
            <p className="text-sm text-white/30">Seguimiento de productos cambiados por clientes</p>
          </div>
          {changes.length > 0 && (
            <button
              className="btn-excel-pt flex-shrink-0"
              onClick={async () => {
                try {
                  const res = await api.get<ProductChangeSummary[]>("/product-changes", { params: { ...debouncedSearch, all: 1 } });
                  const data = res.data.map((c) => ({
                    "Persona": c.nombre_persona,
                    "Cliente": c.cliente || "",
                    "Orden de compra": c.orden_compra || "",
                    "Factura": c.factura || "",
                    "Comentario": c.comentario || "",
                    "Registrado por": c.created_by,
                    "Fecha": new Date(c.fecha).toLocaleString(),
                    "Producto(s) que quedó": c.productos.filter((p) => p.tipo === "entra").map((p) => `${p.nombre}: ${p.cantidad} ${p.unidad}`).join("; "),
                    "Producto(s) que se llevó": c.productos.filter((p) => p.tipo === "sale").map((p) => `${p.nombre}: ${p.cantidad} ${p.unidad}`).join("; "),
                  }));
                  const ws = XLSX.utils.json_to_sheet(data);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Cambios de Productos");
                  XLSX.writeFile(wb, "cambios_de_productos.xlsx");
                } catch (err) {
                  alert("Error al exportar los datos.");
                }
              }}
            >
              <FiDownload size={14} /> Exportar Excel
            </button>
          )}
        </div>

        {mensaje && (
          <div className="mb-5 px-4 py-3 rounded-xl text-sm text-emerald-300 fade-in" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.18)" }}>
            {mensaje}
          </div>
        )}

        <div className="mb-6">
          <form onSubmit={handleSearchSubmit} className="glass rounded-2xl p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { name: "nombre_persona", placeholder: "Nombre chofer/persona" },
                { name: "cliente", placeholder: "Cliente" },
                { name: "user", placeholder: "Usuario que registró" },
                { name: "product", placeholder: "Producto" },
              ].map((f) => (
                <div key={f.name} className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none flex"><FiSearch size={12} /></span>
                  <input
                    name={f.name}
                    value={(searchState as any)[f.name]}
                    onChange={handleSearchChange}
                    placeholder={f.placeholder}
                    className="input-pt2 w-full pl-8 pr-3 py-2.5"
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="field-label-pt">Desde</div>
                <input name="date_from" type="date" value={searchState.date_from} onChange={handleSearchChange} className="input-pt2 w-full px-3 py-2.5" />
              </div>
              <div>
                <div className="field-label-pt">Hasta</div>
                <input name="date_to" type="date" value={searchState.date_to} onChange={handleSearchChange} className="input-pt2 w-full px-3 py-2.5" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary-search-pt" disabled={isLoading}>{isLoading ? "Buscando…" : "Buscar"}</button>
            </div>
          </form>
        </div>

        {isLoading && changes.length === 0 && (
          <div className="flex items-center gap-3 justify-center py-16 text-white/30 text-sm">
            <div className="w-5 h-5 border-2 border-white/10 border-t-indigo-400 rounded-full animate-spin" />
            Cargando…
          </div>
        )}

        {!isLoading && changes.length === 0 && (
          <div className="glass rounded-2xl p-14 text-center fade-in">
            <span className="flex justify-center mb-3 text-white/15"><FiFileText size={30} /></span>
            <p className="text-white/30 text-sm">No se encontraron registros.</p>
          </div>
        )}

        {changes.length > 0 && (
          <div className="space-y-3">
            {changes.map((c, index) => {
              const isEditingRow = editingId === c.id;
              const refProp = index === changes.length - 1 ? { ref: lastRef } : {};
              const productosEntra = c.productos.filter((p) => p.tipo === "entra");
              const productosSale = c.productos.filter((p) => p.tipo === "sale");

              return (
                <div key={c.id} className="pt-card glass rounded-2xl fade-in" style={{ animationDelay: `${Math.min(index, 6) * 0.04}s` }} {...refProp}>
                  {!isEditingRow ? (
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="folio-badge-pt">Folio# {c.id}</span>
                        <div className="flex items-center gap-1.5">
                          <button className="btn-action-pt btn-edit-pt" onClick={() => startEditRow(c)}><FiEdit2 size={13} /></button>
                          <button className="btn-action-pt btn-del-pt" onClick={() => deleteRow(c.id)}><FiTrash2 size={13} /></button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="meta-chip-pt"><span>Persona:</span> <strong>{c.nombre_persona}</strong></span>
                        {c.cliente && <span className="meta-chip-pt"><span>Cliente:</span> <strong>{c.cliente}</strong></span>}
                        {c.orden_compra && <span className="meta-chip-pt"><span>OC:</span> <strong>{c.orden_compra}</strong></span>}
                        {c.factura && <span className="meta-chip-pt"><span>Factura:</span> <strong>{c.factura}</strong></span>}
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="meta-chip-pt"><span>Registrado por:</span> <strong>{c.created_by}</strong></span>
                        <span className="meta-chip-pt">
                          {new Date(c.fecha).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {c.comentario && (
                        <p className="text-sm text-white/80 mb-4 leading-relaxed">
                          <span className="not-italic font-semibold text-xs uppercase tracking-wide">Comentario: </span>
                          <span className="italic">"{c.comentario}"</span>
                        </p>
                      )}

                      <div className="border-t border-blue-500/70 pt-3">
                        {productosEntra.length > 0 && (
                          <div className="mb-3">
                            <p className="field-label-pt mb-2">Quedó (suma stock)</p>
                            <div className="flex flex-col gap-1.5">
                              {productosEntra.map((p, i) => (
                                <span key={i} className="tipo-chip-entra w-fit">{p.nombre} · {p.cantidad} {p.unidad}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {productosSale.length > 0 && (
                          <div>
                            <p className="field-label-pt mb-2">Se llevó (resta stock)</p>
                            <div className="flex flex-col gap-1.5">
                              {productosSale.map((p, i) => (
                                <span key={i} className="tipo-chip-sale w-fit">{p.nombre} · {p.cantidad} {p.unidad}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-5">
                        <span className="font-display font-semibold text-base">Editando #{c.id}</span>
                        <div className="flex gap-2">
                          <button className="btn-action-pt btn-save-pt" onClick={() => saveRow(c.id)}><FiSave size={13} /> Guardar</button>
                          <button className="btn-action-pt btn-cancel-pt" onClick={cancelEditRow}><FiX size={13} /> Cancelar</button>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="field-label-pt">Persona</div>
                          <input value={draft?.nombre_persona || ""} onChange={(e) => setDraft((prev) => prev ? { ...prev, nombre_persona: e.target.value } : prev)} className="input-pt2 w-full px-3 py-2.5" />
                        </div>
                        <div>
                          <div className="field-label-pt">Cliente</div>
                          <input value={draft?.cliente || ""} onChange={(e) => setDraft((prev) => prev ? { ...prev, cliente: e.target.value } : prev)} className="input-pt2 w-full px-3 py-2.5" />
                        </div>
                        <div>
                          <div className="field-label-pt">N° Orden de compra</div>
                          <input value={draft?.orden_compra || ""} onChange={(e) => setDraft((prev) => prev ? { ...prev, orden_compra: e.target.value } : prev)} className="input-pt2 w-full px-3 py-2.5" />
                        </div>
                        <div>
                          <div className="field-label-pt">N° Factura</div>
                          <input value={draft?.factura || ""} onChange={(e) => setDraft((prev) => prev ? { ...prev, factura: e.target.value } : prev)} className="input-pt2 w-full px-3 py-2.5" />
                        </div>
                        <div>
                          <div className="field-label-pt">Fecha</div>
                          <input type="date" value={draft?.fecha || ""} onChange={(e) => setDraft((prev) => prev ? { ...prev, fecha: e.target.value } : prev)} className="input-pt2 w-full px-3 py-2.5" />
                        </div>
                        <div className="sm:col-span-2">
                          <div className="field-label-pt">Comentario</div>
                          <input value={draft?.comentario || ""} onChange={(e) => setDraft((prev) => prev ? { ...prev, comentario: e.target.value } : prev)} className="input-pt2 w-full px-3 py-2.5" />
                        </div>
                      </div>

                      {(["entra", "sale"] as const).map((tipo) => (
                        <div className="border-t border-blue-500/70 pt-3 mb-4" key={tipo}>
                          <div className="flex items-center justify-between mb-3">
                            <p className="field-label-pt">{tipo === "entra" ? "Quedó (suma stock)" : "Se llevó (resta stock)"}</p>
                            <button className="btn-action-pt btn-add-prod-pt" onClick={() => addRow(tipo)}><FiPlus size={13} /> Agregar</button>
                          </div>
                          <div className="space-y-2">
                            {draft?.productos.map((row, idx) => {
                              if (row.tipo !== tipo) return null;
                              return (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                  <div className="relative col-span-6">
                                    <input
                                      ref={(el) => { inputRefs.current[idx] = el; }}
                                      className="input-pt2 w-full px-3 py-2"
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
                                            setDropdownPos((prev) => ({ ...prev, [idx]: { top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX, width: rect.width } }));
                                          }
                                        } else {
                                          setSuggestions((prev) => ({ ...prev, [idx]: [] }));
                                        }
                                      }}
                                      onBlur={() => setTimeout(() => setSuggestions((prev) => ({ ...prev, [idx]: [] })), 150)}
                                    />
                                    {suggestions[idx]?.length > 0 && dropdownPos[idx] && createPortal(
                                      <ul style={{ position: "absolute", top: dropdownPos[idx].top, left: dropdownPos[idx].left, width: dropdownPos[idx].width, zIndex: 99999, background: "#0F172A", border: "2px solid #6366F1", borderRadius: "16px", overflow: "auto", maxHeight: "240px", boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.95)", fontSize: "14px" }}>
                                        {suggestions[idx].map((sug, i) => (
                                          <li key={i} style={{ padding: "12px 16px", cursor: "pointer", color: "white", borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = "#1E40AF")}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                            onMouseDown={() => { updateRow(idx, { nombre: sug, unidad: detectUnit(sug) }); setSuggestions((prev) => ({ ...prev, [idx]: [] })); }}
                                          >{sug}</li>
                                        ))}
                                      </ul>, document.body
                                    )}
                                  </div>
                                  <input type="number" className="input-pt2 col-span-2 px-2 py-2 text-right" placeholder="Cant." value={row.cantidad} onChange={(e) => updateRow(idx, { cantidad: parseFloat(e.target.value) || 0 })} />
                                  <select className="select-pt2 col-span-3 px-2 py-2" value={row.unidad} onChange={(e) => updateRow(idx, { unidad: e.target.value })}>
                                    <option value="unidades">Unidades</option>
                                    <option value="kg">Kilogramos</option>
                                    <option value="lt">Litros</option>
                                    <option value="cajas">Cajas</option>
                                    <option value="PQT">Paquetes</option>
                                  </select>
                                  <div className="col-span-1 flex justify-end">
                                    <button className="btn-action-pt btn-rem-prod-pt" onClick={() => removeRow(idx)}><FiMinus size={13} /></button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {hasMore && !isLoading && (
          <div className="text-center mt-6">
            <button className="btn-load-more-pt" onClick={() => setPage((prev) => prev + 1)}>Cargar más</button>
          </div>
        )}
      </div>

      {validationError && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl p-6 max-w-md w-full fade-in" style={{ background: "#111827", border: "1px solid rgba(248,113,113,0.2)" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(248,113,113,0.15)" }}>
                <span className="text-red-400 flex"><FiX size={14} /></span>
              </div>
              <h3 className="font-display font-semibold text-red-400">Error al guardar</h3>
            </div>
            <p className="text-sm text-white/55 mb-5 leading-relaxed">{validationError}</p>
            <button className="w-full py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, #4F46E5, #6366F1)" }} onClick={() => setValidationError(null)}>
              Entendido, voy a corregirlo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductChangeTracking;