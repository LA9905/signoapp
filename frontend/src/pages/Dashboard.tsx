// import { useEffect, useState } from "react";
// import type { AxiosResponse } from "axios";
// import NavbarUser from "../components/NavbarUser";
// import ChartMonthlyOrders from "../components/ChartMonthlyOrders";
// import { useNavigate } from "react-router-dom";
// import { api } from "../services/http";
// import { me } from "../services/authService";
// import type { MeResp } from "../types";

// const Dashboard: React.FC = () => {
//   const navigate = useNavigate();
//   const name = localStorage.getItem("name") || "Usuario";
//   const [chartData, setChartData] = useState<number[]>([]);
//   const [isAdmin, setIsAdmin] = useState(false);
//   const [isLimited, setIsLimited] = useState(false);
//   const [gender, setGender] = useState<"m" | "f" | null>(null);
//   const [isLoadingUser, setIsLoadingUser] = useState(true);
//   const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
//   const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
//   const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);

//   const handleStart = () => navigate("/CreateDispatch");

//   useEffect(() => {
//     const fetchChartData = async () => {
//       try {
//         const res = await api.get("/dispatches/monthly", {
//           params: {
//             year: selectedYear,
//             month: selectedMonth,
//           },
//         });
//         setChartData(res.data || []);
//         setErrorMessage(null);
//       } catch (err) {
//         setChartData([]);
//         setErrorMessage("Error al cargar los datos del gráfico. Verifica los parámetros o intenta de nuevo.");
//       }
//     };
//     fetchChartData();
//   }, [selectedYear, selectedMonth]);

//   useEffect(() => {
//     me()
//       .then((res: AxiosResponse<MeResp>) => {
//         setIsAdmin(!!res.data.is_admin);
//         setIsLimited(!!res.data.is_limited);
//         setAvatarUrl(res.data.avatar_url || null);
//         setGender(res.data.gender ?? null);
//         setIsLoadingUser(false);
//       })
//       .catch(() => {
//         setIsAdmin(false);
//         setIsLimited(false);
//         setAvatarUrl(null);
//         setIsLoadingUser(false);
//       });
//   }, []);

//   let menuItems = [
//     { title: "Crear despacho", route: "/CreateDispatch" },
//     { title: "Agregar productos", route: "/add-product" },
//     { title: "Listado de productos", route: "/products" },
//     { title: "Choferes", route: "/drivers" },
//     { title: "Centros de Costos", route: "/clients" },
//     { title: "Seguimiento de despachos", route: "/tracking" },
//     { title: "Recepción de Proveedores", route: "/receive-supplier" },
//     { title: "Recepciones registradas", route: "/supplier-tracking" },
//     { title: "Proveedores", route: "/suppliers" },
//     { title: "Operarios", route: "/operators" },
//     { title: "Ingreso de Producción", route: "/create-production" },
//     { title: "Registros de Producción", route: "/production-tracking" },
//     { title: "Crear Nota de Crédito", route: "/create-credit-note" },
//     { title: "Seguimiento de Notas de Crédito", route: "/credit-note-tracking" },
//     { title: "Consumo Interno", route: "/create-internal" },
//     { title: "Registros de Consumos Internos", route: "/internal-tracking" },
//     { title: "Búsqueda de Movimientos de Stock por Producto", route: "/stock-movements" },
//   ];

//   if (isLimited) {
//     menuItems = [{ title: "Seguimiento de despachos", route: "/tracking" }];
//   } else if (isAdmin) {
//     menuItems.push({ title: "Administración (pagos)", route: "/admin/billing" });
//   }

//   const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
//   const months = [
//     "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
//     "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
//   ];

//   if (isLoadingUser) {
//     return (
//       <div className="min-h-screen bg-blue-50 flex items-center justify-center">
//         <div className="text-center">
//           <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
//           <p className="mt-2 text-neutral-900">Cargando...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-slate-100 text-neutral-900">
//       <NavbarUser avatarUrl={avatarUrl} />
//       <div className="max-w-5xl mx-auto px-4 py-8">

