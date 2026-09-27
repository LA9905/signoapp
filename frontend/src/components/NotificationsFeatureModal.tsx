import { useEffect, useState, type CSSProperties } from "react";
import { FiX, FiChevronLeft, FiChevronRight, FiBell, FiCheck, FiCheckCircle } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";

/** Campaña hasta el miércoles 30 de septiembre 2026. */
const CAMPAIGN_END = "2026-09-30";
const STORAGE_LAST_SHOWN = "notif_feature_modal_last_shown";
const STORAGE_EVER_SEEN = "notif_feature_modal_ever_seen";

function todayStr(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  const local = new Date(now.getTime() - offsetMs);
  return local.toISOString().slice(0, 10);
}

type RoleProps = {
  isLimited: boolean;
  isOperatorLimited: boolean;
};

function buildSlides(isLimited: boolean, isOperatorLimited: boolean) {
  const slides: { title: string; desc: string }[] = [
    {
      title: "La campana en la barra superior",
      desc: "Arriba a la derecha, junto a tu foto de perfil, verás el ícono de campana. Si hay avisos sin leer, aparece un número rojo.",
    },
    {
      title: "Panel de notificaciones",
      desc: 'Al tocarla se abre la lista. Podés marcar una como leída o usar "Marcar todas". El punto violeta indica que aún no la leíste.',
    },
  ];

  if (isLimited && isOperatorLimited) {
    slides.push({
      title: "Avisos de chofer y de operario",
      desc: "Como tenés ambos roles, recibirás alertas de despachos pendientes de marcar y también de tu nivel de producción o récords.",
    });
  } else if (isLimited) {
    slides.push({
      title: "Despachos pendientes",
      desc: "Si un despacho lleva más de una semana sin marcarse como entregado al cliente, te avisamos para que no afecte tu rendimiento.",
    });
  } else if (isOperatorLimited) {
    slides.push({
      title: "Tu producción",
      desc: "Te avisamos si tu rendimiento baja (Regular, Baja, etc.) o si igualás/superás un récord de producto, para que sigas de cerca tu mes.",
    });
  } else {
    slides.push({
      title: "Correcciones en tus despachos",
      desc: "Si alguien edita un despacho que creaste (OC, centro de costo, productos o chofer), te llega un aviso con el detalle exacto del cambio.",
    });
  }

  return slides;
}

function mockBodyForRole(isLimited: boolean, isOperatorLimited: boolean): { title: string; body: string } {
  if (isLimited && isOperatorLimited) {
    return {
      title: "Despacho pendiente > 1 semana",
      body: "Tenés un despacho sin marcar como entregado. Revisalo para no afectar tu rendimiento de chofer.",
    };
  }
  if (isLimited) {
    return {
      title: "Despacho pendiente > 1 semana",
      body: "OC 12345 · Centro de Costo: Hotel ejemplo. Marcá la entrega a tiempo.",
    };
  }
  if (isOperatorLimited) {
    return {
      title: "Producción regular en producto X",
      body: "Tu rendimiento está bajo respecto al récord. Subí la producción para no afectar tu evaluación.",
    };
  }
  return {
    title: "Tu despacho OC 136563 fue corregido",
    body: "Cambios: el producto cambió de cantidad. Revisá el detalle para mantener stock y trazabilidad.",
  };
}

const MockBellBar = () => (
  <div className="nfm-mock-navbar">
    <span className="nfm-mock-logo">☰  SignoApp</span>
    <div className="nfm-mock-right">
      <div className="nfm-mock-bell nfm-pulse">
        <FiBell size={12} />
        <span className="nfm-mock-badge">2</span>
      </div>
      <span className="nfm-mock-user">🙂 Usuario ▾</span>
    </div>
  </div>
);

