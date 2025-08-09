import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react';
import { FaRegEdit, FaTrashAlt, FaSave, FaTimes } from "react-icons/fa";
import { useClients } from "../context/ClientsContext";

const Clients = () => {
  const { clients, refresh, createClient, updateClient, deleteClient } = useClients();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    refresh().catch((e) => console.error("Error loading clients:", e));
  }, [refresh]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createClient(name.trim());
      setName("");
    } catch (err) {
      console.error("Error adding client:", err);
      alert("No se pudo crear el cliente");
    }
  };

  const startEdit = (id: number, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveEdit = async (id: number) => {
    try {
      await updateClient(id, editName.trim());
      cancelEdit();
    } catch (err: any) {
      console.error("Error updating client:", err);
      alert(err?.response?.data?.error || "No se pudo actualizar el cliente");
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("¿Eliminar este cliente?")) return;
    try {
      await deleteClient(id);
    } catch (err: any) {
      console.error("Error deleting client:", err);
      alert(err?.response?.data?.error || "No se pudo eliminar el cliente");
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Lista de Clientes</h2>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Nombre del cliente"
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          className="flex-1 border p-2 rounded"
          required
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Agregar
        </button>
      </form>

      <ul className="space-y-2">
        {clients.map((client) => {
          const isEditing = editingId === client.id;
          return (
            <li key={client.id} className="border p-3 rounded shadow flex items-center justify-between gap-3">
              <div className="flex-1">
                {!isEditing ? (
                  <strong>{client.name}</strong>
                ) : (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="border p-2 rounded w-full"
                    placeholder="Nombre del cliente"
                  />
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <button
                      className="px-2 py-2 rounded border border-gray-600 text-white hover:text-blue-400"
                      title="Editar"
                      aria-label="Editar"
                      onClick={() => startEdit(client.id, client.name)}
                    >
                      <FaRegEdit size={16} />
                    </button>
                    <button
                      className="px-2 py-2 rounded border border-gray-600 text-white hover:text-red-400"
                      title="Eliminar"
                      aria-label="Eliminar"
                      onClick={() => remove(client.id)}
                    >
                      <FaTrashAlt size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="px-2 py-2 rounded border border-gray-600 text-white hover:text-emerald-300"
                      title="Guardar"
                      aria-label="Guardar"
                      onClick={() => saveEdit(client.id)}
                    >
                      <FaSave size={16} />
                    </button>
                    <button
                      className="px-2 py-2 rounded border border-gray-600 text-white hover:text-gray-300"
                      title="Cancelar"
                      aria-label="Cancelar"
                      onClick={cancelEdit}
                    >
                      <FaTimes size={16} />
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Clients;