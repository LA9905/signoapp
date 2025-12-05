import { useEffect, useState } from "react";
import { getBillingStatus, markPaid, getAllUsers, markPaidMultiple, blockMultiple, type BillingUser } from "../services/billingService";
import { me } from "../services/authService";
import ArrowBackButton from "../components/ArrowBackButton";

function nextCutDate(dueDay = 8): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const todayDay = now.getDate();
  const target = new Date(y, m, dueDay);
  if (todayDay > dueDay) {
    return new Date(y, m + 1, dueDay).toISOString().slice(0, 10);
  }
  return target.toISOString().slice(0, 10);
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
      // Bloquear seteando subscription_paid_until a null
      await blockMultiple({ user_ids: selectedIds });
      setMsg(`Bloqueo aplicado a ${selectedIds.length} usuarios seleccionados.`);
      setSelectedIds([]);
      await loadAllUsers();
      if (email) await load();
    } catch (error) {
      setMsg("Error al bloquear usuarios");
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

  if (!viewerIsAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-8"><ArrowBackButton /></div>
        <h2 className="text-xl font-bold mb-2">Administración de pagos</h2>
        <p>No autorizado. Debes ser administrador.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8"><ArrowBackButton /></div>
      <h2 className="text-2xl font-bold mb-4">Administración de pagos</h2>

      {/* Búsqueda opcional para visualizar el estado de alguien */}
      <div className="grid sm:grid-cols-3 gap-3 items-end">
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Email del usuario (opcional)</label>
          <input
            className="w-full border p-2 rounded"
            placeholder="usuario@dominio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button onClick={load} className="bg-blue-600 text-white px-4 py-2 rounded h-10">
          Buscar
        </button>
      </div>

      {info && (
        <div className="mt-6 border rounded p-4 bg-white">
          <p><b>Usuario:</b> {info.name} — {info.email}</p>
          <p><b>Bloqueado:</b> {info.blocked ? "Sí" : "No"}</p>
          <p><b>Cubierto hasta:</b> {info.subscription_paid_until || "—"}</p>
        </div>
      )}

      {/* Botón para cargar usuarios */}
      <div className="mt-6">
        <button
          onClick={loadAllUsers}
          className="bg-gray-600 text-white px-4 py-2 rounded h-10"
          disabled={loadingUsers}
        >
          {loadingUsers ? "Cargando..." : "Cargar todos los usuarios"}
        </button>
      </div>

      {/* Lista de usuarios con selección (seleccionar para mantener bloqueados) */}
      {users.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-bold mb-2">Usuarios registrados (selecciona para mantener bloqueados)</h3>
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-blue-500">
                <th className="border p-2">Mantener bloqueado</th>
                <th className="border p-2">Nombre</th>
                <th className="border p-2">Email</th>
                <th className="border p-2">Cubierto hasta</th>
                <th className="border p-2">Bloqueado</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="border p-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(u.id)}
                      onChange={() => toggleSelect(u.id)}
                    />
                  </td>
                  <td className="border p-2">{u.name}</td>
                  <td className="border p-2">{u.email}</td>
                  <td className="border p-2">{u.subscription_paid_until || "—"}</td>
                  <td className="border p-2">{u.blocked ? "Sí" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 border rounded p-4 bg-white">
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Cubrir hasta (para desbloqueos)</label>
            <input
              type="date"
              className="w-full border p-2 rounded"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          </div>
          <button onClick={doUnblockNonSelected} className="bg-blue-600 text-white px-4 py-2 rounded h-10" disabled={users.length === 0}>
            Desbloquear los usuarios no seleccionados
          </button>
        </div>
      </div>

      <div className="mt-6 border rounded p-4 bg-white">
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Mantener bloqueados usuarios seleccionados</label>
          </div>
          <button
              onClick={doBlockSelected}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
              disabled={selectedIds.length === 0}
            >
              {selectedIds.length === 0 
                ? "Seleccionar usuarios para bloquear" 
                : `Bloquear ${selectedIds.length} usuario${selectedIds.length > 1 ? 's' : ''} seleccionado${selectedIds.length > 1 ? 's' : ''}`
              }
          </button>
        </div>
      </div>

      <div className="mt-6 border rounded p-4 bg-white">
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Cubrir hasta (global)</label>
            <input
              type="date"
              className="w-full border p-2 rounded"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          </div>
          <button onClick={doMarkPaidGlobal} className="bg-emerald-600 text-white px-4 py-2 rounded h-10">
            Desbloquear global
          </button>
        </div>
      </div>

      {msg && <p className="mt-4 text-emerald-600">{msg}</p>}
    </div>
  );
};

export default AdminBilling;