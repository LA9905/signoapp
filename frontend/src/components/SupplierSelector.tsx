import { useMemo, useState, useEffect } from "react";
import { useSuppliers } from "../context/SuppliersContext";
import { FaRegEdit, FaTrashAlt, FaSave, FaTimes } from "react-icons/fa";

interface SupplierSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const SupplierSelector: React.FC<SupplierSelectorProps> = ({ value, onChange }) => {
  const { suppliers, refresh, createSupplier, updateSupplier, deleteSupplier } = useSuppliers();

  const [searchSupplier, setSearchSupplier] = useState("");
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (suppliers.length === 0) {
      refresh().catch(() => {});
    }
  }, [suppliers.length, refresh]);

  const filteredSuppliers = useMemo(
    () => suppliers.filter((s) => s.name.toLowerCase().includes(searchSupplier.toLowerCase())),
    [suppliers, searchSupplier]
  );

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.name === value) || null,
    [suppliers, value]
  );

  const handleRegisterSupplier = async () => {
    const nombre = newSupplier.trim();
    if (!nombre) return;
    try {
      const created = await createSupplier(nombre);
      onChange(created.name);
      setShowNewSupplier(false);
      setNewSupplier("");
    } catch (err) {
      console.error("Error registering supplier:", err);
      alert("No se pudo registrar el proveedor porque ya existe");
    }
  };

  const startEdit = () => {
    if (!selectedSupplier) return;
    setEditName(selectedSupplier.name);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditName("");
  };

  const saveEdit = async () => {
    if (!selectedSupplier) return;
    const nombre = editName.trim();
    if (!nombre) return;
    try {
      const updated = await updateSupplier(selectedSupplier.id, nombre);
      onChange(updated.name);
      cancelEdit();
    } catch (err: any) {
      console.error("Error updating supplier:", err);
      alert(err?.response?.data?.error || "No se pudo actualizar el proveedor");
    }
  };

  const removeSelected = async () => {
    if (!selectedSupplier) return;
    if (!window.confirm(`¿Eliminar el proveedor "${selectedSupplier.name}"?`)) return;
    try {
      await deleteSupplier(selectedSupplier.id);
      if (value === selectedSupplier.name) onChange("");
    } catch (err: any) {
      console.error("Error deleting supplier:", err);
      alert(err?.response?.data?.error || "No se pudo eliminar el proveedor");
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Buscar proveedor..."
        value={searchSupplier}
        onChange={(e) => {
          const value = e.target.value;
          setSearchSupplier(value);
          const match = suppliers.find((s) =>
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
          <option value="">Selecciona Proveedor</option>
          {filteredSuppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.name}>
              {supplier.name}
            </option>
          ))}
        </select>

        {selectedSupplier && !isEditing && (
          <div className="flex items-center gap-1">
            <button
              className="px-2 py-2 rounded border border-gray-600 text-white hover:text-blue-400"
              title="Editar proveedor seleccionado"
              aria-label="Editar proveedor seleccionado"
              onClick={startEdit}
              type="button"
            >
              <FaRegEdit size={16} />
            </button>
            <button
              className="px-2 py-2 rounded border border-gray-600 text-white hover:text-red-400"
              title="Eliminar proveedor seleccionado"
              aria-label="Eliminar proveedor seleccionado"
              onClick={removeSelected}
              type="button"
            >
              <FaTrashAlt size={16} />
            </button>
          </div>
        )}
      </div>

      {selectedSupplier && isEditing && (
        <div className="flex items-center gap-2">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 border p-2 rounded"
            placeholder="Nuevo nombre del proveedor"
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

      {showNewSupplier ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newSupplier}
            onChange={(e) => setNewSupplier(e.target.value)}
            placeholder="Nuevo proveedor"
            className="flex-1 border p-2 rounded"
          />
          <button
            onClick={handleRegisterSupplier}
            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
            type="button"
          >
            Guardar
          </button>
          <button
            onClick={() => { setShowNewSupplier(false); setNewSupplier(""); }}
            className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
            type="button"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setShowNewSupplier(true); setNewSupplier(""); }}
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          type="button"
        >
          Nuevo Proveedor
        </button>
      )}
    </div>
  );
};

export default SupplierSelector;