import { useState, useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import { FiCamera, FiEye } from "react-icons/fi";
import { api } from "../services/http";

export interface DriverPerformance {
  driver_id: number;
  name: string;
  photo_url: string | null;
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
  onChanged?: () => void;
  onViewDetail?: (driverId: number) => void;
}

const DriverPerformanceCard: React.FC<Props> = ({ dr, monthLabel, onChanged, onViewDetail }) => {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const info = CLASIFICACION_INFO[dr.clasificacion] || CLASIFICACION_INFO.sin_datos;
  const pct = dr.ratio !== null ? Math.round(dr.ratio * 100) : null;
  const pctRing = pct !== null ? Math.min(pct, 100) : 0;

  const handlePhotoClick = () => fileRef.current?.click();

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("photo", file);
    setUploading(true);
    try {
      await api.post(`/drivers/${dr.driver_id}/photo`, formData, {
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
      <div className="opc-top">
        <div className="opc-avatar-wrap" onClick={handlePhotoClick} title="Cambiar foto">
          {dr.photo_url ? (
            <img src={dr.photo_url} alt={dr.name} className="opc-avatar-img" />
          ) : (
            <div className="opc-avatar-placeholder">{dr.name.charAt(0).toUpperCase()}</div>
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

      {uploading && <div className="opc-uploading">Subiendo foto…</div>}

      {onViewDetail && (
        <div style={{ display: "flex", gap: 6, width: "100%", marginTop: 4 }}>
          <button className="opc-activity-btn" onClick={() => onViewDetail(dr.driver_id)} type="button" style={{ flex: 1 }}>
            <FiEye size={12} /> Ver detalle
          </button>
        </div>
      )}
    </div>
  );
};

export default DriverPerformanceCard;