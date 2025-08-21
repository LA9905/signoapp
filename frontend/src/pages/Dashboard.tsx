import { useEffect, useState } from "react";
import NavbarUser from "../components/NavbarUser";
import ChartMonthlyOrders from "../components/ChartMonthlyOrders";
import { useNavigate } from "react-router-dom";
import { api } from "../services/http";
import { me } from "../services/authService"; // 👈 falta este import

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const name = localStorage.getItem("name") || "Usuario";
  const [chartData, setChartData] = useState<number[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleStart = () => navigate("/CreateDispatch");

  useEffect(() => {
    api
      .get("/dispatches/monthly")
      .then((res) => setChartData(res.data || []))
      .catch(() => setChartData([]));

    me()
      .then((res) => setIsAdmin(!!res.data.is_admin))
      .catch(() => setIsAdmin(false));
  }, []);

  const menuItems = [
    { title: "Crear despacho", route: "/CreateDispatch" },
    { title: "Agregar productos", route: "/add-product" },
    { title: "Listado de productos", route: "/products" },
    { title: "Choferes", route: "/drivers" },
    { title: "Centros de Costos", route: "/clients" },
    { title: "Seguimiento", route: "/tracking" },
    ...(isAdmin ? [{ title: "Administración (pagos)", route: "/admin/billing" }] : []),
  ];

  return (
    <div className="min-h-screen bg-blue-50 text-neutral-900">
      <NavbarUser />

      <div className="max-w-5xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Bienvenido, {name}</h2>

        <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mt-4">
          <button
            onClick={handleStart}
            className="bg-blue-600 text-white px-6 py-3 rounded shadow hover:bg-blue-700"
          >
            Iniciar jornada del día
          </button>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {menuItems.map((item) => (
              <button
                key={item.route}
                onClick={() => navigate(item.route)}
                className="bg-white text-neutral-800 border border-slate-200 hover:border-blue-400 rounded px-4 py-2 text-sm text-left shadow-sm"
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <h3 className="text-lg font-semibold mb-2">Despachos del último mes</h3>
          <ChartMonthlyOrders dataPoints={chartData} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;