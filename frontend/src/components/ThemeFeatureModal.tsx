import { useEffect, useState, type CSSProperties } from "react";
import { FiX, FiChevronLeft, FiChevronRight, FiSun, FiMoon } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";

const STORAGE_LAST_SHOWN = "theme_feature_modal_last_shown";
const STORAGE_END_DATE = "theme_feature_modal_end_date";

function todayStr(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  const local = new Date(now.getTime() - offsetMs);
  return local.toISOString().slice(0, 10);
}

function computeEndDate(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  const local = new Date(now.getTime() - offsetMs);
  const day = local.getDay(); // 0 domingo ... 6 sábado
  const daysUntilMonday = (1 - day + 7) % 7; // si hoy es lunes, 0
  local.setDate(local.getDate() + daysUntilMonday);
  return local.toISOString().slice(0, 10);
}

const slides = [
  {
    title: "Desde el inicio",
    desc: "Toca el ícono de sol/luna en la barra superior de la página de inicio, junto a los botones de acceso.",
  },
  {
    title: "Desde tu perfil",
    desc: "Abre el menú de tu usuario (arriba a la derecha) y elige \"Modo claro\" o \"Modo oscuro\".",
  },
  {
    title: "Desde el menú lateral",
    desc: "Abre el menú (ícono ☰) y encuentra el botón de tema al final del panel.",
  },
];

const MockHome = ({ isDark }: { isDark: boolean }) => {
  const mockIcon = isDark ? "rgba(255,255,255,0.85)" : "#0F172A";
  return (
    <div className="tfm-mock-navbar">
      <span className="tfm-mock-logo">🚚 SignoApp</span>
      <div className="tfm-mock-actions">
        <div className="tfm-mock-toggle tfm-pulse">{isDark ? <FiSun size={11} color={mockIcon} /> : <FiMoon size={11} color={mockIcon} />}</div>
        <span className="tfm-mock-pill">Ingresar</span>
        <span className="tfm-mock-pill solid">Registro</span>
      </div>
    </div>
  );
};

const MockNavbarUser = ({ isDark }: { isDark: boolean }) => {
  const mockIcon = isDark ? "rgba(255,255,255,0.85)" : "#0F172A";
  return (
    <>
      <div className="tfm-mock-navbar">
        <span className="tfm-mock-menu-icon">☰</span>
        <span className="tfm-mock-logo">🚚 SignoApp</span>
        <span className="tfm-mock-user-chip">🙂 Usuario ▾</span>
      </div>
      <div className="tfm-mock-dropdown">
        <div className="tfm-mock-drop-item">Editar perfil</div>
        <div className="tfm-mock-drop-item tfm-pulse-row">
          <span>{isDark ? "Modo claro" : "Modo oscuro"}</span>
          {isDark ? <FiSun size={11} color={mockIcon} /> : <FiMoon size={11} color={mockIcon} />}
        </div>
        <div className="tfm-mock-drop-item danger">Cerrar sesión</div>
      </div>
    </>
  );
};

const MockSidebar = ({ isDark }: { isDark: boolean }) => {
  const mockIcon = isDark ? "rgba(255,255,255,0.85)" : "#0F172A";
  return (
    <div className="tfm-mock-sidebar">
      <div className="tfm-mock-sidebar-header">
        <span>Menú</span>
        <FiX size={11} color={mockIcon} />
      </div>
      <div className="tfm-mock-sidebar-row" />
      <div className="tfm-mock-sidebar-row" />
      <div className="tfm-mock-sidebar-row" style={{ width: "70%" }} />
      <div className="tfm-mock-sidebar-footer tfm-pulse-row">
        {isDark ? <FiMoon size={11} color={mockIcon} /> : <FiSun size={11} color={mockIcon} />}
        <span>{isDark ? "Modo oscuro" : "Modo claro"}</span>
      </div>
    </div>
  );
};

