import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import { FiX, FiTrash2, FiEdit2 } from "react-icons/fi";
import { api } from "../services/http";
import { useTheme } from "../context/ThemeContext";

interface DiaDetalle {
  fecha: string;
  cantidad_producto_principal: number;
  cantidad_total_dia: number;
  productos_dia: { nombre: string; cantidad: number }[];
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

interface DetalleUnidad {
  nombre: string;
  unidad: string | null;
  cantidad: number;
  horas: number;
  produccion_por_hora: number;
  linea_base: number | null;
  linea_base_fuente: "historica" | "producto" | "pares_mes" | "inicial" | null;
  linea_base_fecha: string | null;
  linea_base_operario: string | null;
  linea_base_cantidad: number | null;
  linea_base_horas: number | null;
  ratio: number | null;
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
    detalle_unidades: DetalleUnidad[];
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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const [editFecha, setEditFecha] = useState<string>("");
  const [editHoras, setEditHoras] = useState<string>("");
  const [editNota, setEditNota] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);
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

  const startEditActivity = (a: Actividad) => {
    setEditingActivityId(a.id);
    setEditFecha(a.fecha);
    setEditHoras(String(a.horas));
    setEditNota(a.nota || "");
  };

  const cancelEditActivity = () => {
    setEditingActivityId(null);
    setEditFecha("");
    setEditHoras("");
    setEditNota("");
  };

  const saveEditActivity = async () => {
    if (!editingActivityId) return;
    if (!editHoras || Number(editHoras) <= 0) {
      alert("Ingresa una cantidad de horas válida");
      return;
    }
    setSavingEdit(true);
    try {
      await api.put(`/operators/activities/${editingActivityId}`, {
        fecha: editFecha,
        horas: Number(editHoras),
        nota: editNota,
      });
      cancelEditActivity();
      await fetchDetail();
      onActivityChanged?.();
    } catch (err) {
      console.error("Error actualizando actividad:", err);
      alert("No se pudo actualizar la actividad");
    } finally {
      setSavingEdit(false);
    }
  };

  const CHART_PALETTE = [
    "rgba(99,102,241,0.8)",   // índigo — reservado para el producto principal
    "rgba(52,211,153,0.75)",  // verde
    "rgba(96,165,250,0.75)",  // azul
    "rgba(251,191,36,0.75)",  // amarillo
    "rgba(248,113,113,0.75)", // rojo
    "rgba(232,121,249,0.75)", // fucsia
    "rgba(45,212,191,0.75)",  // teal
    "rgba(251,146,60,0.75)",  // naranjo
  ];

