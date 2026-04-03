import { useEffect, useState } from "react";
import type { AxiosResponse } from "axios";
import NavbarUser from "../components/NavbarUser";
import ChartMonthlyOrders from "../components/ChartMonthlyOrders";
import { useNavigate } from "react-router-dom";
import { api } from "../services/http";
import { me } from "../services/authService";
import type { MeResp } from "../types";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const name = localStorage.getItem("name") || "Usuario";
  const [chartData, setChartData] = useState<number[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLimited, setIsLimited] = useState(false);
  const [gender, setGender] = useState<"m" | "f" | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
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
      .then((res: AxiosResponse<MeResp>) => {
        setIsAdmin(!!res.data.is_admin);
        setIsLimited(!!res.data.is_limited);
        setAvatarUrl(res.data.avatar_url || null);
        setGender(res.data.gender ?? null);
        setIsLoadingUser(false);
      })
      .catch(() => {
        setIsAdmin(false);
        setIsLimited(false);
        setAvatarUrl(null);
        setIsLoadingUser(false);
      });
  }, []);

  let menuItems = [
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
    { title: "Crear Nota de Crédito", route: "/create-credit-note" },
    { title: "Seguimiento de Notas de Crédito", route: "/credit-note-tracking" },
    { title: "Consumo Interno", route: "/create-internal" },
    { title: "Registros de Consumos Internos", route: "/internal-tracking" },
    { title: "Búsqueda de Movimientos de Stock por Producto", route: "/stock-movements" },
  ];

  if (isLimited) {
    menuItems = [{ title: "Seguimiento de despachos", route: "/tracking" }];
  } else if (isAdmin) {
    menuItems.push({ title: "Administración (pagos)", route: "/admin/billing" });
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-neutral-900">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-neutral-900">
      <NavbarUser avatarUrl={avatarUrl} />
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-wide font-medium">Panel principal</p>
            <h2 className="text-2xl font-bold text-slate-800">
              {gender === "f" ? "Bienvenida" : "Bienvenido"}, {name}
            </h2>
          </div>
          {!isLimited && (
            <button
              onClick={handleStart}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Iniciar jornada del día
            </button>
          )}
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
          {menuItems.map((item) => (
            <button
              key={item.route}
              onClick={() => navigate(item.route)}
              className="bg-white text-slate-700 border border-slate-200 border-l-4 border-l-blue-400 rounded-xl px-4 py-3 text-sm text-left shadow-sm transition-all duration-150 font-medium hover:bg-blue-50 hover:text-blue-700 hover:shadow-md"
            >
              {item.title}
            </button>
          ))}
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <h3 className="text-base font-semibold text-slate-800">Despachos del mes</h3>
            <div className="flex gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="border border-slate-200 bg-slate-50 text-slate-700 text-sm p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="border border-slate-200 bg-slate-50 text-slate-700 text-sm p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {months.map((month, index) => (
                  <option key={index + 1} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>
          </div>
          {errorMessage && <p className="text-red-500 text-sm mb-3">{errorMessage}</p>}
          <ChartMonthlyOrders dataPoints={chartData} />
        </div>

      </div>
    </div>
  );
};

export default Dashboard;