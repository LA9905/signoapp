import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { ClientsProvider } from "../context/ClientsContext";
import { DriversProvider } from "../context/DriversContext";
import { getBillingStatus, markPaid } from "../services/billingService";
import { SuppliersProvider } from "../context/SuppliersContext";
import { OperatorsProvider } from "../context/OperatorsContext";

type JWTPayload = { exp?: number };

function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const { exp } = jwtDecode<JWTPayload>(token);
    if (!exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return exp > now;
  } catch {
    return false;
  }
}

const Paywall: React.FC<{
  message: string;
  isAdmin: boolean;
  onMarkPaid: () => Promise<void>;
  refreshing: boolean;
}> = ({ message, isAdmin, onMarkPaid, refreshing }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white p-6">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-700 rounded-lg p-6 shadow">
        <h2 className="text-xl font-bold mb-3">Suscripción requerida</h2>
        <p className="text-neutral-200 mb-4">{message}</p>
        <p className="text-sm text-neutral-400 mb-6">
          Fecha de corte: día 8 de cada mes. Si no registras el pago, las funciones seguirán bloqueadas.
        </p>

        {isAdmin ? (
          <button
            onClick={onMarkPaid}
            disabled={refreshing}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded px-4 py-2 font-semibold"
          >
            {refreshing ? "Marcando pago..." : "Marcar pago recibido ahora"}
          </button>
        ) : (
          <p className="text-sm text-neutral-400">
            Contacta al administrador para registrar tu pago.
          </p>
        )}
      </div>
    </div>
  );
};

function nextCutDate(dueDay = 8): string {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), dueDay);
  if (now.getDate() > dueDay) {
    return new Date(now.getFullYear(), now.getMonth() + 1, dueDay).toISOString().slice(0, 10);
  }
  return base.toISOString().slice(0, 10);
}

const ProtectedShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem("token");
  const location = useLocation();

  if (!isTokenValid(token)) {
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("Debe pagar la suscripción para seguir usando la app.");
  const [busy, setBusy] = useState(false);

  const [myDueDay, setMyDueDay] = useState<number>(8);

  const refreshStatus = async () => {
    const { data } = await getBillingStatus(); // status del usuario actual
    setBlocked(data.user.blocked);
    setIsAdmin(!!(data.viewer_is_admin || data.user.is_admin));
    setMyDueDay(data.user.due_day ?? 8);
    setMessage(data.user.blocked ? "Debe pagar la suscripción para seguir usando la app." : "OK");
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      try {
        await refreshStatus();
      } catch {
        setBlocked(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleMarkPaid = async () => {
    try {
      setBusy(true);
      const until = nextCutDate(myDueDay);
      // 👇 GLOBAL: sin email => habilita a toda la empresa
      await markPaid({ until });
      await refreshStatus();
    } catch {
      alert("No se pudo marcar el pago. Verifica que tu usuario sea administrador.");
    } finally {
      setBusy(false);
    }
  };

  if (blocked === null) return null;

  if (blocked) {
    return (
      <Paywall
        message={message}
        isAdmin={isAdmin}
        onMarkPaid={handleMarkPaid}
        refreshing={busy}
      />
    );
  }

  return (
  <ClientsProvider>
    <DriversProvider>
      <SuppliersProvider>
        <OperatorsProvider>
          {children}
        </OperatorsProvider>
      </SuppliersProvider>
    </DriversProvider>
  </ClientsProvider>
);
};

export default ProtectedShell;