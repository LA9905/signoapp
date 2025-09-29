import { useEffect, useRef, useState } from "react";
import type { AxiosError } from "axios";
import { FiEdit2, FiTrash2, FiSave, FiX, FiPlus, FiMinus } from "react-icons/fi";
import SupplierSelector from "../components/SupplierSelector";
import ArrowBackButton from "../components/ArrowBackButton";
import { api } from "../services/http";

interface ReceiptSummary {
  id: number;
  orden: string;
  supplier: string;
  created_by: string;
  fecha: string;
  status: string;
  productos: { nombre: string; cantidad: number; unidad: string }[];
}

type ProductoRow = { nombre: string; cantidad: number; unidad: string };
type ApiError = { error?: string; details?: string };

type SearchState = {
  supplier: string;
  order: string;
  user: string;
  date_from: string;
  date_to: string;
};

const btnIcon =
  "rounded-full p-2 bg-white/10 text-white border border-white/50 transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900 ";

const SupplierTracking = () => {
  const [receipts, setReceipts] = useState<ReceiptSummary[]>([]);

  const [search, setSearch] = useState<SearchState>({
    supplier: "",
    order: "",
    user: "",
    date_from: "",
    date_to: "",
  });
  const searchRef = useRef<SearchState>(search);
  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  const [mensaje, setMensaje] = useState<string>("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{
    orden: string;
    supplier: string;
    status: string;
    productos: ProductoRow[];
  } | null>(null);

  useEffect(() => {
    fetchReceipts(searchRef.current);
    const onFocus = () => fetchReceipts(searchRef.current);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const fetchReceipts = async (params?: SearchState) => {
    try {
      const response = await api.get<ReceiptSummary[]>("/receipts", {
        params: params ?? searchRef.current,
      });
      setReceipts(response.data);
      setMensaje("");
    } catch {
      setMensaje("Error al cargar recepciones");
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSearch({ ...search, [e.target.name]: e.target.value });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReceipts(search);
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
  };

  const deleteRow = async (id: number) => {
    if (!window.confirm("¿Eliminar esta recepción? Esta acción es permanente y revertirá el stock.")) return;
    try {
      await api.delete(`/receipts/${id}`);
      setReceipts((prev) => prev.filter((r) => r.id !== id));
      if (editingId === id) cancelEditRow();
      setMensaje("Recepción eliminada y stock revertido");
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      setMensaje(error.response?.data?.error || "No se pudo eliminar la recepción");
      alert(error.response?.data?.error || "No se pudo eliminar la recepción");
    }
  };

  const addRow = () => {
    if (!draft) return;
    setDraft({ ...draft, productos: [...draft.productos, { nombre: "", cantidad: 0, unidad: "unidades" }] });
  };
  const removeRow = (idx: number) => {
    if (!draft) return;
    setDraft({ ...draft, productos: draft.productos.filter((_, i) => i !== idx) });
  };
  const updateRow = (idx: number, patch: Partial<ProductoRow>) => {
    if (!draft) return;
    setDraft({
      ...draft,
      productos: draft.productos.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    });
  };

  const saveEditRow = async () => {
    if (!draft || !editingId) return;
    try {
      const payload = {
        orden: draft.orden,
        supplier: draft.supplier,
        productos: draft.productos,
      };
      const response = await api.put(`/receipts/${editingId}`, payload);
      setReceipts((prev) =>
        prev.map((r) => (r.id === editingId ? { ...r, ...response.data } : r))
      );
      setEditingId(null);
      setDraft(null);
      setMensaje("Recepción actualizada correctamente");
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      setMensaje(error.response?.data?.error || "No se pudo actualizar la recepción");
      alert(error.response?.data?.error || "No se pudo actualizar la recepción");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-12">
        <ArrowBackButton />
      </div>
      <h2 className="text-xl font-bold mb-4">Seguimiento de Recepciones</h2>
      {mensaje && <p className="mb-4 text-emerald-400">{mensaje}</p>}

      <form onSubmit={handleSearchSubmit} className="space-y-4 mb-6">
        <input name="supplier" value={search.supplier} onChange={handleSearchChange} placeholder="Buscar por nombre del proveedor" className="w-full border p-2 rounded" />
        <input name="order" value={search.order} onChange={handleSearchChange} placeholder="Buscar por número de orden" className="w-full border p-2 rounded" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Desde</label>
            <input
              name="date_from"
              type="date"
              value={search.date_from}
              onChange={handleSearchChange}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Hasta</label>
            <input
              name="date_to"
              type="date"
              value={search.date_to}
              onChange={handleSearchChange}
              className="w-full border p-2 rounded"
            />
          </div>
        </div>
        
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Buscar</button>
      </form>

      <div className="space-y-4">
        {receipts.map((r) => {
          const isEditingRow = editingId === r.id;

          return (
            <div key={r.id} className="border p-4 hover:bg-gray-900/20 rounded">
              <div className="flex items-start justify-between gap-4">
                {!isEditingRow ? (
                  <div>
                    <p><strong>Orden:</strong> {r.orden}</p>
                    <p><strong>Proveedor:</strong> {r.supplier}</p>
                    <p><strong>Ingresado por:</strong> {r.created_by}</p>
                    <p><strong>Fecha:</strong> {new Date(r.fecha).toLocaleString()}</p>
                  </div>
                ) : (
                  <div className="w-full">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm mb-1">Orden</label>
                        <input
                          value={draft?.orden || ""}
                          onChange={(e) => setDraft((prev) => prev ? { ...prev, orden: e.target.value } : prev)}
                          className="w-full border p-2 rounded"
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-1">Proveedor</label>
                        <SupplierSelector
                          value={draft?.supplier || ""}
                          onChange={(supplier) => setDraft((prev) => prev ? { ...prev, supplier } : prev)}
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold">Productos</h4>
                        <button className={`${btnIcon} hover:bg-blue-600`} onClick={addRow} title="Agregar producto" aria-label="Agregar producto">
                          <FiPlus size={18} />
                        </button>
                      </div>

                      <div className="space-y-2">
                        {draft?.productos.map((row, idx) => (
                          <div key={idx} className="grid sm:grid-cols-12 gap-2 items-center">
                            <input
                              className="border p-2 rounded sm:col-span-6"
                              placeholder="Nombre"
                              value={row.nombre}
                              onChange={(e) => updateRow(idx, { nombre: e.target.value })}
                            />
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
                        onClick={() => startEditRow(r)}
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        className={`${btnIcon} hover:bg-red-600`}
                        title="Eliminar"
                        aria-label="Eliminar"
                        onClick={() => deleteRow(r.id)}
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
                    {r.productos.map((p, i) => (
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
    </div>
  );
};

export default SupplierTracking;