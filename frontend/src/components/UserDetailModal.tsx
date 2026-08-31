import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import { FiX } from "react-icons/fi";
import { api } from "../services/http";
import { useTheme } from "../context/ThemeContext";

interface DiaDetalle {
  fecha: string;
  total_despachos: number;
  correctos: number;
  editados: number;
}

interface DetailResponse {
  user_id: string;
  name: string;
  photo_url: string | null;
  year: number;
  month: number;
  resumen: {
    total_despachos: number;
    editados: number;
    tasa_error: number;
    volumen_ratio: number | null;
    ratio: number | null;
    clasificacion: string;
    motivos_frecuentes: { motivo: string; label: string; count: number }[];
    mes_en_curso: boolean;
  };
  diario: DiaDetalle[];
  explicacion: string;
}

interface Props {
  userId: string;
  year: number;
  month: number;
  monthLabel: string;
  onClose: () => void;
}

const UserDetailModal: React.FC<Props> = ({ userId, year, month, monthLabel, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const monthParam = `${year}-${String(month).padStart(2, "0")}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get(`/users/${userId}/performance/detail`, { params: { month: monthParam } })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        console.error("Error cargando detalle de usuario:", err);
        if (!cancelled) setError("No se pudo cargar el detalle.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, year, month]);

  const chartData = data
    ? {
        labels: data.diario.map((d) => d.fecha.slice(8, 10)),
        datasets: [
          {
            label: "Correctos",
            data: data.diario.map((d) => d.correctos),
            backgroundColor: "rgba(52,211,153,0.75)",
            borderRadius: 4,
            stack: "total",
          },
          {
            label: "Editados (con error)",
            data: data.diario.map((d) => d.editados),
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
        labels: { color: isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)", font: { size: 10 }, boxWidth: 10 },
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.5)", font: { size: 10 } } },
      y: { stacked: true, grid: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.08)" }, ticks: { color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.5)", font: { size: 10 }, precision: 0 } },
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
        .odm-motivo-row { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; padding: 7px 10px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); margin-bottom: 6px; }
        .odm-act-empty { font-size: 12px; color: rgba(255,255,255,0.3); text-align: center; padding: 12px 0; }

        /* ─── Modo claro ─── */
        body[data-theme="light"] .odm-panel {
          background: #FFFFFF;
          border: 1px solid rgba(99,102,241,0.25);
          color: #0F172A;
          box-shadow: 0 12px 40px rgba(15,23,42,0.18);
        }
        body[data-theme="light"] .odm-close {
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.35);
          color: #4338CA;
        }
        body[data-theme="light"] .odm-section-title {
          color: #4338CA;
        }
        body[data-theme="light"] .odm-explicacion {
          color: rgba(15,23,42,0.65);
          background: rgba(15,23,42,0.03);
          border: 1px solid rgba(15,23,42,0.08);
        }
        body[data-theme="light"] .odm-resumen-item {
          background: rgba(15,23,42,0.03);
          border: 1px solid rgba(15,23,42,0.08);
        }
        body[data-theme="light"] .odm-resumen-label {
          color: rgba(15,23,42,0.45);
        }
        body[data-theme="light"] .odm-resumen-value {
          color: #0F172A;
        }
        body[data-theme="light"] .odm-motivo-row {
          background: rgba(15,23,42,0.03);
          border: 1px solid rgba(15,23,42,0.08);
        }
        body[data-theme="light"] .odm-act-empty {
          color: rgba(15,23,42,0.4);
        }
      `}</style>
      <div className="odm-panel" onClick={(e) => e.stopPropagation()}>
        <div className="odm-header">
          <span className="odm-title">{data ? data.name : "Detalle del usuario"} — {monthLabel}</span>
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
                  <div className="odm-resumen-label">Despachos creados</div>
                  <div className="odm-resumen-value">{data.resumen.total_despachos}</div>
                </div>
                <div className="odm-resumen-item">
                  <div className="odm-resumen-label">Editados por error</div>
                  <div className="odm-resumen-value">{data.resumen.editados}</div>
                </div>
                <div className="odm-resumen-item">
                  <div className="odm-resumen-label">Tasa de error</div>
                  <div className="odm-resumen-value">{Math.round(data.resumen.tasa_error * 100)}%</div>
                </div>
                <div className="odm-resumen-item">
                  <div className="odm-resumen-label">Volumen vs equipo</div>
                  <div className="odm-resumen-value">
                    {data.resumen.volumen_ratio !== null ? `${Math.round(data.resumen.volumen_ratio * 100)}%` : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="odm-section">
              <div className="odm-section-title">Despachos por fecha</div>
              {data.diario.length === 0 ? (
                <div className="odm-act-empty">Sin despachos creados este mes.</div>
              ) : (
                <div style={{ height: 200 }}>
                  {chartData && <Bar data={chartData} options={chartOptions} />}
                </div>
              )}
            </div>

            <div className="odm-section">
              <div className="odm-section-title">Motivos de error más frecuentes</div>
              {data.resumen.motivos_frecuentes.length === 0 ? (
                <div className="odm-act-empty">Sin errores registrados este mes.</div>
              ) : (
                data.resumen.motivos_frecuentes.map((m) => (
                  <div className="odm-motivo-row" key={m.motivo}>
                    <span>{m.label}</span>
                    <span>{m.count} {m.count === 1 ? "vez" : "veces"}</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserDetailModal;