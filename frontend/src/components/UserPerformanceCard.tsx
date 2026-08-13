import { Doughnut } from "react-chartjs-2";
import "chart.js/auto";

export interface UserPerformance {
  user_id: string;
  name: string;
  photo_url: string | null;
  total_despachos: number;
  editados: number;
  tasa_error: number;
  volumen_ratio: number | null;
  ratio: number | null;
  clasificacion: "muy_alta" | "alta" | "regular" | "baja" | "muy_baja" | "sin_datos";
  motivos_frecuentes: { motivo: string; label: string; count: number }[];
  mes_en_curso?: boolean;
}

const CLASIFICACION_INFO: Record<string, { label: string; color: string }> = {
  muy_alta: { label: "Muy Alta", color: "#34D399" },
  alta: { label: "Alta", color: "#60A5FA" },
  regular: { label: "Regular", color: "#FBBF24" },
  baja: { label: "Baja", color: "#FB923C" },
  muy_baja: { label: "Muy Baja", color: "#F87171" },
  sin_datos: { label: "Sin datos", color: "rgba(255,255,255,0.25)" },
};

const BANDAS_BAJAS: Record<string, [number, number, number, number]> = {
  regular: [0.85, 1.0, 70, 84],
  baja: [0.65, 0.85, 50, 70],
  muy_baja: [0, 0.65, 0, 50],
};

function calcularPorcentajeVisual(ratio: number, clasificacion: string): number {
  if (ratio >= 1.0) return Math.round(ratio * 100);
  const banda = BANDAS_BAJAS[clasificacion];
  if (!banda) return Math.round(ratio * 100);
  const [rMin, rMax, sMin, sMax] = banda;
  const t = rMax > rMin ? Math.min(Math.max((ratio - rMin) / (rMax - rMin), 0), 1) : 0;
  return Math.round(sMin + t * (sMax - sMin));
}

interface Props {
  u: UserPerformance;
  monthLabel: string;
}

const UserPerformanceCard: React.FC<Props> = ({ u, monthLabel }) => {
  const info = CLASIFICACION_INFO[u.clasificacion] || CLASIFICACION_INFO.sin_datos;
  const pctDisplay = u.ratio !== null ? calcularPorcentajeVisual(u.ratio, u.clasificacion) : null;
  const pctRing = pctDisplay !== null ? Math.min(pctDisplay, 100) : 0;

  const data = {
    labels: ["Rendimiento", "Restante"],
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
      <div className="opc-top">
        <div className="opc-avatar-wrap" style={{ cursor: "default" }}>
          {u.photo_url ? (
            <img src={u.photo_url} alt={u.name} className="opc-avatar-img" />
          ) : (
            <div className="opc-avatar-placeholder">{u.name.charAt(0).toUpperCase()}</div>
          )}
        </div>

        <div className="opc-chart-wrap">
          <Doughnut data={data} options={options} />
          <div className="opc-chart-center">
            <span style={{ color: info.color }}>{pctDisplay !== null ? `${pctDisplay}%` : "—"}</span>
          </div>
        </div>
      </div>

      <div className="opc-name">{u.name}</div>
      <div className="opc-month">{monthLabel}</div>

      <div className="opc-badge" style={{ color: info.color, borderColor: `${info.color}55`, background: `${info.color}18` }}>
        {info.label}
      </div>

      <div className="opc-bono">
        {u.total_despachos} despachos creados
        {u.editados > 0 && ` · ${u.editados} editados (${Math.round(u.tasa_error * 100)}%)`}
      </div>

      {u.motivos_frecuentes.length > 0 && (
        <div className="opc-source" style={{ textAlign: "left", width: "100%" }}>
          Errores frecuentes: {u.motivos_frecuentes.map((m) => `${m.label} (${m.count})`).join(", ")}
        </div>
      )}
      {u.mes_en_curso && <div className="opc-source">Mes en curso — puede variar</div>}
    </div>
  );
};

export default UserPerformanceCard;