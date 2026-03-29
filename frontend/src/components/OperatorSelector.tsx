import { useMemo, useState, useEffect } from "react";
import { useOperators } from "../context/OperatorsContext";
import { FaRegEdit, FaTrashAlt, FaSave, FaTimes } from "react-icons/fa";

interface OperatorSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const OperatorSelector: React.FC<OperatorSelectorProps> = ({ value, onChange }) => {
  const { operators, refresh, createOperator, updateOperator, deleteOperator } = useOperators();

  const [searchOperator, setSearchOperator] = useState("");
  const [showNewOperator, setShowNewOperator] = useState(false);
  const [newOperator, setNewOperator] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (operators.length === 0) {
      refresh().catch(() => {});
    }
  }, [operators.length, refresh]);

  const filteredOperators = useMemo(
    () => operators.filter((s) => s.name.toLowerCase().includes(searchOperator.toLowerCase())),
    [operators, searchOperator]
  );

  const selectedOperator = useMemo(
    () => operators.find((s) => s.name === value) || null,
    [operators, value]
  );

  const handleRegisterOperator = async () => {
    const nombre = newOperator.trim();
    if (!nombre) return;
    try {
      const created = await createOperator(nombre);
      onChange(created.name);
      setShowNewOperator(false);
      setNewOperator("");
    } catch (err) {
      console.error("Error registering operator:", err);
      alert("No se pudo registrar el operario porque ya existe");
    }
  };

  const startEdit = () => {
    if (!selectedOperator) return;
    setEditName(selectedOperator.name);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditName("");
  };

  const saveEdit = async () => {
    if (!selectedOperator) return;
    const nombre = editName.trim();
    if (!nombre) return;
    try {
      const updated = await updateOperator(selectedOperator.id, nombre);
      onChange(updated.name);
      cancelEdit();
    } catch (err: any) {
      console.error("Error updating operator:", err);
      alert(err?.response?.data?.error || "No se pudo actualizar el operario");
    }
  };

  const removeSelected = async () => {
    if (!selectedOperator) return;
    if (!window.confirm(`¿Eliminar el operario "${selectedOperator.name}"?`)) return;
    try {
      await deleteOperator(selectedOperator.id);
      if (value === selectedOperator.name) onChange("");
    } catch (err: any) {
      console.error("Error deleting operator:", err);
      alert(err?.response?.data?.error || "No se pudo eliminar el operario");
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Buscar operario..."
        value={searchOperator}
        onChange={(e) => {
          const value = e.target.value;
          setSearchOperator(value);
          const match = operators.find((s) =>
            s.name.toLowerCase().includes(value.toLowerCase())
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
          <option value="">Selecciona Operario</option>
          {filteredOperators.map((operator) => (
            <option key={operator.id} value={operator.name}>
              {operator.name}
            </option>
          ))}
        </select>

        {selectedOperator && !isEditing && (
          <div className="flex items-center gap-1">
            <button
              className="px-2 py-2 rounded border border-gray-600 text-white hover:text-blue-400"
              title="Editar operario seleccionado"
              aria-label="Editar operario seleccionado"
              onClick={startEdit}
              type="button"
            >
              <FaRegEdit size={16} />
            </button>
            <button
              className="px-2 py-2 rounded border border-gray-600 text-white hover:text-red-400"
              title="Eliminar operario seleccionado"
              aria-label="Eliminar operario seleccionado"
              onClick={removeSelected}
              type="button"
            >
              <FaTrashAlt size={16} />
            </button>
          </div>
        )}
      </div>

      {selectedOperator && isEditing && (
        <div className="flex items-center gap-2">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 border p-2 rounded"
            placeholder="Nuevo nombre del operario"
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

      {showNewOperator ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newOperator}
            onChange={(e) => setNewOperator(e.target.value)}
            placeholder="Nuevo operario"
            className="flex-1 border p-2 rounded"
          />
          <button
            onClick={handleRegisterOperator}
            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
            type="button"
          >
            Guardar
          </button>
          <button
            onClick={() => { setShowNewOperator(false); setNewOperator(""); }}
            className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
            type="button"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setShowNewOperator(true); setNewOperator(""); }}
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          type="button"
        >
          Nuevo Operario
        </button>
      )}
    </div>
  );
};

export default OperatorSelector;