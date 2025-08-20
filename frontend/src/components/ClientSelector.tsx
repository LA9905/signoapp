import { useMemo, useState, useEffect } from "react";
import { useClients } from "../context/ClientsContext";
import { FaRegEdit, FaTrashAlt, FaSave, FaTimes } from "react-icons/fa";

interface ClientSelectorProps {
  value: string;                 // seguimos trabajando con el nombre
  onChange: (value: string) => void;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({ value, onChange }) => {
  const { clients, refresh, createClient, updateClient, deleteClient } = useClients();

  const [searchClient, setSearchClient] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (clients.length === 0) {
      refresh().catch(() => {});
    }
  }, [clients.length, refresh]);

  const filteredClients = useMemo(
    () => clients.filter((c) => c.name.toLowerCase().includes(searchClient.toLowerCase())),
    [clients, searchClient]
  );

  const selectedClient = useMemo(
    () => clients.find((c) => c.name === value) || null,
    [clients, value]
  );

  const handleRegisterClient = async () => {
    const nombre = newClient.trim();
    if (!nombre) return;
    try {
      const created = await createClient(nombre);
      onChange(created.name);
      setShowNewClient(false);
      setNewClient("");
    } catch (err) {
      console.error("Error registering client:", err);
      alert("No se pudo registrar el cliente");
    }
  };

  const startEdit = () => {
    if (!selectedClient) return;
    setEditName(selectedClient.name);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditName("");
  };

  const saveEdit = async () => {
    if (!selectedClient) return;
    const nombre = editName.trim();
    if (!nombre) return;
    try {
      const updated = await updateClient(selectedClient.id, nombre);
      onChange(updated.name);
      cancelEdit();
    } catch (err: any) {
      console.error("Error updating client:", err);
      alert(err?.response?.data?.error || "No se pudo actualizar el cliente");
    }
  };

  const removeSelected = async () => {
    if (!selectedClient) return;
    if (!window.confirm(`¿Eliminar el cliente "${selectedClient.name}"?`)) return;
    try {
      await deleteClient(selectedClient.id);
      if (value === selectedClient.name) onChange("");
    } catch (err: any) {
      console.error("Error deleting client:", err);
      alert(err?.response?.data?.error || "No se pudo eliminar el cliente");
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Buscar cliente..."
        value={searchClient}
        onChange={(e) => {
          const value = e.target.value;
          setSearchClient(value);

          // 🔹 Autoseleccionar primer cliente que coincida
          const match = clients.find((c) =>
            c.name.toLowerCase().includes(value.toLowerCase())
          );
          if (match) {
            onChange(match.name);
          } else {
            onChange("");
          }
        }}
        className="w-full border p-2 rounded"
      />

      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="">Selecciona Centro de costo</option>
          {filteredClients.map((client) => (
            <option key={client.id} value={client.name}>
              {client.name}
            </option>
          ))}
        </select>

        {selectedClient && !isEditing && (
          <div className="flex items-center gap-1">
            <button
              className="px-2 py-2 rounded border border-gray-600 text-white hover:text-blue-400"
              title="Editar cliente seleccionado"
              aria-label="Editar cliente seleccionado"
              onClick={startEdit}
              type="button"
            >
              <FaRegEdit size={16} />
            </button>
            <button
              className="px-2 py-2 rounded border border-gray-600 text-white hover:text-red-400"
              title="Eliminar cliente seleccionado"
              aria-label="Eliminar cliente seleccionado"
              onClick={removeSelected}
              type="button"
            >
              <FaTrashAlt size={16} />
            </button>
          </div>
        )}
      </div>

      {selectedClient && isEditing && (
        <div className="flex items-center gap-2">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 border p-2 rounded"
            placeholder="Nuevo nombre del cliente"
          />
          <button
            onClick={saveEdit}
            className="px-2 py-2 rounded border border-gray-600 text-white hover:text-emerald-300"
            title="Guardar"
            aria-label="Guardar"
            type="button"
          >
            <FaSave size={16} />
          </button>
          <button
            onClick={cancelEdit}
            className="px-2 py-2 rounded border border-gray-600 text-white hover:text-gray-300"
            title="Cancelar"
            aria-label="Cancelar"
            type="button"
          >
            <FaTimes size={16} />
          </button>
        </div>
      )}

      {showNewClient ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newClient}
            onChange={(e) => setNewClient(e.target.value)}
            placeholder="Nuevo centro de costo"
            className="flex-1 border p-2 rounded"
          />
          <button
            onClick={handleRegisterClient}
            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
            type="button"
          >
            Guardar
          </button>
          <button
            onClick={() => { setShowNewClient(false); setNewClient(""); }}
            className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
            type="button"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setShowNewClient(true); setNewClient(""); }}
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          type="button"
        >
          Nuevo Centro de Costo
        </button>
      )}
    </div>
  );
};

export default ClientSelector;