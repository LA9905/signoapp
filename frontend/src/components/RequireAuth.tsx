import { Navigate, Outlet, useLocation } from "react-router-dom";

// Utilidad básica para verificar expiración del JWT sin librerías externas
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // exp en segundos
    const now = Math.floor(Date.now() / 1000);
    return typeof payload.exp === "number" ? payload.exp <= now : true;
  } catch {
    return true; // si no se puede decodificar, trátalo como inválido
  }
}

const RequireAuth = () => {
  const location = useLocation();
  const token = localStorage.getItem("token");

  if (!token || isTokenExpired(token)) {
    // limpiar si está vencido o ausente, y mandar a login
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default RequireAuth;