//         {/* Header */}
//         <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
//           <div>
//             <p className="text-sm text-slate-500 uppercase tracking-wide font-medium">Panel principal</p>
//             <h2 className="text-2xl font-bold text-slate-800">
//               {gender === "f" ? "Bienvenida" : "Bienvenido"}, {name}
//             </h2>
//           </div>
//           {!isLimited && (
//             <button
//               onClick={handleStart}
//               className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow transition-colors"
//             >
//               <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
//                 <path d="M8 5v14l11-7z"/>
//               </svg>
//               Iniciar jornada del día
//             </button>
//           )}
//         </div>

//         {/* Menu Grid */}
//         <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
//           {menuItems.map((item) => (
//             <button
//               key={item.route}
//               onClick={() => navigate(item.route)}
//               className="bg-white text-slate-700 border border-slate-200 border-l-4 border-l-blue-400 rounded-xl px-4 py-3 text-sm text-left shadow-sm transition-all duration-150 font-medium hover:bg-blue-50 hover:text-blue-700 hover:shadow-md"
//             >
//               {item.title}
//             </button>
//           ))}
//         </div>

//         {/* Chart Section */}
//         <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
//           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
//             <h3 className="text-base font-semibold text-slate-800">Despachos del mes</h3>
//             <div className="flex gap-2">
//               <select
//                 value={selectedYear}
//                 onChange={(e) => setSelectedYear(parseInt(e.target.value))}
//                 className="border border-slate-200 bg-slate-50 text-slate-700 text-sm p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
//               >
//                 {years.map((year) => (
//                   <option key={year} value={year}>{year}</option>
//                 ))}
//               </select>
//               <select
//                 value={selectedMonth}
//                 onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
//                 className="border border-slate-200 bg-slate-50 text-slate-700 text-sm p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
//               >
//                 {months.map((month, index) => (
//                   <option key={index + 1} value={index + 1}>{month}</option>
//                 ))}
//               </select>
//             </div>
//           </div>
//           {errorMessage && <p className="text-red-500 text-sm mb-3">{errorMessage}</p>}
//           <ChartMonthlyOrders dataPoints={chartData} />
//         </div>

//       </div>
//     </div>
//   );
// };

// export default Dashboard;


import { useEffect, useState } from "react";
import type { AxiosResponse } from "axios";
import { Bar } from "react-chartjs-2";
import NavbarUser from "../components/NavbarUser";
import DashboardAnniversaryBanner from "../components/DashboardAnniversaryBanner";
import ChartMonthlyOrders from "../components/ChartMonthlyOrders";
import { useNavigate } from "react-router-dom";
import { api } from "../services/http";
import { me } from "../services/authService";
import type { MeResp } from "../types";
import Sidebar from "../components/Sidebar";

interface DriverDiaDetalle {
  fecha: string;
  total_despachos: number;
  marcados: number;
  sin_marcar: number;
}

interface DriverPerformanceDetail {
  driver_id: number;
  name: string;
  photo_url: string | null;
  year: number;
  month: number;
  resumen: {
    total_despachos: number;
    entregados: number;
    pendientes: number;
    ratio: number | null;
    clasificacion: string;
    sujeto_sancion: boolean;
    mes_en_curso: boolean;
  };
  diario: DriverDiaDetalle[];
  explicacion: string;
}

interface OperatorDiaDetalle {
  fecha: string;
  cantidad_producto_principal: number;
  cantidad_total_dia: number;
  productos_dia: { nombre: string; cantidad: number }[];
  horas_programadas: number;
  horas_otras_actividades: number;
  horas_efectivas: number;
}

interface OperatorPerformanceDetail {
  operator_id: number;
  name: string;
  photo_url: string | null;
  year: number;
  month: number;
  resumen: {
    unidad: string | null;
    producto_principal: string | null;
    cantidad_mes: number;
    dias_trabajados: number;
    horas_efectivas: number;
    produccion_por_hora: number | null;
    linea_base_historica: number | null;
    linea_base_fuente: string | null;
    ratio: number | null;
    clasificacion: "muy_alta" | "alta" | "regular" | "baja" | "muy_baja" | "sin_datos";
    bono: boolean;
    mes_en_curso: boolean;
    detalle_unidades: unknown[];
  };
  producto_principal: string | null;
  diario: OperatorDiaDetalle[];
  actividades: unknown[];
  explicacion: string;
}

