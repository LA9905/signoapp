import { useEffect, useRef, useState, useCallback, type ChangeEvent } from "react";
import type { AxiosError } from "axios";
import { FiEdit2, FiTrash2, FiSave, FiX, FiPlus, FiMinus } from "react-icons/fi";
import OperatorSelector from "../components/OperatorSelector";
import ArrowBackButton from "../components/ArrowBackButton";
import { api } from "../services/http";

interface ProductionSummary {
  id: number;
  operator: string;
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
  operator: string;
  user: string;
  date_from: string;
  date_to: string;
};

const btnIcon =
  "rounded-full p-2 bg-white/10 text-white border border-white/50 transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900";

const ProductionTracking = () => {
  const [productions, setProductions] = useState<ProductionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [mensaje, setMensaje] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{
    operator: string;
    productos: ProductoRow[];
  } | null>(null);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Record<number, string[]>>({});

  const [searchState, setSearchState] = useState<SearchState>({
    operator: "",
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
  const lastProductionRef = useRef<HTMLDivElement | null>(null);

  const fetchProducts = async () => {
    try {
      const res = await api.get<Product[]>("/products");
      setProductNames(res.data.map((p) => p.name));
    } catch (err) {
      console.error("Error fetching products:", err);
      setMensaje("Error al cargar lista de productos");
    }
  };

  const fetchProductions = useCallback(
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
        const response = await api.get<ProductionSummary[]>("/productions", {
          params: { ...params, page: pageNum, limit: 10 },
          headers: { "Cache-Control": "no-cache" },
          signal,
        });
        const newProductions = response.data;
        setProductions((prev) => (append ? [...prev, ...newProductions] : newProductions));
        setHasMore(newProductions.length === 10);
        setMensaje("");
      } catch (err: any) {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || err?.name === "AbortError") return;
        console.error("Error fetching productions:", err);
        setMensaje("Error al cargar producciones");
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

    if (lastProductionRef.current) {
      observer.current.observe(lastProductionRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [isLoading, hasMore]);

  useEffect(() => {
    if (page > 1) {
      fetchProductions(debouncedSearch, page, true);
    }
  }, [page, debouncedSearch, fetchProductions]);

  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(searchState);
    }, 300);
    return () => clearTimeout(id);
  }, [searchState]);

  useEffect(() => {
    fetchProductions(debouncedSearch, 1, false);
    return () => {
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
    };
  }, [debouncedSearch, fetchProductions]);

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
        const response = await api.get<ProductionSummary[]>("/productions", {
          params: { ...searchState, page: 1, limit: 10 },
          headers: { "Cache-Control": "no-cache" },
          signal: controller.signal,
        });
        setProductions(response.data);
        setHasMore(response.data.length === 10);
        setMensaje("");
        setPage(1);
        setDebouncedSearch(searchState);
      } catch (err: any) {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || err?.name === "AbortError") return;
        setMensaje("Error al cargar producciones");
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const startEditRow = (p: ProductionSummary) => {
    setEditingId(p.id);
    setDraft({
      operator: p.operator,
      productos: p.productos.map((pr) => ({ ...pr })),
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
        operator: draft.operator,
        productos: draft.productos.map((pr) => ({
          nombre: pr.nombre,
          cantidad: pr.cantidad,
          unidad: pr.unidad,
        })),
      };
      const response = await api.put<ProductionSummary>(`/productions/${editingId}`, payload);
      const updated = response.data;
      setProductions((prev) =>
        prev.map((pr) => (pr.id === editingId ? { ...pr, ...updated } : pr))
      );
      setMensaje("Producción actualizada correctamente");
      cancelEditRow();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      console.error("Error al actualizar producción:", error.response?.data || error.message);
      alert(error.response?.data?.error || "No se pudo actualizar la producción");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRow = async (id: number) => {
    if (!window.confirm("¿Eliminar esta producción? Esta acción es permanente y revertirá el stock.")) return;
    setIsLoading(true);
    try {
      await api.delete(`/productions/${id}`);
      setProductions((prev) => prev.filter((pr) => pr.id !== id));
      if (editingId === id) cancelEditRow();
      setMensaje("Producción eliminada y stock revertido");
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      console.error("Error eliminando producción:", error.response?.data || error.message);
      alert(error.response?.data?.error || "No se pudo eliminar la producción");
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-12">
        <ArrowBackButton />
      </div>
      <h2 className="text-xl font-bold mb-4">Registros de Producción</h2>
      {mensaje && <p className="mb-4 text-emerald-400">{mensaje}</p>}

      <form onSubmit={handleSearchSubmit} className="space-y-4 mb-6">
        <input
          name="operator"
          value={searchState.operator}
          onChange={handleSearchChange}
          placeholder="Buscar por nombre del operario"
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

      {isLoading && productions.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-400">Cargando producciones...</p>
        </div>
      ) : productions.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No se encontraron producciones.</p>
      ) : (
        <div className="space-y-4">
          {productions.map((p, index) => {
            const isEditingRow = editingId === p.id;
            const refProp = index === productions.length - 1 ? { ref: lastProductionRef } : {};

            return (
              <div key={p.id} className="border p-4 hover:bg-gray-900/20 rounded" {...refProp}>
                <div className="flex items-start justify-between gap-4">
                  {!isEditingRow ? (
                    <div>
                      <p><strong>Operario:</strong> {p.operator}</p>
                      <p><strong>Ingresado por:</strong> {p.created_by}</p>
                      <p><strong>Fecha:</strong> {new Date(p.fecha).toLocaleString()}</p>
                    </div>
                  ) : (
                    <div className="w-full">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm mb-1">Operario</label>
                          <OperatorSelector
                            value={draft?.operator || ""}
                            onChange={(operator) => setDraft((prev) => (prev ? { ...prev, operator } : prev))}
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
                    {!isEditingRow ? (
                      <>
                        <button
                          className={`${btnIcon} hover:bg-blue-600`}
                          title="Editar"
                          aria-label="Editar"
                          onClick={() => startEditRow(p)}
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          className={`${btnIcon} hover:bg-red-600`}
                          title="Eliminar"
                          aria-label="Eliminar"
                          onClick={() => deleteRow(p.id)}
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
                      {p.productos.map((pr, i) => (
                        <li key={i}>
                          {pr.nombre} - {pr.cantidad} {pr.unidad}
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

export default ProductionTracking;