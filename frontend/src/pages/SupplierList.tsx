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
    <div
      className="min-h-screen"
      style={{ background: "#080C14", color: "white", fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .ls-font-display { font-family: 'Syne', sans-serif; }

        .ls-glass {
          background: rgba(30,40,80,0.35);
          border: 1px solid rgba(99,102,241,0.18);
          border-radius: 16px;
        }

        .ls-input {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: white;
          border-radius: 10px;
          transition: border-color .15s, box-shadow .15s;
          font-size: 14px;
          width: 100%;
          padding: 9px 12px;
          box-sizing: border-box;
          font-family: 'DM Sans', sans-serif;
        }
        .ls-input::placeholder { color: rgba(255,255,255,0.2); }
        .ls-input:focus { outline: none; border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }

        .ls-field-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin-bottom: 5px;
        }

        .ls-btn {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 6px; border: none; border-radius: 10px;
          padding: 9px 18px; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all .15s;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
        }
        .ls-btn:disabled { opacity: .45; cursor: not-allowed; transform: none !important; }

        .ls-btn-indigo {
          background: linear-gradient(135deg, #4F46E5, #6366F1);
          box-shadow: 0 4px 14px rgba(99,102,241,0.3);
          color: white;
        }
        .ls-btn-indigo:hover:not(:disabled) { box-shadow: 0 6px 20px rgba(99,102,241,0.4); transform: translateY(-1px); }

        .ls-item {
          background: rgba(30,40,80,0.35);
          border: 1px solid rgba(99,102,241,0.15);
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          transition: background .12s;
        }
        .ls-item:hover { background: rgba(30,40,80,0.5); }

        .ls-item-name {
          font-size: 14px;
          font-weight: 500;
          color: rgba(255,255,255,0.9);
          flex: 1;
          min-width: 0;
          word-break: break-word;
        }

        ls-action-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; 
          height: 36px;
          border-radius: 10px;
          border: 1px solid transparent;
          cursor: pointer; 
          transition: all .15s;
          flex-shrink: 0;
          font-family: 'DM Sans', sans-serif;
          background: none;
          /* Eliminamos color: inherit para que no se pierda el color */
          line-height: 1;
        }
        .ls-action-btn svg { 
          display: block; 
          color: currentColor; 
          stroke-width: 2.5px; /* Un poco más de grosor para que resalten */
        }
        .ls-action-btn:disabled { opacity: .4; cursor: not-allowed; }

        .ls-btn-edit {
          background: rgba(96,165,250,0.25);
          border: 1px solid rgba(96,165,250,0.5);
          color: #60A5FA;
        }
        .ls-btn-edit:hover { 
          background: rgba(96,165,250,0.4); 
          border-color: rgba(96,165,250,0.8); 
          color: #bae6fd; 
          transform: scale(1.08);
        }
ls-action-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; 
          height: 36px;
          border-radius: 10px;
          border: 1px solid transparent;
          cursor: pointer; 
          transition: all .15s;
          flex-shrink: 0;
          font-family: 'DM Sans', sans-serif;
          background: none;
          /* Eliminamos color: inherit para que no se pierda el color */
          line-height: 1;
        }
        .ls-action-btn svg { 
          display: block; 
          color: currentColor; 
          stroke-width: 2.5px; /* Un poco más de grosor para que resalten */
        }
        .ls-action-btn:disabled { opacity: .4; cursor: not-allowed; }

        /* Editar */
        .ls-btn-edit {
          background: rgba(96,165,250,0.25);
          border: 1px solid rgba(96,165,250,0.5);
          color: #60A5FA;
        }
        .ls-btn-edit:hover { 
          background: rgba(96,165,250,0.4); 
          border-color: rgba(96,165,250,0.8); 
          color: #bae6fd; 
          transform: scale(1.08);
        }

        /* Eliminar */
        .ls-btn-del {
          background: rgba(248,113,113,0.25);
          border: 1px solid rgba(248,113,113,0.5);
          color: #F87171;
        }
        .ls-btn-del:hover { 
          background: rgba(248,113,113,0.4); 
          border-color: rgba(248,113,113,0.8); 
          color: #fecaca; 
          transform: scale(1.08);
        }

        /* Guardar */
        .ls-btn-save {
          background: rgba(52,211,153,0.25);
          border: 1px solid rgba(52,211,153,0.5);
          color: #6EE7B7;
        }
        .ls-btn-save:hover:not(:disabled) { 
          background: rgba(52,211,153,0.4); 
          border-color: rgba(52,211,153,0.8); 
          color: #a7f3d0;
          transform: scale(1.08);
        }

        /* Cancelar */
        .ls-btn-cancel {
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.35);
          color: rgba(255,255,255,0.85);
        }
        .ls-btn-cancel:hover { 
          background: rgba(255,255,255,0.22); 
          border-color: rgba(255,255,255,0.55); 
          color: white; 
          transform: scale(1.08);
        }
        .ls-btn-del {
          background: rgba(248,113,113,0.25);
          border: 1px solid rgba(248,113,113,0.5);
          color: #F87171;
        }
        .ls-btn-del:hover { 
          background: rgba(248,113,113,0.4); 
          border-color: rgba(248,113,113,0.8); 
          color: #fecaca; 
          transform: scale(1.08);
        }

        /* Guardar */
        .ls-btn-save {
          background: rgba(52,211,153,0.25);
          border: 1px solid rgba(52,211,153,0.5);
          color: #6EE7B7;
        }
        .ls-btn-save:hover:not(:disabled) { 
          background: rgba(52,211,153,0.4); 
          border-color: rgba(52,211,153,0.8); 
          color: #a7f3d0;
          transform: scale(1.08);
        }

        /* Cancelar */
        .ls-btn-cancel {
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.35);
          color: rgba(255,255,255,0.85);
        }
        .ls-btn-cancel:hover { 
          background: rgba(255,255,255,0.22); 
          border-color: rgba(255,255,255,0.55); 
          color: white; 
          transform: scale(1.08);
        }

        .ls-empty {
          background: rgba(30,40,80,0.25);
          border: 1px solid rgba(99,102,241,0.12);
          border-radius: 12px;
          padding: 32px 24px;
          text-align: center;
          font-size: 13px;
          color: rgba(255,255,255,0.25);
        }

        .ls-count {
          display: inline-flex; align-items: center;
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.2);
          color: #A5B4FC;
          border-radius: 99px;
          padding: 2px 10px;
          font-size: 12px;
          font-weight: 600;
          margin-left: 8px;
        }

        @keyframes ls-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ls-fade-in { animation: ls-fade-in .25s ease both; }

        .ls-container { max-width: 640px; margin: 0 auto; padding: 32px 16px; box-sizing: border-box; }

        .ls-add-row { display: flex; gap: 10px; align-items: flex-end; }
        .ls-add-row .ls-input { flex: 1; }

        @media (max-width: 480px) {
          .ls-add-row { flex-direction: column; }
          .ls-add-row .ls-btn { width: 100%; }
          .ls-item { flex-wrap: wrap; }
        }
      `}</style>

      <div className="ls-container">

        {/* Volver */}
        <div style={{ marginBottom: 32 }}>
          <ArrowBackButton />
        </div>

        {/* Título */}
        <div className="ls-fade-in" style={{ marginBottom: 28 }}>
          <h1
            className="ls-font-display"
            style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", margin: "0 0 4px" }}
          >
            Lista de Proveedores
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: 0 }}>
            Gestión de proveedores del sistema
          </p>
        </div>

        {/* Panel principal */}
        <div className="ls-glass ls-fade-in" style={{ padding: "20px 24px", marginBottom: 16 }}>

          {/* Búsqueda */}
          <div style={{ marginBottom: 20 }}>
            <label className="ls-field-label">Buscar proveedor</label>
            <input
              type="text"
              placeholder="Escribe para filtrar por nombre..."
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="ls-input"
              aria-label="Buscar proveedor por nombre"
            />
          </div>

          {/* Agregar nuevo */}
          <div style={{ marginBottom: 24 }}>
            <label className="ls-field-label">Agregar nuevo proveedor</label>
            <form onSubmit={handleSubmit} className="ls-add-row">
              <input
                type="text"
                placeholder="Nombre del Proveedor"
                value={name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                className="ls-input"
                required
              />
              <button
                type="submit"
                disabled={submitting}
                className="ls-btn ls-btn-indigo"
              >
                {submitting ? "Agregando..." : "Agregar"}
              </button>
            </form>
          </div>

          {/* Divisor */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }} />

          {/* Encabezado de lista */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>
              Lista
            </span>
            <span className="ls-count">{filteredSuppliers.length}</span>
          </div>

          {/* Lista */}
          {filteredSuppliers.length === 0 ? (
            <div className="ls-empty">
              {search ? `Sin resultados para "${search}"` : "No hay proveedores registrados aún."}
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredSuppliers.map((supplier, i) => {
                const isEditing = editingId === supplier.id;
                return (
                  <li
                    key={supplier.id}
                    className="ls-item ls-fade-in"
                    style={{ animationDelay: `${Math.min(i, 10) * 0.03}s` }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {!isEditing ? (
                        <span className="ls-item-name">{supplier.name}</span>
                      ) : (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="ls-input"
                          placeholder="Nombre del proveedor"
                          style={{ padding: "7px 10px", fontSize: 13 }}
                        />
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {!isEditing ? (
                        <>
                          <button
                            className="ls-action-btn ls-btn-edit"
                            title="Editar"
                            aria-label="Editar"
                            onClick={() => startEdit(supplier.id, supplier.name)}
                          >
                            <FaRegEdit size={14} />
                          </button>
                          <button
                            className="ls-action-btn ls-btn-del"
                            title="Eliminar"
                            aria-label="Eliminar"
                            onClick={() => remove(supplier.id)}
                          >
                            <FaTrashAlt size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="ls-action-btn ls-btn-save"
                            title="Guardar"
                            aria-label="Guardar"
                            onClick={() => saveEdit(supplier.id)}
                            disabled={savingEdit}
                          >
                            <FaSave size={14} />
                          </button>
                          <button
                            className="ls-action-btn ls-btn-cancel"
                            title="Cancelar"
                            aria-label="Cancelar"
                            onClick={cancelEdit}
                          >
                            <FaTimes size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
};

export default SupplierList;