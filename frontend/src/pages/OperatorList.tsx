import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOperators } from "../context/OperatorsContext";
import ArrowBackButton from "../components/ArrowBackButton";
import { FiEdit2, FiTrash2, FiPlus } from "react-icons/fi";

const OperatorList: React.FC = () => {
  const navigate = useNavigate();
  const { operators, refresh, updateOperator, deleteOperator } = useOperators();
  const [message, setMessage] = React.useState<string>("");

  useEffect(() => {
    refresh().catch(() => setMessage("Error al cargar operarios"));
  }, [refresh]);

  const handleEdit = (id: number, name: string) => {
    const newName = prompt("Editar nombre del operario:", name);
    if (newName && newName.trim() !== name) {
      updateOperator(id, newName.trim())
        .then(() => setMessage("Operario actualizado"))
        .catch((err: any) => setMessage(err?.response?.data?.error || "Error al actualizar"));
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`¿Eliminar el operario "${name}"?`)) {
      deleteOperator(id)
        .then(() => setMessage("Operario eliminado"))
        .catch((err: any) => setMessage(err?.response?.data?.error || "Error al eliminar"));
    }
  };

  const handleCreateNew = () => {
    navigate("/create-production"); // Redirige a la página de ingreso para crear un operario
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-12">
        <ArrowBackButton />
      </div>
      <h2 className="text-xl font-bold mb-4">Listado de Operarios</h2>
      {message && <p className="mb-4 text-green-600">{message}</p>}

      <div className="space-y-4">
        {operators.map((operator) => (
          <div key={operator.id} className="border p-4 rounded flex justify-between items-center">
            <span>{operator.name}</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(operator.id, operator.name)}
                className="text-blue-500 hover:text-blue-700"
                title="Editar"
              >
                <FiEdit2 size={18} />
              </button>
              <button
                onClick={() => handleDelete(operator.id, operator.name)}
                className="text-red-500 hover:text-red-700"
                title="Eliminar"
              >
                <FiTrash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {operators.length === 0 && (
        <div>
          <p>No hay operarios registrados.</p>
          <button
            onClick={handleCreateNew}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center"
          >
            <FiPlus size={18} />
            <span className="ml-2">Crear Nuevo Operario</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default OperatorList;