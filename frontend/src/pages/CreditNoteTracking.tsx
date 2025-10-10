import { useEffect, useRef, useState, useCallback, type ChangeEvent } from "react";
import type { AxiosError } from "axios";
import { FiEdit2, FiTrash2, FiSave, FiX, FiPlus, FiMinus } from "react-icons/fi";
import ClientSelector from "../components/ClientSelector";
import ArrowBackButton from "../components/ArrowBackButton";
import { api } from "../services/http";
import * as XLSX from "xlsx";  //para generar Excel

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
type ApiError = { error?: string; details?: string };

type SearchState = {
  client: string;
  order_number: string;
  invoice_number: string;
  credit_note_number: string;
  reason: string;
  user: string;
  date_from: string;
  date_to: string;
};

const btnIcon =
  "rounded-full p-2 bg-white/10 text-white border border-white/50 transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900";

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

  const [searchState, setSearchState] = useState<SearchState>({
    client: "",
    order_number: "",
    invoice_number: "",
    credit_note_number: "",
    reason: "",
    user: "",
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
        console.error("Error fetching credit notes:", err);
        setMensaje("Error al cargar notas de crédito");
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

    if (lastCreditNoteRef.current) {
      observer.current.observe(lastCreditNoteRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [isLoading, hasMore]);

  useEffect(() => {
    if (page > 1) {
      fetchCreditNotes(debouncedSearch, page, true);
    }
  }, [page, debouncedSearch, fetchCreditNotes]);

  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(searchState);
    }, 300);
    return () => clearTimeout(id);
  }, [searchState]);

  useEffect(() => {
    fetchCreditNotes(debouncedSearch, 1, false);
    return () => {
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
    };
  }, [debouncedSearch, fetchCreditNotes]);

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
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const startEditRow = (cn: CreditNoteSummary) => {
    setEditingId(cn.id);
    setDraft({
      client: cn.client,
      order_number: cn.order_number,
      invoice_number: cn.invoice_number,
      credit_note_number: cn.credit_note_number,
      reason: cn.reason,
      productos: cn.productos.map((p) => ({ ...p })),
    });
  };

  const cancelEditRow = () => {
    setEditingId(null);
    setDraft(null);
    setSuggestions({});
  };

  const saveEditRow = async () => {
    if (!draft || !editingId) return;
    setIsLoading(true);
    try {
      const payload = {
        client: draft.client,
        order_number: draft.order_number,
        invoice_number: draft.invoice_number,
        credit_note_number: draft.credit_note_number,
        reason: draft.reason,
        productos: draft.productos.map((p) => ({
          nombre: p.nombre,
          cantidad: p.cantidad,
          unidad: p.unidad,
        })),
      };
      const response = await api.put<CreditNoteSummary>(`/credit-notes/${editingId}`, payload);
      const updated = response.data;
      setCreditNotes((prev) =>
        prev.map((cn) => (cn.id === editingId ? { ...cn, ...updated } : cn))
      );
      setMensaje("Nota de crédito actualizada correctamente");

      if (window.confirm("¿Desea imprimir la nota de crédito actualizada?")) {
        printPDF(editingId);
      }

      cancelEditRow();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      console.error("Error al actualizar nota de crédito:", error.response?.data || error.message);
      alert(error.response?.data?.error || "No se pudo actualizar la nota de crédito");
    } finally {
      setIsLoading(false);
    }
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
      console.error("Error eliminando nota de crédito:", error.response?.data || error.message);
      alert(error.response?.data?.error || "No se pudo eliminar la nota de crédito");
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

  const downloadPDF = async (id: number) => {
    try {
      const resp = await api.get(`/print-credit-note/${id}`, {
        responseType: "blob",
        params: { format: "pos80" },
      });
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nota_credito_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error descargando PDF:", err);
      setMensaje("No se pudo descargar el PDF");
    }
  };

  const printPDF = async (id: number) => {
    try {
      const resp = await api.get(`/print-credit-note/${id}`, {
        responseType: "blob",
        params: { inline: "1", format: "pos80" },
      });
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (w) {
        setTimeout(() => {
          try {
            w.print();
          } catch (printErr) {
            console.warn("No se pudo lanzar print()", printErr);
          }
        }, 500);
      } else {
        window.location.href = url;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error("Error abriendo PDF:", err);
      setMensaje("No se pudo abrir el PDF para imprimir");
    }
  };

  // Componentes SVG inline dentro del componente
  const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );

  const PrinterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9V2h12v7" />
      <path d="M6 18h12v4H6z" />
      <path d="M6 14H5a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3h-1" />
    </svg>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-12">
        <ArrowBackButton />
      </div>
      <h2 className="text-xl font-bold mb-4">Seguimiento de Notas de Crédito</h2>
      {mensaje && <p className="mb-4 text-emerald-400">{mensaje}</p>}

      <form onSubmit={handleSearchSubmit} className="space-y-4 mb-6">
        <input
          name="client"
          value={searchState.client}
          onChange={handleSearchChange}
          placeholder="Buscar por centro de costo"
          className="w-full border p-2 rounded"
        />
        <input
          name="order_number"
          value={searchState.order_number}
          onChange={handleSearchChange}
          placeholder="Buscar por número de orden"
          className="w-full border p-2 rounded"
        />
        <input
          name="invoice_number"
          value={searchState.invoice_number}
          onChange={handleSearchChange}
          placeholder="Buscar por número de factura"
          className="w-full border p-2 rounded"
        />
        <input
          name="credit_note_number"
          value={searchState.credit_note_number}
          onChange={handleSearchChange}
          placeholder="Buscar por número de nota de crédito"
          className="w-full border p-2 rounded"
        />
        <input
          name="reason"
          value={searchState.reason}
          onChange={handleSearchChange}
          placeholder="Buscar por motivo"
          className="w-full border p-2 rounded"
        />
        <input
          name="user"
          value={searchState.user}
          onChange={handleSearchChange}
          placeholder="Buscar por usuario que creó"
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

      {/* Botón de descarga de documento excel con la información filtrada */}
      {creditNotes.length > 0 && (
        <div className="flex justify-end mb-4">
          <button
            className="flex items-center gap-2 px-3 py-2 rounded text-white bg-emerald-600 hover:bg-emerald-700"
            title="Descargar Excel de notas de crédito filtradas"
            aria-label="Descargar Excel"
            onClick={() => {
              // Calcular totales por producto (agrupar por nombre, sumar cantidades)
              const totals: Record<string, number> = {};
              creditNotes.forEach((cn) => {
                cn.productos.forEach((p) => {
                  totals[p.nombre] = (totals[p.nombre] || 0) + p.cantidad;
                });
              });

              // Datos de notas de crédito
              const data = creditNotes.map((cn) => ({
                "Centro de Costo": cn.client,
                "N° Orden": cn.order_number,
                "N° Factura": cn.invoice_number,
                "N° Nota de Crédito": cn.credit_note_number,
                "Motivo": cn.reason,
                "Ingresado por": cn.created_by,
                "Fecha": new Date(cn.fecha).toLocaleString(),
                "Productos": cn.productos.map((p) => `${p.nombre}: ${p.cantidad} ${p.unidad}`).join("; "),
              }));

              // Agregar fila vacía y luego totales con todas las columnas
              data.push({
                "Centro de Costo": "",
                "N° Orden": "",
                "N° Factura": "",
                "N° Nota de Crédito": "",
                "Motivo": "",
                "Ingresado por": "",
                "Fecha": "",
                "Productos": "",
              }); // Fila vacía para separar
              data.push({
                "Centro de Costo": "Totales por Producto",
                "N° Orden": "",
                "N° Factura": "",
                "N° Nota de Crédito": "",
                "Motivo": "",
                "Ingresado por": "",
                "Fecha": "",
                "Productos": "",
              }); // Encabezado de totales
              Object.entries(totals).forEach(([producto, total]) => {
                data.push({
                  "Centro de Costo": producto,
                  "N° Orden": "",
                  "N° Factura": "",
                  "N° Nota de Crédito": "",
                  "Motivo": "",
                  "Ingresado por": "",
                  "Fecha": "",
                  "Productos": `Total: ${total}`,
                });
              });

              // Crear hoja y libro
              const ws = XLSX.utils.json_to_sheet(data);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Notas de Crédito");

              // Descargar
              XLSX.writeFile(wb, "notas_credito_filtradas.xlsx");
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


      {isLoading && creditNotes.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-400">Cargando notas de crédito...</p>
        </div>
      ) : creditNotes.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No se encontraron notas de crédito.</p>
      ) : (
        <div className="space-y-4">
          {creditNotes.map((cn, index) => {
            const isEditingRow = editingId === cn.id;
            const refProp = index === creditNotes.length - 1 ? { ref: lastCreditNoteRef } : {};

            return (
              <div key={cn.id} className="border p-4 hover:bg-gray-900/20 rounded" {...refProp}>
                <div className="flex items-start justify-between gap-4">
                  {!isEditingRow ? (
                    <div>
                      <p><strong>Centro de Costo:</strong> {cn.client}</p>
                      <p><strong>N° Orden:</strong> {cn.order_number}</p>
                      <p><strong>N° Factura:</strong> {cn.invoice_number}</p>
                      <p><strong>N° Nota de Crédito:</strong> {cn.credit_note_number}</p>
                      <p><strong>Motivo:</strong> {cn.reason}</p>
                      <p><strong>Ingresado por:</strong> {cn.created_by}</p>
                      <p><strong>Fecha:</strong> {new Date(cn.fecha).toLocaleString()}</p>
                    </div>
                  ) : (
                    <div className="w-full">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm mb-1">Centro de Costo</label>
                          <ClientSelector
                            value={draft?.client || ""}
                            onChange={(client) => setDraft((prev) => (prev ? { ...prev, client } : prev))}
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">N° Orden</label>
                          <input
                            value={draft?.order_number || ""}
                            onChange={(e) => setDraft((prev) => (prev ? { ...prev, order_number: e.target.value } : prev))}
                            className="w-full border p-2 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">N° Factura</label>
                          <input
                            value={draft?.invoice_number || ""}
                            onChange={(e) => setDraft((prev) => (prev ? { ...prev, invoice_number: e.target.value } : prev))}
                            className="w-full border p-2 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">N° Nota de Crédito</label>
                          <input
                            value={draft?.credit_note_number || ""}
                            onChange={(e) => setDraft((prev) => (prev ? { ...prev, credit_note_number: e.target.value } : prev))}
                            className="w-full border p-2 rounded"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm mb-1">Motivo</label>
                          <textarea
                            value={draft?.reason || ""}
                            onChange={(e) => setDraft((prev) => (prev ? { ...prev, reason: e.target.value } : prev))}
                            className="w-full border p-2 rounded h-24"
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
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="flex items-center gap-2 px-3 py-2 rounded text-white bg-blue-600 hover:bg-blue-700"
                      title="Descargar PDF"
                      aria-label="Descargar PDF"
                      onClick={() => downloadPDF(cn.id)}
                    >
                      <DownloadIcon />
                      <span className="text-xs font-medium">PDF</span>
                    </button>
                    <button
                      className="flex items-center gap-2 px-3 py-2 rounded text-white bg-indigo-600 hover:bg-indigo-700"
                      title="Imprimir PDF"
                      aria-label="Imprimir PDF"
                      onClick={() => printPDF(cn.id)}
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
                          onClick={() => startEditRow(cn)}
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          className={`${btnIcon} hover:bg-red-600`}
                          title="Eliminar"
                          aria-label="Eliminar"
                          onClick={() => deleteRow(cn.id)}
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
                          onClick={saveEditRow}
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
                  </div>
                </div>
                {!isEditingRow && (
                  <>
                    <p className="mt-3"><strong>Productos:</strong></p>
                    <ul className="list-disc pl-5">
                      {cn.productos.map((p, i) => (
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
    </div>
  );
};

export default CreditNoteTracking;