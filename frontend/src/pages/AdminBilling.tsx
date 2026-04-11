import { useEffect, useState } from "react";
import { getBillingStatus, markPaid, getAllUsers, markPaidMultiple, blockMultiple, deleteUsers, setStockPermission, type BillingUser } from "../services/billingService";
import { me } from "../services/authService";
import ArrowBackButton from "../components/ArrowBackButton";

function nextCutDate(dueDay = 8): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return new Date(y, m, dueDay).toISOString().slice(0, 10);
}

const AdminBilling = () => {
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [until, setUntil] = useState(nextCutDate(8));
  const [info, setInfo] = useState<BillingUser | null>(null);
  const [msg, setMsg] = useState("");
  const [users, setUsers] = useState<BillingUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    me().then(res => {
      const admin = !!res.data.is_admin;
      setViewerIsAdmin(admin);
      setUntil(nextCutDate(res.data.due_day ?? 8));
    });
  }, []);

  const load = async () => {
    setMsg("");
    try {
      const res = await getBillingStatus(email || undefined);
      setInfo(res.data.user);
    } catch (error) {
      setMsg("Error al buscar usuario");
    }
  };

  const loadAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await getAllUsers();
      setUsers(res.data.users);
      setMsg("Lista de usuarios cargada");
    } catch (error) {
      setMsg("Error al cargar usuarios");
    } finally {
      setLoadingUsers(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const doBlockSelected = async () => {
    if (selectedIds.length === 0) {
      setMsg("Selecciona al menos un usuario para mantener bloqueado");
      return;
    }
    try {
      await blockMultiple({ user_ids: selectedIds });
      setMsg(`Bloqueo aplicado a ${selectedIds.length} usuarios seleccionados.`);
      setSelectedIds([]);
      await loadAllUsers();
      if (email) await load();
    } catch (error) {
      setMsg("Error al bloquear usuarios");
    }
  };

  const doDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      setMsg("Selecciona al menos un usuario para eliminar");
      return;
    }
    const confirmDelete = window.confirm(
      `¡ATENCIÓN! Estás a punto de eliminar permanentemente a ${selectedIds.length} usuario(s). Esta acción no se puede deshacer. ¿Deseas continuar?`
    );
    if (!confirmDelete) return;
    try {
      await deleteUsers({ user_ids: selectedIds });
      setMsg(`Éxito: ${selectedIds.length} usuario(s) eliminado(s) por completo.`);
      setSelectedIds([]);
      await loadAllUsers();
      if (info) setInfo(null);
    } catch (error) {
      setMsg("Error al intentar eliminar los usuarios.");
    }
  };

  const doUnblockNonSelected = async () => {
    const allIds = users.map(u => u.id);
    const nonSelectedIds = allIds.filter(id => !selectedIds.includes(id));
    if (nonSelectedIds.length === 0) {
      setMsg("No hay usuarios no seleccionados para desbloquear");
      return;
    }
    try {
      await markPaidMultiple({ user_ids: nonSelectedIds, until });
      setMsg(`Desbloqueo aplicado a ${nonSelectedIds.length} usuarios no seleccionados.`);
      setSelectedIds([]);
      await loadAllUsers();
      if (email) await load();
    } catch (error) {
      setMsg("Error al desbloquear usuarios");
    }
  };

  const doMarkPaidGlobal = async () => {
    try {
      await markPaid({ until });
      setMsg("Pago registrado (global). Toda la app quedó habilitada.");
      await loadAllUsers();
      if (email) await load();
    } catch (error) {
      setMsg("Error al marcar pago global");
    }
  };

  /* ── Vista sin permisos ── */
  if (!viewerIsAdmin) {
    return (
      <div
        className="min-h-screen"
        style={{ background: "#080C14", color: "white", fontFamily: "'DM Sans', sans-serif" }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');`}</style>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
          <div style={{ marginBottom: 32 }}><ArrowBackButton /></div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
            Administración de pagos
          </h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>No autorizado. Debes ser administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "#080C14", color: "white", fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .ab-font-display { font-family: 'Syne', sans-serif; }

        .ab-glass {
          background: rgba(30,40,80,0.35);
          border: 1px solid rgba(99,102,241,0.18);
          border-radius: 16px;
        }

        .ab-section-title {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .07em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin: 0 0 14px;
        }

        .ab-field-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin-bottom: 5px;
        }

        .ab-input {
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
        .ab-input::placeholder { color: rgba(255,255,255,0.2); }
        .ab-input:focus { outline: none; border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }

        /* ── Botones ── */
        .ab-btn {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 6px; border: none; border-radius: 10px;
          padding: 9px 18px; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all .15s;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
        }
        .ab-btn:disabled { opacity: .45; cursor: not-allowed; transform: none !important; }

        .ab-btn-indigo {
          background: linear-gradient(135deg, #4F46E5, #6366F1);
          box-shadow: 0 4px 14px rgba(99,102,241,0.3);
          color: white;
        }
        .ab-btn-indigo:hover:not(:disabled) { box-shadow: 0 6px 20px rgba(99,102,241,0.4); transform: translateY(-1px); }

        .ab-btn-gray {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.8);
        }
        .ab-btn-gray:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: white; }

        .ab-btn-emerald {
          background: rgba(52,211,153,0.12);
          border: 1px solid rgba(52,211,153,0.25);
          color: #6EE7B7;
        }
        .ab-btn-emerald:hover:not(:disabled) { background: rgba(52,211,153,0.2); border-color: rgba(52,211,153,0.4); }

        .ab-btn-red {
          background: rgba(248,113,113,0.12);
          border: 1px solid rgba(248,113,113,0.25);
          color: #FCA5A5;
        }
        .ab-btn-red:hover:not(:disabled) { background: rgba(248,113,113,0.2); border-color: rgba(248,113,113,0.4); }

        .ab-btn-red-solid {
          background: rgba(185,28,28,0.55);
          border: 1px solid rgba(248,113,113,0.3);
          color: #FEE2E2;
        }
        .ab-btn-red-solid:hover:not(:disabled) { background: rgba(185,28,28,0.75); }

        /* ── Info card ── */
        .ab-info-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 14px 18px;
        }
        .ab-info-row {
          display: flex; gap: 8px; align-items: baseline;
          font-size: 13px; margin-bottom: 6px;
          color: rgba(255,255,255,0.6);
        }
        .ab-info-row:last-child { margin-bottom: 0; }
        .ab-info-row strong { color: rgba(255,255,255,0.85); font-weight: 500; }

        /* ── Tabla ── */
        .ab-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .ab-table th {
          padding: 10px 12px; text-align: left;
          font-size: 10px; font-weight: 600; letter-spacing: .07em;
          text-transform: uppercase; color: rgba(255,255,255,0.35);
          border-bottom: 1px solid rgba(255,255,255,0.07);
          white-space: nowrap;
        }
        .ab-table th.center { text-align: center; }
        .ab-table td {
          padding: 10px 12px;
          color: rgba(255,255,255,0.75);
          border-bottom: 1px solid rgba(255,255,255,0.04);
          vertical-align: middle;
        }
        .ab-table td.center { text-align: center; }
        .ab-table tr:last-child td { border-bottom: none; }
        .ab-table tr:hover td { background: rgba(99,102,241,0.05); color: rgba(255,255,255,0.9); }

        .ab-checkbox {
          width: 15px; height: 15px;
          accent-color: #6366F1;
          cursor: pointer;
        }

        .ab-stock-btn {
          display: inline-flex; align-items: center;
          padding: 3px 10px; border-radius: 99px;
          font-size: 11px; font-weight: 600;
          border: 1px solid transparent;
          cursor: pointer; transition: all .15s;
          font-family: 'DM Sans', sans-serif;
        }
        .ab-stock-on {
          background: rgba(52,211,153,0.1);
          border-color: rgba(52,211,153,0.25);
          color: #6EE7B7;
        }
        .ab-stock-on:hover { background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.25); color: #FCA5A5; }
        .ab-stock-off {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.4);
        }
        .ab-stock-off:hover { background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.25); color: #6EE7B7; }

        .ab-blocked-yes { color: #FCA5A5; font-weight: 500; }
        .ab-blocked-no  { color: #6EE7B7; font-weight: 500; }

        /* ── Zona de peligro ── */
        .ab-danger {
          background: rgba(185,28,28,0.08);
          border: 1px solid rgba(248,113,113,0.2);
          border-radius: 16px;
          padding: 20px 24px;
        }

        /* ── Mensaje ── */
        .ab-msg {
          border-radius: 12px;
          padding: 12px 18px;
          font-size: 13px;
          background: rgba(52,211,153,0.07);
          border: 1px solid rgba(52,211,153,0.15);
          color: #6EE7B7;
        }

        @keyframes ab-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ab-fade-in { animation: ab-fade-in .25s ease both; }

          /* === RESPONSIVE === */
        .ab-container { max-width: 820px; margin: 0 auto; padding: 32px 16px; width: 100%; box-sizing: border-box; }
        
        .ab-responsive-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          align-items: flex-end;
        }
        @media (min-width: 640px) { .ab-responsive-grid { grid-template-columns: 1fr auto; } }

        .ab-table-container { overflow-x: auto; -webkit-overflow-scrolling: touch; margin-top: 20px; }
        
        @media (max-width: 480px) {
          .ab-table th, .ab-table td { font-size: 12px; padding: 8px 6px; }
        }

      `}</style>

      <div className="ab-container">

        {/* Volver */}
        <div style={{ marginBottom: 32 }}>
          <ArrowBackButton />
        </div>

        {/* Título */}
        <div className="ab-fade-in" style={{ marginBottom: 32 }}>
          <h1
            className="ab-font-display"
            style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.01em", margin: "0 0 4px" }}
          >
            Administración de Pagos
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: 0 }}>
            Gestión de acceso y suscripciones de usuarios
          </p>
        </div>

        {/* ── 1. Buscar usuario ── */}
        <div className="ab-glass ab-fade-in" style={{ padding: "20px 24px", marginBottom: 16 }}>
          <p className="ab-section-title">Consultar usuario</p>
          <div className="ab-responsive-grid">
            <div>
              <label className="ab-field-label">Email del usuario (opcional)</label>
              <input
                className="ab-input"
                placeholder="usuario@dominio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button onClick={load} className="ab-btn ab-btn-indigo" style={{ height: 40 }}>
              Buscar
            </button>
          </div>

          {info && (
            <div className="ab-info-card" style={{ marginTop: 16 }}>
              <div className="ab-info-row">
                <span>Usuario:</span>
                <strong>{info.name} — {info.email}</strong>
              </div>
              <div className="ab-info-row">
                <span>Bloqueado:</span>
                <strong className={info.blocked ? "ab-blocked-yes" : "ab-blocked-no"}>
                  {info.blocked ? "Sí" : "No"}
                </strong>
              </div>
              <div className="ab-info-row">
                <span>Cubierto hasta:</span>
                <strong>{info.subscription_paid_until || "—"}</strong>
              </div>
            </div>
          )}
        </div>

        {/* ── 2. Cargar usuarios ── */}
        <div className="ab-glass ab-fade-in" style={{ padding: "20px 24px", marginBottom: 16 }}>
          <p className="ab-section-title">Lista de usuarios</p>
          <button
            onClick={loadAllUsers}
            className="ab-btn ab-btn-gray"
            disabled={loadingUsers}
          >
            {loadingUsers ? "Cargando..." : "Cargar todos los usuarios"}
          </button>

          {users.length > 0 && (
            <div className="ab-table-container">
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>
                Selecciona los usuarios que deseas mantener bloqueados
              </p>
              <table className="ab-table">
                <thead>
                  <tr>
                    <th className="center">
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                        <span>Todos</span>
                        <input
                          type="checkbox"
                          className="ab-checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(users.map(u => u.id));
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                          checked={selectedIds.length === users.length && users.length > 0}
                        />
                      </div>
                    </th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Cubierto hasta</th>
                    <th className="center">Bloqueado</th>
                    <th className="center">Editar stock</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="center">
                        <input
                          type="checkbox"
                          className="ab-checkbox"
                          checked={selectedIds.includes(u.id)}
                          onChange={() => toggleSelect(u.id)}
                        />
                      </td>
                      <td>{u.name}</td>
                      <td style={{ color: "rgba(255,255,255,0.5)" }}>{u.email}</td>
                      <td>{u.subscription_paid_until || "—"}</td>
                      <td className="center">
                        <span className={u.blocked ? "ab-blocked-yes" : "ab-blocked-no"}>
                          {u.blocked ? "Sí" : "No"}
                        </span>
                      </td>
                      <td className="center">
                        <button
                          className={`ab-stock-btn ${u.can_edit_stock ? "ab-stock-on" : "ab-stock-off"}`}
                          title={u.can_edit_stock ? "Clic para quitar permiso" : "Clic para dar permiso"}
                          onClick={async () => {
                            const newVal = !u.can_edit_stock;
                            try {
                              await setStockPermission({ user_ids: [u.id], can_edit_stock: newVal });
                              setUsers(prev => prev.map(x => x.id === u.id ? { ...x, can_edit_stock: newVal } : x));
                              setMsg(`Permiso de stock ${newVal ? "habilitado" : "deshabilitado"} para ${u.name}.`);
                            } catch {
                              setMsg("Error al actualizar permiso de stock");
                            }
                          }}
                        >
                          {u.can_edit_stock ? "Habilitado" : "Deshabilitado"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── 3. Desbloquear no seleccionados ── */}
        <div className="ab-glass ab-fade-in" style={{ padding: "20px 24px", marginBottom: 16 }}>
          <p className="ab-section-title">Desbloquear usuarios no seleccionados</p>
          <div className="ab-responsive-grid">
            <div>
              <label className="ab-field-label">Cubrir hasta</label>
              <input
                type="date"
                className="ab-input"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
              />
            </div>
            <button
              onClick={doUnblockNonSelected}
              className="ab-btn ab-btn-emerald"
              disabled={users.length === 0}
              style={{ height: 40 }}
            >
              Desbloquear no seleccionados
            </button>
          </div>
        </div>

        {/* ── 4. Bloquear seleccionados ── */}
        <div className="ab-glass ab-fade-in" style={{ padding: "20px 24px", marginBottom: 16 }}>
          <p className="ab-section-title">Bloquear usuarios seleccionados</p>
          <button
            onClick={doBlockSelected}
            className="ab-btn ab-btn-red"
            disabled={selectedIds.length === 0}
          >
            {selectedIds.length === 0
              ? "Seleccionar usuarios para bloquear"
              : `Bloquear ${selectedIds.length} usuario${selectedIds.length > 1 ? "s" : ""} seleccionado${selectedIds.length > 1 ? "s" : ""}`}
          </button>
        </div>

        {/* ── 5. Desbloquear global ── */}
        <div className="ab-glass ab-fade-in" style={{ padding: "20px 24px", marginBottom: 16 }}>
          <p className="ab-section-title">Desbloqueo global</p>
          <div className="ab-responsive-grid">
            <div>
              <label className="ab-field-label">Cubrir hasta (global)</label>
              <input
                type="date"
                className="ab-input"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
              />
            </div>
            <button
              onClick={doMarkPaidGlobal}
              className="ab-btn ab-btn-emerald"
              style={{ height: 40 }}
            >
              Desbloquear global
            </button>
          </div>
        </div>

        {/* ── 6. Zona de peligro ── */}
        <div className="ab-danger ab-fade-in" style={{ marginBottom: 24 }}>
          <p className="ab-section-title" style={{ color: "rgba(248,113,113,0.6)" }}>
            Zona de peligro
          </p>
          <p style={{ fontSize: 12, color: "rgba(248,113,113,0.5)", marginBottom: 14, marginTop: 0 }}>
            Eliminar los usuarios seleccionados de la base de datos de forma permanente. Esta acción no se puede deshacer.
          </p>
          <button
            onClick={doDeleteSelected}
            className="ab-btn ab-btn-red-solid"
            disabled={selectedIds.length === 0}
          >
            {selectedIds.length === 0
              ? "Seleccionar usuarios para eliminar"
              : `Eliminar ${selectedIds.length} usuario${selectedIds.length > 1 ? "s" : ""} permanentemente`}
          </button>
        </div>

        {/* ── Mensaje ── */}
        {msg && (
          <div className="ab-msg ab-fade-in">
            {msg}
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminBilling;