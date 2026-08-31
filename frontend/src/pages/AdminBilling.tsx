import { useEffect, useState } from "react";
import {
  getBillingStatus, markPaid, getAllUsers, markPaidMultiple, blockMultiple, deleteUsers,
  setStockPermission, setNotificationPrefs, getOperatorsList, getDriversList,
  setEmployeeLink, setAdminStatus, type BillingUser, type SimpleEmployee,
} from "../services/billingService";
import { me } from "../services/authService";
import ArrowBackButton from "../components/ArrowBackButton";
import { useTheme } from "../context/ThemeContext";

function nextCutDate(dueDay = 8): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return new Date(y, m, dueDay).toISOString().slice(0, 10);
}

const AdminBilling = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);
  const [viewerIsSuperAdmin, setViewerIsSuperAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [until, setUntil] = useState(nextCutDate(8));
  const [info, setInfo] = useState<BillingUser | null>(null);
  const [msg, setMsg] = useState("");
  const [users, setUsers] = useState<BillingUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [operators, setOperators] = useState<SimpleEmployee[]>([]);
  const [drivers, setDrivers] = useState<SimpleEmployee[]>([]);

  useEffect(() => {
    me().then(res => {
      const admin = !!res.data.is_admin;
      setViewerIsAdmin(admin);
      setViewerIsSuperAdmin(!!res.data.is_super_admin);
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
      const [usersRes, operatorsRes, driversRes] = await Promise.all([
        getAllUsers(),
        getOperatorsList(),
        getDriversList(),
      ]);
      setUsers(usersRes.data.users);
      setOperators([...operatorsRes.data].sort((a, b) => a.name.localeCompare(b.name)));
      setDrivers([...driversRes.data].sort((a, b) => a.name.localeCompare(b.name)));
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

  const handleSetOperatorLink = async (userId: number, operatorIdStr: string) => {
    try {
      if (!operatorIdStr) {
        await setEmployeeLink({ user_id: userId, role: "none" });
        setUsers(prev => prev.map(x => x.id === userId
          ? { ...x, linked_operator_id: null, linked_operator_name: null, linked_driver_id: null, linked_driver_name: null }
          : x));
      } else {
        const operatorId = Number(operatorIdStr);
        await setEmployeeLink({ user_id: userId, role: "operator", operator_id: operatorId });
        const opName = operators.find(o => o.id === operatorId)?.name || null;
        setUsers(prev => prev.map(x => x.id === userId
          ? { ...x, linked_operator_id: operatorId, linked_operator_name: opName, linked_driver_id: null, linked_driver_name: null }
          : x));
      }
      setMsg("Vínculo de operario actualizado.");
    } catch (err: any) {
      setMsg(err?.response?.data?.msg || "Error al vincular el operario");
    }
  };

  const handleSetDriverLink = async (userId: number, driverIdStr: string) => {
    try {
      if (!driverIdStr) {
        await setEmployeeLink({ user_id: userId, role: "none" });
        setUsers(prev => prev.map(x => x.id === userId
          ? { ...x, linked_driver_id: null, linked_driver_name: null, linked_operator_id: null, linked_operator_name: null }
          : x));
      } else {
        const driverId = Number(driverIdStr);
        await setEmployeeLink({ user_id: userId, role: "driver", driver_id: driverId });
        const drName = drivers.find(d => d.id === driverId)?.name || null;
        setUsers(prev => prev.map(x => x.id === userId
          ? { ...x, linked_driver_id: driverId, linked_driver_name: drName, linked_operator_id: null, linked_operator_name: null }
          : x));
      }
      setMsg("Vínculo de chofer actualizado.");
    } catch (err: any) {
      setMsg(err?.response?.data?.msg || "Error al vincular el chofer");
    }
  };

  const handleToggleAdmin = async (userId: number, newVal: boolean) => {
    try {
      await setAdminStatus({ user_id: userId, is_admin: newVal });
      setUsers(prev => prev.map(x => x.id === userId ? { ...x, is_admin: newVal } : x));
      setMsg(`Rol de administrador ${newVal ? "otorgado" : "quitado"} correctamente.`);
    } catch (err: any) {
      setMsg(err?.response?.data?.msg || "Error al actualizar el rol de administrador");
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
        style={{ background: isDark ? "#080C14" : "#F4F6FD", color: isDark ? "white" : "#0F172A", fontFamily: "'DM Sans', sans-serif" }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');`}</style>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
          <div style={{ marginBottom: 32 }}><ArrowBackButton /></div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
            Administración de pagos
          </h2>
          <p style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.5)", fontSize: 14 }}>No autorizado. Debes ser administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: isDark ? "#080C14" : "#F4F6FD", color: isDark ? "white" : "#0F172A", fontFamily: "'DM Sans', sans-serif" }}
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

        .ab-link-select {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.85);
          border-radius: 8px;
          font-size: 12px;
          padding: 5px 8px;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          min-width: 140px;
        }
        .ab-link-select option { background: #111827; color: white; }

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

        /* ── Tarjetas de usuario (reemplaza la tabla horizontal) ── */
        .ab-users-list { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }

        .ab-user-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 14px 16px;
          transition: border-color .15s, background .15s;
        }
        .ab-user-card:hover { border-color: rgba(99,102,241,0.25); background: rgba(99,102,241,0.04); }

        .ab-user-card-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 10px; margin-bottom: 12px;
        }
        .ab-user-card-name { font-size: 14px; font-weight: 600; color: white; }
        .ab-user-card-email { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 2px; word-break: break-all; }

        .ab-user-card-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px 14px;
        }
        @media (min-width: 560px) { .ab-user-card-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 780px) { .ab-user-card-grid { grid-template-columns: repeat(4, 1fr); } }

        .ab-user-field-label {
          font-size: 10px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
          color: rgba(255,255,255,0.3); margin-bottom: 4px;
        }
        .ab-user-field-value { font-size: 13px; }

        .ab-user-card-fullrow { grid-column: 1 / -1; }

        /* ─── Modo claro ─── */
        body[data-theme="light"] .ab-glass {
          background: #FFFFFF;
          border: 1px solid rgba(99,102,241,0.18);
          box-shadow: 0 4px 24px rgba(15,23,42,0.06);
        }
        body[data-theme="light"] .ab-section-title {
          color: rgba(15,23,42,0.5);
        }
        body[data-theme="light"] .ab-field-label {
          color: rgba(15,23,42,0.5);
        }
        body[data-theme="light"] .ab-input {
          background: #FFFFFF;
          border: 1px solid rgba(15,23,42,0.12);
          color: #0F172A;
        }
        body[data-theme="light"] .ab-input::placeholder { color: rgba(15,23,42,0.3); }
        body[data-theme="light"] .ab-input:focus {
          border-color: rgba(99,102,241,0.6);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }
        body[data-theme="light"] .ab-btn-gray {
          background: rgba(15,23,42,0.04);
          border: 1px solid rgba(15,23,42,0.12);
          color: rgba(15,23,42,0.7);
        }
        body[data-theme="light"] .ab-btn-gray:hover:not(:disabled) {
          background: rgba(15,23,42,0.08);
          color: #0F172A;
        }
        body[data-theme="light"] .ab-info-card {
          background: rgba(15,23,42,0.02);
          border: 1px solid rgba(15,23,42,0.08);
        }
        body[data-theme="light"] .ab-info-row {
          color: rgba(15,23,42,0.6);
        }
        body[data-theme="light"] .ab-info-row strong {
          color: rgba(15,23,42,0.85);
        }
        body[data-theme="light"] .ab-user-card {
          background: rgba(15,23,42,0.02);
          border: 1px solid rgba(15,23,42,0.08);
        }
        body[data-theme="light"] .ab-user-card:hover {
          border-color: rgba(99,102,241,0.3);
          background: rgba(99,102,241,0.04);
        }
        body[data-theme="light"] .ab-user-card-name {
          color: #0F172A;
        }
        body[data-theme="light"] .ab-user-card-email {
          color: rgba(15,23,42,0.4);
        }
        body[data-theme="light"] .ab-user-field-label {
          color: rgba(15,23,42,0.4);
        }
        body[data-theme="light"] .ab-link-select {
          background: #FFFFFF;
          border: 1px solid rgba(15,23,42,0.12);
          color: rgba(15,23,42,0.85);
        }
        body[data-theme="light"] .ab-link-select option {
          background: #FFFFFF;
          color: #0F172A;
        }
        body[data-theme="light"] .ab-stock-off {
          background: rgba(15,23,42,0.03);
          border-color: rgba(15,23,42,0.1);
          color: rgba(15,23,42,0.45);
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
            Administración de usuarios
          </h1>
          <p style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(15,23,42,0.5)", margin: 0 }}>
            Gestión de acceso y suscripciones de usuarios
          </p>
        </div>

    {viewerIsSuperAdmin && (
      <>
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
      </>
      )}

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
            <div>
              {viewerIsSuperAdmin && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                  <p style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(15,23,42,0.5)", margin: 0 }}>
                    Selecciona los usuarios que deseas mantener bloqueados
                  </p>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: isDark ? "rgba(255,255,255,0.5)" : "rgba(15,23,42,0.6)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      className="ab-checkbox"
                      onChange={(e) => setSelectedIds(e.target.checked ? users.map(u => u.id) : [])}
                      checked={selectedIds.length === users.length && users.length > 0}
                    />
                    Seleccionar todos
                  </label>
                </div>
              )}

              <div className="ab-users-list">
                {users.map(u => (
                  <div className="ab-user-card" key={u.id}>
                    <div className="ab-user-card-head">
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        {viewerIsSuperAdmin && (
                          <input
                            type="checkbox"
                            className="ab-checkbox"
                            checked={selectedIds.includes(u.id)}
                            onChange={() => toggleSelect(u.id)}
                            style={{ marginTop: 3, flexShrink: 0 }}
                          />
                        )}
                        <div>
                          <div className="ab-user-card-name">{u.name}</div>
                          <div className="ab-user-card-email">{u.email}</div>
                        </div>
                      </div>
                      {viewerIsSuperAdmin && (
                        u.is_super_admin ? (
                          <span style={{ fontSize: 11, color: "rgba(192,132,252,0.9)", fontWeight: 600, whiteSpace: "nowrap" }}>
                            Principal
                          </span>
                        ) : (
                          <button
                            className={`ab-stock-btn ${u.is_admin ? "ab-stock-on" : "ab-stock-off"}`}
                            title={u.is_admin ? "Clic para quitar rol de administrador" : "Clic para hacer administrador"}
                            onClick={() => handleToggleAdmin(u.id, !u.is_admin)}
                            style={{ flexShrink: 0 }}
                          >
                            {u.is_admin ? "✓ Administrador" : "+ Hacer admin"}
                          </button>
                        )
                      )}
                    </div>

                    <div className="ab-user-card-grid">
                      <div>
                        <div className="ab-user-field-label">Cubierto hasta</div>
                        <div className="ab-user-field-value">{u.subscription_paid_until || "—"}</div>
                      </div>

                      <div>
                        <div className="ab-user-field-label">Bloqueado</div>
                        <div className={`ab-user-field-value ${u.blocked ? "ab-blocked-yes" : "ab-blocked-no"}`}>
                          {u.blocked ? "Sí" : "No"}
                        </div>
                      </div>

                      <div>
                        <div className="ab-user-field-label">Editar stock</div>
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
                      </div>

                      <div>
                        <div className="ab-user-field-label">Stock bajo</div>
                        <button
                          className={`ab-stock-btn ${u.notify_low_stock ? "ab-stock-on" : "ab-stock-off"}`}
                          title={u.notify_low_stock ? "Clic para desactivar notificaciones de stock bajo" : "Clic para activar notificaciones de stock bajo"}
                          onClick={async () => {
                            const newVal = !u.notify_low_stock;
                            try {
                              await setNotificationPrefs({ user_ids: [u.id], notify_low_stock: newVal });
                              setUsers(prev => prev.map(x => x.id === u.id ? { ...x, notify_low_stock: newVal } : x));
                              setMsg(`Notificaciones de stock bajo ${newVal ? "activadas" : "desactivadas"} para ${u.name}.`);
                            } catch {
                              setMsg("Error al actualizar notificaciones de stock bajo");
                            }
                          }}
                        >
                          {u.notify_low_stock ? "Sí" : "No"}
                        </button>
                      </div>

                      <div>
                        <div className="ab-user-field-label">Despachos retrasados</div>
                        <button
                          className={`ab-stock-btn ${u.notify_pending_dispatches ? "ab-stock-on" : "ab-stock-off"}`}
                          title={u.notify_pending_dispatches ? "Clic para desactivar notificaciones de despachos retrasados" : "Clic para activar notificaciones de despachos retrasados"}
                          onClick={async () => {
                            const newVal = !u.notify_pending_dispatches;
                            try {
                              await setNotificationPrefs({ user_ids: [u.id], notify_pending_dispatches: newVal });
                              setUsers(prev => prev.map(x => x.id === u.id ? { ...x, notify_pending_dispatches: newVal } : x));
                              setMsg(`Notificaciones de despachos retrasados ${newVal ? "activadas" : "desactivadas"} para ${u.name}.`);
                            } catch {
                              setMsg("Error al actualizar notificaciones de despachos retrasados");
                            }
                          }}
                        >
                          {u.notify_pending_dispatches ? "Sí" : "No"}
                        </button>
                      </div>

                      <div>
                        <div className="ab-user-field-label">Operario</div>
                        <select
                          className="ab-link-select"
                          value={u.linked_operator_id ?? ""}
                          onChange={(e) => handleSetOperatorLink(u.id, e.target.value)}
                          style={{ width: "100%" }}
                        >
                          <option value="">— Ninguno —</option>
                          {operators.map((op) => (
                            <option key={op.id} value={op.id}>{op.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="ab-user-field-label">Chofer</div>
                        <select
                          className="ab-link-select"
                          value={u.linked_driver_id ?? ""}
                          onChange={(e) => handleSetDriverLink(u.id, e.target.value)}
                          style={{ width: "100%" }}
                        >
                          <option value="">— Ninguno —</option>
                          {drivers.map((dr) => (
                            <option key={dr.id} value={dr.id}>{dr.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
    {viewerIsSuperAdmin && (
      <>
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
      </>      
    )}
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