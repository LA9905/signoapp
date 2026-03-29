import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSuppliers } from "../context/SuppliersContext";
import ArrowBackButton from "../components/ArrowBackButton";
import { FiEdit2, FiTrash2, FiPlus } from "react-icons/fi";

const SupplierList: React.FC = () => {
  const navigate = useNavigate();
  const { suppliers, refresh, updateSupplier, deleteSupplier } = useSuppliers();
  const [message, setMessage] = React.useState<string>("");

  useEffect(() => {
    refresh().catch(() => setMessage("Error al cargar proveedores"));
  }, [refresh]);

  const handleEdit = (id: number, name: string) => {
    const newName = prompt("Editar nombre del proveedor:", name);
    if (newName && newName.trim() !== name) {
      updateSupplier(id, newName.trim())
        .then(() => setMessage("Proveedor actualizado"))
        .catch((err: any) => setMessage(err?.response?.data?.error || "Error al actualizar"));
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`¿Eliminar el proveedor "${name}"?`)) {
      deleteSupplier(id)
        .then(() => setMessage("Proveedor eliminado"))
        .catch((err: any) => setMessage(err?.response?.data?.error || "Error al eliminar"));
    }
  };

  const handleCreateNew = () => {
    navigate("/receive-supplier"); // Redirige a la página de recepción para crear un proveedor
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-12">
        <ArrowBackButton />
      </div>
      <h2 className="text-xl font-bold mb-4">Listado de Proveedores</h2>
      {message && <p className="mb-4 text-green-600">{message}</p>}

      <div className="space-y-4">
        {suppliers.map((supplier) => (
          <div key={supplier.id} className="border p-4 rounded flex justify-between items-center">
            <span>{supplier.name}</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(supplier.id, supplier.name)}
                className="text-blue-500 hover:text-blue-700"
                title="Editar"
              >
                <FiEdit2 size={18} />
              </button>
              <button
                onClick={() => handleDelete(supplier.id, supplier.name)}
                className="text-red-500 hover:text-red-700"
                title="Eliminar"
              >
                <FiTrash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {suppliers.length === 0 && (
        <div>
          <p>No hay proveedores registrados.</p>
          <button
            onClick={handleCreateNew}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center"
          >
            <FiPlus size={18} /> {/* Quitamos className del ícono y lo movemos al button */}
            <span className="ml-2">Crear Nuevo Proveedor</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SupplierList;