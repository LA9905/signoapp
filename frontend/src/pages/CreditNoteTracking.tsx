import { useEffect, useRef, useState, useCallback, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { normalizeSearch } from "../utils/normalizeSearch";
import type { AxiosError } from "axios";
import { FiEdit2, FiTrash2, FiSave, FiX, FiPlus, FiMinus, FiDownload, FiPrinter, FiSearch, FiFileText } from "react-icons/fi";
import ClientSelector from "../components/ClientSelector";
import ArrowBackButton from "../components/ArrowBackButton";
import { api } from "../services/http";
import * as XLSX from "xlsx";

interface CreditNoteSummary {
  id: number;
  client: string;
  order_number: string;
  invoice_number: string;
  credit_note_number: string;
  reason: string;
  created_by: string;
  fecha: string;
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
type ApiError = { error?: string; details?: string; msg?: string };

type SearchState = {
  client: string;
  order_number: string;
  invoice_number: string;
  credit_note_number: string;
  reason: string;
  user: string;
  product: string;
  date_from: string;
  date_to: string;
};

const CreditNoteTracking = () => {
  const [creditNotes, setCreditNotes] = useState<CreditNoteSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [mensaje, setMensaje] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{
    client: string;
    order_number: string;
    invoice_number: string;
    credit_note_number: string;
    reason: string;
    productos: ProductoRow[];
  } | null>(null);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Record<number, string[]>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<Record<number, { top: number; left: number; width: number }>>({});
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [searchState, setSearchState] = useState<SearchState>({
    client: "", order_number: "", invoice_number: "",
    credit_note_number: "", reason: "", user: "",
    product: "", date_from: "", date_to: "",
  });
  const [debouncedSearch, setDebouncedSearch] = useState<SearchState>(searchState);
  const searchStateRef = useRef<SearchState>(searchState);
  useEffect(() => { searchStateRef.current = searchState; }, [searchState]);

  const fetchControllerRef = useRef<AbortController | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastCreditNoteRef = useRef<HTMLDivElement | null>(null);

  const fetchProducts = async () => {
    try {
      const res = await api.get<Product[]>("/products");
      setProductNames(res.data.map((p) => p.name));
    } catch (err) {
      console.error("Error fetching products:", err);
      setMensaje("Error al cargar lista de productos");
    }
  };

  const fetchCreditNotes = useCallback(
    async (params: SearchState, pageNum: number, append = false, signal?: AbortSignal) => {
      let scrollPosition = 0;
      if (!append) {
        scrollPosition = window.pageYOffset;
        if (fetchControllerRef.current) fetchControllerRef.current.abort();
        if (!signal) {
          const c = new AbortController();
          fetchControllerRef.current = c;
          signal = c.signal;
        } else { fetchControllerRef.current = null; }
      }
      setIsLoading(true);
      try {
        const response = await api.get<CreditNoteSummary[]>("/credit-notes", {
          params: { ...params, page: pageNum, limit: 10 },
          headers: { "Cache-Control": "no-cache" },
          signal,
        });
        const newCreditNotes = response.data;
        setCreditNotes((prev) => (append ? [...prev, ...newCreditNotes] : newCreditNotes));
        setHasMore(newCreditNotes.length === 10);
        setMensaje("");
      } catch (err: any) {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || err?.name === "AbortError") return;
        setMensaje("Error al cargar notas de crédito");
      } finally {
        setIsLoading(false);
        if (!append) window.scrollTo(0, scrollPosition);
      }
    }, []
  );

  useEffect(() => {
    fetchProducts();
    setDebouncedSearch(searchState);
    const onFocus = () => { fetchProducts(); setDebouncedSearch(searchStateRef.current); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    if (isLoading || !hasMore) return;
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setPage((prev) => prev + 1);
    }, { threshold: 0.1 });
    if (lastCreditNoteRef.current) observer.current.observe(lastCreditNoteRef.current);
    return () => { if (observer.current) observer.current.disconnect(); };
  }, [isLoading, hasMore]);

  useEffect(() => { if (page > 1) fetchCreditNotes(debouncedSearch, page, true); }, [page, debouncedSearch, fetchCreditNotes]);

  useEffect(() => {
    const id = setTimeout(() => { setPage(1); setDebouncedSearch(searchState); }, 300);
    return () => clearTimeout(id);
  }, [searchState]);

  useEffect(() => {
    fetchCreditNotes(debouncedSearch, 1, false);
    return () => { if (fetchControllerRef.current) fetchControllerRef.current.abort(); };
  }, [debouncedSearch, fetchCreditNotes]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fetchControllerRef.current) fetchControllerRef.current.abort();
    (async () => {
      const controller = new AbortController();
      fetchControllerRef.current = controller;
      setIsLoading(true);
      try {
        const response = await api.get<CreditNoteSummary[]>("/credit-notes", {
          params: { ...searchState, page: 1, limit: 10 },
          headers: { "Cache-Control": "no-cache" },
          signal: controller.signal,
        });
        setCreditNotes(response.data);
        setHasMore(response.data.length === 10);
        setMensaje("");
        setPage(1);
        setDebouncedSearch(searchState);
      } catch (err: any) {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || err?.name === "AbortError") return;
        setMensaje("Error al cargar notas de crédito");
      } finally { setIsLoading(false); }
    })();
  };

  const startEditRow = (cn: CreditNoteSummary) => {
    setEditingId(cn.id);
    setDraft({
      client: cn.client, order_number: cn.order_number,
      invoice_number: cn.invoice_number, credit_note_number: cn.credit_note_number,
      reason: cn.reason, productos: cn.productos.map((p) => ({ ...p })),
    });
  };

  const cancelEditRow = () => { setEditingId(null); setDraft(null); setSuggestions({}); };

  const saveEditRow = async () => {
    if (!draft || !editingId) return;
    for (const p of draft.productos) {
      if (!p.nombre || !p.nombre.trim()) { setValidationError("Hay un producto sin nombre. Por favor selecciona un producto de la lista o elimina la fila vacía."); return; }
      if (!productNames.map(n => normalizeSearch(n)).includes(normalizeSearch(p.nombre.trim()))) { setValidationError(`El producto "${p.nombre}" no existe en el listado. Por favor selecciónalo desde las sugerencias o elimina esa fila.`); return; }
      if (!p.cantidad || p.cantidad <= 0) { setValidationError(`El producto "${p.nombre}" tiene cantidad 0 o vacía. Por favor ingresa una cantidad válida.`); return; }
    }
    setIsLoading(true);
    const payload = {
      client: draft.client, order_number: draft.order_number,
      invoice_number: draft.invoice_number, credit_note_number: draft.credit_note_number,
      reason: draft.reason,
      productos: draft.productos.map((p) => ({ nombre: p.nombre, cantidad: p.cantidad, unidad: p.unidad })),
    };
    try {
      const response = await api.put<CreditNoteSummary>(`/credit-notes/${editingId}`, payload);
      const updated = response.data;
      setCreditNotes((prev) => prev.map((cn) => (cn.id === editingId ? { ...cn, ...updated } : cn)));
      setMensaje("Nota de crédito actualizada correctamente");
      if (window.confirm("¿Desea imprimir la nota de crédito actualizada?")) printPDF(editingId);
      cancelEditRow();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      const errCode = error.response?.data?.error;
      const errMsg = error.response?.data?.msg || "";
      const duplicateCodes = ["duplicate_order","duplicate_invoice","duplicate_credit","duplicate_order_invoice","duplicate_order_credit","duplicate_invoice_credit","duplicate_all"];
      if (error.response?.status === 409 && errCode && duplicateCodes.includes(errCode)) {
        if (window.confirm(errMsg)) {
          try {
            const response = await api.put<CreditNoteSummary>(`/credit-notes/${editingId}`, { ...payload, force: true });
            const updated = response.data;
            setCreditNotes((prev) => prev.map((cn) => (cn.id === editingId ? { ...cn, ...updated } : cn)));
            setMensaje("Nota de crédito actualizada correctamente");
            if (window.confirm("¿Desea imprimir la nota de crédito actualizada?")) printPDF(editingId);
            cancelEditRow();
          } catch { alert("No se pudo actualizar la nota de crédito"); }
        }
      } else { alert(error.response?.data?.error || "No se pudo actualizar la nota de crédito"); }
    } finally { setIsLoading(false); }
  };

  const deleteRow = async (id: number) => {
    if (!window.confirm("¿Eliminar esta nota de crédito? Esta acción es permanente y revertirá el stock.")) return;
    setIsLoading(true);
    try {
      await api.delete(`/credit-notes/${id}`);
      setCreditNotes((prev) => prev.filter((cn) => cn.id !== id));
      if (editingId === id) cancelEditRow();
      setMensaje("Nota de crédito eliminada y stock revertido");
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      alert(error.response?.data?.error || "No se pudo eliminar la nota de crédito");
    } finally { setIsLoading(false); }
  };

  const addRow = () => { if (!draft) return; setDraft({ ...draft, productos: [...draft.productos, { nombre: "", cantidad: 0, unidad: "unidades" }] }); };
  const removeRow = (idx: number) => {
    if (!draft) return;
    setDraft({ ...draft, productos: draft.productos.filter((_, i) => i !== idx) });
    setSuggestions((prev) => { const c = { ...prev }; delete c[idx]; return c; });
  };
  const updateRow = (idx: number, patch: Partial<ProductoRow>) => {
    if (!draft) return;
    setDraft({ ...draft, productos: draft.productos.map((r, i) => (i === idx ? { ...r, ...patch } : r)) });
  };

  const downloadPDF = async (id: number) => {
    try {
      const resp = await api.get(`/print-credit-note/${id}`, { responseType: "blob", params: { format: "pos80" } });
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `nota_credito_${id}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (err) { console.error("Error descargando PDF:", err); setMensaje("No se pudo descargar el PDF"); }
  };

  const printPDF = async (id: number) => {
    try {
      const resp = await api.get(`/print-credit-note/${id}`, { responseType: "blob", params: { inline: "1", format: "pos80" } });
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (w) { setTimeout(() => { try { w.print(); } catch (e) { console.warn(e); } }, 500); } else { window.location.href = url; }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) { console.error("Error abriendo PDF:", err); setMensaje("No se pudo abrir el PDF para imprimir"); }
  };

  return (
    <div className="min-h-screen bg-[#080C14] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .font-display { font-family: 'Syne', sans-serif; }

        .glass { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); }
        .glass-hover:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.12); }

        .input-cn {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: white; border-radius: 10px;
          transition: border-color .15s, box-shadow .15s;
          font-size: 15px;
        }
        .input-cn::placeholder { color: rgba(255,255,255,0.2); }
        .input-cn:focus { outline: none; border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }

        .select-cn {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.75); border-radius: 10px;
          font-size: 13px; transition: border-color .15s;
        }
        .select-cn:focus { outline: none; border-color: rgba(99,102,241,0.5); }
        .select-cn option { background: #111827; color: white; }

        .btn-action {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 6px; padding: 6px 12px; border-radius: 8px;
          font-size: 12px; font-weight: 500;
          border: 1px solid transparent;
          transition: all .15s; cursor: pointer;
          white-space: nowrap;
        }

        .btn-pdf { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.2); color: #93C5FD; }
        .btn-pdf:hover { background: rgba(59,130,246,0.18); border-color: rgba(59,130,246,0.35); }

        .btn-print { background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.2); color: #6EE7B7; }
        .btn-print:hover { background: rgba(52,211,153,0.18); border-color: rgba(52,211,153,0.35); }

        .btn-edit { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); }
        .btn-edit:hover { background: rgba(96,165,250,0.1); border-color: rgba(96,165,250,0.3); color: #60A5FA; }

        .btn-del { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); }
        .btn-del:hover { background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.3); color: #F87171; }

        .btn-save { background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.2); color: #6EE7B7; }
        .btn-save:hover { background: rgba(52,211,153,0.18); border-color: rgba(52,211,153,0.35); }

        .btn-cancel { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.25); color: rgba(255,255,255,0.9); }
        .btn-cancel:hover { background: rgba(255,255,255,0.08); border-color: rgba(99,102,241,0.25); color: white; }

        .btn-add-prod { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.25); color: #A5B4FC; padding: 6px 10px; }
        .btn-add-prod:hover { background: rgba(99,102,241,0.18); }

        .btn-rem-prod { background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.2); color: #FCA5A5; padding: 6px 8px; }
        .btn-rem-prod:hover { background: rgba(248,113,113,0.15); }

        .btn-primary-search {
          background: linear-gradient(135deg, #4F46E5, #6366F1);
          box-shadow: 0 4px 16px rgba(99,102,241,0.3);
          color: white; border: none; border-radius: 10px;
          padding: 9px 20px; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all .15s;
        }
        .btn-primary-search:hover { box-shadow: 0 6px 20px rgba(99,102,241,0.4); transform: translateY(-1px); }
        .btn-primary-search:disabled { opacity: .5; cursor: not-allowed; transform: none; }

        .btn-excel {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 9px; font-size: 12px; font-weight: 500;
          background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.2); color: #6EE7B7;
          cursor: pointer; transition: all .15s;
        }
        .btn-excel:hover { background: rgba(52,211,153,0.14); border-color: rgba(52,211,153,0.35); }

        .btn-load-more {
          background: rgba(52,211,153,0.6); border: 1px solid rgba(52,211,153,0.35);
          color: rgba(255,255,255,0.9); padding: 9px 28px; border-radius: 10px;
          font-size: 13px; font-weight: 500; cursor: pointer; transition: all .15s;
        }
        .btn-load-more:hover { background: rgba(59,130,246,0.35); color: white; }

        .field-label { font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: rgba(255,255,255,0.9); margin-bottom: 4px; }

        .meta-chip {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 6px; padding: 3px 8px; font-size: 13px; color: rgba(255,255,255,0.9);
        }
        .meta-chip strong { color: rgba(255,255,255,0.9); font-weight: 500; }

        .folio-badge {
          font-family: 'DM Mono', monospace;
          font-size: 12px; letter-spacing: .08em;
          background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.2);
          color: #A5B4FC; border-radius: 5px; padding: 2px 7px;
        }

        .cn-card { transition: background .12s; }
        .cn-card:hover { background: rgba(255,255,255,0.035); }

        .filter-toggle {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 9px; font-size: 13px; font-weight: 500;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.55); cursor: pointer; transition: all .15s;
        }
        .filter-toggle:hover { background: rgba(255,255,255,0.07); color: white; }
        .filter-toggle.active { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.25); color: #A5B4FC; }

        .filter-badge {
          background: #6366F1; color: white; border-radius: 50%;
          width: 16px; height: 16px; font-size: 10px; font-weight: 700;
          display: inline-flex; align-items: center; justify-content: center;
        }

        @keyframes slide-down { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .slide-down { animation: slide-down .2s ease both; }

        @keyframes fade-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fade-in .25s ease both; }

        .textarea-cn { resize: vertical; min-height: 80px; }

        .suggestion-list {
        isolation: isolate;
        }
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
              Notas de Crédito
            </h1>
            <p className="text-sm text-white/30">Seguimiento y gestión de devoluciones</p>
          </div>

          {creditNotes.length > 0 && (
            <button
              className="btn-excel flex-shrink-0"
              title="Descargar Excel"
              aria-label="Descargar Excel"
              onClick={async () => {
                try {
                  const res = await api.get<CreditNoteSummary[]>("/credit-notes", { params: { ...debouncedSearch, all: 1 } });
                  const fullCreditNotes = res.data;
                  const totals: Record<string, number> = {};
                  fullCreditNotes.forEach((cn) => { cn.productos.forEach((p) => { totals[p.nombre] = (totals[p.nombre] || 0) + p.cantidad; }); });
                  const data = fullCreditNotes.map((cn) => ({
                    "Centro de Costo": cn.client, "N° Orden": cn.order_number, "N° Factura": cn.invoice_number,
                    "N° Nota de Crédito": cn.credit_note_number, "Motivo": cn.reason,
                    "Ingresado por": cn.created_by, "Fecha": new Date(cn.fecha).toLocaleString(),
                    "Productos": cn.productos.map((p) => `${p.nombre}: ${p.cantidad} ${p.unidad}`).join("; "),
                  }));
                  data.push({ "Centro de Costo": "", "N° Orden": "", "N° Factura": "", "N° Nota de Crédito": "", "Motivo": "", "Ingresado por": "", "Fecha": "", "Productos": "" });
                  data.push({ "Centro de Costo": "Totales por Producto", "N° Orden": "", "N° Factura": "", "N° Nota de Crédito": "", "Motivo": "", "Ingresado por": "", "Fecha": "", "Productos": "" });
                  Object.entries(totals).forEach(([producto, total]) => {
                    data.push({ "Centro de Costo": producto, "N° Orden": "", "N° Factura": "", "N° Nota de Crédito": "", "Motivo": "", "Ingresado por": "", "Fecha": "", "Productos": `Total: ${total}` });
                  });
                  const ws = XLSX.utils.json_to_sheet(data);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Notas de Crédito");
                  XLSX.writeFile(wb, "notas_credito_filtradas.xlsx");
                } catch (err) { console.error(err); alert("Error al cargar los datos para la exportación."); }
              }}
            >
              <FiDownload size={14} />
              Exportar Excel
            </button>
          )}
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className="mb-5 px-4 py-3 rounded-xl text-sm text-emerald-300 fade-in"
            style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.18)" }}>
            {mensaje}
          </div>
        )}

        {/* Search form */}
        <div className="mb-6">
          <form onSubmit={handleSearchSubmit} className="glass rounded-2xl p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { name: "client", placeholder: "Centro de costo" },
                  { name: "order_number", placeholder: "N° Orden" },
                  { name: "invoice_number", placeholder: "N° Factura" },
                  { name: "credit_note_number", placeholder: "N° Nota de crédito" },
                  { name: "reason", placeholder: "Motivo" },
                  { name: "product", placeholder: "Producto" },
                ].map((f) => (
                  <div key={f.name} className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none flex"><FiSearch size={12} /></span>
                    <input
                      name={f.name}
                      value={(searchState as any)[f.name]}
                      onChange={handleSearchChange}
                      placeholder={f.placeholder}
                      className="input-cn w-full pl-8 pr-3 py-2.5"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="field-label">Desde</div>
                  <input name="date_from" type="date" value={searchState.date_from} onChange={handleSearchChange} className="input-cn w-full px-3 py-2.5" />
                </div>
                <div>
                  <div className="field-label">Hasta</div>
                  <input name="date_to" type="date" value={searchState.date_to} onChange={handleSearchChange} className="input-cn w-full px-3 py-2.5" />
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn-primary-search" disabled={isLoading}>
                  {isLoading ? "Buscando…" : "Buscar"}
                </button>
              </div>
            </form>
        </div>

        {/* Loading */}
        {isLoading && creditNotes.length === 0 && (
          <div className="flex items-center gap-3 justify-center py-16 text-white/30 text-sm">
            <div className="w-5 h-5 border-2 border-white/10 border-t-indigo-400 rounded-full animate-spin" />
            Cargando notas de crédito…
          </div>
        )}

        {/* Empty */}
        {!isLoading && creditNotes.length === 0 && (
          <div className="glass rounded-2xl p-14 text-center fade-in">
            <span className="flex justify-center mb-3 text-white/15"><FiFileText size={30} /></span>
            <p className="text-white/30 text-sm">No se encontraron notas de crédito.</p>
          </div>
        )}

        {/* Cards */}
        {creditNotes.length > 0 && (
          <div className="space-y-3">
            {creditNotes.map((cn, index) => {
              const isEditingRow = editingId === cn.id;
              const refProp = index === creditNotes.length - 1 ? { ref: lastCreditNoteRef } : {};

              return (
                <div
                  key={cn.id}
                  className="cn-card glass rounded-2xl fade-in"
                  style={{ animationDelay: `${Math.min(index, 6) * 0.04}s` }}
                  {...refProp}
                >
                  {!isEditingRow ? (
                    /* ── View mode ── */
                    <div className="p-5">
                      {/* Top row */}
                      <div className="mb-4">
                        {/* Fila 1: folio + botones */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="folio-badge flex-shrink-0">Folio# {cn.id}</span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button className="btn-action btn-pdf" onClick={() => downloadPDF(cn.id)} title="Descargar PDF" aria-label="Descargar PDF">
                              <FiDownload size={13} /> <span className="hidden sm:inline">PDF</span>
                            </button>
                            <button className="btn-action btn-print" onClick={() => printPDF(cn.id)} title="Imprimir PDF" aria-label="Imprimir PDF">
                              <FiPrinter size={13} /> <span className="hidden sm:inline">Imprimir</span>
                            </button>
                            <button className="btn-action btn-edit" onClick={() => startEditRow(cn)} title="Editar" aria-label="Editar">
                              <FiEdit2 size={13} />
                            </button>
                            <button className="btn-action btn-del" onClick={() => deleteRow(cn.id)} title="Eliminar" aria-label="Eliminar">
                              <FiTrash2 size={13} />
                            </button>
                          </div>
                        </div>
                        {/* Fila 2: nombre del cliente */}
                        <span className="font-display font-semibold text-lg text-white/90 break-words">{cn.client}</span>
                      </div>

                      {/* Meta chips */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {cn.order_number && <span className="meta-chip"><span className="text-blue-500">Orden</span> <strong>{cn.order_number}</strong></span>}
                        {cn.invoice_number && <span className="meta-chip"><span className="text-blue-500">Factura</span> <strong>{cn.invoice_number}</strong></span>}
                        {cn.credit_note_number && <span className="meta-chip"><span className="text-blue-500">NC</span> <strong>{cn.credit_note_number}</strong></span>}
                        <span className="meta-chip"><span className="text-white/90">Registrado por:</span> <strong>{cn.created_by}</strong></span>
                        <span className="meta-chip">{new Date(cn.fecha).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>

                      {/* Reason */}
                      {cn.reason && (
                      <p className="text-sm text-white/90 mb-4 leading-relaxed">
                        <span className="text-white/90 not-italic font-semibold text-xs uppercase tracking-wide">Motivo: </span>
                        <span className="italic">"{cn.reason}"</span>
                      </p>
                    )}

                      {/* Products */}
                      <div className="border-t border-white/5 pt-3">
                        <p className="field-label mb-2">Productos</p>
                        <div className="flex flex-col gap-1.5">
                          {cn.productos.map((p, i) => (
                            <span key={i} className="meta-chip w-fit">
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
                        <span className="font-display font-semibold text-base">Editando #{cn.id}</span>
                        <div className="flex gap-2">
                          <button className="btn-action btn-save" onClick={saveEditRow} title="Guardar" aria-label="Guardar">
                            <FiSave size={13} /> Guardar
                          </button>
                          <button className="btn-action btn-cancel" onClick={cancelEditRow} title="Cancelar" aria-label="Cancelar">
                            <FiX size={13} /> Cancelar
                          </button>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        <div className="sm:col-span-2">
                          <div className="field-label">Centro de Costo</div>
                          <ClientSelector
                            value={draft?.client || ""}
                            onChange={(client) => setDraft((prev) => (prev ? { ...prev, client } : prev))}
                          />
                        </div>
                        <div>
                          <div className="field-label">N° Orden</div>
                          <input value={draft?.order_number || ""} onChange={(e) => setDraft((prev) => (prev ? { ...prev, order_number: e.target.value } : prev))} className="input-cn w-full px-3 py-2.5" />
                        </div>
                        <div>
                          <div className="field-label">N° Factura</div>
                          <input value={draft?.invoice_number || ""} onChange={(e) => setDraft((prev) => (prev ? { ...prev, invoice_number: e.target.value } : prev))} className="input-cn w-full px-3 py-2.5" />
                        </div>
                        <div>
                          <div className="field-label">N° Nota de Crédito</div>
                          <input value={draft?.credit_note_number || ""} onChange={(e) => setDraft((prev) => (prev ? { ...prev, credit_note_number: e.target.value } : prev))} className="input-cn w-full px-3 py-2.5" />
                        </div>
                        <div className="sm:col-span-2">
                          <div className="field-label">Motivo</div>
                          <textarea
                            value={draft?.reason || ""}
                            onChange={(e) => setDraft((prev) => (prev ? { ...prev, reason: e.target.value } : prev))}
                            className="input-cn textarea-cn w-full px-3 py-2.5"
                          />
                        </div>
                      </div>

                      {/* Products edit */}
                      <div className="border-t border-white/5 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="field-label">Productos</p>
                          <button className="btn-action btn-add-prod" onClick={addRow} title="Agregar producto" aria-label="Agregar producto">
                            <FiPlus size={13} /> Agregar
                          </button>
                        </div>
                        <div className="space-y-2">
                          {draft?.productos.map((row, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                              <div className="relative col-span-6">
                                <input
                                  ref={(el) => { inputRefs.current[idx] = el; }}
                                  className="input-cn w-full px-3 py-2"
                                  placeholder="Producto"
                                  value={row.nombre}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    updateRow(idx, { nombre: value });
                                    if (value) {
                                      const filtered = productNames.filter((n) => normalizeSearch(n).includes(normalizeSearch(value)));
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
                                      fontSize: "13px",
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

                              <input type="number" className="input-cn col-span-2 px-2 py-2 text-right" placeholder="Cant."
                                value={row.cantidad} onChange={(e) => updateRow(idx, { cantidad: parseFloat(e.target.value) || 0 })} />
                              <select className="select-cn col-span-3 px-2 py-2" value={row.unidad}
                                onChange={(e) => updateRow(idx, { unidad: e.target.value })}>
                                <option value="unidades">Unidades</option>
                                <option value="kg">Kilogramos</option>
                                <option value="lt">Litros</option>
                                <option value="cajas">Cajas</option>
                                <option value="PQT">Paquetes</option>
                              </select>
                              <div className="col-span-1 flex justify-end">
                                <button className="btn-action btn-rem-prod" onClick={() => removeRow(idx)} title="Quitar" aria-label="Quitar">
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
            <button className="btn-load-more" onClick={() => setPage((prev) => prev + 1)}>
              Cargar más
            </button>
          </div>
        )}

      </div>

      {/* Validation error modal */}
      {validationError && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl p-6 max-w-md w-full fade-in"
            style={{ background: "#111827", border: "1px solid rgba(248,113,113,0.2)" }}>
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

export default CreditNoteTracking;