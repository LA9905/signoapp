import { useEffect, useRef, useState, useCallback } from "react";
import type { AxiosError } from "axios";
import { FiEdit2, FiTrash2, FiSave, FiX, FiPlus, FiMinus } from "react-icons/fi";
import ArrowBackButton from "../components/ArrowBackButton";
import { api } from "../services/http";
import * as XLSX from "xlsx";  //para generar Excel

interface InternalSummary {
  id: number;
  nombre_retira: string;
  area: string;
  motivo: string;
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
  nombre_retira: string;
  area: string;
  motivo: string;
  user: string;
  date_from: string;
  date_to: string;
};

// Lista de áreas
const areas: string[] = [
  "Administración",
  "Producción",
  "Almacén",
  "Ventas",
  "Mantenimiento",
  "Otros",
];

const btnIcon =
  "rounded-full p-2 bg-white/10 text-white border border-white/50 transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900";

const InternalTracking = () => {
  const [internals, setInternals] = useState<InternalSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [mensaje, setMensaje] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{
    nombre_retira: string;
    area: string;
    motivo: string;
    productos: ProductoRow[];
  } | null>(null);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Record<number, string[]>>({});

  // Estado para búsqueda
  const [searchState, setSearchState] = useState<SearchState>({
    nombre_retira: "",
    area: "",
    motivo: "",
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
  const lastInternalRef = useRef<HTMLDivElement | null>(null);

  const fetchProducts = async () => {
    try {
      const res = await api.get<Product[]>("/products");
      setProductNames(res.data.map((p) => p.name));
    } catch (err) {
      console.error("Error fetching products:", err);
      setMensaje("Error al cargar lista de productos");
    }
  };

  const fetchInternals = useCallback(
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
        const response = await api.get<InternalSummary[]>("/internal-consumptions", {
          params: { ...params, page: pageNum, limit: 10 },
          headers: { "Cache-Control": "no-cache" },
          signal,
        });
        const newInternals = response.data;
        setInternals((prev) => (append ? [...prev, ...newInternals] : newInternals));
        setHasMore(newInternals.length === 10);
        setMensaje("");
      } catch (err: any) {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || err?.name === "AbortError") return;
        console.error("Error fetching internals:", err);
        setMensaje("Error al cargar consumos internos");
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

    if (lastInternalRef.current) {
      observer.current.observe(lastInternalRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [isLoading, hasMore]);

  useEffect(() => {
    if (page > 1) {
      fetchInternals(debouncedSearch, page, true);
    }
  }, [page, debouncedSearch, fetchInternals]);

  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(searchState);
    }, 300);
    return () => clearTimeout(id);
  }, [searchState]);

  useEffect(() => {
    fetchInternals(debouncedSearch, 1, false);
    return () => {
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
    };
  }, [debouncedSearch, fetchInternals]);

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
        const response = await api.get<InternalSummary[]>("/internal-consumptions", {
          params: { ...searchState, page: 1, limit: 10 },
          headers: { "Cache-Control": "no-cache" },
          signal: controller.signal,
        });
        setInternals(response.data);
        setHasMore(response.data.length === 10);
        setMensaje("");
        setPage(1);
        setDebouncedSearch(searchState);
      } catch (err: any) {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || err?.name === "AbortError") return;
        setMensaje("Error al cargar consumos internos");
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const startEditRow = (c: InternalSummary) => {
    setEditingId(c.id);
    setDraft({
      nombre_retira: c.nombre_retira,
      area: c.area,
      motivo: c.motivo,
      productos: c.productos.map((p) => ({ ...p })),
    });
  };

  const cancelEditRow = () => {
    setEditingId(null);
    setDraft(null);
    setSuggestions({});
  };

  const saveRow = async (id: number) => {
    if (!draft) return;
    setIsLoading(true);
    try {
      const payload = {
        nombre_retira: draft.nombre_retira,
        area: draft.area,
        motivo: draft.motivo,
        productos: draft.productos.map((p) => ({
          nombre: p.nombre,
          cantidad: p.cantidad,
          unidad: p.unidad,
        })),
      };
      const resp = await api.put<InternalSummary>(`/internal-consumptions/${id}`, payload);
      const updated = resp.data;
      setInternals((prev) =>
        prev.map((int) => (int.id === id ? { ...int, ...updated } : int))
      );
      setMensaje("Consumo interno actualizado.");

      // Confirmación para imprimir
      if (window.confirm("¿Desea imprimir el registro actualizado?")) {
        await printPDF(id);
      }

      cancelEditRow();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      console.error("Error al actualizar:", error.response?.data || error.message);
      alert(error.response?.data?.error || "No se pudo actualizar");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRow = async (id: number) => {
    if (!window.confirm("¿Eliminar este consumo interno? Esta acción es permanente.")) return;
    setIsLoading(true);
    try {
      await api.delete(`/internal-consumptions/${id}`);
      setInternals((prev) => prev.filter((int) => int.id !== id));
      if (editingId === id) cancelEditRow();
      setMensaje("Consumo interno eliminado");
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      console.error("Error eliminando:", error.response?.data || error.message);
      alert(error.response?.data?.error || "No se pudo eliminar");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPDF = async (id: number) => {
    try {
      const resp = await api.get(`/print-internal/${id}`, {
        responseType: "blob",
        params: { format: "pos80" },
      });
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `consumo_interno_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const error = err as AxiosError;
      console.error("Error descargando PDF:", error.response?.data || error.message);
      setMensaje("No se pudo descargar el PDF");
    }
  };

  const printPDF = async (id: number) => {
    try {
      const resp = await api.get(`/print-internal/${id}`, {
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
      const error = err as AxiosError;
      console.error("Error abriendo PDF:", error.response?.data || error.message);
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
      <h2 className="text-xl font-bold mb-4">Seguimiento de Consumos Internos</h2>
      {mensaje && <p className="mb-4 text-emerald-400">{mensaje}</p>}

      <form onSubmit={handleSearchSubmit} className="space-y-4 mb-6">
        <input
          name="nombre_retira"
          value={searchState.nombre_retira}
          onChange={handleSearchChange}
          placeholder="Buscar por nombre de quien retira"
          className="w-full border p-2 rounded"
        />
        <input
          name="area"
          value={searchState.area}
          onChange={handleSearchChange}
          placeholder="Buscar por área"
          className="w-full border p-2 rounded"
        />
        <input
          name="motivo"
          value={searchState.motivo}
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

      {/* Botón de descarga de documento excele con la busqueda filtrada para consumos internos */}
      {internals.length > 0 && (
        <div className="flex justify-end mb-4">
          <button
            className="flex items-center gap-2 px-3 py-2 rounded text-white bg-emerald-600 hover:bg-emerald-700"
            title="Descargar Excel de consumos internos filtrados"
            aria-label="Descargar Excel"
            onClick={() => {
              // Calcular totales por producto (agrupar por nombre, sumar cantidades)
              const totals: Record<string, number> = {};
              internals.forEach((int) => {
                int.productos.forEach((p) => {
                  totals[p.nombre] = (totals[p.nombre] || 0) + p.cantidad;
                });
              });

              // Datos de consumos internos
              const data = internals.map((int) => ({
                "Nombre quien retira": int.nombre_retira,
                "Área": int.area,
                "Motivo": int.motivo,
                "Registrado por": int.created_by,
                "Fecha": new Date(int.fecha).toLocaleString(),
                "Productos": int.productos.map((p) => `${p.nombre}: ${p.cantidad} ${p.unidad}`).join("; "),
              }));

              // Agregar fila vacía y luego totales con todas las columnas
              data.push({
                "Nombre quien retira": "",
                "Área": "",
                "Motivo": "",
                "Registrado por": "",
                "Fecha": "",
                "Productos": "",
              }); // Fila vacía para separar
              data.push({
                "Nombre quien retira": "Totales por Producto",
                "Área": "",
                "Motivo": "",
                "Registrado por": "",
                "Fecha": "",
                "Productos": "",
              }); // Encabezado de totales
              Object.entries(totals).forEach(([producto, total]) => {
                data.push({
                  "Nombre quien retira": producto,
                  "Área": "",
                  "Motivo": "",
                  "Registrado por": "",
                  "Fecha": "",
                  "Productos": `Total: ${total}`,
                });
              });

              // Crear hoja y libro
              const ws = XLSX.utils.json_to_sheet(data);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Consumos Internos");

              // Descargar
              XLSX.writeFile(wb, "consumos_internos_filtrados.xlsx");
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


      {isLoading && internals.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-400">Cargando consumos internos...</p>
        </div>
      ) : internals.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No se encontraron consumos internos.</p>
      ) : (
        <div className="space-y-4">
          {internals.map((int, index) => {
            const isEditingRow = editingId === int.id;
            const refProp = index === internals.length - 1 ? { ref: lastInternalRef } : {};

            return (
              <div key={int.id} className="border p-4 hover:bg-gray-900/20 rounded" {...refProp}>
                <div className="flex items-start justify-between gap-4">
                  {!isEditingRow ? (
                    <div>
                      <p><strong>Nombre quien retira:</strong> {int.nombre_retira}</p>
                      <p><strong>Área:</strong> {int.area}</p>
                      <p><strong>Motivo:</strong> {int.motivo}</p>
                      <p><strong>Registrado por:</strong> {int.created_by}</p>
                      <p><strong>Fecha:</strong> {new Date(int.fecha).toLocaleString()}</p>
                    </div>
                  ) : (
                    <div className="w-full">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm mb-1">Nombre quien retira</label>
                          <input
                            value={draft?.nombre_retira || ""}
                            onChange={(e) => setDraft((prev) => prev ? { ...prev, nombre_retira: e.target.value } : prev)}
                            className="w-full border p-2 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Área</label>
                          <select
                            value={draft?.area || ""}
                            onChange={(e) => setDraft((prev) => prev ? { ...prev, area: e.target.value } : prev)}
                            className="w-full border p-2 rounded"
                          >
                            <option value="">Seleccione área</option>
                            {areas.map((a) => (
                              <option key={a} value={a}>
                                {a}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm mb-1">Motivo</label>
                          <input
                            value={draft?.motivo || ""}
                            onChange={(e) => setDraft((prev) => prev ? { ...prev, motivo: e.target.value } : prev)}
                            className="w-full border p-2 rounded"
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
                      onClick={() => downloadPDF(int.id)}
                    >
                      <DownloadIcon />
                      <span className="text-xs font-medium">PDF</span>
                    </button>
                    <button
                      className="flex items-center gap-2 px-3 py-2 rounded text-white bg-indigo-600 hover:bg-indigo-700"
                      title="Imprimir PDF"
                      aria-label="Imprimir PDF"
                      onClick={() => printPDF(int.id)}
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
                          onClick={() => startEditRow(int)}
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          className={`${btnIcon} hover:bg-red-600`}
                          title="Eliminar"
                          aria-label="Eliminar"
                          onClick={() => deleteRow(int.id)}
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
                          onClick={() => saveRow(int.id)}
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
                      {int.productos.map((p, i) => (
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

export default InternalTracking;