import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { FiX, FiChevronLeft, FiChevronRight, FiRepeat, FiBox, FiPlay, FiSearch, FiDownload } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";

const STORAGE_LAST_SHOWN = "product_changes_tutorials_modal_last_shown";
const STORAGE_END_DATE = "product_changes_tutorials_modal_end_date";

function todayStr(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  const local = new Date(now.getTime() - offsetMs);
  return local.toISOString().slice(0, 10);
}

/** Calcula el próximo martes (si hoy es martes → el de la semana siguiente). */
function computeEndDate(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  const local = new Date(now.getTime() - offsetMs);
  const day = local.getDay(); // 0 = domingo … 2 = martes … 6 = sábado
  const daysUntilTuesday = (2 - day + 7) % 7 || 7; // si ya es martes → +7
  local.setDate(local.getDate() + daysUntilTuesday);
  return local.toISOString().slice(0, 10);
}

interface Props {
  isLimited: boolean;
  isOperatorLimited: boolean;
}

const ProductChangesTutorialsModal = ({ isLimited, isOperatorLimited }: Props) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const iconMuted = isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)";
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);

  const isNormal = !isLimited && !isOperatorLimited;
  const isDriverOnly = isLimited && !isOperatorLimited;
  const isOperatorOnly = !isLimited && isOperatorLimited;
  const isBoth = isLimited && isOperatorLimited;

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
      // localStorage no disponible
    }
    // Solo se evalúa una vez al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  // ─── Mocks ───────────────────────────────────────────────────────────────

  const MockProductChangeForm = () => (
    <div className="pctm-mock-card">
      <div className="pctm-mock-title">Cambio de Productos</div>
      <div className="pctm-mock-section">
        <div className="pctm-mock-label">Nombre del chofer / persona *</div>
        <div className="pctm-mock-input" />
        <div className="pctm-mock-label" style={{ marginTop: 8 }}>Fecha del cambio *</div>
        <div className="pctm-mock-input short" />
      </div>
      <div className="pctm-mock-section entra">
        <div className="pctm-mock-section-title entra">
          <FiBox size={10} /> Producto que trae y se queda
        </div>
        <div className="pctm-mock-input" />
        <div className="pctm-mock-row">
          <div className="pctm-mock-input tiny" />
          <div className="pctm-mock-input tiny" />
          <div className="pctm-mock-btn green">+ Agregar</div>
        </div>
      </div>
      <div className="pctm-mock-section sale">
        <div className="pctm-mock-section-title sale">
          <FiRepeat size={10} /> Producto que se lleva a cambio
        </div>
        <div className="pctm-mock-input" />
        <div className="pctm-mock-row">
          <div className="pctm-mock-input tiny" />
          <div className="pctm-mock-input tiny" />
          <div className="pctm-mock-btn green">+ Agregar</div>
        </div>
      </div>
      <div className="pctm-mock-btn primary" style={{ marginTop: 10 }}>Guardar Cambio de Producto</div>
    </div>
  );

  const MockProductChangeTracking = () => (
    <div className="pctm-mock-card">
      <div className="pctm-mock-header-row">
        <div className="pctm-mock-title">Cambios de Productos</div>
        <div className="pctm-mock-btn excel"><FiDownload size={9} /> Exportar Excel</div>
      </div>
      <div className="pctm-mock-filters">
        <div className="pctm-mock-input search"><FiSearch size={9} /> Nombre chofer/persona</div>
        <div className="pctm-mock-input search"><FiSearch size={9} /> Cliente</div>
      </div>
      <div className="pctm-mock-folio">
        <div className="pctm-mock-folio-badge">Folio# 1</div>
        <div className="pctm-mock-meta">Persona: Jose Chaucono · Cliente: novafarma</div>
        <div className="pctm-mock-chips">
          <span className="pctm-chip entra">Bolsa de Basura Negra · 10 und</span>
          <span className="pctm-chip sale">Transparente Recuperada · 10 und</span>
        </div>
      </div>
    </div>
  );

  type TutorialItem = { title: string; highlight?: boolean };

  const getTutorialsForRole = (): TutorialItem[] => {
    if (isDriverOnly) {
      return [{ title: "Cómo hacer seguimiento de despachos", highlight: true }];
    }
    if (isOperatorOnly) {
      return [
        { title: "Cómo ver registros de producción", highlight: true },
        { title: "Cómo ver récords de producción", highlight: true },
      ];
    }
    if (isBoth) {
      return [
        { title: "Cómo hacer seguimiento de despachos", highlight: true },
        { title: "Cómo ver registros de producción", highlight: true },
        { title: "Cómo ver récords de producción", highlight: true },
      ];
    }
    // normal / admin
    return [
      { title: "Cómo agregar un producto" },
      { title: "Cómo ver el listado de productos" },
      { title: "Cómo buscar movimientos de stock por producto" },
      { title: "Cómo crear un despacho" },
      { title: "Cómo hacer seguimiento de despachos", highlight: true },
      { title: "Cómo gestionar centros de costos" },
      { title: "Cómo recibir de proveedores" },
      { title: "Cómo ver recepciones registradas" },
      { title: "Cómo gestionar proveedores" },
      { title: "Cómo registrar ingreso de producción" },
      { title: "Cómo ver registros de producción", highlight: true },
      { title: "Cómo gestionar operarios" },
      { title: "Cómo crear una nota de crédito" },
      { title: "Cómo hacer seguimiento de notas de crédito" },
      { title: "Cómo gestionar choferes" },
      { title: "Cómo registrar consumo interno" },
      { title: "Cómo ver registros de consumos internos" },
      { title: "Cómo ver récords de producción", highlight: true },
      { title: "Cómo guardar cambios de productos", highlight: true },
      { title: "Cómo hacer seguimiento de cambios de productos", highlight: true },
    ];
  };

  const MockTutorials = () => {
    const items = getTutorialsForRole();
    const showAllHint = isNormal;
    return (
      <div className="pctm-mock-card tutorials">
        <div className="pctm-mock-title" style={{ marginBottom: 10 }}>
          <span style={{ opacity: 0.7, marginRight: 6 }}>▶</span> Tutoriales
        </div>
        <div className="pctm-tutorials-grid">
          {items.slice(0, showAllHint ? 8 : items.length).map((item, i) => (
            <div
              key={i}
              className={`pctm-tutorial-card ${item.highlight ? "highlight" : ""}`}
            >
              <span className="pctm-tutorial-title">{item.title}</span>
              <span className="pctm-tutorial-btn">
                <FiPlay size={8} /> Ver video
              </span>
            </div>
          ))}
        </div>
        {showAllHint && items.length > 8 && (
          <div className="pctm-more-hint">+ {items.length - 8} tutoriales más disponibles en el menú</div>
        )}
      </div>
    );
  };

  // ─── Slides ──────────────────────────────────────────────────────────────

  type SlideDef = {
    title: string;
    desc: ReactNode;
    content: ReactNode;
  };

  const slides: SlideDef[] = [];

  if (isNormal) {
    slides.push({
      title: "Nueva sección: Cambios de Productos",
      desc: (
        <>
          Ahora puedes registrar cuando un chofer o persona <strong>trae un producto</strong> (suma al stock)
          y <strong>se lleva otro a cambio</strong> (resta del stock). Ideal para canjes y devoluciones.
        </>
      ),
      content: <MockProductChangeForm />,
    });
    slides.push({
      title: "Seguimiento de Cambios de Productos",
      desc: (
        <>
          Consulta, edita, elimina y exporta a Excel todos los cambios registrados. Filtra por persona,
          cliente, usuario, producto o rango de fechas.
        </>
      ),
      content: <MockProductChangeTracking />,
    });
  }

  slides.push({
    title: "Videos tutoriales disponibles",
    desc: isNormal ? (
      <>
        Accede a todos los tutoriales desde el <strong>menú lateral</strong> (ícono ☰). Cada video te guía
        paso a paso por las funciones de SignoApp, incluyendo las nuevas de Cambios de Productos.
      </>
    ) : isDriverOnly ? (
      <>
        Desde el <strong>menú lateral</strong> tienes disponible el video tutorial de{" "}
        <strong>Seguimiento de despachos</strong> para que puedas marcar y consultar tus entregas.
      </>
    ) : isOperatorOnly ? (
      <>
        Desde el <strong>menú lateral</strong> tienes los tutoriales de{" "}
        <strong>Registros de producción</strong> y <strong>Récords de producción</strong>.
      </>
    ) : (
      <>
        Desde el <strong>menú lateral</strong> tienes los tutoriales de{" "}
        <strong>Seguimiento de despachos</strong>, <strong>Registros de producción</strong> y{" "}
        <strong>Récords de producción</strong>.
      </>
    ),
    content: <MockTutorials />,
  });

  const goPrev = () => setSlide((s) => (s - 1 + slides.length) % slides.length);
  const goNext = () => setSlide((s) => (s + 1) % slides.length);

  const modalStyle = {
    background: isDark ? "#0B0F1A" : "#FFFFFF",
    border: isDark ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(99,102,241,0.18)",
    boxShadow: isDark ? "0 24px 60px rgba(0,0,0,0.6)" : "0 24px 60px rgba(15,23,42,0.18)",
    "--pctm-text": isDark ? "#FFFFFF" : "#0F172A",
    "--pctm-text-muted": isDark ? "rgba(255,255,255,0.55)" : "rgba(15,23,42,0.55)",
    "--pctm-bg-elev": isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
    "--pctm-border": isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.1)",
    "--pctm-mock-bg": isDark ? "#05070C" : "#F4F6FD",
    "--pctm-mock-surface": isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
    "--pctm-mock-border": isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)",
    "--pctm-mock-text": isDark ? "rgba(255,255,255,0.85)" : "#0F172A",
    "--pctm-mock-text-muted": isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.45)",
    "--pctm-entra": isDark ? "#34D399" : "#059669",
    "--pctm-sale": isDark ? "#F87171" : "#DC2626",
  } as CSSProperties;

  return (
    <div className="pctm-overlay" onClick={close}>
      <style>{`
        .pctm-overlay {
          position: fixed; inset: 0; z-index: 20000;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: pctm-fade-in .2s ease both;
        }
        @keyframes pctm-fade-in { from { opacity: 0; } to { opacity: 1; } }

        .pctm-modal {
          width: 100%;
          max-width: 480px;
          border-radius: 20px;
          padding: 22px 22px 20px;
          box-sizing: border-box;
          font-family: 'DM Sans', sans-serif;
          animation: pctm-pop .3s cubic-bezier(0.34,1.56,0.64,1) both;
          max-height: 92vh;
          overflow-y: auto;
        }
        @keyframes pctm-pop {
          from { opacity: 0; transform: scale(0.94) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .pctm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .pctm-badge {
          font-size: 11px; font-weight: 700; letter-spacing: .04em;
          color: #818CF8; background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.3);
          padding: 3px 10px; border-radius: 999px;
        }
        .pctm-close {
          width: 28px; height: 28px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--pctm-border); background: var(--pctm-bg-elev);
          color: var(--pctm-text-muted); cursor: pointer; transition: color .15s;
          padding: 0;
        }
        .pctm-close:hover { color: var(--pctm-text); }
        .pctm-close svg {
          display: block !important; stroke: currentColor !important; fill: none !important;
          width: 16px !important; height: 16px !important;
        }

        .pctm-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(17px, 4.2vw, 21px);
          font-weight: 800;
          color: var(--pctm-text);
          margin: 4px 0 6px;
        }
        .pctm-desc { font-size: 13px; line-height: 1.55; color: var(--pctm-text-muted); margin: 0 0 16px; }
        .pctm-desc strong { color: var(--pctm-text); }

        .pctm-carousel { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .pctm-arrow {
          flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--pctm-border); background: var(--pctm-bg-elev);
          color: var(--pctm-text-muted); cursor: pointer; transition: all .15s;
          padding: 0;
        }
        .pctm-arrow:hover { color: var(--pctm-text); border-color: #818CF8; }
        .pctm-arrow svg {
          display: block !important; stroke: currentColor !important; fill: none !important;
          width: 16px !important; height: 16px !important;
        }

        .pctm-slide-frame {
          flex: 1; min-width: 0;
          border-radius: 14px; overflow: hidden;
          background: var(--pctm-mock-bg);
          border: 1px solid var(--pctm-mock-border);
          padding: 12px;
        }

        /* ── Mocks base ── */
        .pctm-mock-card {
          background: var(--pctm-mock-surface);
          border: 1px solid var(--pctm-mock-border);
          border-radius: 12px;
          padding: 12px;
          font-size: 11px;
          color: var(--pctm-mock-text);
        }
        .pctm-mock-title {
          font-family: 'Syne', sans-serif;
          font-size: 13px; font-weight: 700;
          margin-bottom: 8px;
          color: var(--pctm-mock-text);
        }
        .pctm-mock-section {
          margin-bottom: 8px;
          padding: 8px;
          border-radius: 8px;
          background: var(--pctm-mock-bg);
          border: 1px solid var(--pctm-mock-border);
        }
        .pctm-mock-section.entra { border-color: color-mix(in srgb, var(--pctm-entra) 35%, transparent); }
        .pctm-mock-section.sale  { border-color: color-mix(in srgb, var(--pctm-sale) 35%, transparent); }
        .pctm-mock-section-title {
          display: flex; align-items: center; gap: 5px;
          font-size: 10px; font-weight: 600; margin-bottom: 6px;
          text-transform: uppercase; letter-spacing: .04em;
        }
        .pctm-mock-section-title.entra { color: var(--pctm-entra); }
        .pctm-mock-section-title.sale  { color: var(--pctm-sale); }
        .pctm-mock-label {
          font-size: 9px; font-weight: 600; letter-spacing: .04em;
          text-transform: uppercase; color: var(--pctm-mock-text-muted); margin-bottom: 3px;
        }
        .pctm-mock-input {
          height: 22px; border-radius: 6px;
          background: var(--pctm-mock-bg);
          border: 1px solid var(--pctm-mock-border);
        }
        .pctm-mock-input.short { width: 55%; }
        .pctm-mock-input.tiny  { flex: 1; height: 20px; }
        .pctm-mock-input.search {
          display: flex; align-items: center; gap: 5px;
          padding: 0 8px; font-size: 10px; color: var(--pctm-mock-text-muted);
          height: 24px;
        }
        .pctm-mock-row { display: flex; gap: 6px; margin-top: 6px; align-items: center; }
        .pctm-mock-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 4px;
          font-size: 9px; font-weight: 600; border-radius: 6px; padding: 4px 8px;
          white-space: nowrap;
        }
        .pctm-mock-btn.green {
          background: rgba(52,211,153,0.12); color: var(--pctm-entra);
          border: 1px solid color-mix(in srgb, var(--pctm-entra) 30%, transparent);
        }
        .pctm-mock-btn.primary {
          width: 100%; padding: 8px; border-radius: 8px;
          background: linear-gradient(135deg, #4F46E5, #6366F1); color: #fff;
          border: none; font-size: 11px;
        }
        .pctm-mock-btn.excel {
          background: rgba(52,211,153,0.1); color: var(--pctm-entra);
          border: 1px solid color-mix(in srgb, var(--pctm-entra) 25%, transparent);
          font-size: 9px; padding: 3px 7px;
        }
        .pctm-mock-header-row {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
        }
        .pctm-mock-filters {
          display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px;
        }
        .pctm-mock-folio {
          border-top: 1px solid var(--pctm-mock-border); padding-top: 8px;
        }
        .pctm-mock-folio-badge {
          display: inline-block; font-size: 9px; font-weight: 600;
          background: rgba(99,102,241,0.12); color: #A5B4FC;
          border: 1px solid rgba(99,102,241,0.25); border-radius: 4px;
          padding: 2px 6px; margin-bottom: 4px;
        }
        .pctm-mock-meta { font-size: 10px; color: var(--pctm-mock-text-muted); margin-bottom: 6px; }
        .pctm-mock-chips { display: flex; flex-direction: column; gap: 4px; }
        .pctm-chip {
          display: inline-flex; align-self: flex-start;
          font-size: 9px; font-weight: 600; border-radius: 4px; padding: 2px 7px;
        }
        .pctm-chip.entra {
          background: rgba(52,211,153,0.12); color: var(--pctm-entra);
          border: 1px solid color-mix(in srgb, var(--pctm-entra) 30%, transparent);
        }
        .pctm-chip.sale {
          background: rgba(248,113,113,0.12); color: var(--pctm-sale);
          border: 1px solid color-mix(in srgb, var(--pctm-sale) 30%, transparent);
        }

        /* Tutorials mock */
        .pctm-mock-card.tutorials { padding: 10px; }
        .pctm-tutorials-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
          max-height: 180px; overflow-y: auto;
        }
        .pctm-tutorial-card {
          background: var(--pctm-mock-bg);
          border: 1px solid var(--pctm-mock-border);
          border-radius: 8px; padding: 7px 8px;
          display: flex; flex-direction: column; gap: 5px;
        }
        .pctm-tutorial-card.highlight {
          border-color: rgba(99,102,241,0.45);
          background: rgba(99,102,241,0.08);
        }
        .pctm-tutorial-title {
          font-size: 9.5px; line-height: 1.3; color: var(--pctm-mock-text);
          font-weight: 500;
        }
        .pctm-tutorial-btn {
          display: inline-flex; align-items: center; gap: 3px;
          align-self: flex-start;
          font-size: 8px; font-weight: 600;
          background: rgba(52,211,153,0.12); color: var(--pctm-entra);
          border: 1px solid color-mix(in srgb, var(--pctm-entra) 30%, transparent);
          border-radius: 999px; padding: 2px 6px;
        }
        .pctm-more-hint {
          margin-top: 8px; text-align: center;
          font-size: 10px; color: var(--pctm-mock-text-muted);
        }

        .pctm-slide-caption { text-align: center; margin-bottom: 12px; }
        .pctm-slide-caption h3 {
          font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700;
          color: var(--pctm-text); margin: 0 0 4px;
        }
        .pctm-slide-caption p {
          font-size: 12px; color: var(--pctm-text-muted); margin: 0; line-height: 1.5;
        }

        .pctm-dots { display: flex; justify-content: center; gap: 6px; margin-bottom: 16px; }
        .pctm-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--pctm-border); border: none; cursor: pointer; padding: 0; transition: all .2s;
        }
        .pctm-dot.active { width: 18px; border-radius: 4px; background: #6366F1; }

        .pctm-footer { display: flex; justify-content: center; }
        .pctm-btn-primary {
          min-width: 140px;
          display: inline-flex; align-items: center; justify-content: center;
          padding: 11px 20px; border-radius: 11px; font-size: 13px; font-weight: 700;
          border: none; background: linear-gradient(135deg, #4F46E5, #6366F1);
          box-shadow: 0 4px 16px rgba(99,102,241,0.35); color: #fff;
          cursor: pointer; transition: all .15s; font-family: 'DM Sans', sans-serif;
        }
        .pctm-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(99,102,241,0.45); }

        @media (max-width: 400px) {
          .pctm-modal { padding: 16px 14px 14px; }
          .pctm-tutorials-grid { grid-template-columns: 1fr; max-height: 160px; }
          .pctm-mock-filters { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="pctm-modal" onClick={(e) => e.stopPropagation()} style={modalStyle}>
        <div className="pctm-header">
          <span className="pctm-badge">✨ Novedad</span>
          <button className="pctm-close" onClick={close} aria-label="Cerrar" type="button">
            <FiX size={16} color={iconMuted} />
          </button>
        </div>

        <h2 className="pctm-title">{slides[slide].title}</h2>
        <p className="pctm-desc">{slides[slide].desc}</p>

        <div className="pctm-carousel">
          {slides.length > 1 && (
            <button className="pctm-arrow" onClick={goPrev} aria-label="Anterior" type="button">
              <FiChevronLeft size={16} color={iconMuted} />
            </button>
          )}

          <div className="pctm-slide-frame">
            {slides[slide].content}
          </div>

          {slides.length > 1 && (
            <button className="pctm-arrow" onClick={goNext} aria-label="Siguiente" type="button">
              <FiChevronRight size={16} color={iconMuted} />
            </button>
          )}
        </div>

        {slides.length > 1 && (
          <div className="pctm-dots">
            {slides.map((_, i) => (
              <button
                key={i}
                className={`pctm-dot ${i === slide ? "active" : ""}`}
                onClick={() => setSlide(i)}
                aria-label={`Ir a la imagen ${i + 1}`}
                type="button"
              />
            ))}
          </div>
        )}

        <div className="pctm-footer">
          <button className="pctm-btn-primary" onClick={close} type="button">
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductChangesTutorialsModal;