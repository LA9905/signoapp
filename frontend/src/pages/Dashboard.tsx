// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import NavbarUser from "../components/NavbarUser";
import ChartMonthlyOrders from "../components/ChartMonthlyOrders";
import { useNavigate } from "react-router-dom";
import { api } from "../services/http";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const name = localStorage.getItem("name") || "Usuario";
  const [chartData, setChartData] = useState<number[]>([]);

  const handleStart = () => {
    navigate("/CreateDispatch");
  };

  const menuItems = [
    { title: "Crear despacho", route: "/CreateDispatch" },
    { title: "Agregar productos", route: "/add-product" },
    { title: "Listado de productos", route: "/products" },
    { title: "Choferes", route: "/drivers" },
    { title: "Clientes", route: "/clients" },
    { title: "Seguimiento", route: "/tracking" },
  ];

  useEffect(() => {
    api
      .get("/dispatches/monthly")
      .then((res) => setChartData(res.data || []))
      .catch((err) => {
        console.error("Error fetching monthly dispatches:", err);
        setChartData([]);
      });
  }, []);

  return (
    <div className="min-h-screen bg-blue-50">
      <NavbarUser />

      <div className="max-w-5xl mx-auto p-6">
        <div className="flex justify-start mb-4">
          {/* Logo opcional */}
        </div>

        <h2 className="text-2xl font-bold mb-2">Bienvenido, {name}</h2>

        <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mt-6">
          <button
            onClick={handleStart}
            className="bg-blue-500 text-white px-6 py-3 rounded shadow hover:bg-blue-600"
          >
            Iniciar jornada del día
          </button>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {menuItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => navigate(item.route)}
                className="bg-white border hover:border-blue-400 rounded px-4 py-2 text-sm text-left shadow-sm"
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
