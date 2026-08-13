import { useState, useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import { FiCamera, FiClock } from "react-icons/fi";
import { api } from "../services/http";

export interface OperatorPerformance {
  operator_id: number;
  name: string;
  photo_url: string | null;
  unidad: string | null;
  cantidad_mes: number;
  dias_trabajados: number;
  horas_efectivas: number;
  produccion_por_hora: number | null;
  linea_base_historica: number | null;
  linea_base_fuente: "historica" | "producto" | "inicial" | null;
  ratio: number | null;
  clasificacion: "muy_alta" | "alta" | "regular" | "baja" | "muy_baja" | "sin_datos";
  bono: boolean;
  percentil: number | null;
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

interface Props {
  op: OperatorPerformance;
  monthLabel: string;
  onChanged?: () => void;
}

const OperatorPerformanceCard: React.FC<Props> = ({ op, monthLabel, onChanged }) => {
  const [uploading, setUploading] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [actDate, setActDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [actHours, setActHours] = useState<string>("");
  const [actNote, setActNote] = useState<string>("");
  const [savingActivity, setSavingActivity] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const info = CLASIFICACION_INFO[op.clasificacion] || CLASIFICACION_INFO.sin_datos;
  // El texto del centro muestra el porcentaje REAL (puede superar 100%).
  const pctDisplay = op.ratio !== null ? Math.round(op.ratio * 100) : null;
  // El relleno del anillo se calcula sobre una escala de 0%-100%: 
  const pctRing = op.ratio !== null ? Math.min(op.ratio * 100, 100) : 0;

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

  const handlePhotoClick = () => fileRef.current?.click();

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("photo", file);
    setUploading(true);
    try {
      await api.post(`/operators/${op.operator_id}/photo`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChanged?.();
    } catch (err) {
      console.error("Error subiendo foto:", err);
      alert("No se pudo subir la foto");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveActivity = async () => {
    if (!actHours || Number(actHours) <= 0) {
      alert("Ingresa una cantidad de horas válida");
      return;
    }
    setSavingActivity(true);
    try {
      await api.post(`/operators/${op.operator_id}/activities`, {
        fecha: actDate,
        horas: Number(actHours),
        nota: actNote,
      });
      setShowActivityForm(false);
      setActHours("");
      setActNote("");
      onChanged?.();
    } catch (err) {
      console.error("Error registrando actividad:", err);
      alert("No se pudo registrar la actividad");
    } finally {
      setSavingActivity(false);
    }
  };

  return (
    <div className="opc-card">
      <div className="opc-top">
        <div className="opc-avatar-wrap" onClick={handlePhotoClick} title="Cambiar foto">
          {op.photo_url ? (
            <img src={op.photo_url} alt={op.name} className="opc-avatar-img" />
          ) : (
            <div className="opc-avatar-placeholder">{op.name.charAt(0).toUpperCase()}</div>
          )}
          <div className="opc-avatar-edit">
            <FiCamera size={11} />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePhotoChange}
          />
        </div>

        <div className="opc-chart-wrap">
          <Doughnut data={data} options={options} />
          <div className="opc-chart-center">
            <span style={{ color: info.color }}>
              {pctDisplay !== null ? `${pctDisplay}%` : "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="opc-name">{op.name}</div>
      <div className="opc-month">{monthLabel}</div>

      <div className="opc-badge" style={{ color: info.color, borderColor: `${info.color}55`, background: `${info.color}18` }}>
        {info.label}
      </div>

      <div className="opc-bono">
        {op.bono ? "✓ Merece bono de producción" : "Sin bono este mes"}
      </div>

      {op.linea_base_fuente && op.linea_base_fuente !== "historica" && (
        <div className="opc-source">
          {op.linea_base_fuente === "producto"
            ? "Comparado con el histórico de este producto (sin historial propio aún)"
            : "Primer registro de este producto — línea base inicial"}
        </div>
      )}
      {op.mes_en_curso && (
        <div className="opc-source">Mes en curso — el bono puede variar</div>
      )}

      {uploading && <div className="opc-uploading">Subiendo foto…</div>}

      <button className="opc-activity-btn" onClick={() => setShowActivityForm((s) => !s)} type="button">
        <FiClock size={12} /> Registrar otra actividad
      </button>

      {showActivityForm && (
        <div className="opc-activity-form">
          <input type="date" value={actDate} onChange={(e) => setActDate(e.target.value)} className="opc-input" />
          <input
            type="number"
            min={0}
            step={0.5}
            placeholder="Horas"
            value={actHours}
            onChange={(e) => setActHours(e.target.value)}
            className="opc-input"
          />
          <input
            type="text"
            placeholder="Motivo (opcional)"
            value={actNote}
            onChange={(e) => setActNote(e.target.value)}
            className="opc-input"
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button className="opc-save-btn" onClick={saveActivity} disabled={savingActivity} type="button">
              {savingActivity ? "Guardando…" : "Guardar"}
            </button>
            <button className="opc-cancel-btn" onClick={() => setShowActivityForm(false)} type="button">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorPerformanceCard;