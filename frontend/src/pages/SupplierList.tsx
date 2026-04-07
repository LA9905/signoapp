import React, { useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import { useSuppliers } from "../context/SuppliersContext";
import ArrowBackButton from "../components/ArrowBackButton";
import { FaRegEdit, FaTrashAlt, FaSave, FaTimes } from "react-icons/fa";
import { normalizeSearch } from "../utils/normalizeSearch";

const SupplierList: React.FC = () => {
  const { suppliers, refresh, createSupplier, updateSupplier, deleteSupplier } = useSuppliers();

  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [search, setSearch] = useState("");

  useEffect(() => {
    refresh().catch((e) => console.error("Error loading suppliers:", e));
  }, [refresh]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      setSubmitting(true);
      await createSupplier(trimmed);
      setName("");
    } catch (err: any) {
      alert(err?.response?.data?.error || "No se pudo crear el proveedor");
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
    if (!trimmed) { alert("El nombre no puede estar vacío"); return; }
    try {
      setSavingEdit(true);
      await updateSupplier(id, trimmed);
      cancelEdit();
    } catch (err: any) {
      alert(err?.response?.data?.error || "No se pudo actualizar el proveedor");
    } finally {
      setSavingEdit(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("¿Eliminar este proveedor?")) return;
    try {
      await deleteSupplier(id);
    } catch (err: any) {
      alert(err?.response?.data?.error || "No se pudo eliminar el proveedor");
    }
  };

  const normalizedQuery = normalizeSearch(search);
  const filteredSuppliers = normalizedQuery
    ? suppliers.filter((s) => normalizeSearch(s.name || "").includes(normalizedQuery))
    : suppliers;

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="mb-12">
        <ArrowBackButton />
      </div>
      <h2 className="text-2xl font-semibold mb-4">Lista de Proveedores</h2>

      <input
        type="text"
        placeholder="Buscar proveedor por nombre..."
        value={search}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        className="border p-2 rounded w-full mb-4"
        aria-label="Buscar proveedor por nombre"
      />

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Nombre del Proveedor"
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
        {filteredSuppliers.map((supplier) => {
          const isEditing = editingId === supplier.id;
          return (
            <li
              key={supplier.id}
              className="border p-3 rounded shadow flex items-center justify-between gap-3"
            >
              <div className="flex-1">
                {!isEditing ? (
                  <strong>{supplier.name}</strong>
                ) : (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="border p-2 rounded w-full"
                    placeholder="Nombre del proveedor"
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
                      onClick={() => startEdit(supplier.id, supplier.name)}
                    >
                      <FaRegEdit size={16} />
                    </button>
                    <button
                      className="px-2 py-2 rounded border border-gray-600 text-white hover:text-red-400"
                      title="Eliminar"
                      aria-label="Eliminar"
                      onClick={() => remove(supplier.id)}
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
                      onClick={() => saveEdit(supplier.id)}
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

export default SupplierList;