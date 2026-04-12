import { useMemo, useState, useEffect } from "react";
import { normalizeSearch } from "../utils/normalizeSearch";
import { useDrivers } from "../context/DriversContext";
import { FaRegEdit, FaTrashAlt, FaSave, FaTimes } from "react-icons/fa";
import { FiSearch, FiPlus, FiX } from "react-icons/fi";

interface DriverSelectorProps {
  value: string;
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
    () => drivers.filter((d) => normalizeSearch(d.name).includes(normalizeSearch(search))),
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
      onChange(String(updated.id));
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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .drv-wrap { font-family: 'DM Sans', sans-serif; }

        .drv-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: white; border-radius: 10px;
          padding: 10px 12px 10px 36px;
          font-size: 14px; font-family: 'DM Sans', sans-serif;
          transition: border-color .15s, box-shadow .15s;
          outline: none;
        }
        .drv-input::placeholder { color: rgba(255,255,255,0.2); }
        .drv-input:focus {
          border-color: rgba(99,102,241,0.6);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
        }

        .drv-select {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.8); border-radius: 10px;
          padding: 10px 12px; font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          transition: border-color .15s; outline: none;
          appearance: none; cursor: pointer;
        }
        .drv-select:focus { border-color: rgba(99,102,241,0.5); }
        .drv-select option { background: #111827; color: white; }

        .drv-icon-btn {
          display: flex; 
          align-items: center; 
          justify-content: center;
          width: 38px; 
          height: 38px; 
          border-radius: 8px;
          border: 1px solid transparent;
          cursor: pointer; 
          transition: all .2s;
          padding: 0;
        }

        .drv-icon-btn svg { 
          display: block;
          width: 16px; 
          height: 16px;
          fill: currentColor;
        }

        .drv-icon-btn-edit {
          background: rgba(96,165,250,0.08); border-color: rgba(96,165,250,0.2); color: #60A5FA;
        }
        .drv-icon-btn-edit:hover { background: rgba(96,165,250,0.18); border-color: rgba(96,165,250,0.4); color: #93C5FD; }
        .drv-icon-btn-del {
          background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.2); color: #F87171;
        }
        .drv-icon-btn-del:hover { background: rgba(248,113,113,0.18); border-color: rgba(248,113,113,0.4); color: #FCA5A5; }
        .drv-icon-btn-save {
          background: rgba(52,211,153,0.08); border-color: rgba(52,211,153,0.2); color: #6EE7B7;
        }
        .drv-icon-btn-save:hover { background: rgba(52,211,153,0.18); border-color: rgba(52,211,153,0.4); }
        .drv-icon-btn-cancel {
          background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5);
        }
        .drv-icon-btn-cancel:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }

        .drv-btn-new {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 9px; font-size: 13px; font-weight: 500;
          background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25); color: #A5B4FC;
          cursor: pointer; transition: all .15s; font-family: 'DM Sans', sans-serif;
        }
        .drv-btn-new:hover { background: rgba(99,102,241,0.18); border-color: rgba(99,102,241,0.4); }

        .drv-btn-save-new {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 16px; border-radius: 9px; font-size: 13px; font-weight: 500;
          background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.25); color: #6EE7B7;
          cursor: pointer; transition: all .15s; font-family: 'DM Sans', sans-serif; white-space: nowrap;
        }
        .drv-btn-save-new:hover { background: rgba(52,211,153,0.18); border-color: rgba(52,211,153,0.4); }

        .drv-btn-cancel-new {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 14px; border-radius: 9px; font-size: 13px; font-weight: 500;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5);
          cursor: pointer; transition: all .15s; font-family: 'DM Sans', sans-serif; white-space: nowrap;
        }
        .drv-btn-cancel-new:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }

        .drv-edit-input {
          flex: 1;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(99,102,241,0.3);
          color: white; border-radius: 10px; padding: 9px 12px; font-size: 14px;
          outline: none; transition: border-color .15s; font-family: 'DM Sans', sans-serif;
        }
        .drv-edit-input:focus { border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        .drv-edit-input::placeholder { color: rgba(255,255,255,0.2); }

        .drv-search-wrap { position: relative; }
        .drv-search-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.2); pointer-events: none; display: flex;
        }
        .drv-select-wrap { position: relative; }
        .drv-select-arrow {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.25); pointer-events: none; font-size: 10px;
        }
      `}</style>

      <div className="drv-wrap" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

        {/* Search input */}
        <div className="drv-search-wrap">
          <span className="drv-search-icon"><FiSearch size={13} /></span>
          <input
            type="text"
            placeholder="Buscar chofer..."
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value);
              const match = drivers.find((d) =>
                normalizeSearch(d.name).includes(normalizeSearch(value))
              );
              if (match) {
                onChange(String(match.id));
              } else {
                onChange("");
              }
            }}
            className="drv-input"
          />
        </div>

        {/* Select + action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div className="drv-select-wrap" style={{ flex: 1 }}>
            <select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="drv-select"
            >
              <option value="">Selecciona chofer</option>
              {filtered.map((ch) => (
                <option key={ch.id} value={String(ch.id)}>
                  {ch.name}
                </option>
              ))}
            </select>
            <span className="drv-select-arrow">▼</span>
          </div>

          {selected && !isEditing && (
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                className="drv-icon-btn drv-icon-btn-edit"
                title="Editar chofer seleccionado"
                aria-label="Editar chofer seleccionado"
                type="button"
                onClick={startEdit}
              >
                <FaRegEdit size={14} />
              </button>
              <button
                className="drv-icon-btn drv-icon-btn-del"
                title="Eliminar chofer seleccionado"
                aria-label="Eliminar chofer seleccionado"
                type="button"
                onClick={removeSelected}
              >
                <FaTrashAlt size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Edit row */}
        {selected && isEditing && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="drv-edit-input"
              placeholder="Nuevo nombre del chofer"
            />
            <button
              onClick={saveEdit}
              className="drv-icon-btn drv-icon-btn-save"
              title="Guardar"
              aria-label="Guardar"
              type="button"
            >
              <FaSave size={14} />
            </button>
            <button
              onClick={cancelEdit}
              className="drv-icon-btn drv-icon-btn-cancel"
              title="Cancelar"
              aria-label="Cancelar"
              type="button"
            >
              <FaTimes size={14} />
            </button>
          </div>
        )}

        {/* New driver form */}
        {showNew ? (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del nuevo chofer"
              className="drv-edit-input"
              style={{ flex: 1, minWidth: "150px" }}
            />
            <button onClick={handleCreate} className="drv-btn-save-new" type="button">
              <FaSave size={13} /> Guardar
            </button>
            <button
              onClick={() => { setShowNew(false); setNewName(""); }}
              className="drv-btn-cancel-new"
              type="button"
            >
              <FiX size={13} /> Cancelar
            </button>
          </div>
        ) : (
          <div>
            <button
              onClick={() => { setShowNew(true); setNewName(""); }}
              className="drv-btn-new"
              type="button"
            >
              <FiPlus size={13} /> Nuevo Chofer
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default DriverSelector;