const OPERATOR_CLASIFICACION_INFO: Record<string, { label: string; color: string }> = {
  muy_alta: { label: "Muy Alta", color: "#34D399" },
  alta: { label: "Alta", color: "#60A5FA" },
  regular: { label: "Regular", color: "#FBBF24" },
  baja: { label: "Baja", color: "#FB923C" },
  muy_baja: { label: "Muy Baja", color: "#F87171" },
  sin_datos: { label: "Sin datos", color: "rgba(255,255,255,0.25)" },
};

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
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [driverDetail, setDriverDetail] = useState<DriverPerformanceDetail | null>(null);
  const [loadingDriverDetail, setLoadingDriverDetail] = useState(false);
  const [isOperatorLimited, setIsOperatorLimited] = useState(false);
  const [operatorDetail, setOperatorDetail] = useState<OperatorPerformanceDetail | null>(null);
  const [loadingOperatorDetail, setLoadingOperatorDetail] = useState(false);

  const handleStart = () => navigate("/CreateDispatch");

  useEffect(() => {
    if (isLoadingUser) return;

    if (isLimited) {
      const fetchDriverDetail = async () => {
        setLoadingDriverDetail(true);
        try {
          const monthParam = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
          const res = await api.get("/drivers/me/performance/detail", {
            params: { month: monthParam },
          });
          setDriverDetail(res.data);
          setErrorMessage(null);
        } catch (err) {
          setDriverDetail(null);
          setErrorMessage("Error al cargar tus métricas. Intenta de nuevo.");
        } finally {
          setLoadingDriverDetail(false);
        }
      };
      fetchDriverDetail();
      return;
    }

    if (isOperatorLimited) {
      const fetchOperatorDetail = async () => {
        setLoadingOperatorDetail(true);
        try {
          const monthParam = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
          const res = await api.get("/operators/me/performance/detail", {
            params: { month: monthParam },
          });
          setOperatorDetail(res.data);
          setErrorMessage(null);
        } catch (err) {
          setOperatorDetail(null);
          setErrorMessage("Error al cargar tus métricas. Intenta de nuevo.");
        } finally {
          setLoadingOperatorDetail(false);
        }
      };
      fetchOperatorDetail();
      return;
    }

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
  }, [selectedYear, selectedMonth, isLimited, isOperatorLimited, isLoadingUser]);

  useEffect(() => {
    me()
      .then((res: AxiosResponse<MeResp>) => {
        setIsAdmin(!!res.data.is_admin);
        setIsLimited(!!res.data.is_limited);
        setIsOperatorLimited(!!res.data.is_operator_limited);
        setAvatarUrl(res.data.avatar_url || null);
        setGender(res.data.gender ?? null);
        setIsLoadingUser(false);
      })
      .catch(() => {
        setIsAdmin(false);
        setIsLimited(false);
        setIsOperatorLimited(false);
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
  } else if (isOperatorLimited) {
    menuItems = [{ title: "Registros de Producción", route: "/production-tracking" }];
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
      <div className="min-h-screen bg-[#080C14] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/10 border-t-indigo-400 rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-white/30 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080C14] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .font-display { font-family: 'Syne', sans-serif; }

        .dash-glass {
          background: rgba(30,40,80,0.35);
          border: 1px solid rgba(99,102,241,0.18);
          border-radius: 20px;
        }

        .dash-menu-btn {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-left: 3px solid rgba(99,102,241,0.6);
          border-radius: 14px;
          padding: 14px 16px 14px 15px;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.9);
          text-align: left;
          cursor: pointer;
          transition: background .15s, border-color .15s, color .15s, transform .1s;
          font-family: 'DM Sans', sans-serif;
          line-height: 1.4;
        }
        .dash-menu-btn:hover {
          background: rgba(99,102,241,0.1);
          border-left-color: #818CF8;
          border-color: rgba(99,102,241,0.28);
          border-left-color: #818CF8;
          color: white;
          transform: translateY(-1px);
        }
        .dash-menu-btn:active { transform: translateY(0); }

        .dash-start-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #4F46E5, #6366F1);
          box-shadow: 0 4px 20px rgba(99,102,241,0.35);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 11px 22px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all .2s;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
        }
        .dash-start-btn:hover {
          box-shadow: 0 6px 28px rgba(99,102,241,0.5);
          transform: translateY(-1px);
        }
        .dash-start-btn:active { transform: translateY(0); }

        .dash-select {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.75);
          border-radius: 10px;
          font-size: 13px;
          padding: 8px 12px;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: border-color .15s;
          appearance: none;
          padding-right: 28px;
        }
        .dash-select:focus {
          border-color: rgba(99,102,241,0.5);
          color: white;
        }
        .dash-select option { background: #111827; color: white; }

        .dash-select-wrapper {
          position: relative;
          display: inline-block;
        }
        .dash-select-wrapper::after {
          content: '';
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          width: 0; height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 4px solid rgba(255,255,255,0.3);
          pointer-events: none;
        }

        .section-divider {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: rgba(99,102,241,0.7);
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .section-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(99,102,241,0.12);
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fade-in .3s ease both; }
      `}</style>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isLimited={isLimited || isOperatorLimited} />

      <NavbarUser avatarUrl={avatarUrl} onMenuClick={() => setIsSidebarOpen(true)} />
      <DashboardAnniversaryBanner />

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10 fade-in">
          <div>
            <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "4px" }}>
              Panel principal
            </p>
            <h1 className="font-display" style={{ fontSize: "clamp(24px, 5vw, 32px)", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
              {gender === "f" ? "Bienvenida" : "Bienvenido"},{" "}
              <span style={{ color: "#A5B4FC" }}>{name}</span>
            </h1>
          </div>
          {!isLimited && !isOperatorLimited && (
            <button onClick={handleStart} className="dash-start-btn flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Iniciar jornada del día
            </button>
          )}
        </div>

        {/* ── Menu grid ── */}
        <div className="mb-10 fade-in" style={{ animationDelay: "0.05s" }}>
          <div className="section-divider">Accesos rápidos</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {menuItems.map((item, idx) => (
              <button
                key={item.route}
                onClick={() => navigate(item.route)}
                className="dash-menu-btn"
                style={{ animationDelay: `${Math.min(idx, 8) * 0.03}s` }}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>

        {/* ── Chart section ── */}
        <div className="dash-glass p-6 fade-in" style={{ animationDelay: "0.10s" }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="section-divider" style={{ marginBottom: "2px" }}>Actividad</div>
              <p style={{ fontSize: "16px", fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
                {isLimited ? "Mi rendimiento del mes" : isOperatorLimited ? "Mi producción del mes" : "Despachos del mes"}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="dash-select-wrapper">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="dash-select"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="dash-select-wrapper">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="dash-select"
                >
                  {months.map((month, index) => (
                    <option key={index + 1} value={index + 1}>{month}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {errorMessage && (
            <p style={{ color: "#F87171", fontSize: "13px", marginBottom: "12px" }}>{errorMessage}</p>
          )}

          {isLimited ? (
            loadingDriverDetail ? (
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>Cargando tus métricas…</p>
            ) : driverDetail ? (
              <>
                <div
                  style={{
                    fontSize: "12px",
                    lineHeight: 1.5,
                    color: "rgba(255,255,255,0.55)",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    marginBottom: "16px",
                  }}
                >
                  {driverDetail.explicacion}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>Despachos asignados</div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "white" }}>{driverDetail.resumen.total_despachos}</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>Entregados (marcados)</div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "white" }}>{driverDetail.resumen.entregados}</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>Sin marcar</div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "white" }}>{driverDetail.resumen.pendientes}</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>% de cumplimiento</div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "white" }}>
                      {driverDetail.resumen.ratio !== null ? `${Math.round(driverDetail.resumen.ratio * 100)}%` : "—"}
                    </div>
                  </div>
                </div>

                {driverDetail.diario.length === 0 ? (
                  <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px" }}>
                    Sin despachos asignados este mes.
                  </p>
                ) : (
                  <div style={{ height: 220 }}>
                    <Bar
                      data={{
                        labels: driverDetail.diario.map((d) => d.fecha.slice(8, 10)),
                        datasets: [
                          {
                            label: "Entregados (marcados)",
                            data: driverDetail.diario.map((d) => d.marcados),
                            backgroundColor: "rgba(52,211,153,0.75)",
                            borderRadius: 4,
                            stack: "total",
                          },
                          {
                            label: "Sin marcar",
                            data: driverDetail.diario.map((d) => d.sin_marcar),
                            backgroundColor: "rgba(248,113,113,0.6)",
                            borderRadius: 4,
                            stack: "total",
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: true,
                            labels: { color: "rgba(255,255,255,0.6)", font: { size: 10 }, boxWidth: 10 },
                          },
                        },
                        scales: {
                          x: { stacked: true, grid: { display: false }, ticks: { color: "rgba(255,255,255,0.35)", font: { size: 10 } } },
                          y: { stacked: true, grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "rgba(255,255,255,0.35)", font: { size: 10 }, precision: 0 } },
                        },
                      }}
                    />
                  </div>
                )}
              </>
) : (
              <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px" }}>
                No se encontraron métricas para tu usuario.
              </p>
            )
          ) : isOperatorLimited ? (
            loadingOperatorDetail ? (
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>Cargando tus métricas…</p>
            ) : operatorDetail ? (
              <>
                <div
                  style={{
                    fontSize: "12px",
                    lineHeight: 1.5,
                    color: "rgba(255,255,255,0.55)",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    marginBottom: "16px",
                  }}
                >
                  {operatorDetail.explicacion}
                </div>

                {(() => {
                  const info =
                    OPERATOR_CLASIFICACION_INFO[operatorDetail.resumen.clasificacion] ||
                    OPERATOR_CLASIFICACION_INFO.sin_datos;
                  return (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        fontSize: "12px",
                        fontWeight: 700,
                        padding: "4px 14px",
                        borderRadius: "99px",
                        border: `1px solid ${info.color}55`,
                        background: `${info.color}18`,
                        color: info.color,
                        marginBottom: "16px",
                      }}
                    >
                      Producción: {info.label}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>Producto principal</div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "white" }}>
                      {operatorDetail.resumen.producto_principal || "—"}
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>Cantidad producida</div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "white" }}>
                      {operatorDetail.resumen.cantidad_mes} {operatorDetail.resumen.unidad || ""}
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>Días trabajados</div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "white" }}>{operatorDetail.resumen.dias_trabajados}</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>% de rendimiento</div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "white" }}>
                      {operatorDetail.resumen.ratio !== null ? `${Math.round(operatorDetail.resumen.ratio * 100)}%` : "—"}
                    </div>
                  </div>
                </div>

                {operatorDetail.diario.length === 0 ? (
                  <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px" }}>
                    Sin producción registrada este mes.
                  </p>
                ) : (
                  <div style={{ height: 220 }}>
                    <Bar
                      data={{
                        labels: operatorDetail.diario.map((d) => d.fecha.slice(8, 10)),
                        datasets: [
                          {
                            label: `Producción del día${operatorDetail.resumen.unidad ? ` (${operatorDetail.resumen.unidad})` : ""}`,
                            data: operatorDetail.diario.map((d) => d.cantidad_total_dia),
                            backgroundColor: "rgba(99,102,241,0.75)",
                            borderRadius: 4,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: true,
                            labels: { color: "rgba(255,255,255,0.6)", font: { size: 10 }, boxWidth: 10 },
                          },
                        },
                        scales: {
                          x: { grid: { display: false }, ticks: { color: "rgba(255,255,255,0.35)", font: { size: 10 } } },
                          y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "rgba(255,255,255,0.35)", font: { size: 10 }, precision: 0 } },
                        },
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px" }}>
                No se encontraron métricas para tu usuario.
              </p>
            )
          ) : (
            <ChartMonthlyOrders dataPoints={chartData} />
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;