import { Doughnut } from "react-chartjs-2";
import "chart.js/auto";

export interface DriverPerformance {
  driver_id: number;
  name: string;
  total_despachos: number;
  entregados: number;
  pendientes: number;
  ratio: number | null;
  clasificacion: "excelente" | "buena" | "regular" | "baja" | "muy_baja" | "sin_datos";
  sujeto_sancion: boolean;
  mes_en_curso?: boolean;
}

const CLASIFICACION_INFO: Record<string, { label: string; color: string }> = {
  excelente: { label: "Excelente", color: "#34D399" },
  buena: { label: "Buena", color: "#60A5FA" },
  regular: { label: "Regular", color: "#FBBF24" },
  baja: { label: "Baja", color: "#FB923C" },
  muy_baja: { label: "Muy Baja", color: "#F87171" },
  sin_datos: { label: "Sin datos", color: "rgba(255,255,255,0.25)" },
};

interface Props {
  dr: DriverPerformance;
  monthLabel: string;
}

const DriverPerformanceCard: React.FC<Props> = ({ dr, monthLabel }) => {
  const info = CLASIFICACION_INFO[dr.clasificacion] || CLASIFICACION_INFO.sin_datos;
  const pct = dr.ratio !== null ? Math.round(dr.ratio * 100) : null;
  const pctRing = pct !== null ? Math.min(pct, 100) : 0;

  const data = {
    labels: ["Entregados", "Pendientes"],
    datasets: [
      {
        data: [pctRing, Math.max(100 - pctRing, 0)],
        backgroundColor: [info.color, "rgba(255,255,255,0.06)"],
        borderWidth: 0,
        cutout: "72%",
      },
    ],
  };

  const options = {
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="opc-card">
      <div className="opc-top" style={{ justifyContent: "center" }}>
        <div className="opc-chart-wrap">
          <Doughnut data={data} options={options} />
          <div className="opc-chart-center">
            <span style={{ color: info.color }}>{pct !== null ? `${pct}%` : "—"}</span>
          </div>
        </div>
      </div>

      <div className="opc-name">{dr.name}</div>
      <div className="opc-month">{monthLabel}</div>

      <div className="opc-badge" style={{ color: info.color, borderColor: `${info.color}55`, background: `${info.color}18` }}>
        {info.label}
      </div>

      <div className="opc-bono">
        {dr.total_despachos > 0
          ? `${dr.entregados} de ${dr.total_despachos} despachos entregados`
          : "Sin despachos este mes"}
      </div>

      {dr.sujeto_sancion && (
        <div className="opc-source" style={{ color: "#FCA5A5" }}>
          Rendimiento bajo — sujeto a revisión
        </div>
      )}
      {dr.mes_en_curso && (
        <div className="opc-source">Mes en curso — puede variar</div>
      )}
    </div>
  );
};

export default DriverPerformanceCard;