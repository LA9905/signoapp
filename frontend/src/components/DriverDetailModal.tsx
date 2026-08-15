import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import { FiX } from "react-icons/fi";
import { api } from "../services/http";

interface DiaDetalle {
  fecha: string;
  total_despachos: number;
  marcados: number;
  sin_marcar: number;
}

interface DetailResponse {
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
  diario: DiaDetalle[];
  explicacion: string;
}

interface Props {
  driverId: number;
  year: number;
  month: number;
  monthLabel: string;
  onClose: () => void;
}

const DriverDetailModal: React.FC<Props> = ({ driverId, year, month, monthLabel, onClose }) => {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const monthParam = `${year}-${String(month).padStart(2, "0")}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get(`/drivers/${driverId}/performance/detail`, { params: { month: monthParam } })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        console.error("Error cargando detalle de chofer:", err);
        if (!cancelled) setError("No se pudo cargar el detalle.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [driverId, year, month]);

  const chartData = data
    ? {
        labels: data.diario.map((d) => d.fecha.slice(8, 10)),
        datasets: [
          {
            label: "Entregados (marcados)",
            data: data.diario.map((d) => d.marcados),
            backgroundColor: "rgba(52,211,153,0.75)",
            borderRadius: 4,
            stack: "total",
          },
          {
            label: "Sin marcar",
            data: data.diario.map((d) => d.sin_marcar),
            backgroundColor: "rgba(248,113,113,0.6)",
            borderRadius: 4,
            stack: "total",
          },
        ],
      }
    : null;

  const chartOptions = {
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
  };

  return (
    <div className="odm-backdrop" onClick={onClose}>
      <style>{`
        .odm-backdrop {
          position: fixed; inset: 0; z-index: 1300;
          background: rgba(0,0,0,0.65); backdrop-filter: blur(3px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
        }
        .odm-panel {
          background: #0B0F1A; border: 1px solid rgba(99,102,241,0.25);
          border-radius: 16px; width: min(640px, 100%); max-height: 88vh;
          overflow-y: auto; padding: 20px;
          font-family: 'DM Sans', sans-serif; color: white;
        }
        .odm-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .odm-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 16px; }
        .odm-close { background: rgba(99,102,241,0.16); border: 1px solid rgba(129,140,248,0.65); border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #C7D2FE; box-shadow: 0 0 8px rgba(99,102,241,0.15); }
        .odm-close svg { display: block !important; visibility: visible !important; opacity: 1 !important; width: 16px !important; height: 16px !important; min-width: 16px !important; min-height: 16px !important; stroke: currentColor !important; stroke-width: 2 !important; fill: none !important; }
        .odm-section { margin-bottom: 18px; }
        .odm-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: rgba(165,180,252,0.85); margin-bottom: 8px; }
        .odm-explicacion { font-size: 12px; line-height: 1.5; color: rgba(255,255,255,0.55); background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 10px 12px; }
        .odm-resumen-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .odm-resumen-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 8px 10px; }
        .odm-resumen-label { font-size: 10px; color: rgba(255,255,255,0.35); }
        .odm-resumen-value { font-size: 13px; font-weight: 600; color: white; }
        .odm-act-empty { font-size: 12px; color: rgba(255,255,255,0.3); text-align: center; padding: 12px 0; }
      `}</style>
      <div className="odm-panel" onClick={(e) => e.stopPropagation()}>
        <div className="odm-header">
          <span className="odm-title">{data ? data.name : "Detalle del chofer"} — {monthLabel}</span>
          <button className="odm-close" onClick={onClose} type="button"><FiX size={16} /></button>
        </div>

        {loading && <div className="odm-act-empty">Cargando detalle…</div>}
        {error && <div className="odm-act-empty">{error}</div>}

        {data && !loading && (
          <>
            <div className="odm-section">
              <div className="odm-section-title">Cómo se calculó</div>
              <div className="odm-explicacion">{data.explicacion}</div>
            </div>

            <div className="odm-section">
              <div className="odm-section-title">Resumen del mes</div>
              <div className="odm-resumen-grid">
                <div className="odm-resumen-item">
                  <div className="odm-resumen-label">Despachos asignados</div>
                  <div className="odm-resumen-value">{data.resumen.total_despachos}</div>
                </div>
                <div className="odm-resumen-item">
                  <div className="odm-resumen-label">Entregados (marcados)</div>
                  <div className="odm-resumen-value">{data.resumen.entregados}</div>
                </div>
                <div className="odm-resumen-item">
                  <div className="odm-resumen-label">Sin marcar</div>
                  <div className="odm-resumen-value">{data.resumen.pendientes}</div>
                </div>
                <div className="odm-resumen-item">
                  <div className="odm-resumen-label">% de cumplimiento</div>
                  <div className="odm-resumen-value">
                    {data.resumen.ratio !== null ? `${Math.round(data.resumen.ratio * 100)}%` : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="odm-section">
              <div className="odm-section-title">Despachos por fecha</div>
              {data.diario.length === 0 ? (
                <div className="odm-act-empty">Sin despachos asignados este mes.</div>
              ) : (
                <div style={{ height: 200 }}>
                  {chartData && <Bar data={chartData} options={chartOptions} />}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DriverDetailModal;