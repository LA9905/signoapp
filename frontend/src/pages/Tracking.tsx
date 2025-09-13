import { useEffect, useRef, useState } from "react";
import type { AxiosError } from "axios";
import { FiEdit2, FiTrash2, FiSave, FiX, FiPlus, FiMinus } from "react-icons/fi";
import ClientSelector from "../components/ClientSelector";
import DriverSelector from "../components/DriverSelector";
import { useDrivers } from "../context/DriversContext";
import ArrowBackButton from "../components/ArrowBackButton";
import { api } from "../services/http";

interface DispatchSummary {
  id: number;
  orden: string;
  cliente: string;
  chofer: string;
  created_by: string;
  fecha: string;    // ISO local
  status: string;   // pendiente | entregado_chofer | entregado_cliente | cancelado | ...
  delivered_driver: boolean;
  delivered_client: boolean;
  productos: { nombre: string; cantidad: number; unidad: string }[];
  paquete_numero?: number;   // NUEVO (solo display)
  factura_numero?: string;   // NUEVO (editable aquí)
}

type ProductoRow = { nombre: string; cantidad: number; unidad: string };
type ApiError = { error?: string; details?: string };

// Estado de filtros de búsqueda (sólo en memoria)
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

const btnIcon =
  "rounded-full p-2 bg-white/10 text-white border border-white/50 transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900";

const Tracking = () => {
  const [dispatches, setDispatches] = useState<DispatchSummary[]>([]);

  // --- Filtros sólo en memoria (se limpian al recargar o salir de la vista) ---
  const [search, setSearch] = useState<SearchState>({
    client: "",
    order: "",
    user: "",
    driver: "",
    date: "",
    invoice: "",
    date_from: "",
    date_to: "",
  });
  const searchRef = useRef<SearchState>(search);
  useEffect(() => {
    searchRef.current = search;
  }, [search]);
  // -----------------------------------------------------------------------------

  const [mensaje, setMensaje] = useState<string>("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{
    orden: string;
    cliente: string;
    chofer: string; // id (string)
    status: string;
    productos: ProductoRow[];
    factura_numero?: string;  // NUEVO
  } | null>(null);

  const { drivers } = useDrivers();

  useEffect(() => {
    // Primer fetch en el montaje con filtros vacíos (inicio)
    fetchDispatches(searchRef.current);

    // Al volver el foco a la pestaña, refresca conservando filtros actuales
    const onFocus = () => fetchDispatches(searchRef.current);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDispatches = async (params?: SearchState) => {
    try {
      const response = await api.get<DispatchSummary[]>("/dispatches", {
        params: params ?? searchRef.current,
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
    fetchDispatches(search); // usar los filtros actuales
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
  };

  const cancelEditRow = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveRow = async (id: number) => {
    if (!draft) return;
    try {
      const payload = {
        orden: draft.orden,
        cliente: draft.cliente,
        chofer: draft.chofer,
        status: draft.status,
        factura_numero: draft.factura_numero, // NUEVO
        productos: draft.productos.map((p) => ({
          nombre: p.nombre,
          cantidad: p.cantidad,
          unidad: p.unidad,
        })),
      };
      const resp = await api.put<DispatchSummary>(`/dispatches/${id}`, payload);
      const updated = resp.data;

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
                delivered_driver: updated.delivered_driver,
                delivered_client: updated.delivered_client,
                productos: updated.productos,
                paquete_numero: updated.paquete_numero,
                factura_numero: updated.factura_numero,
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
      await api.delete(`/dispatches/${id}`);
      setDispatches((prev) => prev.filter((d) => d.id !== id));
      if (editingId === id) cancelEditRow();
      setMensaje("Despacho eliminado");
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      console.error("Error eliminando despacho:", error.response?.data || error.message);
      alert(error.response?.data?.error || "No se pudo eliminar el despacho");
    }
  };

  // Estados granulares -> endpoints dedicados
  const markToDriver = async (id: number) => {
    try {
      const resp = await api.post<DispatchSummary>(`/dispatches/${id}/mark-driver`, {});
      const updated = resp.data;
      setDispatches((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                status: updated.status,
                delivered_driver: updated.delivered_driver,
                delivered_client: updated.delivered_client,
                fecha: updated.fecha,
              }
            : d
        )
      );
      setMensaje("Despacho marcado como 'Entregado a Chofer'.");
    } catch (err) {
      const error = err as AxiosError;
      console.error("Error marcando chofer:", error.response ? error.response.data : error.message);
      setMensaje("No se pudo marcar 'Entregado a Chofer'.");
    }
  };

  const markToClient = async (id: number) => {
    try {
      const resp = await api.post<DispatchSummary>(`/dispatches/${id}/mark-client`, {});
      const updated = resp.data;
      setDispatches((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                status: updated.status,
                delivered_driver: updated.delivered_driver,
                delivered_client: updated.delivered_client,
                fecha: updated.fecha,
              }
            : d
        )
      );
      setMensaje("Despacho marcado como 'Pedido Entregado'.");
    } catch (err) {
      const error = err as AxiosError;
      console.error("Error marcando cliente:", error.response ? error.response.data : error.message);
      setMensaje("No se pudo marcar 'Pedido Entregado'.");
    }
  };

  // PDF helpers
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
      const error = err as AxiosError;
      console.error("Error descargando PDF:", error.response ? error.response.data : error.message);
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
        try { w.focus(); w.print(); } catch {}
      });
    } catch (err) {
      const error = err as AxiosError;
      console.error("Error abriendo PDF para imprimir:", error.response ? error.response.data : error.message);
      setMensaje("No se pudo abrir el PDF para imprimir");
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
        <input name="client" value={search.client} onChange={handleSearchChange} placeholder="Buscar por nombre del centro de costo" className="w-full border p-2 rounded" />
        <input name="order" value={search.order} onChange={handleSearchChange} placeholder="Buscar por número de orden" className="w-full border p-2 rounded" />
        <input name="invoice" value={search.invoice} onChange={handleSearchChange} placeholder="Buscar por número de factura" className="w-full border p-2 rounded"/>
        <input name="user" value={search.user} onChange={handleSearchChange} placeholder="Buscar por usuario que creó" className="w-full border p-2 rounded" />
        <input name="driver" value={search.driver} onChange={handleSearchChange} placeholder="Buscar por nombre del chofer" className="w-full border p-2 rounded" />

        {/* Rango de fechas */}
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
        {dispatches.map((d) => {
          const isDriverDone = d.delivered_driver || d.delivered_client;
          const isClientDone = d.delivered_client;
          const isEditingRow = editingId === d.id;

          return (
            <div key={d.id} className="border p-4 hover:bg-gray-900/20 rounded">
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
                          onChange={(e) => setDraft((prev) => prev ? { ...prev, orden: e.target.value } : prev)}
                          className="w-full border p-2 rounded"
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-1">Centro de Costo</label>
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
                          onChange={(e) => setDraft((prev) => prev ? { ...prev, factura_numero: e.target.value } : prev)}
                          placeholder="Ej: 12345"
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
                              <option value="l">Litros</option>
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

                  {/* Estados específicos */}
                  <button
                    className={
                      "px-3 py-2 rounded text-white " +
                      (isDriverDone ? "bg-emerald-600 cursor-default" : "bg-green-600 hover:bg-green-700")
                    }
                    disabled={isDriverDone}
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
                    disabled={isClientDone}
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
    </div>
  );
};

export default Tracking;