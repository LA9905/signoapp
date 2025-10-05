import { useEffect, useState } from "react";
import NavbarUser from "../components/NavbarUser";
import ChartMonthlyOrders from "../components/ChartMonthlyOrders";
import { useNavigate } from "react-router-dom";
import { api } from "../services/http";
import { me } from "../services/authService";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const name = localStorage.getItem("name") || "Usuario";
  const [chartData, setChartData] = useState<number[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStart = () => navigate("/CreateDispatch");

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const res = await api.get("/dispatches/monthly", {
          params: {
            year: selectedYear,
            month: selectedMonth,
          },
        });
        setChartData(res.data || []);
        setErrorMessage(null);
      } catch (err) {
        setChartData([]);
        setErrorMessage("Error al cargar los datos del gráfico. Verifica los parámetros o intenta de nuevo.");
      }
    };
    fetchChartData();
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
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
    { title: "Seguimiento de despachos", route: "/tracking" },
    { title: "Recepción de Proveedores", route: "/receive-supplier" },
    { title: "Recepciones registradas", route: "/supplier-tracking" },
    { title: "Proveedores", route: "/suppliers" },
    { title: "Operarios", route: "/operators" },
    { title: "Ingreso de Producción", route: "/create-production" },
    { title: "Registros de Producción", route: "/production-tracking" },
    { title: "Consumo Interno", route: "/create-internal" },
    { title: "Registros de Consumos Internos", route: "/internal-tracking" },
    ...(isAdmin ? [{ title: "Administración (pagos)", route: "/admin/billing" }] : []),
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
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
          {errorMessage && <p className="text-red-500 mb-2">{errorMessage}</p>}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border p-2 rounded"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="border p-2 rounded"
            >
              {months.map((month, index) => (
                <option key={index + 1} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <h3 className="text-lg font-semibold mb-2">Despachos del mes seleccionado</h3>
          <ChartMonthlyOrders dataPoints={chartData} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;