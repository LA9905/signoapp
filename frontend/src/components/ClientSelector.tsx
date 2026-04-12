import { useMemo, useState, useEffect } from "react";
import { normalizeSearch } from "../utils/normalizeSearch";
import { useClients } from "../context/ClientsContext";
import { FaRegEdit, FaTrashAlt, FaSave, FaTimes } from "react-icons/fa";
import { FiSearch, FiPlus, FiX } from "react-icons/fi";

interface ClientSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({ value, onChange }) => {
  const { clients, refresh, createClient, updateClient, deleteClient } = useClients();

  const [searchClient, setSearchClient] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (clients.length === 0) {
      refresh().catch(() => {});
    }
  }, [clients.length, refresh]);

  const filteredClients = useMemo(
    () => clients.filter((c) => normalizeSearch(c.name).includes(normalizeSearch(searchClient))),
    [clients, searchClient]
  );

  const selectedClient = useMemo(
    () => clients.find((c) => c.name === value) || null,
    [clients, value]
  );

  const handleRegisterClient = async () => {
    const nombre = newClient.trim();
    if (!nombre) return;
    try {
      const created = await createClient(nombre);
      onChange(created.name);
      setShowNewClient(false);
      setNewClient("");
    } catch (err) {
      console.error("Error registering client:", err);
      alert("No se pudo registrar el centro de costo porque ya existe");
    }
  };

  const startEdit = () => {
    if (!selectedClient) return;
    setEditName(selectedClient.name);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditName("");
  };

  const saveEdit = async () => {
    if (!selectedClient) return;
    const nombre = editName.trim();
    if (!nombre) return;
    try {
      const updated = await updateClient(selectedClient.id, nombre);
      onChange(updated.name);
      cancelEdit();
    } catch (err: any) {
      console.error("Error updating client:", err);
      alert(err?.response?.data?.error || "No se pudo actualizar el cliente");
    }
  };

  const removeSelected = async () => {
    if (!selectedClient) return;
    if (!window.confirm(`¿Eliminar el cliente "${selectedClient.name}"?`)) return;
    try {
      await deleteClient(selectedClient.id);
      if (value === selectedClient.name) onChange("");
    } catch (err: any) {
      console.error("Error deleting client:", err);
      alert(err?.response?.data?.error || "No se pudo eliminar el cliente");
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .sel-wrap { font-family: 'DM Sans', sans-serif; }

        .sel-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: white;
          border-radius: 10px;
          padding: 10px 12px 10px 36px;
          font-size: 14px;
          transition: border-color .15s, box-shadow .15s;
          outline: none;
        }
        .sel-input::placeholder { color: rgba(255,255,255,0.2); }
        .sel-input:focus {
          border-color: rgba(99,102,241,0.6);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
        }

        .sel-select {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.8);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          transition: border-color .15s;
          outline: none;
          appearance: none;
          cursor: pointer;
        }
        .sel-select:focus { border-color: rgba(99,102,241,0.5); }
        .sel-select option { background: #111827; color: white; }

        .sel-icon-btn {
          display: flex; 
          align-items: center; 
          justify-content: center;
          width: 38px; 
          height: 38px; 
          border-radius: 8px;
          border: 1px solid transparent;
          cursor: pointer; 
          transition: all .2s; 
          flex-shrink: 0;
          padding: 0; /* Evita que el padding colapse el icono */
        }

        /* SVG */
        .sel-icon-btn svg { 
          display: block;
          width: 16px; 
          height: 16px; 
          fill: currentColor; 
        }

        .sel-icon-btn-edit {
          background: rgba(96,165,250,0.08);
          border-color: rgba(96,165,250,0.2);
          color: #60A5FA;
        }
        .sel-icon-btn-edit:hover { background: rgba(96,165,250,0.18); border-color: rgba(96,165,250,0.4); color: #93C5FD; }

        .sel-icon-btn-del {
          background: rgba(248,113,113,0.08);
          border-color: rgba(248,113,113,0.2);
          color: #F87171;
        }
        .sel-icon-btn-del:hover { background: rgba(248,113,113,0.18); border-color: rgba(248,113,113,0.4); color: #FCA5A5; }

        .sel-icon-btn-save {
          background: rgba(52,211,153,0.08);
          border-color: rgba(52,211,153,0.2);
          color: #6EE7B7;
        }
        .sel-icon-btn-save:hover { background: rgba(52,211,153,0.18); border-color: rgba(52,211,153,0.4); }

        .sel-icon-btn-cancel {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5);
        }
        .sel-icon-btn-cancel:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }

        .sel-btn-new {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 9px; font-size: 13px; font-weight: 500;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.25);
          color: #A5B4FC;
          cursor: pointer; transition: all .15s;
          font-family: 'DM Sans', sans-serif;
        }
        .sel-btn-new:hover { background: rgba(99,102,241,0.18); border-color: rgba(99,102,241,0.4); }

        .sel-btn-save-new {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 16px; border-radius: 9px; font-size: 13px; font-weight: 500;
          background: rgba(52,211,153,0.1);
          border: 1px solid rgba(52,211,153,0.25);
          color: #6EE7B7;
          cursor: pointer; transition: all .15s;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
        }
        .sel-btn-save-new:hover { background: rgba(52,211,153,0.18); border-color: rgba(52,211,153,0.4); }

        .sel-btn-cancel-new {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 14px; border-radius: 9px; font-size: 13px; font-weight: 500;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5);
          cursor: pointer; transition: all .15s;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
        }
        .sel-btn-cancel-new:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }

        .sel-label {
          font-size: 11px; font-weight: 600; letter-spacing: .06em;
          text-transform: uppercase; color: rgba(255,255,255,0.35);
          margin-bottom: 5px; display: block;
        }

        .sel-selected-chip {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 6px; padding: 3px 10px;
          font-size: 12px; color: #A5B4FC;
          font-weight: 500;
        }

        .sel-edit-row {
          display: flex; align-items: center; gap: 8px;
        }
        .sel-edit-input {
          flex: 1;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(99,102,241,0.3);
          color: white; border-radius: 10px;
          padding: 9px 12px; font-size: 14px;
          outline: none; transition: border-color .15s;
          font-family: 'DM Sans', sans-serif;
        }
        .sel-edit-input:focus { border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        .sel-edit-input::placeholder { color: rgba(255,255,255,0.2); }

        .sel-divider {
          height: 1px;
          background: linear-gradient(to right, rgba(99,102,241,0.15), transparent);
          margin: 2px 0;
        }

        .sel-search-wrap { position: relative; }
        .sel-search-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.2); pointer-events: none;
          display: flex;
        }

        .sel-select-wrap { position: relative; }
        .sel-select-arrow {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.25); pointer-events: none; font-size: 10px;
        }
      `}</style>

      <div className="sel-wrap" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

        {/* Search input */}
        <div className="sel-search-wrap">
          <span className="sel-search-icon"><FiSearch size={13} /></span>
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={searchClient}
            onChange={(e) => {
              const value = e.target.value;
              setSearchClient(value);
              const match = clients.find((c) =>
                normalizeSearch(c.name).includes(normalizeSearch(value))
              );
              if (match) {
                onChange(match.name);
              } else {
                onChange("");
              }
            }}
            className="sel-input"
          />
        </div>

        {/* Select + action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div className="sel-select-wrap" style={{ flex: 1 }}>
            <select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="sel-select"
            >
              <option value="">Selecciona Centro de costo</option>
              {filteredClients.map((client) => (
                <option key={client.id} value={client.name}>
                  {client.name}
                </option>
              ))}
            </select>
            <span className="sel-select-arrow">▼</span>
          </div>

          {selectedClient && !isEditing && (
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                className="sel-icon-btn sel-icon-btn-edit"
                title="Editar cliente seleccionado"
                aria-label="Editar cliente seleccionado"
                onClick={startEdit}
                type="button"
              >
                <FaRegEdit size={14} />
              </button>
              <button
                className="sel-icon-btn sel-icon-btn-del"
                title="Eliminar cliente seleccionado"
                aria-label="Eliminar cliente seleccionado"
                onClick={removeSelected}
                type="button"
              >
                <FaTrashAlt size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Edit row */}
        {selectedClient && isEditing && (
          <div className="sel-edit-row">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="sel-edit-input"
              placeholder="Nuevo nombre del cliente"
            />
            <button
              onClick={saveEdit}
              className="sel-icon-btn sel-icon-btn-save"
              title="Guardar"
              aria-label="Guardar"
              type="button"
            >
              <FaSave size={14} />
            </button>
            <button
              onClick={cancelEdit}
              className="sel-icon-btn sel-icon-btn-cancel"
              title="Cancelar"
              aria-label="Cancelar"
              type="button"
            >
              <FaTimes size={14} />
            </button>
          </div>
        )}

        {/* New client form */}
        {showNewClient ? (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input
              type="text"
              value={newClient}
              onChange={(e) => setNewClient(e.target.value)}
              placeholder="Nombre del nuevo centro de costo"
              className="sel-edit-input"
              style={{ flex: 1, minWidth: "150px" }}
            />
            <button onClick={handleRegisterClient} className="sel-btn-save-new" type="button">
              <FaSave size={13} /> Guardar
            </button>
            <button
              onClick={() => { setShowNewClient(false); setNewClient(""); }}
              className="sel-btn-cancel-new"
              type="button"
            >
              <FiX size={13} /> Cancelar
            </button>
          </div>
        ) : (
          <div>
            <button
              onClick={() => { setShowNewClient(true); setNewClient(""); }}
              className="sel-btn-new"
              type="button"
            >
              <FiPlus size={13} /> Nuevo Centro de Costo
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default ClientSelector;