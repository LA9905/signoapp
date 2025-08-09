import { useMemo, useState, useEffect } from "react";
import { useDrivers } from "../context/DriversContext";
import { FaRegEdit, FaTrashAlt, FaSave, FaTimes } from "react-icons/fa";

interface DriverSelectorProps {
  value: string;                 // id del chofer seleccionado (string)
  onChange: (id: string) => void;
}

const DriverSelector: React.FC<DriverSelectorProps> = ({ value, onChange }) => {
  const { drivers, refresh, createDriver, updateDriver, deleteDriver } = useDrivers();

  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (drivers.length === 0) {
      refresh().catch(() => {});
    }
  }, [drivers.length, refresh]);

  const filtered = useMemo(
    () => drivers.filter((d) => d.name.toLowerCase().includes(search.toLowerCase())),
    [drivers, search]
  );

  const selected = useMemo(
    () => drivers.find((d) => String(d.id) === value) || null,
    [drivers, value]
  );

  const handleCreate = async () => {
    const nombre = newName.trim();
    if (!nombre) return;
    try {
      const created = await createDriver(nombre);
      onChange(String(created.id));
      setShowNew(false);
      setNewName("");
    } catch (err) {
      console.error(err);
      alert("No se pudo registrar el chofer");
    }
  };

  const startEdit = () => {
    if (!selected) return;
    setEditName(selected.name);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditName("");
  };

  const saveEdit = async () => {
    if (!selected) return;
    const nombre = editName.trim();
    if (!nombre) return;
    try {
      const updated = await updateDriver(selected.id, nombre);
      onChange(String(updated.id)); // mantener selección
      cancelEdit();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.error || "No se pudo actualizar el chofer");
    }
  };

  const removeSelected = async () => {
    if (!selected) return;
    if (!window.confirm(`¿Eliminar el chofer "${selected.name}"?`)) return;
    try {
      await deleteDriver(selected.id);
      if (String(selected.id) === value) onChange("");
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.error || "No se pudo eliminar el chofer");
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Buscar chofer..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border p-2 rounded"
      />

      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="">Selecciona chofer</option>
          {filtered.map((ch) => (
            <option key={ch.id} value={String(ch.id)}>
              {ch.name}
            </option>
          ))}
        </select>

        {selected && !isEditing && (
          <div className="flex items-center gap-1">
            <button
              className="px-2 py-2 rounded border border-gray-600 text-white hover:text-blue-400"
              title="Editar chofer seleccionado"
              aria-label="Editar chofer seleccionado"
              type="button"
              onClick={startEdit}
            >
              <FaRegEdit size={16} />
            </button>
            <button
              className="px-2 py-2 rounded border border-gray-600 text-white hover:text-red-400"
              title="Eliminar chofer seleccionado"
              aria-label="Eliminar chofer seleccionado"
              type="button"
              onClick={removeSelected}
            >
              <FaTrashAlt size={16} />
            </button>
          </div>
        )}
      </div>

      {selected && isEditing && (
        <div className="flex items-center gap-2">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 border p-2 rounded"
            placeholder="Nuevo nombre del chofer"
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

      {showNew ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nuevo chofer"
            className="flex-1 border p-2 rounded"
          />
          <button
            onClick={handleCreate}
            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
            type="button"
          >
            Guardar
          </button>
          <button
            onClick={() => { setShowNew(false); setNewName(""); }}
            className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
            type="button"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setShowNew(true); setNewName(""); }}
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          type="button"
        >
          Nuevo Chofer
        </button>
      )}
    </div>
  );
};

export default DriverSelector;