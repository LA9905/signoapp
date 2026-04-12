import { useMemo, useState, useEffect } from "react";
import { useOperators } from "../context/OperatorsContext";
import { FaRegEdit, FaTrashAlt, FaSave, FaTimes } from "react-icons/fa";
import { normalizeSearch } from "../utils/normalizeSearch";
import { FiSearch, FiPlus, FiX } from "react-icons/fi";

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
    () => operators.filter((s) => normalizeSearch(s.name).includes(normalizeSearch(searchOperator))),
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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .opr-wrap { font-family: 'DM Sans', sans-serif; }

        .opr-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: white; border-radius: 10px;
          padding: 10px 12px 10px 36px;
          font-size: 14px; font-family: 'DM Sans', sans-serif;
          transition: border-color .15s, box-shadow .15s; outline: none;
        }
        .opr-input::placeholder { color: rgba(255,255,255,0.2); }
        .opr-input:focus { border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }

        .opr-select {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.8); border-radius: 10px;
          padding: 10px 12px; font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          transition: border-color .15s; outline: none;
          appearance: none; cursor: pointer;
        }
        .opr-select:focus { border-color: rgba(99,102,241,0.5); }
        .opr-select option { background: #111827; color: white; }

        /* --- ICONOS --- */
        .opr-icon-btn {
          display: flex; 
          align-items: center; 
          justify-content: center;
          width: 38px; 
          height: 38px; 
          border-radius: 8px;
          border: 1px solid transparent;
          cursor: pointer; 
          transition: all .15s; 
          flex-shrink: 0;
          padding: 0;
          color: inherit;
        }
        /* SVG */
        .opr-icon-btn svg { 
          display: block; 
          width: 16px; 
          height: 16px; 
          fill: currentColor; 
        }

        .opr-icon-btn-edit { background: rgba(96,165,250,0.08); border-color: rgba(96,165,250,0.2); color: #60A5FA; }
        .opr-icon-btn-edit:hover { background: rgba(96,165,250,0.18); border-color: rgba(96,165,250,0.4); color: #93C5FD; }
        
        .opr-icon-btn-del { background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.2); color: #F87171; }
        .opr-icon-btn-del:hover { background: rgba(248,113,113,0.18); border-color: rgba(248,113,113,0.4); color: #FCA5A5; }
        
        .opr-icon-btn-save { background: rgba(52,211,153,0.08); border-color: rgba(52,211,153,0.2); color: #6EE7B7; }
        .opr-icon-btn-save:hover { background: rgba(52,211,153,0.18); border-color: rgba(52,211,153,0.4); }
        
        .opr-icon-btn-cancel { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); }
        .opr-icon-btn-cancel:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }

        /* Ajuste para iconos en botones con texto */
        .opr-btn-new svg, .opr-btn-save-new svg, .opr-btn-cancel-new svg {
          display: block;
          fill: currentColor;
        }

        .opr-btn-new {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 9px; font-size: 13px; font-weight: 500;
          background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25); color: #A5B4FC;
          cursor: pointer; transition: all .15s; font-family: 'DM Sans', sans-serif;
        }
        .opr-btn-new:hover { background: rgba(99,102,241,0.18); border-color: rgba(99,102,241,0.4); }

        .opr-btn-save-new {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 16px; border-radius: 9px; font-size: 13px; font-weight: 500;
          background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.25); color: #6EE7B7;
          cursor: pointer; transition: all .15s; font-family: 'DM Sans', sans-serif; white-space: nowrap;
        }
        .opr-btn-save-new:hover { background: rgba(52,211,153,0.18); border-color: rgba(52,211,153,0.4); }

        .opr-btn-cancel-new {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 14px; border-radius: 9px; font-size: 13px; font-weight: 500;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5);
          cursor: pointer; transition: all .15s; font-family: 'DM Sans', sans-serif; white-space: nowrap;
        }
        .opr-btn-cancel-new:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }

        .opr-edit-input {
          flex: 1;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(99,102,241,0.3);
          color: white; border-radius: 10px; padding: 9px 12px; font-size: 14px;
          outline: none; transition: border-color .15s; font-family: 'DM Sans', sans-serif;
        }
        .opr-edit-input:focus { border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        .opr-edit-input::placeholder { color: rgba(255,255,255,0.2); }

        .opr-search-wrap { position: relative; }
        .opr-search-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.2); pointer-events: none; display: flex;
        }
        .opr-select-wrap { position: relative; }
        .opr-select-arrow {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.25); pointer-events: none; font-size: 10px;
        }
      `}</style>

      <div className="opr-wrap" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

        {/* Search input */}
        <div className="opr-search-wrap">
          <span className="opr-search-icon"><FiSearch size={13} /></span>
          <input
            type="text"
            placeholder="Buscar operario..."
            value={searchOperator}
            onChange={(e) => {
              const value = e.target.value;
              setSearchOperator(value);
              const match = operators.find((s) =>
                normalizeSearch(s.name).includes(normalizeSearch(value))
              );
              if (match) {
                onChange(match.name);
              } else {
                onChange("");
              }
            }}
            className="opr-input"
          />
        </div>

        {/* Select + action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div className="opr-select-wrap" style={{ flex: 1 }}>
            <select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="opr-select"
            >
              <option value="">Selecciona Operario</option>
              {filteredOperators.map((operator) => (
                <option key={operator.id} value={operator.name}>
                  {operator.name}
                </option>
              ))}
            </select>
            <span className="opr-select-arrow">▼</span>
          </div>

          {selectedOperator && !isEditing && (
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                className="opr-icon-btn opr-icon-btn-edit"
                title="Editar operario seleccionado"
                aria-label="Editar operario seleccionado"
                onClick={startEdit}
                type="button"
              >
                <FaRegEdit size={14} />
              </button>
              <button
                className="opr-icon-btn opr-icon-btn-del"
                title="Eliminar operario seleccionado"
                aria-label="Eliminar operario seleccionado"
                onClick={removeSelected}
                type="button"
              >
                <FaTrashAlt size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Edit row */}
        {selectedOperator && isEditing && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="opr-edit-input"
              placeholder="Nuevo nombre del operario"
            />
            <button
              onClick={saveEdit}
              className="opr-icon-btn opr-icon-btn-save"
              title="Guardar"
              aria-label="Guardar"
              type="button"
            >
              <FaSave size={14} />
            </button>
            <button
              onClick={cancelEdit}
              className="opr-icon-btn opr-icon-btn-cancel"
              title="Cancelar"
              aria-label="Cancelar"
              type="button"
            >
              <FaTimes size={14} />
            </button>
          </div>
        )}

        {/* New operator form */}
        {showNewOperator ? (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input
              type="text"
              value={newOperator}
              onChange={(e) => setNewOperator(e.target.value)}
              placeholder="Nombre del nuevo operario"
              className="opr-edit-input"
              style={{ flex: 1, minWidth: "150px" }}
            />
            <button onClick={handleRegisterOperator} className="opr-btn-save-new" type="button">
              <FaSave size={13} /> Guardar
            </button>
            <button
              onClick={() => { setShowNewOperator(false); setNewOperator(""); }}
              className="opr-btn-cancel-new"
              type="button"
            >
              <FiX size={13} /> Cancelar
            </button>
          </div>
        ) : (
          <div>
            <button
              onClick={() => { setShowNewOperator(true); setNewOperator(""); }}
              className="opr-btn-new"
              type="button"
            >
              <FiPlus size={13} /> Nuevo Operario
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default OperatorSelector;