  const chartData = (() => {
    if (!data || data.diario.length === 0) return null;

    // Nombres únicos de producto que aparecen en el mes; el principal va primero
    // para que siempre tenga el mismo color índigo.
    const nombresSet = new Set<string>();
    data.diario.forEach((d) => d.productos_dia.forEach((p) => nombresSet.add(p.nombre)));
    const otrosNombres = Array.from(nombresSet)
      .filter((n) => n !== data.producto_principal)
      .sort();
    const ordenNombres = data.producto_principal
      ? [data.producto_principal, ...otrosNombres]
      : otrosNombres;

    return {
      labels: data.diario.map((d) => d.fecha.slice(8, 10)),
      datasets: ordenNombres.map((nombre, i) => ({
        label: nombre,
        data: data.diario.map(
          (d) => d.productos_dia.find((p) => p.nombre === nombre)?.cantidad || 0
        ),
        backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length],
        borderRadius: 4,
        stack: "total",
      })),
    };
  })();

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
      y: { stacked: true, grid: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.08)" }, ticks: { color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.5)", font: { size: 10 } } },
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
        .odm-close svg, .odm-icon-btn svg { display: block !important; visibility: visible !important; opacity: 1 !important; width: 16px !important; height: 16px !important; min-width: 16px !important; min-height: 16px !important; stroke: currentColor !important; stroke-width: 2 !important; fill: none !important; }
        .odm-section { margin-bottom: 18px; }
        .odm-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: rgba(165,180,252,0.85); margin-bottom: 8px; }
        .odm-explicacion { font-size: 12px; line-height: 1.5; color: rgba(255,255,255,0.55); background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 10px 12px; }
        .odm-resumen-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .odm-resumen-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 8px 10px; }
        .odm-resumen-label { font-size: 10px; color: rgba(255,255,255,0.35); }
        .odm-resumen-value { font-size: 13px; font-weight: 600; color: white; }
        .odm-act-row { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; padding: 7px 10px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); margin-bottom: 6px; }
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
        body[data-theme="light"] .odm-act-row {
          background: rgba(15,23,42,0.03);
          border: 1px solid rgba(15,23,42,0.08);
        }
        body[data-theme="light"] .odm-act-empty {
          color: rgba(15,23,42,0.4);
        }
      `}</style>
      <div className="odm-panel" onClick={(e) => e.stopPropagation()}>
        <div className="odm-header">
          <span className="odm-title">{data ? data.name : "Detalle del operario"} — {monthLabel}</span>
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
              <div className="odm-section-title">Detalle por producto (auditoría del cálculo)</div>
              {data.resumen.detalle_unidades.length === 0 ? (
                <div className="odm-act-empty">Sin productos evaluados este mes.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {data.resumen.detalle_unidades.map((d, i) => {
                    const fuenteLabel =
                      d.linea_base_fuente === "producto"
                        ? "Histórico del producto"
                        : d.linea_base_fuente === "pares_mes"
                        ? "Compañeros este mes"
                        : d.linea_base_fuente === "historica"
                        ? "Historial propio"
                        : d.linea_base_fuente === "inicial"
                        ? "Primer registro (sin comparación)"
                        : "—";
                    return (
                      <div
                        key={i}
                        style={{
                          background: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                          border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(15,23,42,0.08)",
                          borderRadius: 10,
                          padding: "8px 10px",
                          fontSize: 12,
                        }}
                      >
                        <div style={{ fontWeight: 600, color: isDark ? "white" : "#0F172A", marginBottom: 4 }}>{d.nombre}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, color: isDark ? "rgba(255,255,255,0.55)" : "rgba(15,23,42,0.6)" }}>
                          <span>Cant: {d.cantidad} {d.unidad || ""}</span>
                          <span>Horas: {d.horas}h</span>
                          <span>Prod/h: {d.produccion_por_hora}</span>
                          <span>Línea base: {d.linea_base ?? "—"}</span>
                          <span>Fuente: {fuenteLabel}</span>
                          <span style={{ color: isDark ? "white" : "#0F172A", fontWeight: 600 }}>
                            Ratio: {d.ratio !== null ? `${Math.round(d.ratio * 100)}%` : "—"}
                          </span>
                        </div>
                        {(d.linea_base_fecha || d.linea_base_operario) && (
                          <div style={{ marginTop: 6, fontSize: 11, color: "rgba(165,180,252,0.75)", lineHeight: 1.5 }}>
                            Récord establecido {d.linea_base_operario ? `por ${d.linea_base_operario}` : ""}
                            {d.linea_base_fecha ? ` el ${d.linea_base_fecha}` : ""}
                            {typeof d.linea_base_cantidad === "number" && typeof d.linea_base_horas === "number" && (
                              <>
                                {" "}— produjo {d.linea_base_cantidad} {d.unidad || ""} en {d.linea_base_horas}h
                                {" "}(resultado: {d.linea_base} {d.unidad || ""}/h)
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="odm-section">
              <div className="odm-section-title">Otras actividades registradas</div>
              {data.actividades.length === 0 ? (
                <div className="odm-act-empty">No se han registrado otras actividades este mes.</div>
              ) : (
                data.actividades.map((a) =>
                  editingActivityId === a.id ? (
                    <div
                      key={a.id}
                      className="odm-act-row"
                      style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}
                    >
                      <input
                        type="date"
                        value={editFecha}
                        onChange={(e) => setEditFecha(e.target.value)}
                        style={{
                          background: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
                          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(15,23,42,0.12)",
                          color: isDark ? "white" : "#0F172A",
                          borderRadius: 6,
                          padding: "5px 8px",
                          fontSize: 12,
                        }}
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={editHoras}
                        onChange={(e) => setEditHoras(e.target.value)}
                        placeholder="Horas"
                        style={{
                          background: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
                          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(15,23,42,0.12)",
                          color: isDark ? "white" : "#0F172A",
                          borderRadius: 6,
                          padding: "5px 8px",
                          fontSize: 12,
                        }}
                      />
                      <input
                        type="text"
                        value={editNota}
                        onChange={(e) => setEditNota(e.target.value)}
                        placeholder="Motivo (opcional)"
                        style={{
                          background: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
                          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(15,23,42,0.12)",
                          color: isDark ? "white" : "#0F172A",
                          borderRadius: 6,
                          padding: "5px 8px",
                          fontSize: 12,
                        }}
                      />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={saveEditActivity}
                          disabled={savingEdit}
                          type="button"
                          style={{
                            flex: 1,
                            background: "rgba(52,211,153,0.15)",
                            border: "1px solid rgba(52,211,153,0.3)",
                            color: "#6EE7B7",
                            borderRadius: 6,
                            padding: "6px 0",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {savingEdit ? "Guardando…" : "Guardar"}
                        </button>
                        <button
                          onClick={cancelEditActivity}
                          type="button"
                          style={{
                            flex: 1,
                            background: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
                            border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(15,23,42,0.12)",
                            color: isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)",
                            borderRadius: 6,
                            padding: "6px 0",
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="odm-act-row" key={a.id}>
                      <span>{a.fecha}</span>
                      <span>{a.horas}h</span>
                      <span style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.5)", flex: 1 }}>{a.nota || "—"}</span>
                      <button
                        className="odm-icon-btn"
                        onClick={() => startEditActivity(a)}
                        type="button"
                        style={{
                          background: "rgba(96,165,250,0.18)",
                          border: "1px solid rgba(96,165,250,0.65)",
                          color: "#BFDBFE",
                          borderRadius: 6,
                          width: 24,
                          height: 24,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                        title="Editar actividad"
                      >
                        <FiEdit2 size={12} />
                      </button>
                      <button
                        className="odm-icon-btn"
                        onClick={() => handleDeleteActivity(a.id)}
                        disabled={deletingId === a.id}
                        type="button"
                        style={{
                          background: "rgba(248,113,113,0.18)",
                          border: "1px solid rgba(248,113,113,0.65)",
                          color: "#FECACA",
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
                  )
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OperatorDetailModal;