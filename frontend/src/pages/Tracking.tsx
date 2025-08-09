import { useEffect, useState } from "react";
import axios, { AxiosError } from "axios";
import { FiEdit2, FiTrash2, FiSave, FiX, FiPlus, FiMinus } from "react-icons/fi";
import ClientSelector from "../components/ClientSelector";
import DriverSelector from "../components/DriverSelector";
import { useDrivers } from "../context/DriversContext";

interface DispatchSummary {
  id: number;
  orden: string;
  cliente: string; // nombre
  chofer: string;  // nombre
  created_by: string;
  fecha: string;
  status: string;
  productos: { nombre: string; cantidad: number; unidad: string }[];
}

type ProductoRow = { nombre: string; cantidad: number; unidad: string };
type ApiError = { error?: string; details?: string };

const btnIcon =
  "rounded-full p-2 bg-white/10 text-white border border-white/50 transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900";

const Tracking = () => {
  const [dispatches, setDispatches] = useState<DispatchSummary[]>([]);
  const [search, setSearch] = useState({ client: "", order: "", user: "", driver: "", date: "" });
  const [mensaje, setMensaje] = useState<string>("");

  // edición inline por tarjeta
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{
    orden: string;
    cliente: string;   // nombre
    chofer: string;    // id (string) para DriverSelector
    status: string;
    productos: ProductoRow[];
  } | null>(null);

  const { drivers } = useDrivers(); // para mapear nombre->id cuando entras a editar

  const token = localStorage.getItem("token");
  const auth = token ? { Authorization: `Bearer ${token}` } : undefined;

  useEffect(() => {
    fetchDispatches();
    const onFocus = () => fetchDispatches();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDispatches = async () => {
    try {
      if (!token) throw new Error("No token found");
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dispatches`, {
        headers: auth,
        params: search,
      });
      setDispatches(response.data);
      setMensaje("");
    } catch (err) {
      const error = err as AxiosError;
      console.error("Error fetching dispatches:", error.response ? error.response.data : error.message);
      setMensaje("Error al cargar despachos");
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSearch({ ...search, [e.target.name]: e.target.value });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDispatches();
  };

  // ===== Acciones de lista =====
  const startEditRow = (d: DispatchSummary) => {
    // Convertir nombre de chofer -> id (string) para usar DriverSelector
    const choferId = drivers.find((x) => x.name === d.chofer)?.id;
    setEditingId(d.id);
    setDraft({
      orden: d.orden,
      cliente: d.cliente,            // ClientSelector usa nombre
      chofer: choferId ? String(choferId) : "", // DriverSelector usa id string
      status: d.status || "pendiente",
      productos: d.productos.map((p) => ({ ...p })),
    });
  };

  const cancelEditRow = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveRow = async (id: number) => {
    if (!draft) return;
    try {
      if (!token) throw new Error("No token found");
      // IMPORTANTE: chofer debe ir como ID (string convertible a int en el back)
      const payload = {
        orden: draft.orden,
        cliente: draft.cliente,  // backend espera nombre
        chofer: draft.chofer,    // backend espera ID
        status: draft.status,
        productos: draft.productos.map((p) => ({
          nombre: p.nombre,
          cantidad: p.cantidad,
          unidad: p.unidad,
        })),
      };
      const resp = await axios.put(`${import.meta.env.VITE_API_URL}/api/dispatches/${id}`, payload, { headers: auth });
      const updated = resp.data as DispatchSummary;

      setDispatches((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                orden: updated.orden,
                cliente: updated.cliente,
                chofer: updated.chofer,
                fecha: updated.fecha,
                status: updated.status,
                productos: updated.productos,
              }
            : d
        )
      );
      setMensaje("Despacho actualizado. Puedes descargar/imprimir el PDF actualizado.");
      cancelEditRow();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      console.error("Error al actualizar despacho:", error.response?.data || error.message);
      alert(error.response?.data?.error || "No se pudo actualizar el despacho");
    }
  };

  const deleteRow = async (id: number) => {
    if (!window.confirm("¿Eliminar este despacho? Esta acción es permanente.")) return;
    try {
      if (!token) throw new Error("No token found");
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/dispatches/${id}`, { headers: auth });
      setDispatches((prev) => prev.filter((d) => d.id !== id));
      if (editingId === id) cancelEditRow();
      setMensaje("Despacho eliminado");
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      console.error("Error eliminando despacho:", error.response?.data || error.message);
      alert(error.response?.data?.error || "No se pudo eliminar el despacho");
    }
  };

  const markAsDelivered = async (id: number) => {
    if (!window.confirm("¿Estás seguro de marcar este despacho como entregado?")) return;
    try {
      if (!token) throw new Error("No token found");
      await axios.post(`${import.meta.env.VITE_API_URL}/api/dispatches/${id}/mark-delivered`, {}, { headers: auth });
      setDispatches((prev) => prev.map((d) => (d.id === id ? { ...d, status: "entregado" } : d)));
      setMensaje("Despacho marcado como entregado");
    } catch (err) {
      const error = err as AxiosError;
      console.error("Error marking as delivered:", error.response ? error.response.data : error.message);
      setMensaje("Error al marcar como entregado");
    }
  };

  // PDF helpers
  const downloadPDF = async (id: number) => {
    try {
      if (!token) throw new Error("No token found");
      const resp = await axios.get(`${import.meta.env.VITE_API_URL}/api/print/${id}`, {
        headers: auth,
        responseType: "blob",
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
      const error = err as AxiosError;
      console.error("Error descargando PDF:", error.response ? error.response.data : error.message);
      setMensaje("No se pudo descargar el PDF");
    }
  };

  const printPDF = async (id: number) => {
    try {
      if (!token) throw new Error("No token found");
      const resp = await axios.get(`${import.meta.env.VITE_API_URL}/api/print/${id}?inline=1`, {
        headers: auth,
        responseType: "blob",
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
      console.error("Error abriendo PDF para imprimir:", error.response ? error.response.data : error.message);
      setMensaje("No se pudo abrir el PDF para imprimir");
    }
  };

  // helpers productos (draft)
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
      <h2 className="text-xl font-bold mb-4">Seguimiento de Despachos</h2>
      {mensaje && <p className="mb-4 text-emerald-400">{mensaje}</p>}

      {/* Búsqueda */}
      <form onSubmit={handleSearchSubmit} className="space-y-4 mb-6">
        <input name="client" value={search.client} onChange={handleSearchChange} placeholder="Buscar por nombre del cliente" className="w-full border p-2 rounded" />
        <input name="order" value={search.order} onChange={handleSearchChange} placeholder="Buscar por número de orden" className="w-full border p-2 rounded" />
        <input name="user" value={search.user} onChange={handleSearchChange} placeholder="Buscar por usuario que creó" className="w-full border p-2 rounded" />
        <input name="driver" value={search.driver} onChange={handleSearchChange} placeholder="Buscar por nombre del chofer" className="w-full border p-2 rounded" />
        <input name="date" value={search.date} onChange={handleSearchChange} type="date" className="w-full border p-2 rounded" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Buscar</button>
      </form>

      {/* Lista */}
      <div className="space-y-4">
        {dispatches.map((d) => {
          const isDelivered = d.status === "entregado";
          const isEditingRow = editingId === d.id;

          return (
            <div key={d.id} className="border p-4 hover:bg-gray-900/20 rounded">
              {/* Encabezado + acciones */}
              <div className="flex items-start justify-between gap-4">
                {!isEditingRow ? (
                  <div>
                    <p><strong>Orden:</strong> {d.orden}</p>
                    <p><strong>Cliente:</strong> {d.cliente}</p>
                    <p><strong>Chofer:</strong> {d.chofer}</p>
                    <p><strong>Creado por:</strong> {d.created_by}</p>
                    <p><strong>Fecha:</strong> {new Date(d.fecha).toLocaleDateString()}</p>
                    <p><strong>Estado:</strong> {d.status}</p>
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
                        <label className="block text-sm mb-1">Cliente</label>
                        <ClientSelector
                          value={draft?.cliente || ""}
                          onChange={(cliente) => setDraft((prev) => prev ? { ...prev, cliente } : prev)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-1">Chofer</label>
                        <DriverSelector
                          value={draft?.chofer || ""}
                          onChange={(choferId) => setDraft((prev) => prev ? { ...prev, chofer: choferId } : prev)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-1">Estado</label>
                        <select
                          value={draft?.status || "pendiente"}
                          onChange={(e) => setDraft((prev) => prev ? { ...prev, status: e.target.value } : prev)}
                          className="w-full border p-2 rounded"
                        >
                          <option value="pendiente">pendiente</option>
                          <option value="entregado">entregado</option>
                          <option value="cancelado">cancelado</option>
                        </select>
                      </div>
                    </div>

                    {/* Productos editar */}
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
                              <option value="l">Litros</option>
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

                {/* Acciones siempre visibles */}
                <div className="flex items-center gap-2">
                  {/* PDF */}
                  <button
                    className="flex items-center gap-2 px-3 py-2 rounded text-white bg-blue-600 hover:bg-blue-700"
                    title="Descargar PDF"
                    aria-label="Descargar PDF"
                    onClick={() => downloadPDF(d.id)}
                  >
                    <DownloadIcon />
                    <span className="text-xs font-medium">PDF</span>
                  </button>

                  {/* Imprimir */}
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

                  {/* Entregado / Marcar */}
                  <button
                    className={
                      "px-3 py-2 rounded text-white " +
                      (isDelivered ? "bg-emerald-600 cursor-default" : "bg-green-600 hover:bg-green-700")
                    }
                    disabled={isDelivered}
                    onClick={() => {
                      if (!isDelivered) markAsDelivered(d.id);
                    }}
                    title={isDelivered ? "Este despacho ya fue marcado como entregado" : "Marcar como entregado"}
                  >
                    {isDelivered ? "Entregado" : "Marcar como Entregado"}
                  </button>
                </div>
              </div>

              {/* Productos (solo display cuando no editas) */}
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
    </div>
  );
};

export default Tracking;