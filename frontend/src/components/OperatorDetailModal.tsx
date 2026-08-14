import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import { FiX, FiTrash2 } from "react-icons/fi";
import { api } from "../services/http";

interface DiaDetalle {
  fecha: string;
  cantidad_producto_principal: number;
  cantidad_total_dia: number;
  horas_programadas: number;
  horas_otras_actividades: number;
  horas_efectivas: number;
}

interface Actividad {
  id: number;
  fecha: string;
  horas: number;
  nota: string | null;
}

interface DetailResponse {
  operator_id: number;
  name: string;
  photo_url: string | null;
  year: number;
  month: number;
  resumen: {
    ratio: number | null;
    clasificacion: string;
    bono: boolean;
    linea_base_historica: number | null;
    linea_base_fuente: string | null;
    produccion_por_hora: number | null;
    horas_efectivas: number;
    dias_trabajados: number;
  };
  producto_principal: string | null;
  diario: DiaDetalle[];
  actividades: Actividad[];
  explicacion: string;
}

interface Props {
  operatorId: number;
  year: number;
  month: number;
  monthLabel: string;
  onClose: () => void;
  onActivityChanged?: () => void;
}

const OperatorDetailModal: React.FC<Props> = ({ operatorId, year, month, monthLabel, onClose, onActivityChanged }) => {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const monthParam = `${year}-${String(month).padStart(2, "0")}`;

  const fetchDetail = () => {
    setLoading(true);
    setError(null);
    return api
      .get(`/operators/${operatorId}/performance/detail`, { params: { month: monthParam } })
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        console.error("Error cargando detalle de operario:", err);
        setError("No se pudo cargar el detalle.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get(`/operators/${operatorId}/performance/detail`, { params: { month: monthParam } })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        console.error("Error cargando detalle de operario:", err);
        if (!cancelled) setError("No se pudo cargar el detalle.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [operatorId, year, month]);

  const handleDeleteActivity = async (activityId: number) => {
    if (!confirm("¿Eliminar este registro de actividad? Se volverá a calcular el rendimiento sin estas horas.")) return;
    setDeletingId(activityId);
    try {
      await api.delete(`/operators/activities/${activityId}`);
      await fetchDetail();
      onActivityChanged?.();
    } catch (err) {
      console.error("Error eliminando actividad:", err);
      alert("No se pudo eliminar la actividad");
    } finally {
      setDeletingId(null);
    }
  };

  const chartData = data
    ? {
        labels: data.diario.map((d) => d.fecha.slice(8, 10)),
        datasets: [
          {
            label: "Producción diaria",
            data: data.diario.map((d) => d.cantidad_producto_principal),
            backgroundColor: "rgba(99,102,241,0.5)",
            borderRadius: 4,
          },
        ],
      }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: "rgba(255,255,255,0.35)", font: { size: 10 } } },
      y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "rgba(255,255,255,0.35)", font: { size: 10 } } },
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
        .odm-close { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(255,255,255,0.7); }
        .odm-section { margin-bottom: 18px; }
        .odm-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: rgba(165,180,252,0.85); margin-bottom: 8px; }
        .odm-explicacion { font-size: 12px; line-height: 1.5; color: rgba(255,255,255,0.55); background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 10px 12px; }
        .odm-resumen-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .odm-resumen-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 8px 10px; }
        .odm-resumen-label { font-size: 10px; color: rgba(255,255,255,0.35); }
        .odm-resumen-value { font-size: 13px; font-weight: 600; color: white; }
        .odm-act-row { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; padding: 7px 10px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); margin-bottom: 6px; }
        .odm-act-empty { font-size: 12px; color: rgba(255,255,255,0.3); text-align: center; padding: 12px 0; }
      `}</style>
      <div className="odm-panel" onClick={(e) => e.stopPropagation()}>
        <div className="odm-header">
          <span className="odm-title">{data ? data.name : "Detalle del operario"} — {monthLabel}</span>
          <button className="odm-close" onClick={onClose} type="button"><FiX size={15} /></button>
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
                  <div className="odm-resumen-label">Producto principal</div>
                  <div className="odm-resumen-value">{data.producto_principal || "—"}</div>
                </div>
                <div className="odm-resumen-item">
                  <div className="odm-resumen-label">Días trabajados</div>
                  <div className="odm-resumen-value">{data.resumen.dias_trabajados}</div>
                </div>
                <div className="odm-resumen-item">
                  <div className="odm-resumen-label">Producción / hora</div>
                  <div className="odm-resumen-value">
                    {data.resumen.produccion_por_hora !== null ? data.resumen.produccion_por_hora.toFixed(2) : "—"}
                  </div>
                </div>
                <div className="odm-resumen-item">
                  <div className="odm-resumen-label">Línea base del producto</div>
                  <div className="odm-resumen-value">
                    {data.resumen.linea_base_historica !== null ? data.resumen.linea_base_historica.toFixed(2) : "—"}
                  </div>
                </div>
                <div className="odm-resumen-item">
                  <div className="odm-resumen-label">Horas efectivas del mes</div>
                  <div className="odm-resumen-value">{data.resumen.horas_efectivas}h</div>
                </div>
                <div className="odm-resumen-item">
                  <div className="odm-resumen-label">Bono</div>
                  <div className="odm-resumen-value">{data.resumen.bono ? "Sí" : "No"}</div>
                </div>
              </div>
            </div>

            <div className="odm-section">
              <div className="odm-section-title">Picos de producción por fecha</div>
              {data.diario.length === 0 ? (
                <div className="odm-act-empty">Sin registros este mes.</div>
              ) : (
                <div style={{ height: 200 }}>
                  {chartData && <Bar data={chartData} options={chartOptions} />}
                </div>
              )}
            </div>

            <div className="odm-section">
              <div className="odm-section-title">Otras actividades registradas</div>
              {data.actividades.length === 0 ? (
                <div className="odm-act-empty">No se han registrado otras actividades este mes.</div>
              ) : (
                data.actividades.map((a) => (
                  <div className="odm-act-row" key={a.id}>
                    <span>{a.fecha}</span>
                    <span>{a.horas}h</span>
                    <span style={{ color: "rgba(255,255,255,0.4)", flex: 1 }}>{a.nota || "—"}</span>
                    <button
                      onClick={() => handleDeleteActivity(a.id)}
                      disabled={deletingId === a.id}
                      type="button"
                      style={{
                        background: "rgba(248,113,113,0.12)",
                        border: "1px solid rgba(248,113,113,0.3)",
                        color: "#FCA5A5",
                        borderRadius: 6,
                        width: 24,
                        height: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                      title="Eliminar actividad"
                    >
                      <FiTrash2 size={12} />
                    </button>
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

export default OperatorDetailModal;