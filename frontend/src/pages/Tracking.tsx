import { useEffect, useState } from "react";
import axios, { AxiosError } from "axios";

interface DispatchSummary {
  id: number;
  orden: string;
  cliente: string;
  chofer: string;
  created_by: string;
  fecha: string;
  status: string;
  productos: { nombre: string; cantidad: number; unidad: string }[];
}

interface DispatchDetail {
  id: number;
  orden: string;
  cliente: string;
  chofer: string;
  created_by: string;
  fecha: string;
  status: string;
  productos: { nombre: string; cantidad: number; unidad: string }[];
}

const Tracking = () => {
  const [dispatches, setDispatches] = useState<DispatchSummary[]>([]);
  const [search, setSearch] = useState({
    client: "",
    order: "",
    user: "",
    driver: "",
    date: "",
  });
  const [selectedDispatch, setSelectedDispatch] = useState<DispatchDetail | null>(null);
  const [mensaje, setMensaje] = useState<string>("");

  useEffect(() => {
    fetchDispatches();
  }, []);

  const fetchDispatches = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dispatches`, {
        headers: { Authorization: `Bearer ${token}` },
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

  const fetchDispatchDetails = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dispatches/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedDispatch(response.data);
      setMensaje("");
    } catch (err) {
      const error = err as AxiosError;
      console.error("Error fetching dispatch details:", error.response ? error.response.data : error.message);
      setMensaje("Error al cargar detalles del despacho");
    }
  };

  const markAsDelivered = async (id: number) => {
    if (!window.confirm("¿Estás seguro de marcar este despacho como entregado?")) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");

      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/dispatches/${id}/mark-delivered`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // UI optimista
      setDispatches((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: "entregado" } : d))
      );
      setSelectedDispatch((prev) => (prev ? { ...prev, status: "entregado" } : null));

      setMensaje("Despacho marcado como entregado");
    } catch (err) {
      const error = err as AxiosError;
      console.error("Error marking as delivered:", error.response ? error.response.data : error.message);
      setMensaje("Error al marcar como entregado");
    }
  };

  // Descargar PDF
  const downloadPDF = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");

      const resp = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/print/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );
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

  // Imprimir PDF
  const printPDF = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");

      const resp = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/print/${id}?inline=1`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      w?.addEventListener("load", () => {
        try {
          w.focus();
          w.print();
        } catch {
          /* noop */
        }
      });
    } catch (err) {
      const error = err as AxiosError;
      console.error("Error abriendo PDF para imprimir:", error.response ? error.response.data : error.message);
      setMensaje("No se pudo abrir el PDF para imprimir");
    }
  };

  // Iconos (trazo) visibles en dark/light
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
      {mensaje && <p className="mb-4 text-red-600">{mensaje}</p>}

      {/* Búsqueda */}
      <form onSubmit={handleSearchSubmit} className="space-y-4 mb-6">
        <input
          name="client"
          value={search.client}
          onChange={handleSearchChange}
          placeholder="Buscar por nombre del cliente"
          className="w-full border p-2"
        />
        <input
          name="order"
          value={search.order}
          onChange={handleSearchChange}
          placeholder="Buscar por número de orden"
          className="w-full border p-2"
        />
        <input
          name="user"
          value={search.user}
          onChange={handleSearchChange}
          placeholder="Buscar por usuario que creó"
          className="w-full border p-2"
        />
        <input
          name="driver"
          value={search.driver}
          onChange={handleSearchChange}
          placeholder="Buscar por nombre del chofer"
          className="w-full border p-2"
        />
        <input
          name="date"
          value={search.date}
          onChange={handleSearchChange}
          type="date"
          className="w-full border p-2"
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2">
          Buscar
        </button>
      </form>

      {/* Lista de despachos */}
      <div className="space-y-4">
        {dispatches.map((dispatch) => {
          const isDelivered = dispatch.status === "entregado";
          return (
            <div
              key={dispatch.id}
              className="border p-4 hover:bg-gray-100"
              onClick={() => fetchDispatchDetails(dispatch.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="cursor-pointer">
                  <p><strong>Orden:</strong> {dispatch.orden}</p>
                  <p><strong>Cliente:</strong> {dispatch.cliente}</p>
                  <p><strong>Chofer:</strong> {dispatch.chofer}</p>
                  <p><strong>Creado por:</strong> {dispatch.created_by}</p>
                  <p><strong>Fecha:</strong> {new Date(dispatch.fecha).toLocaleDateString()}</p>
                  <p><strong>Estado:</strong> {dispatch.status}</p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Descargar PDF */}
                  <button
                    className="flex items-center gap-2 px-3 py-2 rounded text-white bg-blue-600 hover:bg-blue-700"
                    title="Descargar PDF"
                    aria-label="Descargar PDF"
                    onClick={(e) => { e.stopPropagation(); downloadPDF(dispatch.id); }}
                  >
                    <DownloadIcon />
                    <span className="text-xs font-medium">PDF</span>
                  </button>

                  {/* Imprimir PDF */}
                  <button
                    className="flex items-center gap-2 px-3 py-2 rounded text-white bg-indigo-600 hover:bg-indigo-700"
                    title="Imprimir PDF"
                    aria-label="Imprimir PDF"
                    onClick={(e) => { e.stopPropagation(); printPDF(dispatch.id); }}
                  >
                    <PrinterIcon />
                    <span className="text-xs font-medium">Imprimir</span>
                  </button>

                  {/* Marcar entregado */}
                  <button
                    className={
                      "px-3 py-2 rounded text-white " +
                      (isDelivered ? "bg-emerald-600 cursor-default" : "bg-green-500 hover:opacity-90")
                    }
                    disabled={isDelivered}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isDelivered) markAsDelivered(dispatch.id);
                    }}
                    title={isDelivered ? "Este despacho ya fue marcado como entregado" : "Marcar como entregado"}
                  >
                    {isDelivered ? "Entregado" : "Marcar como Entregado"}
                  </button>
                </div>
              </div>

              <p className="mt-3"><strong>Productos:</strong></p>
              <ul>
                {dispatch.productos.map((prod, index) => (
                  <li key={index}>
                    {prod.nombre} - {prod.cantidad} {prod.unidad}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Detalles del despacho seleccionado */}
      {selectedDispatch && (
        <div className="mt-6 border p-4">
          <h3 className="text-lg font-bold mb-2">Detalles del Despacho</h3>
          <p><strong>ID:</strong> {selectedDispatch.id}</p>
          <p><strong>Orden:</strong> {selectedDispatch.orden}</p>
          <p><strong>Cliente:</strong> {selectedDispatch.cliente}</p>
          <p><strong>Chofer:</strong> {selectedDispatch.chofer}</p>
          <p><strong>Creado por:</strong> {selectedDispatch.created_by}</p>
          <p><strong>Fecha:</strong> {new Date(selectedDispatch.fecha).toLocaleDateString()}</p>
          <p><strong>Estado:</strong> {selectedDispatch.status}</p>

          <h4 className="font-bold mt-2">Productos:</h4>
          <ul>
            {selectedDispatch.productos.map((prod, index) => (
              <li key={index}>
                {prod.nombre} - {prod.cantidad} {prod.unidad}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex gap-2">
            {/* Descargar / Imprimir en detalle también */}
            <button
              className="flex items-center gap-2 px-3 py-2 rounded text-white bg-blue-600 hover:bg-blue-700"
              onClick={() => downloadPDF(selectedDispatch.id)}
              title="Descargar PDF"
              aria-label="Descargar PDF"
            >
              <DownloadIcon />
              <span className="text-sm font-medium">PDF</span>
            </button>
            <button
              className="flex items-center gap-2 px-3 py-2 rounded text-white bg-indigo-600 hover:bg-indigo-700"
              onClick={() => printPDF(selectedDispatch.id)}
              title="Imprimir PDF"
              aria-label="Imprimir PDF"
            >
              <PrinterIcon />
              <span className="text-sm font-medium">Imprimir</span>
            </button>

            {selectedDispatch.status !== "entregado" ? (
              <button
                onClick={() => markAsDelivered(selectedDispatch.id)}
                className="bg-green-500 text-white px-4 py-2"
              >
                Marcar como Entregado
              </button>
            ) : (
              <button
                disabled
                className="bg-emerald-600 text-white px-4 py-2 cursor-default"
                title="Este despacho ya fue marcado como entregado"
              >
                Entregado
              </button>
            )}

            <button
              onClick={() => setSelectedDispatch(null)}
              className="bg-red-500 text-white px-4 py-2"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tracking;