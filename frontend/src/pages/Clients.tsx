// src/pages/Clients.tsx
import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import { FaRegEdit, FaTrashAlt, FaSave, FaTimes } from "react-icons/fa";
import ArrowBackButton from "../components/ArrowBackButton";
import { useClients } from "../context/ClientsContext";

const Clients = () => {
  const { clients, refresh, createClient, updateClient, deleteClient } = useClients();

  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // 🔎 NUEVO: estado de búsqueda
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Carga inicial
    refresh().catch((e) => console.error("Error loading clients:", e));
  }, [refresh]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      setSubmitting(true);
      await createClient(trimmed);
      setName("");
      // si tu provider no auto-actualiza, descomenta:
      // await refresh();
    } catch (err: any) {
      console.error("Error adding client:", err);
      alert(err?.response?.data?.error || "No se pudo crear el cliente");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (id: number, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setSavingEdit(false);
  };

  const saveEdit = async (id: number) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      alert("El nombre no puede estar vacío");
      return;
    }
    try {
      setSavingEdit(true);
      await updateClient(id, trimmed);
      cancelEdit();
      // si tu provider no auto-actualiza, descomenta:
      // await refresh();
    } catch (err: any) {
      console.error("Error updating client:", err);
      alert(err?.response?.data?.error || "No se pudo actualizar el cliente");
    } finally {
      setSavingEdit(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("¿Eliminar este cliente?")) return;
    try {
      await deleteClient(id);
      // si tu provider no auto-actualiza, descomenta:
      // await refresh();
    } catch (err: any) {
      console.error("Error deleting client:", err);
      alert(err?.response?.data?.error || "No se pudo eliminar el cliente");
    }
  };

  // 🔎 NUEVO: filtrado por nombre (case-insensitive, ignora espacios extra)
  const normalizedQuery = search.trim().toLowerCase();
  const filteredClients = normalizedQuery
    ? clients.filter((c) => (c.name || "").toLowerCase().includes(normalizedQuery))
    : clients;

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="mb-12">
        <ArrowBackButton />
      </div>
      <h2 className="text-2xl font-semibold mb-4">Lista de Centro de Costos</h2>

      {/* 🔎 NUEVO: barra de búsqueda */}
      <input
        type="text"
        placeholder="Buscar centro de costo por nombre..."
        value={search}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        className="border p-2 rounded w-full mb-4"
        aria-label="Buscar centro de costo por nombre"
      />

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Nombre del Centro de Costo"
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          className="flex-1 border p-2 rounded"
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-60"
        >
          {submitting ? "Agregando..." : "Agregar"}
        </button>
      </form>

      <ul className="space-y-2">
        {filteredClients.map((client) => {
          const isEditing = editingId === client.id;
          return (
            <li
              key={client.id}
              className="border p-3 rounded shadow flex items-center justify-between gap-3"
            >
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
                      className="px-2 py-2 rounded border border-gray-600 text-white hover:text-emerald-300 disabled:opacity-60"
                      title="Guardar"
                      aria-label="Guardar"
                      onClick={() => saveEdit(client.id)}
                      disabled={savingEdit}
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