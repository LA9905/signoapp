import { useEffect, useState } from "react";
import { getBillingStatus, markPaid, type BillingUser } from "../services/billingService";
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

  useEffect(() => {
    me().then(res => {
      const admin = !!res.data.is_admin;
      setViewerIsAdmin(admin);
      setUntil(nextCutDate(res.data.due_day ?? 8));
    });
  }, []);

  const load = async () => {
    setMsg("");
    const res = await getBillingStatus(email || undefined);
    setInfo(res.data.user);
  };

  // 👉 GLOBAL: ignora user_id y email al marcar
  const doMarkPaid = async () => {
    await markPaid({ until });
    setMsg("Pago registrado (global). Toda la app quedó habilitada.");
    if (email) await load();
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
          <button onClick={doMarkPaid} className="bg-emerald-600 text-white px-4 py-2 rounded h-10">
            Marcar pagado (global)
          </button>
        </div>
      </div>

      {msg && <p className="mt-4 text-emerald-600">{msg}</p>}
    </div>
  );
};

export default AdminBilling;