const ThemeFeatureModal = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const iconMuted = isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)";
  const iconStrong = isDark ? "#FFFFFF" : "#0F172A";
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    try {
      let endDate = localStorage.getItem(STORAGE_END_DATE);
      if (!endDate) {
        endDate = computeEndDate();
        localStorage.setItem(STORAGE_END_DATE, endDate);
      }
      const today = todayStr();
      const lastShown = localStorage.getItem(STORAGE_LAST_SHOWN);
      if (today <= endDate && lastShown !== today) {
        setVisible(true);
      }
    } catch {
      // localStorage no disponible (modo privado, etc.) — simplemente no mostramos el modal.
    }
    // Solo se evalúa una vez, al montar la app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      setSlide((s) => (s + 1) % slides.length);
    }, 4000);
    return () => clearInterval(id);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const close = () => {
    try {
      localStorage.setItem(STORAGE_LAST_SHOWN, todayStr());
    } catch {
      // Si falla el guardado, el modal podría reaparecer — no es crítico.
    }
    setVisible(false);
  };

  if (!visible) return null;

  const goPrev = () => setSlide((s) => (s - 1 + slides.length) % slides.length);
  const goNext = () => setSlide((s) => (s + 1) % slides.length);

  const modalStyle = {
    background: isDark ? "#0B0F1A" : "#FFFFFF",
    border: isDark ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(99,102,241,0.18)",
    boxShadow: isDark ? "0 24px 60px rgba(0,0,0,0.6)" : "0 24px 60px rgba(15,23,42,0.18)",
    "--tfm-text": isDark ? "#FFFFFF" : "#0F172A",
    "--tfm-text-muted": isDark ? "rgba(255,255,255,0.55)" : "rgba(15,23,42,0.55)",
    "--tfm-bg-elev": isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
    "--tfm-border": isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.1)",
    "--tfm-mock-bg": isDark ? "#05070C" : "#F4F6FD",
    "--tfm-mock-surface": isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
    "--tfm-mock-border": isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)",
    "--tfm-mock-text": isDark ? "rgba(255,255,255,0.85)" : "#0F172A",
    "--tfm-mock-text-muted": isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.45)",
    "--tfm-danger": isDark ? "#F87171" : "#DC2626",
  } as CSSProperties;

  return (
    <div className="tfm-overlay" onClick={close}>
      <style>{`
        .tfm-overlay {
          position: fixed; inset: 0; z-index: 20000;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: tfm-fade-in .2s ease both;
        }
        @keyframes tfm-fade-in { from { opacity: 0; } to { opacity: 1; } }

        .tfm-modal {
          width: 100%;
          max-width: 460px;
          border-radius: 20px;
          padding: 22px 22px 20px;
          box-sizing: border-box;
          font-family: 'DM Sans', sans-serif;
          animation: tfm-pop .3s cubic-bezier(0.34,1.56,0.64,1) both;
          max-height: 92vh;
          overflow-y: auto;
        }
        @keyframes tfm-pop {
          from { opacity: 0; transform: scale(0.94) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .tfm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .tfm-badge {
          font-size: 11px; font-weight: 700; letter-spacing: .04em;
          color: #818CF8; background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.3);
          padding: 3px 10px; border-radius: 999px;
        }
        .tfm-close {
          width: 28px; height: 28px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--tfm-border); background: var(--tfm-bg-elev);
          color: var(--tfm-text-muted); cursor: pointer; transition: color .15s;
          padding: 0;
        }
        .tfm-close:hover { color: var(--tfm-text); }
        .tfm-close svg {
          display: block !important;
          stroke: currentColor !important;
          fill: none !important;
          width: 16px !important;
          height: 16px !important;
        }

        .tfm-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(18px, 4.5vw, 22px);
          font-weight: 800;
          color: var(--tfm-text);
          margin: 4px 0 6px;
        }
        .tfm-desc { font-size: 13px; line-height: 1.55; color: var(--tfm-text-muted); margin: 0 0 18px; }
        .tfm-desc strong { color: var(--tfm-text); }

        .tfm-carousel { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
        .tfm-arrow {
          flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--tfm-border); background: var(--tfm-bg-elev);
          color: var(--tfm-text-muted); cursor: pointer; transition: all .15s;
          padding: 0;
        }
        .tfm-arrow:hover { color: var(--tfm-text); border-color: #818CF8; }
        .tfm-arrow svg {
          display: block !important;
          stroke: currentColor !important;
          fill: none !important;
          width: 16px !important;
          height: 16px !important;
        }

        .tfm-slide-frame {
          flex: 1; min-width: 0;
          border-radius: 14px; overflow: hidden;
          background: var(--tfm-mock-bg);
          border: 1px solid var(--tfm-mock-border);
          padding: 14px;
        }

        .tfm-mock-navbar {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          background: var(--tfm-mock-surface);
          border: 1px solid var(--tfm-mock-border);
          border-radius: 10px; padding: 8px 10px; margin-bottom: 10px;
        }
        .tfm-mock-logo { font-size: 11px; font-weight: 700; color: var(--tfm-mock-text); white-space: nowrap; }
        .tfm-mock-actions { display: flex; align-items: center; gap: 6px; }
        .tfm-mock-pill {
          font-size: 9px; padding: 4px 8px; border-radius: 999px;
          border: 1px solid var(--tfm-mock-border); color: var(--tfm-mock-text-muted);
          white-space: nowrap;
        }
        .tfm-mock-pill.solid { background: #4F46E5; color: #fff; border-color: transparent; }

        .tfm-mock-toggle {
          width: 22px; height: 22px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--tfm-mock-border); color: var(--tfm-mock-text);
          position: relative; flex-shrink: 0;
        }
        .tfm-mock-toggle svg {
          display: block !important;
          stroke: currentColor !important;
          fill: none !important;
          width: 11px !important;
          height: 11px !important;
        }
        .tfm-pulse::before {
          content: ''; position: absolute; inset: -5px; border-radius: 50%;
          border: 2px solid #818CF8; animation: tfm-pulse-ring 1.8s ease-out infinite;
        }
        @keyframes tfm-pulse-ring {
          0% { transform: scale(0.9); opacity: 0.8; }
          70% { transform: scale(1.5); opacity: 0; }
          100% { opacity: 0; }
        }

        .tfm-mock-menu-icon {
          width: 20px; height: 20px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--tfm-mock-border); color: var(--tfm-mock-text-muted); font-size: 10px;
        }
        .tfm-mock-user-chip {
          font-size: 9px; padding: 4px 8px; border-radius: 999px;
          border: 1px solid var(--tfm-mock-border); color: var(--tfm-mock-text);
          background: var(--tfm-mock-bg); white-space: nowrap;
        }

        .tfm-mock-dropdown {
          background: var(--tfm-mock-surface);
          border: 1px solid var(--tfm-mock-border);
          border-radius: 10px; overflow: hidden;
          margin-left: auto; max-width: 160px;
        }
        .tfm-mock-drop-item {
          font-size: 9.5px; padding: 7px 10px;
          color: var(--tfm-mock-text-muted);
          border-bottom: 1px solid var(--tfm-mock-border);
          display: flex; align-items: center; justify-content: space-between; gap: 6px;
        }
        .tfm-mock-drop-item:last-child { border-bottom: none; }
        .tfm-mock-drop-item.danger { color: var(--tfm-danger); }
        .tfm-mock-drop-item.tfm-pulse-row { color: var(--tfm-mock-text); font-weight: 600; position: relative; }
        .tfm-mock-drop-item svg {
          display: block !important;
          stroke: currentColor !important;
          fill: none !important;
          width: 11px !important;
          height: 11px !important;
          flex-shrink: 0;
        }
        .tfm-mock-drop-item.tfm-pulse-row::after {
          content: ''; position: absolute; inset: 2px; border-radius: 6px;
          border: 1.5px solid #818CF8; animation: tfm-pulse-ring 1.8s ease-out infinite;
          pointer-events: none;
        }

        .tfm-mock-sidebar {
          background: var(--tfm-mock-surface);
          border: 1px solid var(--tfm-mock-border);
          border-radius: 10px; overflow: hidden;
          max-width: 220px; margin: 0 auto;
        }
        .tfm-mock-sidebar-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 10px; font-size: 10px; font-weight: 700; color: var(--tfm-mock-text);
          border-bottom: 1px solid var(--tfm-mock-border);
        }
        .tfm-mock-sidebar-row {
          height: 8px; margin: 8px 10px; border-radius: 5px;
          background: var(--tfm-mock-border); opacity: .6;
        }
        .tfm-mock-sidebar-footer {
          margin-top: 6px; padding: 8px 10px;
          font-size: 9.5px; font-weight: 600; color: var(--tfm-mock-text);
          border-top: 1px solid var(--tfm-mock-border);
          display: flex; align-items: center; justify-content: center; gap: 6px;
          position: relative;
        }
        .tfm-mock-sidebar-footer.tfm-pulse-row::after {
          content: ''; position: absolute; inset: 3px; border-radius: 6px;
          border: 1.5px solid #818CF8; animation: tfm-pulse-ring 1.8s ease-out infinite;
          pointer-events: none;
        }
        .tfm-mock-sidebar-footer svg {
          display: block !important;
          stroke: currentColor !important;
          fill: none !important;
          width: 11px !important;
          height: 11px !important;
          flex-shrink: 0;
        }

        .tfm-slide-caption { text-align: center; margin-bottom: 14px; }
        .tfm-slide-caption h3 { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; color: var(--tfm-text); margin: 0 0 4px; }
        .tfm-slide-caption p { font-size: 12px; color: var(--tfm-text-muted); margin: 0; line-height: 1.5; }

        .tfm-dots { display: flex; justify-content: center; gap: 6px; margin-bottom: 18px; }
        .tfm-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--tfm-border); border: none; cursor: pointer; padding: 0; transition: all .2s; }
        .tfm-dot.active { width: 18px; border-radius: 4px; background: #6366F1; }

        .tfm-footer { display: flex; flex-wrap: wrap; gap: 10px; }
        .tfm-btn-ghost {
          flex: 1; min-width: 160px;
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          padding: 11px 14px; border-radius: 11px; font-size: 13px; font-weight: 600;
          border: 1px solid var(--tfm-border); background: var(--tfm-bg-elev); color: var(--tfm-text);
          cursor: pointer; transition: all .15s; font-family: 'DM Sans', sans-serif;
        }
        .tfm-btn-ghost:hover { border-color: #818CF8; }
        .tfm-btn-primary {
          flex: 1; min-width: 120px;
          display: inline-flex; align-items: center; justify-content: center;
          padding: 11px 14px; border-radius: 11px; font-size: 13px; font-weight: 700;
          border: none; background: linear-gradient(135deg, #4F46E5, #6366F1);
          box-shadow: 0 4px 16px rgba(99,102,241,0.35); color: #fff;
          cursor: pointer; transition: all .15s; font-family: 'DM Sans', sans-serif;
        }
        .tfm-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(99,102,241,0.45); }
        .tfm-btn-ghost svg {
          display: block !important;
          stroke: currentColor !important;
          fill: none !important;
          width: 14px !important;
          height: 14px !important;
          flex-shrink: 0;
        }

        @media (max-width: 380px) {
          .tfm-modal { padding: 18px 16px 16px; }
          .tfm-footer { flex-direction: column; }
        }
      `}</style>

      <div className="tfm-modal" onClick={(e) => e.stopPropagation()} style={modalStyle}>
        <div className="tfm-header">
          <span className="tfm-badge">✨ Novedad</span>
         <button className="tfm-close" onClick={close} aria-label="Cerrar" type="button">
            <FiX size={16} color={iconMuted} />
          </button>
        </div>

        <h2 className="tfm-title">Elige el estilo de SignoApp</h2>
        <p className="tfm-desc">
          Ahora puedes cambiar entre <strong>modo oscuro</strong> y <strong>modo claro</strong> cuando quieras.
          Aquí te mostramos dónde encontrar el botón:
        </p>

        <div className="tfm-carousel">
          <button className="tfm-arrow" onClick={goPrev} aria-label="Anterior" type="button">
            <FiChevronLeft size={16} color={iconMuted} />
          </button>

          <div className="tfm-slide-frame">
            {slide === 0 && <MockHome isDark={isDark} />}
            {slide === 1 && <MockNavbarUser isDark={isDark} />}
            {slide === 2 && <MockSidebar isDark={isDark} />}
          </div>

          <button className="tfm-arrow" onClick={goNext} aria-label="Siguiente" type="button">
            <FiChevronRight size={16} color={iconMuted} />
          </button>
        </div>

        <div className="tfm-slide-caption">
          <h3>{slides[slide].title}</h3>
          <p>{slides[slide].desc}</p>
        </div>

        <div className="tfm-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`tfm-dot ${i === slide ? "active" : ""}`}
              onClick={() => setSlide(i)}
              aria-label={`Ir a la imagen ${i + 1}`}
              type="button"
            />
          ))}
        </div>

        <div className="tfm-footer">
          <button className="tfm-btn-ghost" onClick={toggleTheme} type="button">
            {isDark ? <FiSun size={14} color={iconStrong} /> : <FiMoon size={14} color={iconStrong} />}
            Probar {isDark ? "modo claro" : "modo oscuro"}
          </button>
          <button className="tfm-btn-primary" onClick={close} type="button">
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeFeatureModal;