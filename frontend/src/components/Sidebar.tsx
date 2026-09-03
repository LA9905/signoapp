import { useEffect, useState, useCallback } from "react";
import { FiX, FiMoon, FiSun, FiVideo, FiBarChart2, FiTruck, FiUsers, FiChevronLeft, FiChevronRight, FiChevronDown, FiPlayCircle, FiMaximize2, FiMinimize2 } from "react-icons/fi";
import { api } from "../services/http";
import { useTheme } from "../context/ThemeContext";
import OperatorPerformanceCard, { type OperatorPerformance } from "./OperatorPerformanceCard";
import DriverPerformanceCard, { type DriverPerformance } from "./DriverPerformanceCard";
import UserPerformanceCard, { type UserPerformance } from "./UserPerformanceCard";
import OperatorDetailModal from "./OperatorDetailModal";
import DriverDetailModal from "./DriverDetailModal";
import UserDetailModal from "./UserDetailModal";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const TUTORIALES: { title: string; video: string }[] = [
  { title: "Cómo agregar un producto", video: "" },
  { title: "Cómo ver el listado de productos", video: "" },
  { title: "Cómo buscar movimientos de stock por producto", video: "" },
  { title: "Cómo crear un despacho", video: "" },
  { title: "Cómo hacer seguimiento de despachos", video: "" },
  { title: "Cómo gestionar centros de costos", video: "" },
  { title: "Cómo recibir de proveedores", video: "" },
  { title: "Cómo ver recepciones registradas", video: "" },
  { title: "Cómo gestionar proveedores", video: "" },
  { title: "Cómo registrar ingreso de producción", video: "" },
  { title: "Cómo ver registros de producción", video: "" },
  { title: "Cómo gestionar operarios", video: "" },
  { title: "Cómo crear una nota de crédito", video: "" },
  { title: "Cómo hacer seguimiento de notas de crédito", video: "" },
  { title: "Cómo gestionar choferes", video: "" },
  { title: "Cómo registrar consumo interno", video: "" },
  { title: "Cómo ver registros de consumos internos", video: "" },
  { title: "Cómo ver récords de producción", video: "" },
  { title: "Cómo guardar cambios de productos", video: "" },
  { title: "Cómo hacer seguimiento de cambios de productos", video: "" },
];

const REFRESH_MS = 3 * 60 * 1000; // refresco automático, solo para secciones abiertas

type SectionKey = "production" | "drivers" | "logistics";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isLimited?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isLimited = false }) => {
  const [expanded, setExpanded] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [activeVideo, setActiveVideo] = useState<{ title: string; video: string } | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  // Cada sección arranca CERRADA: nada se pide hasta que el usuario la abre.
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    production: false,
    drivers: false,
    logistics: false,
  });

  const [operators, setOperators] = useState<OperatorPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailOperatorId, setDetailOperatorId] = useState<number | null>(null);
  const [detailDriverId, setDetailDriverId] = useState<number | null>(null);
  const [drivers, setDrivers] = useState<DriverPerformance[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [logisticsUsers, setLogisticsUsers] = useState<UserPerformance[]>([]);
  const [loadingLogistics, setLoadingLogistics] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  const fetchPerformance = useCallback(async () => {
    setLoading(true);
    try {
      const monthParam = `${year}-${String(month).padStart(2, "0")}`;
      const res = await api.get("/operators/performance", { params: { month: monthParam } });
      setOperators(res.data.operators || []);
    } catch (err) {
      console.error("Error cargando rendimiento de operarios:", err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  const fetchDriverPerformance = useCallback(async () => {
    setLoadingDrivers(true);
    try {
      const monthParam = `${year}-${String(month).padStart(2, "0")}`;
      const res = await api.get("/drivers/performance", { params: { month: monthParam } });
      setDrivers(res.data.drivers || []);
    } catch (err) {
      console.error("Error cargando rendimiento de choferes:", err);
    } finally {
      setLoadingDrivers(false);
    }
  }, [year, month]);

  const fetchLogisticsPerformance = useCallback(async () => {
    setLoadingLogistics(true);
    try {
      const monthParam = `${year}-${String(month).padStart(2, "0")}`;
      const res = await api.get("/users/performance", { params: { month: monthParam } });
      setLogisticsUsers(res.data.users || []);
    } catch (err) {
      console.error("Error cargando rendimiento de logística:", err);
    } finally {
      setLoadingLogistics(false);
    }
  }, [year, month]);

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Al abrir una sección (o cambiar el mes mientras está abierta), pide sus
  // datos. Al cerrarla, simplemente deja de pedirse — no se borra lo ya
  // cargado, así que si el usuario la vuelve a abrir sin cambiar de mes ve
  // los datos de inmediato mientras se refresca en segundo plano.
  useEffect(() => {
    if (!isOpen || !openSections.production) return;
    fetchPerformance();
  }, [isOpen, openSections.production, fetchPerformance]);

  useEffect(() => {
    if (!isOpen || !openSections.drivers) return;
    fetchDriverPerformance();
  }, [isOpen, openSections.drivers, fetchDriverPerformance]);

  useEffect(() => {
    if (!isOpen || !openSections.logistics) return;
    fetchLogisticsPerformance();
  }, [isOpen, openSections.logistics, fetchLogisticsPerformance]);

  // Refresco automático: cada tick solo pide las secciones que estén
  // abiertas en ese momento — nunca las tres a la vez si el usuario no
  // las abrió todas.
  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => {
      if (openSections.production) fetchPerformance();
      if (openSections.drivers) fetchDriverPerformance();
      if (openSections.logistics) fetchLogisticsPerformance();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [isOpen, openSections, fetchPerformance, fetchDriverPerformance, fetchLogisticsPerformance]);

  const changeMonth = (delta: number) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear += 1; }
    if (newMonth < 1) { newMonth = 12; newYear -= 1; }
    setMonth(newMonth);
    setYear(newYear);
  };

  const closeSidebar = () => {
    onClose();
    setExpanded(false);
  };

  const monthLabel = `${MESES[month - 1]} ${year}`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .sb-toggle-btn {
          position: fixed; top: 14px; left: 16px; z-index: 1200;
          display: flex; align-items: center; gap: 8px;
          height: 42px; padding: 0 16px 0 12px; border-radius: 12px;
          background: linear-gradient(135deg, rgba(79,70,229,0.9), rgba(99,102,241,0.85));
          border: 1px solid rgba(165,180,252,0.4);
          color: white; font-size: 13px; font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer; box-shadow: 0 4px 16px rgba(79,70,229,0.35);
          transition: all .15s;
        }
        .sb-toggle-btn:hover { box-shadow: 0 6px 22px rgba(79,70,229,0.5); transform: translateY(-1px); }

        .sb-backdrop {
          position: fixed; inset: 0; z-index: 1190;
          background: rgba(0,0,0,0.6); backdrop-filter: blur(2px);
        }

        .sb-panel {
          position: fixed; top: 0; left: 0; bottom: 0; z-index: 1195;
          width: min(320px, 88vw);
          background: #0B0F1A;
          border-right: 1px solid rgba(99,102,241,0.18);
          display: flex; flex-direction: column;
          font-family: 'DM Sans', sans-serif;
          color: white;
          box-shadow: 20px 0 60px rgba(0,0,0,0.5);
          overflow: hidden;
          transition: width .2s ease;
        }
        .sb-panel.expanded {
          width: min(1200px, 96vw);
        }

        .sb-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0; gap: 8px;
        }
        .sb-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 16px; }
        .sb-header-actions { display: flex; align-items: center; gap: 8px; }
        .sb-icon-btn {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          border: 1px solid transparent;
          padding: 0;
        }

        .sb-icon-btn svg {
          display: block;
          stroke: currentColor !important;
          color: currentColor !important;
        }

        .sb-icon-btn.expand {
          background: rgba(99,102,241,0.18);
          border-color: rgba(129,140,248,0.45);
          color: #A5B4FC !important;
        }

        .sb-icon-btn.expand:hover {
          background: rgba(99,102,241,0.30);
          border-color: rgba(165,180,252,0.65);
          color: #FFFFFF !important;
        }

        .sb-icon-btn.close {
          background: rgba(248,113,113,0.15);
          border-color: rgba(248,113,113,0.45);
          color: #FCA5A5 !important;
        }

        .sb-icon-btn.close:hover {
          background: rgba(248,113,113,0.28);
          border-color: rgba(248,113,113,0.65);
          color: #FFFFFF !important;
        }

        .sb-body { flex: 1; overflow-y: auto; padding: 16px; }
        .sb-panel.expanded .sb-body { padding: 24px 32px; }

        .sb-section { margin-bottom: 14px; }

        .sb-section-btn {
          width: 100%;
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 12px 14px;
          cursor: pointer;
          transition: all .15s;
        }
        .sb-section-btn:hover {
          background: rgba(99,102,241,0.1);
          border-color: rgba(99,102,241,0.3);
        }
        .sb-section-btn.open {
          background: rgba(99,102,241,0.12);
          border-color: rgba(99,102,241,0.35);
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
        }
        .sb-section-btn-label {
          display: flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
          color: rgba(165,180,252,0.85);
        }
        .sb-section-chevron {
          color: rgba(165,180,252,0.6);
          transition: transform .15s;
          display: flex;
        }
        .sb-section-chevron.open { transform: rotate(180deg); }

        .sb-section-content {
          border: 1px solid rgba(99,102,241,0.35);
          border-top: none;
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
          padding: 14px;
          background: rgba(255,255,255,0.015);
        }

        .sb-tuto-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 10px; margin-bottom: 6px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          font-size: 13px; color: rgba(255,255,255,0.65);
        }
        .sb-tuto-item span.soon {
          margin-left: auto; font-size: 10px; color: rgba(255,255,255,0.25);
          border: 1px solid rgba(255,255,255,0.12); padding: 1px 7px; border-radius: 99px;
          white-space: nowrap;
        }
        .sb-tuto-item.has-video { cursor: pointer; transition: background .15s, border-color .15s; }
        .sb-tuto-item.has-video:hover { background: rgba(99,102,241,0.12); border-color: rgba(99,102,241,0.3); }
        .sb-tuto-item span.ready {
          margin-left: auto; font-size: 10px; font-weight: 600; color: #34D399;
          border: 1px solid rgba(52,211,153,0.35); background: rgba(52,211,153,0.1);
          padding: 1px 7px; border-radius: 99px; white-space: nowrap;
        }
        .sb-panel.expanded .sb-tutoriales-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px;
        }
        .sb-panel.expanded .sb-tuto-item { margin-bottom: 0; }

        .sb-month-nav {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 14px; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 6px 8px;
          max-width: 220px;
        }
        .sb-month-nav button {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(99,102,241,0.18);
          border: 1px solid rgba(129,140,248,0.35);
          color: #A5B4FC !important;
          cursor: pointer;
          padding: 0;
        }

        .sb-month-nav button svg {
          display: block;
          stroke: currentColor !important;
          color: currentColor !important;
        }

        .sb-month-nav button:hover {
          background: rgba(99,102,241,0.32);
          border-color: rgba(165,180,252,0.55);
          color: #FFFFFF !important;
        }

        .sb-month-nav span {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.85);
        }

        .sb-month-picker {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.9);
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          outline: none;
          text-align: center;
          min-width: 120px;
          padding: 4px 2px;
        }

        .sb-month-picker::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.95;
          cursor: pointer;
        }

        .sb-month-picker::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }

        .sb-loading { text-align: center; padding: 20px 0; color: rgba(255,255,255,0.3); font-size: 12px; }
        .sb-empty { text-align: center; padding: 20px 0; color: rgba(255,255,255,0.25); font-size: 12px; }

        .sb-operators-grid { display: flex; flex-direction: column; gap: 12px; }
        .sb-panel.expanded .sb-operators-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px;
        }

        .opc-card {
          background: rgba(30,40,80,0.35); border: 1px solid rgba(99,102,241,0.15);
          border-radius: 14px; padding: 14px; display: flex; flex-direction: column; align-items: center;
          text-align: center;
        }
        .opc-top { display: flex; align-items: center; gap: 14px; width: 100%; justify-content: center; }
        .opc-avatar-wrap {
          position: relative; width: 46px; height: 46px; border-radius: 50%; cursor: pointer; flex-shrink: 0;
        }
        .opc-avatar-img { width: 46px; height: 46px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(99,102,241,0.35); }
        .opc-avatar-placeholder {
          width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          background: rgba(99,102,241,0.18); border: 2px solid rgba(99,102,241,0.35); color: #A5B4FC; font-weight: 700;
        }
        .opc-avatar-edit {
          position: absolute; bottom: -2px; right: -2px; width: 18px; height: 18px; border-radius: 50%;
          background: #4F46E5; display: flex; align-items: center; justify-content: center; color: white;
          border: 2px solid #0B0F1A;
        }
        .opc-chart-wrap { position: relative; width: 74px; height: 74px; flex-shrink: 0; }
        .opc-chart-center {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; font-family: 'Syne', sans-serif;
        }
        .opc-name { margin-top: 10px; font-size: 14px; font-weight: 600; color: white; }
        .opc-month { font-size: 11px; color: rgba(255,255,255,0.3); margin-bottom: 8px; }
        .opc-badge {
          font-size: 11px; font-weight: 700; padding: 3px 12px; border-radius: 99px; border: 1px solid;
          margin-bottom: 6px;
        }
        .opc-bono { font-size: 11px; color: rgba(255,255,255,0.45); margin-bottom: 4px; }
        .opc-source { font-size: 10px; color: rgba(255,255,255,0.3); margin-bottom: 8px; }
        .opc-uploading { font-size: 11px; color: #A5B4FC; margin-bottom: 4px; }

        .opc-activity-btn {
          display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 500;
          padding: 6px 10px; border-radius: 8px; background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); cursor: pointer;
        }
        .opc-activity-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }

        .opc-activity-form {
          margin-top: 10px; width: 100%; display: flex; flex-direction: column; gap: 6px;
        }
        .opc-input {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: white;
          border-radius: 8px; padding: 7px 9px; font-size: 12px; width: 100%; box-sizing: border-box;
        }
          
        select.opc-input option {
          background: #111827;
          color: white;
        }
        .opc-save-btn {
          flex: 1; background: rgba(52,211,153,0.15); border: 1px solid rgba(52,211,153,0.3); color: #6EE7B7;
          border-radius: 8px; padding: 6px 0; font-size: 12px; font-weight: 600; cursor: pointer;
        }
        .opc-cancel-btn {
          flex: 1; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6);
          border-radius: 8px; padding: 6px 0; font-size: 12px; cursor: pointer;
        }

        .sb-footer {
          flex-shrink: 0; padding: 14px 16px; border-top: 1px solid rgba(255,255,255,0.06);
        }
        .sb-theme-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px; border-radius: 10px; font-size: 13px; font-weight: 600;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.75); cursor: pointer; transition: all .15s;
        }
        .sb-theme-btn:hover { background: rgba(99,102,241,0.12); border-color: rgba(99,102,241,0.3); }

        .sb-video-overlay {
          position: fixed; inset: 0; z-index: 1300;
          background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        .sb-video-modal {
          width: 100%; max-width: 720px;
          background: #0B0F1A; border: 1px solid rgba(99,102,241,0.25);
          border-radius: 16px; overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6);
        }
        .sb-video-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px; font-size: 13px; font-weight: 600; color: white;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .sb-video-close {
          width: 28px; height: 28px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(248,113,113,0.15); border: 1px solid rgba(248,113,113,0.4);
          color: #FCA5A5; cursor: pointer; padding: 0; flex-shrink: 0;
        }
        .sb-video-close svg { display: block; stroke: currentColor !important; }
        .sb-video-player { width: 100%; display: block; max-height: 70vh; background: #000; }

        /* ─── Modo claro ─── */
        body[data-theme="light"] .sb-panel {
          background: #FFFFFF;
          border-right: 1px solid rgba(15,23,42,0.08);
          color: #0F172A;
        }
        body[data-theme="light"] .sb-header {
          border-bottom: 1px solid rgba(15,23,42,0.08);
        }
        body[data-theme="light"] .sb-title {
          color: #0F172A;
        }
        body[data-theme="light"] .sb-section-btn {
          background: rgba(15,23,42,0.03);
          border: 1px solid rgba(15,23,42,0.1);
        }
        body[data-theme="light"] .sb-section-btn:hover {
          background: rgba(99,102,241,0.08);
          border-color: rgba(99,102,241,0.3);
        }
        body[data-theme="light"] .sb-section-btn-label {
          color: #4338CA;
        }
        body[data-theme="light"] .sb-section-chevron {
          color: #6366F1;
        }
        body[data-theme="light"] .sb-section-content {
          background: rgba(15,23,42,0.015);
          border-color: rgba(99,102,241,0.25);
        }
        body[data-theme="light"] .opc-card {
          background: rgba(99,102,241,0.04);
          border: 1px solid rgba(99,102,241,0.15);
        }
        body[data-theme="light"] .sb-month-nav {
          background: rgba(15,23,42,0.03);
          border-color: rgba(15,23,42,0.08);
        }
        body[data-theme="light"] .sb-theme-btn {
          background: rgba(15,23,42,0.03);
          border-color: rgba(15,23,42,0.1);
          color: rgba(15,23,42,0.75);
        }
        body[data-theme="light"] .sb-backdrop {
          background: rgba(15,23,42,0.35);
        }
        body[data-theme="light"] .sb-panel {
          box-shadow: 20px 0 60px rgba(15,23,42,0.12);
        }
        body[data-theme="light"] .sb-tuto-item {
          background: rgba(15,23,42,0.03);
          border: 1px solid rgba(15,23,42,0.08);
          color: rgba(15,23,42,0.7);
        }
        body[data-theme="light"] .sb-tuto-item span.soon {
          color: rgba(15,23,42,0.35);
          border: 1px solid rgba(15,23,42,0.15);
        }
        body[data-theme="light"] .sb-tuto-item.has-video:hover {
          background: rgba(99,102,241,0.08);
          border-color: rgba(99,102,241,0.3);
        }
        body[data-theme="light"] .sb-tuto-item span.ready {
          color: #059669;
          border: 1px solid rgba(5,150,105,0.3);
          background: rgba(5,150,105,0.08);
        }
        body[data-theme="light"] .sb-video-modal {
          background: #FFFFFF;
          border: 1px solid rgba(99,102,241,0.2);
          box-shadow: 0 20px 60px rgba(15,23,42,0.2);
        }
        body[data-theme="light"] .sb-video-modal-header {
          color: #0F172A;
          border-bottom: 1px solid rgba(15,23,42,0.08);
        }
        body[data-theme="light"] .sb-loading {
          color: rgba(15,23,42,0.4);
        }
        body[data-theme="light"] .sb-empty {
          color: rgba(15,23,42,0.35);
        }
        body[data-theme="light"] .sb-month-picker {
          color: rgba(15,23,42,0.85);
        }
        body[data-theme="light"] .sb-month-picker::-webkit-calendar-picker-indicator {
          filter: none;
          opacity: 0.65;
        }
        body[data-theme="light"] .sb-month-picker::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }
        body[data-theme="light"] .opc-name {
          color: #0F172A;
        }
        body[data-theme="light"] .opc-month {
          color: rgba(15,23,42,0.4);
        }
        body[data-theme="light"] .opc-bono {
          color: rgba(15,23,42,0.55);
        }
        body[data-theme="light"] .opc-source {
          color: rgba(15,23,42,0.4);
        }
        body[data-theme="light"] .opc-input {
          background: #FFFFFF;
          border: 1px solid rgba(15,23,42,0.12);
          color: #0F172A;
        }
        body[data-theme="light"] select.opc-input option {
          background: #FFFFFF;
          color: #0F172A;
        }
        body[data-theme="light"] .opc-activity-btn {
          background: rgba(15,23,42,0.03);
          border: 1px solid rgba(15,23,42,0.1);
          color: rgba(15,23,42,0.55);
        }
        body[data-theme="light"] .opc-activity-btn:hover {
          background: rgba(15,23,42,0.06);
          color: #0F172A;
        }
        body[data-theme="light"] .opc-cancel-btn {
          background: rgba(15,23,42,0.03);
          border: 1px solid rgba(15,23,42,0.1);
          color: rgba(15,23,42,0.55);
        }
      `}</style>

      {isOpen && (
        <>
          <div className="sb-backdrop" onClick={closeSidebar} />
          <aside className={`sb-panel ${expanded ? "expanded" : ""}`}>
            <div className="sb-header">
              <span className="sb-title">Menú</span>
              <div className="sb-header-actions">
                <button
                  className="sb-icon-btn expand"
                  onClick={() => setExpanded((e) => !e)}
                  aria-label={expanded ? "Salir de pantalla completa" : "Ver en pantalla completa"}
                  title={expanded ? "Salir de pantalla completa" : "Ver en pantalla completa"}
                  type="button"
                >
                  {expanded ? <FiMinimize2 size={15} /> : <FiMaximize2 size={15} />}
                </button>
                <button className="sb-icon-btn close" onClick={closeSidebar} aria-label="Cerrar menú" type="button">
                  <FiX size={16} />
                </button>
              </div>
            </div>

            <div className="sb-body">
              <div className="sb-section">
                <div className="sb-section-title" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: "11px", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: isDark ? "rgba(165,180,252,0.85)" : "#4338CA" }}>
                  <FiVideo size={13} /> Tutoriales
                </div>
                <div className="sb-tutoriales-grid">
                  {TUTORIALES.map((t) => (
                    <div
                      className={`sb-tuto-item ${t.video ? "has-video" : ""}`}
                      key={t.title}
                      onClick={() => t.video && setActiveVideo(t)}
                      role={t.video ? "button" : undefined}
                    >
                      <FiPlayCircle size={14} />
                      {t.title}
                      {t.video ? (
                        <span className="ready">Ver video</span>
                      ) : (
                        <span className="soon">Próximamente</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {!isLimited && (
                <>
              {/* Selector de mes compartido por las 3 secciones de rendimiento */}
              <div className="sb-month-nav">
                <button onClick={() => changeMonth(-1)} type="button" aria-label="Mes anterior">
                  <FiChevronLeft size={14} />
                </button>

                <input
                  type="month"
                  className="sb-month-picker"
                  value={`${year}-${String(month).padStart(2, "0")}`}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const [selectedYear, selectedMonth] = e.target.value.split("-");
                    setYear(Number(selectedYear));
                    setMonth(Number(selectedMonth));
                  }}
                  aria-label="Seleccionar mes y año"
                />

                <button onClick={() => changeMonth(1)} type="button" aria-label="Mes siguiente">
                  <FiChevronRight size={14} />
                </button>
              </div>

              {/* ── Producción ── */}
              <div className="sb-section">
                <button
                  className={`sb-section-btn ${openSections.production ? "open" : ""}`}
                  onClick={() => toggleSection("production")}
                  type="button"
                >
                  <span className="sb-section-btn-label"><FiBarChart2 size={13} /> Rendimiento de Producción</span>
                  <span className={`sb-section-chevron ${openSections.production ? "open" : ""}`}><FiChevronDown size={16} /></span>
                </button>

                {openSections.production && (
                  <div className="sb-section-content">
                    {loading && <div className="sb-loading">Cargando rendimiento…</div>}
                    {!loading && operators.length === 0 && (
                      <div className="sb-empty">Sin datos para este mes.</div>
                    )}
                    <div className="sb-operators-grid">
                      {!loading &&
                        operators.map((op) => (
                          <OperatorPerformanceCard
                            key={op.operator_id}
                            op={op}
                            monthLabel={monthLabel}
                            onChanged={fetchPerformance}
                            onViewDetail={setDetailOperatorId}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Choferes ── */}
              <div className="sb-section">
                <button
                  className={`sb-section-btn ${openSections.drivers ? "open" : ""}`}
                  onClick={() => toggleSection("drivers")}
                  type="button"
                >
                  <span className="sb-section-btn-label"><FiTruck size={13} /> Rendimiento de Choferes</span>
                  <span className={`sb-section-chevron ${openSections.drivers ? "open" : ""}`}><FiChevronDown size={16} /></span>
                </button>

                {openSections.drivers && (
                  <div className="sb-section-content">
                    {loadingDrivers && <div className="sb-loading">Cargando rendimiento…</div>}
                    {!loadingDrivers && drivers.length === 0 && (
                      <div className="sb-empty">Sin datos para este mes.</div>
                    )}
                    <div className="sb-operators-grid">
                      {!loadingDrivers &&
                        drivers.map((dr) => (
                          <DriverPerformanceCard
                            key={dr.driver_id}
                            dr={dr}
                            monthLabel={monthLabel}
                            onChanged={fetchDriverPerformance}
                            onViewDetail={setDetailDriverId}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Logística ── */}
              <div className="sb-section">
                <button
                  className={`sb-section-btn ${openSections.logistics ? "open" : ""}`}
                  onClick={() => toggleSection("logistics")}
                  type="button"
                >
                  <span className="sb-section-btn-label"><FiUsers size={13} /> Rendimiento de Logística</span>
                  <span className={`sb-section-chevron ${openSections.logistics ? "open" : ""}`}><FiChevronDown size={16} /></span>
                </button>

                {openSections.logistics && (
                  <div className="sb-section-content">
                    {loadingLogistics && <div className="sb-loading">Cargando rendimiento…</div>}
                    {!loadingLogistics && logisticsUsers.length === 0 && (
                      <div className="sb-empty">Sin datos para este mes.</div>
                    )}
                    <div className="sb-operators-grid">
                      {!loadingLogistics &&
                        logisticsUsers.map((u) => (
                          <UserPerformanceCard
                            key={u.user_id}
                            u={u}
                            monthLabel={monthLabel}
                            onViewDetail={setDetailUserId}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </div>
                </>
              )}
            </div>

            <div className="sb-footer">
              <button className="sb-theme-btn" onClick={toggleTheme} type="button">
                {isDark ? <FiMoon size={15} /> : <FiSun size={15} />}
                {isDark ? "Modo oscuro" : "Modo claro"}
              </button>
            </div>

            {detailOperatorId !== null && (
              <OperatorDetailModal
                operatorId={detailOperatorId}
                year={year}
                month={month}
                monthLabel={monthLabel}
                onClose={() => setDetailOperatorId(null)}
                onActivityChanged={fetchPerformance}
              />
            )}

            {detailDriverId !== null && (
              <DriverDetailModal
                driverId={detailDriverId}
                year={year}
                month={month}
                monthLabel={monthLabel}
                onClose={() => setDetailDriverId(null)}
              />
            )}

            {detailUserId !== null && (
              <UserDetailModal
                userId={detailUserId}
                year={year}
                month={month}
                monthLabel={monthLabel}
                onClose={() => setDetailUserId(null)}
              />
            )}

            {activeVideo && (
              <div className="sb-video-overlay" onClick={() => setActiveVideo(null)}>
                <div className="sb-video-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="sb-video-modal-header">
                    <span>{activeVideo.title}</span>
                    <button
                      className="sb-video-close"
                      onClick={() => setActiveVideo(null)}
                      type="button"
                      aria-label="Cerrar video"
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                  <video
                    key={activeVideo.video}
                    src={`/tutoriales/${activeVideo.video}`}
                    controls
                    autoPlay
                    className="sb-video-player"
                  />
                </div>
              </div>
            )}
          </aside>
        </>
      )}
    </>
  );
};

export default Sidebar;