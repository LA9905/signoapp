import { useMemo, useState, useEffect } from "react";
import { useSuppliers } from "../context/SuppliersContext";
import { FaRegEdit, FaTrashAlt, FaSave, FaTimes } from "react-icons/fa";
import { normalizeSearch } from "../utils/normalizeSearch";
import { FiSearch, FiPlus, FiX } from "react-icons/fi";

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
    () => suppliers.filter((s) => normalizeSearch(s.name).includes(normalizeSearch(searchSupplier))),
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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .sup-wrap { font-family: 'DM Sans', sans-serif; }

        .sup-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: white; border-radius: 10px;
          padding: 10px 12px 10px 36px;
          font-size: 14px; font-family: 'DM Sans', sans-serif;
          transition: border-color .15s, box-shadow .15s; outline: none;
        }
        .sup-input::placeholder { color: rgba(255,255,255,0.2); }
        .sup-input:focus { border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }

        .sup-select {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.8); border-radius: 10px;
          padding: 10px 12px; font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          transition: border-color .15s; outline: none;
          appearance: none; cursor: pointer;
        }
        .sup-select:focus { border-color: rgba(99,102,241,0.5); }
        .sup-select option { background: #111827; color: white; }

        /* ICONOS */
        .sup-icon-btn {
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
        .sup-icon-btn svg { 
          display: block; 
          width: 16px; 
          height: 16px; 
          fill: currentColor; 
        }

        .sup-icon-btn-edit { background: rgba(96,165,250,0.08); border-color: rgba(96,165,250,0.2); color: #60A5FA; }
        .sup-icon-btn-edit:hover { background: rgba(96,165,250,0.18); border-color: rgba(96,165,250,0.4); color: #93C5FD; }
        
        .sup-icon-btn-del { background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.2); color: #F87171; }
        .sup-icon-btn-del:hover { background: rgba(248,113,113,0.18); border-color: rgba(248,113,113,0.4); color: #FCA5A5; }
        
        .sup-icon-btn-save { background: rgba(52,211,153,0.08); border-color: rgba(52,211,153,0.2); color: #6EE7B7; }
        .sup-icon-btn-save:hover { background: rgba(52,211,153,0.18); border-color: rgba(52,211,153,0.4); }
        
        .sup-icon-btn-cancel { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); }
        .sup-icon-btn-cancel:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }

        .sup-btn-new {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 9px; font-size: 13px; font-weight: 500;
          background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25); color: #A5B4FC;
          cursor: pointer; transition: all .15s; font-family: 'DM Sans', sans-serif;
        }
        .sup-btn-new:hover { background: rgba(99,102,241,0.18); border-color: rgba(99,102,241,0.4); }

        /* Asegura que los iconos en los botones de texto vean */
        .sup-btn-save-new svg, .sup-btn-cancel-new svg, .sup-btn-new svg {
          display: block;
          fill: currentColor;
        }

        .sup-btn-save-new {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 16px; border-radius: 9px; font-size: 13px; font-weight: 500;
          background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.25); color: #6EE7B7;
          cursor: pointer; transition: all .15s; font-family: 'DM Sans', sans-serif; white-space: nowrap;
        }
        .sup-btn-save-new:hover { background: rgba(52,211,153,0.18); border-color: rgba(52,211,153,0.4); }

        .sup-btn-cancel-new {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 14px; border-radius: 9px; font-size: 13px; font-weight: 500;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5);
          cursor: pointer; transition: all .15s; font-family: 'DM Sans', sans-serif; white-space: nowrap;
        }
        .sup-btn-cancel-new:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }

        .sup-edit-input {
          flex: 1;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(99,102,241,0.3);
          color: white; border-radius: 10px; padding: 9px 12px; font-size: 14px;
          outline: none; transition: border-color .15s; font-family: 'DM Sans', sans-serif;
        }
        .sup-edit-input:focus { border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        .sup-edit-input::placeholder { color: rgba(255,255,255,0.2); }

        .sup-search-wrap { position: relative; }
        .sup-search-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.2); pointer-events: none; display: flex;
        }
        .sup-select-wrap { position: relative; }
        .sup-select-arrow {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.25); pointer-events: none; font-size: 10px;
        }
      `}</style>

      <div className="sup-wrap" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

        {/* Search input */}
        <div className="sup-search-wrap">
          <span className="sup-search-icon"><FiSearch size={13} /></span>
          <input
            type="text"
            placeholder="Buscar proveedor..."
            value={searchSupplier}
            onChange={(e) => {
              const value = e.target.value;
              setSearchSupplier(value);
              const match = suppliers.find((s) =>
                normalizeSearch(s.name).includes(normalizeSearch(value))
              );
              if (match) {
                onChange(match.name);
              } else {
                onChange("");
              }
            }}
            className="sup-input"
          />
        </div>

        {/* Select + action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div className="sup-select-wrap" style={{ flex: 1 }}>
            <select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="sup-select"
            >
              <option value="">Selecciona Proveedor</option>
              {filteredSuppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.name}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <span className="sup-select-arrow">▼</span>
          </div>

          {selectedSupplier && !isEditing && (
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                className="sup-icon-btn sup-icon-btn-edit"
                title="Editar proveedor seleccionado"
                aria-label="Editar proveedor seleccionado"
                onClick={startEdit}
                type="button"
              >
                <FaRegEdit size={14} />
              </button>
              <button
                className="sup-icon-btn sup-icon-btn-del"
                title="Eliminar proveedor seleccionado"
                aria-label="Eliminar proveedor seleccionado"
                onClick={removeSelected}
                type="button"
              >
                <FaTrashAlt size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Edit row */}
        {selectedSupplier && isEditing && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="sup-edit-input"
              placeholder="Nuevo nombre del proveedor"
            />
            <button
              onClick={saveEdit}
              className="sup-icon-btn sup-icon-btn-save"
              title="Guardar"
              aria-label="Guardar"
              type="button"
            >
              <FaSave size={14} />
            </button>
            <button
              onClick={cancelEdit}
              className="sup-icon-btn sup-icon-btn-cancel"
              title="Cancelar"
              aria-label="Cancelar"
              type="button"
            >
              <FaTimes size={14} />
            </button>
          </div>
        )}

        {/* New supplier form */}
        {showNewSupplier ? (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input
              type="text"
              value={newSupplier}
              onChange={(e) => setNewSupplier(e.target.value)}
              placeholder="Nombre del nuevo proveedor"
              className="sup-edit-input"
              style={{ flex: 1, minWidth: "150px" }}
            />
            <button onClick={handleRegisterSupplier} className="sup-btn-save-new" type="button">
              <FaSave size={13} /> Guardar
            </button>
            <button
              onClick={() => { setShowNewSupplier(false); setNewSupplier(""); }}
              className="sup-btn-cancel-new"
              type="button"
            >
              <FiX size={13} /> Cancelar
            </button>
          </div>
        ) : (
          <div>
            <button
              onClick={() => { setShowNewSupplier(true); setNewSupplier(""); }}
              className="sup-btn-new"
              type="button"
            >
              <FiPlus size={13} /> Nuevo Proveedor
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default SupplierSelector;