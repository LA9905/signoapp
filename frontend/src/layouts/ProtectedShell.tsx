import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { ClientsProvider } from "../context/ClientsContext";
import { DriversProvider } from "../context/DriversContext";

type JWTPayload = { exp?: number };

function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const { exp } = jwtDecode<JWTPayload>(token);
    if (!exp) return true; // por si el token no tiene exp (no debería)
    const now = Math.floor(Date.now() / 1000);
    return exp > now;
  } catch {
    return false;
  }
}

const ProtectedShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem("token");
  const location = useLocation();

  if (!isTokenValid(token)) {
    // Limpia (evita estados raros)
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Solo montamos Providers cuando sí hay sesión válida
  return (
    <ClientsProvider>
      <DriversProvider>
        {children}
      </DriversProvider>
    </ClientsProvider>
  );
};

export default ProtectedShell;