const MockNotifPanel = ({
  isLimited,
  isOperatorLimited,
}: {
  isLimited: boolean;
  isOperatorLimited: boolean;
}) => {
  const sample = mockBodyForRole(isLimited, isOperatorLimited);
  return (
    <div className="nfm-mock-panel">
      <div className="nfm-mock-panel-head">
        <span>Notificaciones</span>
        <span className="nfm-mock-markall">
          <FiCheckCircle size={10} /> Marcar todas
        </span>
      </div>
      <div className="nfm-mock-item unread">
        <div className="nfm-mock-item-top">
          <strong>{sample.title}</strong>
          <span className="nfm-dot" />
        </div>
        <p>{sample.body}</p>
        <div className="nfm-mock-item-foot">
          <span>26/9, 10:15</span>
          <span className="nfm-leida">
            <FiCheck size={10} /> Leída
          </span>
        </div>
      </div>
      <div className="nfm-mock-item">
        <div className="nfm-mock-item-top">
          <strong>Aviso anterior</strong>
        </div>
        <p>Ejemplo de notificación ya leída.</p>
      </div>
    </div>
  );
};

const MockRoleTip = ({
  isLimited,
  isOperatorLimited,
}: {
  isLimited: boolean;
  isOperatorLimited: boolean;
}) => {
  const tips: string[] = [];
  if (!isLimited && !isOperatorLimited) {
    tips.push("Ediciones de OC, cliente, productos o chofer en despachos que creaste");
  }
  if (isLimited) {
    tips.push("Despachos con más de 1 semana sin marcar entregado");
  }
  if (isOperatorLimited) {
    tips.push("Bajadas de nivel de producción y récords de producto");
  }
  return (
    <div className="nfm-mock-tips">
      <p className="nfm-mock-tips-title">En tu cuenta verás:</p>
      <ul>
        {tips.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
};

const NotificationsFeatureModal = ({ isLimited, isOperatorLimited }: RoleProps) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const iconMuted = isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)";
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);
  const slides = buildSlides(isLimited, isOperatorLimited);

  useEffect(() => {
    try {
      const today = todayStr();
      const lastShown = localStorage.getItem(STORAGE_LAST_SHOWN);
      const everSeen = localStorage.getItem(STORAGE_EVER_SEEN);

      if (today <= CAMPAIGN_END) {
        // Hasta el 30/09 inclusive: una vez por día de sesión
        if (lastShown !== today) setVisible(true);
      } else {
        // Después del 30/09: solo si nunca lo vio (no entró en la campaña)
        if (!everSeen) setVisible(true);
      }
    } catch {
      /* sin localStorage */
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), 90000);
    return () => clearInterval(id);
  }, [visible, slides.length]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  const close = () => {
    try {
      localStorage.setItem(STORAGE_LAST_SHOWN, todayStr());
      localStorage.setItem(STORAGE_EVER_SEEN, "1");
    } catch {

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
    "--nfm-text": isDark ? "#FFFFFF" : "#0F172A",
    "--nfm-text-muted": isDark ? "rgba(255,255,255,0.55)" : "rgba(15,23,42,0.55)",
    "--nfm-bg-elev": isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
    "--nfm-border": isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.1)",
    "--nfm-mock-bg": isDark ? "#05070C" : "#F4F6FD",
    "--nfm-mock-surface": isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
    "--nfm-mock-border": isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)",
    "--nfm-mock-text": isDark ? "rgba(255,255,255,0.85)" : "#0F172A",
    "--nfm-mock-text-muted": isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.5)",
  } as CSSProperties;

  return (
    <div className="nfm-overlay" onClick={close}>
      <style>{`
        .nfm-overlay {
          position: fixed; inset: 0; z-index: 20000;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: nfm-fade-in .2s ease both;
        }
        @keyframes nfm-fade-in { from { opacity: 0; } to { opacity: 1; } }

        .nfm-modal {
          width: 100%;
          max-width: 460px;
          border-radius: 20px;
          padding: 22px 22px 20px;
          box-sizing: border-box;
          font-family: 'DM Sans', sans-serif;
          animation: nfm-pop .3s cubic-bezier(0.34,1.56,0.64,1) both;
          max-height: 92vh;
          overflow-y: auto;
        }
        @keyframes nfm-pop {
          from { opacity: 0; transform: scale(0.94) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .nfm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .nfm-badge {
          font-size: 11px; font-weight: 700; letter-spacing: .04em;
          color: #818CF8; background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.3);
          padding: 3px 10px; border-radius: 999px;
        }
        .nfm-close {
          width: 28px; height: 28px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--nfm-border); background: var(--nfm-bg-elev);
          color: var(--nfm-text-muted); cursor: pointer; padding: 0;
        }
        .nfm-close:hover { color: var(--nfm-text); }

        .nfm-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(18px, 4.5vw, 22px);
          font-weight: 800;
          color: var(--nfm-text);
          margin: 4px 0 6px;
        }
        .nfm-desc { font-size: 13px; line-height: 1.55; color: var(--nfm-text-muted); margin: 0 0 16px; }
        .nfm-desc strong { color: var(--nfm-text); }

        .nfm-carousel { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
        .nfm-arrow {
          flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--nfm-border); background: var(--nfm-bg-elev);
          color: var(--nfm-text-muted); cursor: pointer; padding: 0;
        }
        .nfm-arrow:hover { color: var(--nfm-text); border-color: #818CF8; }

        .nfm-slide-frame {
          flex: 1; min-width: 0;
          border-radius: 14px; overflow: hidden;
          background: var(--nfm-mock-bg);
          border: 1px solid var(--nfm-mock-border);
          padding: 12px;
        }

        .nfm-mock-navbar {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          background: var(--nfm-mock-surface);
          border: 1px solid var(--nfm-mock-border);
          border-radius: 10px; padding: 8px 10px;
        }
        .nfm-mock-logo { font-size: 11px; font-weight: 700; color: var(--nfm-mock-text); }
        .nfm-mock-right { display: flex; align-items: center; gap: 8px; }
        .nfm-mock-user {
          font-size: 9px; padding: 4px 8px; border-radius: 999px;
          border: 1px solid var(--nfm-mock-border); color: var(--nfm-mock-text);
        }
        .nfm-mock-bell {
          width: 24px; height: 24px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid rgba(129,140,248,0.4);
          background: rgba(99,102,241,0.15);
          color: #A5B4FC; position: relative;
        }
        .nfm-mock-badge {
          position: absolute; top: -4px; right: -4px;
          min-width: 14px; height: 14px; padding: 0 3px;
          border-radius: 99px; background: #EF4444; color: #fff;
          font-size: 9px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }
        .nfm-pulse::before {
          content: ''; position: absolute; inset: -5px; border-radius: 10px;
          border: 2px solid #818CF8; animation: nfm-pulse-ring 1.8s ease-out infinite;
        }
        @keyframes nfm-pulse-ring {
          0% { transform: scale(0.9); opacity: 0.8; }
          70% { transform: scale(1.45); opacity: 0; }
          100% { opacity: 0; }
        }

        .nfm-mock-panel {
          background: var(--nfm-mock-surface);
          border: 1px solid var(--nfm-mock-border);
          border-radius: 10px; overflow: hidden; font-size: 10px;
        }
        .nfm-mock-panel-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 10px; font-weight: 700; color: var(--nfm-mock-text);
          border-bottom: 1px solid var(--nfm-mock-border); font-size: 11px;
        }
        .nfm-mock-markall {
          display: inline-flex; align-items: center; gap: 3px;
          font-size: 9px; font-weight: 600; color: #34D399;
          background: rgba(52,211,153,0.12); padding: 3px 6px; border-radius: 6px;
        }
        .nfm-mock-item {
          padding: 8px 10px;
          border-bottom: 1px solid var(--nfm-mock-border);
          color: var(--nfm-mock-text-muted);
        }
        .nfm-mock-item.unread { background: rgba(99,102,241,0.08); }
        .nfm-mock-item-top {
          display: flex; justify-content: space-between; gap: 6px;
          color: var(--nfm-mock-text); margin-bottom: 3px;
        }
        .nfm-mock-item-top strong { font-size: 10.5px; font-weight: 600; }
        .nfm-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #6366F1;
          flex-shrink: 0; margin-top: 3px;
        }
        .nfm-mock-item p { margin: 0; line-height: 1.4; font-size: 9.5px; }
        .nfm-mock-item-foot {
          display: flex; justify-content: space-between; margin-top: 4px; font-size: 9px;
        }
        .nfm-leida { display: inline-flex; align-items: center; gap: 2px; color: #818CF8; }

        .nfm-mock-tips {
          background: var(--nfm-mock-surface);
          border: 1px solid var(--nfm-mock-border);
          border-radius: 10px; padding: 12px;
          color: var(--nfm-mock-text);
        }
        .nfm-mock-tips-title { font-size: 11px; font-weight: 700; margin: 0 0 8px; }
        .nfm-mock-tips ul { margin: 0; padding-left: 16px; font-size: 10.5px; color: var(--nfm-mock-text-muted); line-height: 1.55; }

        .nfm-slide-caption { text-align: center; margin-bottom: 12px; }
        .nfm-slide-caption h3 {
          font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700;
          color: var(--nfm-text); margin: 0 0 4px;
        }
        .nfm-slide-caption p { font-size: 12px; color: var(--nfm-text-muted); margin: 0; line-height: 1.5; }

        .nfm-dots { display: flex; justify-content: center; gap: 6px; margin-bottom: 16px; }
        .nfm-dot-btn {
          width: 6px; height: 6px; border-radius: 50%; background: var(--nfm-border);
          border: none; cursor: pointer; padding: 0; transition: all .2s;
        }
        .nfm-dot-btn.active { width: 18px; border-radius: 4px; background: #6366F1; }

        .nfm-btn-primary {
          width: 100%;
          display: inline-flex; align-items: center; justify-content: center;
          padding: 11px 14px; border-radius: 11px; font-size: 13px; font-weight: 700;
          border: none; background: linear-gradient(135deg, #4F46E5, #6366F1);
          box-shadow: 0 4px 16px rgba(99,102,241,0.35); color: #fff;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
        }
        .nfm-btn-primary:hover { transform: translateY(-1px); }

        @media (max-width: 380px) {
          .nfm-modal { padding: 18px 14px 16px; }
        }
      `}</style>

      <div className="nfm-modal" onClick={(e) => e.stopPropagation()} style={modalStyle}>
        <div className="nfm-header">
          <span className="nfm-badge">✨ Novedad</span>
          <button className="nfm-close" onClick={close} aria-label="Cerrar" type="button">
            <FiX size={16} color={iconMuted} />
          </button>
        </div>

        <h2 className="nfm-title">Notificaciones en SignoApp</h2>
        <p className="nfm-desc">
          Ahora tenés <strong>avisos personalizados dentro de la app</strong>:
          campana en la barra superior, badge de no leídas y detalle según tu rol.
        </p>

        <div className="nfm-carousel">
          <button className="nfm-arrow" onClick={goPrev} aria-label="Anterior" type="button">
            <FiChevronLeft size={16} color={iconMuted} />
          </button>

          <div className="nfm-slide-frame">
            {slide === 0 && <MockBellBar />}
            {slide === 1 && (
            <MockNotifPanel
                isLimited={isLimited}
                isOperatorLimited={isOperatorLimited}
            />
            )}
            {slide === 2 && (
              <MockRoleTip isLimited={isLimited} isOperatorLimited={isOperatorLimited} />
            )}
          </div>

          <button className="nfm-arrow" onClick={goNext} aria-label="Siguiente" type="button">
            <FiChevronRight size={16} color={iconMuted} />
          </button>
        </div>

        <div className="nfm-slide-caption">
          <h3>{slides[slide].title}</h3>
          <p>{slides[slide].desc}</p>
        </div>

        <div className="nfm-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`nfm-dot-btn ${i === slide ? "active" : ""}`}
              onClick={() => setSlide(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        <button className="nfm-btn-primary" onClick={close} type="button">
          Entendido
        </button>
      </div>
    </div>
  );
};

export default NotificationsFeatureModal;