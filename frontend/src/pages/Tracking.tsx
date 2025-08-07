import { useEffect, useState } from "react";
import axios, { AxiosError } from "axios"; // Añadimos la importación de AxiosError

interface DispatchSummary {
  id: number;
  orden: string;
  cliente: string;
  chofer: string;
  created_by: string;
  fecha: string;
  status: string; // Nuevo campo
  producto_count: number;
}

interface DispatchDetail {
  id: number;
  orden: string;
  cliente: string;
  chofer: string;
  created_by: string;
  fecha: string;
  status: string; // Nuevo campo
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
      const error = err as AxiosError; // Tipado correcto con AxiosError
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
      const error = err as AxiosError; // Tipado correcto con AxiosError
      console.error("Error fetching dispatch details:", error.response ? error.response.data : error.message);
      setMensaje("Error al cargar detalles del despacho");
    }
  };

  const markAsDelivered = async (id: number) => {
    if (window.confirm("¿Estás seguro de marcar este despacho como entregado?")) {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No token found");

        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/dispatches/${id}/mark-delivered`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSelectedDispatch((prev) => prev ? { ...prev, status: 'entregado' } : null);
        fetchDispatches(); // Actualizar la lista
        setMensaje("Despacho marcado como entregado");
      } catch (err) {
        const error = err as AxiosError; // Tipado correcto con AxiosError
        console.error("Error marking as delivered:", error.response ? error.response.data : error.message);
        setMensaje("Error al marcar como entregado");
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">Seguimiento de Despachos</h2>
      {mensaje && <p className="mb-4 text-red-600">{mensaje}</p>}

      {/* Formulario de búsqueda */}
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
        {dispatches.map((dispatch) => (
          <div
            key={dispatch.id}
            className="border p-4 cursor-pointer hover:bg-gray-100"
            onClick={() => fetchDispatchDetails(dispatch.id)}
          >
            <p><strong>Orden:</strong> {dispatch.orden}</p>
            <p><strong>Cliente:</strong> {dispatch.cliente}</p>
            <p><strong>Chofer:</strong> {dispatch.chofer}</p>
            <p><strong>Creado por:</strong> {dispatch.created_by}</p>
            <p><strong>Fecha:</strong> {new Date(dispatch.fecha).toLocaleDateString()}</p>
            <p><strong>Estado:</strong> {dispatch.status}</p>
            <p><strong>Productos:</strong> {dispatch.producto_count}</p>
          </div>
        ))}
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
          {selectedDispatch.status !== 'entregado' && (
            <button
              onClick={() => markAsDelivered(selectedDispatch.id)}
              className="mt-4 bg-green-500 text-white px-4 py-2"
            >
              Marcar como Entregado
            </button>
          )}
          <button
            onClick={() => setSelectedDispatch(null)}
            className="mt-4 bg-red-500 text-white px-4 py-2 ml-2"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
};

export default Tracking;