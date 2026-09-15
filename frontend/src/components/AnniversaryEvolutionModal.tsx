import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FiX, FiChevronLeft, FiChevronRight, FiPlay, FiPause } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";

const STORAGE_LAST_SHOWN = "anniversary_evolution_modal_last_shown";
const STORAGE_END_DATE = "anniversary_evolution_modal_end_date";

/** desde el 15 hasta el 21 de septiembre 2026 */
const WINDOW_START = "2026-09-15";
const WINDOW_END = "2026-09-21";

const FORCE_PREVIEW =
  (import.meta as any).env?.VITE_FORCE_ANNIVERSARY_EVOLUTION === "true";

const AUTO_MS  = 6800; // duración de cada slide (~video corto)

/** Música de fondo del carrusel */
const BG_MUSIC_SRC = "/anniversary/anniversary-bg.mp3";

function todayStr(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  const local = new Date(now.getTime() - offsetMs);
  return local.toISOString().slice(0, 10);
}

function computeEndDate(): string {
  return WINDOW_END;
}

interface Props {
  isLimited?: boolean;
  isOperatorLimited?: boolean;
}

type SlideDef = {
  badge?: string;
  title: string;
  desc: ReactNode;
  visual: ReactNode;
  tone?: "celebrate" | "story" | "thanks" | "joke" | "close";
};

const AnniversaryEvolutionModal = ({ isLimited = false, isOperatorLimited = false }: Props) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const iconMuted = isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)";
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const progressRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Roles limitados ven una versión más corta y emotiva
  const showFull = !isLimited && !isOperatorLimited;

  useEffect(() => {
    try {
      let endDate = localStorage.getItem(STORAGE_END_DATE);
      if (!endDate) {
        endDate = computeEndDate();
        localStorage.setItem(STORAGE_END_DATE, endDate);
      }
      const today = todayStr();
      const lastShown = localStorage.getItem(STORAGE_LAST_SHOWN);
      if (FORCE_PREVIEW || (today >= WINDOW_START && today <= endDate && lastShown !== today)) {
        setVisible(true);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, slide]);

  // Auto-play + barra de progreso
  useEffect(() => {
    if (!visible || !playing) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (progressRef.current) window.cancelAnimationFrame(progressRef.current);
      return;
    }

    startTimeRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const p = Math.min(1, elapsed / AUTO_MS);
      setProgress(p);
      if (p < 1) {
        progressRef.current = requestAnimationFrame(tick);
      }
    };
    progressRef.current = requestAnimationFrame(tick);

    timerRef.current = window.setTimeout(() => {
      setSlide((s) => (s + 1) % effectiveSlides.length);
      setProgress(0);
    }, AUTO_MS);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (progressRef.current) window.cancelAnimationFrame(progressRef.current);
    };
  }, [visible, playing, slide]);

    // Música de fondo: play/pause según visible + playing
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (visible && playing) {
      audio.volume = 0.25
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
        });
      }
    } else {
      audio.pause();
    }
  }, [visible, playing]);

const close = () => {
    try {
      localStorage.setItem(STORAGE_LAST_SHOWN, todayStr());
    } catch {
    }
    setVisible(false);
    setPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  if (!visible) return null;

  // ─── Mocks de la evolución de la UI ─────────────────────────────────────

  /** Dashboard antiguos */
  const MockOldDashboard = () => (
    <div className="aem-mock aem-old-dash">
      <div className="aem-old-header">Bienvenido, Alejandro Arraga</div>
      <div className="aem-old-row">
        <div className="aem-old-blue-block">Iniciar jornada del día</div>
        <div className="aem-old-btns">
          {["Crear despacho", "Agregar productos", "Listado de productos", "Choferes", "Centros de Costos", "Seguimiento"].map((t) => (
            <div key={t} className="aem-old-btn">{t}</div>
          ))}
        </div>
      </div>
      <div className="aem-old-error">Error al cargar los datos del gráfico…</div>
      <div className="aem-old-selects">
        <span>2026 ▾</span>
        <span>Enero ▾</span>
      </div>
      <div className="aem-old-empty">Aún no hay despachos registrados este mes.</div>
    </div>
  );

  /** Dashboard intermedio*/
  const MockMidDashboard = () => (
    <div className="aem-mock aem-mid-dash">
      <div className="aem-mid-header">Bienvenido, Alejandro Arraga</div>
      <div className="aem-mid-start">Iniciar jornada del día</div>
      <div className="aem-mid-grid">
        {["Crear despacho", "Agregar productos", "Listado", "Choferes", "Centros", "Seguimiento", "Recepción", "Proveedores", "Operarios"].map((t) => (
          <div key={t} className="aem-mid-btn">{t}</div>
        ))}
      </div>
      <div className="aem-mid-chart-label">Despachos del mes seleccionado</div>
      <div className="aem-mid-bars">
        {[18, 12, 22, 27, 15, 21, 24, 19, 32, 25, 28, 35, 22, 30].map((h, i) => (
          <div key={i} className="aem-mid-bar" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );

  /** Dashboard actual */
  const MockNewDashboard = ({ light = false }: { light?: boolean }) => (
    <div className={`aem-mock aem-new-dash ${light ? "light" : ""}`}>
      <div className="aem-new-top">
        <div>
          <div className="aem-new-label">PANEL PRINCIPAL</div>
          <div className="aem-new-welcome">Bienvenido, Alejandro Arraga</div>
        </div>
        <div className="aem-new-start-btn">▶ Iniciar jornada del día</div>
      </div>
      <div className="aem-new-section">ACCESOS RÁPIDOS</div>
      <div className="aem-new-grid">
        {["Agregar productos", "Listado de productos", "Crear despacho", "Seguimiento", "Centros de Costos", "Recepción", "Producción", "Operarios", "Notas de Crédito", "Choferes", "Consumo Interno", "Cambios de Productos"].map((t) => (
          <div key={t} className="aem-new-btn">{t}</div>
        ))}
      </div>
      <div className="aem-new-chart-box">
        <div className="aem-new-chart-title">Despachos del mes</div>
        <div className="aem-new-bars">
          {[32, 28, 45, 22, 30, 35, 18, 40, 25, 38].map((h, i) => (
            <div key={i} className="aem-new-bar" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );

  /** Crear despacho antiguo */
  const MockOldCreate = () => (
    <div className="aem-mock aem-old-form">
      <div className="aem-old-form-title">Crear Despacho</div>
      {["Número de orden de compra", "Número de paquete (ej. 1/4)", "Buscar cliente…", "Selecciona Centro de costo"].map((p) => (
        <div key={p} className="aem-old-input">{p}</div>
      ))}
      <div className="aem-old-blue-sm">Nuevo Centro de Costo</div>
      <div className="aem-old-input">Buscar chofer…</div>
      <div className="aem-old-input">Selecciona chofer</div>
      <div className="aem-old-blue-sm">Nuevo Chofer</div>
      <div className="aem-old-input">Buscar producto…</div>
      <div className="aem-old-row">
        <div className="aem-old-input tiny">0</div>
        <div className="aem-old-input tiny">Unidades ▾</div>
        <div className="aem-old-green">Agregar</div>
      </div>
      <div className="aem-old-blue-sm full">Guardar Despacho</div>
    </div>
  );

  /** Crear despacho actual */
  const MockNewCreate = ({ light = false }: { light?: boolean }) => (
    <div className={`aem-mock aem-new-form ${light ? "light" : ""}`}>
      <div className="aem-new-form-title">Crear Despacho</div>
      <div className="aem-new-form-sub">Completa los datos para registrar un nuevo despacho</div>
      <div className="aem-new-section-card">
        <div className="aem-new-sec-label">IDENTIFICACIÓN</div>
        <div className="aem-new-field">ORDEN DE COMPRA *</div>
        <div className="aem-new-input">Ej: OC-2024-001</div>
        <div className="aem-new-row">
          <div className="aem-new-field half">Nº PAQUETE</div>
          <div className="aem-new-field half">Nº FACTURA</div>
        </div>
        <div className="aem-new-row">
          <div className="aem-new-input half">Ej: 1/4</div>
          <div className="aem-new-input half">Opcional</div>
        </div>
        <div className="aem-new-field">FECHA DEL DESPACHO *</div>
        <div className="aem-new-input">14-09-2026</div>
      </div>
      <div className="aem-new-section-card">
        <div className="aem-new-sec-label">DESTINO</div>
        <div className="aem-new-field">CENTRO DE COSTO *</div>
        <div className="aem-new-input">Buscar cliente…</div>
        <div className="aem-new-purple-sm">+ Nuevo Centro de Costo</div>
      </div>
      <div className="aem-new-purple-btn">Guardar Despacho</div>
    </div>
  );

  /** Seguimiento de despachos (antes vs ahora resumido) */
  const MockTracking = () => (
    <div className="aem-mock aem-track">
      <div className="aem-track-title">Despachos</div>
      <div className="aem-track-filters">
        <div className="aem-track-f">Centro de costo</div>
        <div className="aem-track-f">Nº Orden</div>
        <div className="aem-track-f">Chofer</div>
        <div className="aem-track-f">Producto</div>
      </div>
      <div className="aem-track-card">
        <div className="aem-track-badges">
          <span className="aem-badge folio">Folio# 35</span>
          <span className="aem-badge ok">Pedido Entregado</span>
        </div>
        <div className="aem-track-meta">Centro de Costo: DROGUERIA HOFMANN SAC</div>
        <div className="aem-track-meta muted">Orden 03630R9 · Chofer: Claudio Garbarino</div>
        <div className="aem-track-prods">
          <span>Revolvedores – PQT x 1.000 · 5 und</span>
          <span>Bolsa PEAD C/Logo… · 4 PQT</span>
        </div>
      </div>
    </div>
  );

  // ─── Slides ─────────────────────────────────────────────────────────────

  const fullSlides: SlideDef[] = [
    {
      badge: "🎉 1er Aniversario",
      title: "¡Un año de SignoApp!",
      tone: "celebrate",
      desc: (
        <>
          Este mes cumplimos nuestro <strong>primer año</strong> juntos.
          Quisimos recordarte cómo empezamos… y todo lo que hemos construido.
        </>
      ),
      visual: (
        <div className="aem-hero">
          <div className="aem-hero-emoji">🚚✨</div>
          <div className="aem-hero-year">2025 → 2026</div>
          <div className="aem-hero-sub">Un año de despachos, producción y muchas mejoras</div>
        </div>
      ),
    },
    {
      badge: "📖 Historia",
      title: "Así se veía el inicio",
      tone: "story",
      desc: (
        <>
          Fondo celeste, un bloque azul enorme y botones blancos.
          Funcional… pero todavía lejos de lo que tenemos hoy.
        </>
      ),
      visual: <MockOldDashboard />,
    },
    {
      badge: "🌑 Primera evolución",
      title: "Pasamos a oscuro",
      tone: "story",
      desc: (
        <>
          Llegó el tema oscuro plano, los primeros gráficos de despachos
          y una grilla más ordenada. Ya se sentía más “app de verdad”.
        </>
      ),
      visual: <MockMidDashboard />,
    },
    {
      badge: "📝 Formularios",
      title: "Crear despacho… versión 1.0",
      tone: "story",
      desc: (
        <>
          Campos sueltos, poco contraste y sin secciones claras.
          Hoy es mucho más guiado, ordenado y agradable.
        </>
      ),
      visual: <MockOldCreate />,
    },
    {
      badge: "✨ Ahora",
      title: "Crear despacho actual",
      tone: "story",
      desc: (
        <>
          Secciones (Identificación, Destino, Productos, Imágenes),
          jerarquía visual clara y soporte nativo de <strong>modo claro y oscuro</strong>.
        </>
      ),
      visual: <MockNewCreate light={!isDark} />,
    },
    {
      badge: "🚀 Dashboard 2026",
      title: "La app que usas hoy",
      tone: "story",
      desc: (
        <>
          Accesos rápidos, glass, indigo, gráficos vivos, rendimiento de
          choferes y operarios, y una experiencia mucho más profesional.
        </>
      ),
      visual: <MockNewDashboard light={!isDark} />,
    },
    {
      badge: "📦 Seguimiento",
      title: "Despachos bajo control",
      tone: "story",
      desc: (
        <>
          Filtros potentes, estados claros, exportar a Excel, PDF e imprimir.
          Todo lo que necesitas para no perder un solo pedido.
        </>
      ),
      visual: <MockTracking />,
    },
    {
      badge: "🧩 Funciones nuevas",
      title: "Todo lo que se sumó este año",
      tone: "story",
      desc: (
        <>
          Producción, récords, cambios de productos, notas de crédito,
          consumos internos, tutoriales en video, rendimiento…
          y seguimos sumando.
        </>
      ),
      visual: (
        <div className="aem-features">
          {[
            "Crear / Seguir despachos",
            "Ingreso de producción",
            "Récords de producción",
            "Cambios de productos",
            "Notas de crédito",
            "Consumo interno",
            "Tutoriales en video",
            "Modo claro / oscuro",
            "Rendimiento choferes",
            "Rendimiento operarios",
            "Movimientos de stock",
            "Administración de usuarios",
          ].map((f) => (
            <span key={f} className="aem-chip">
              {f}
            </span>
          ))}
        </div>
      ),
    },
    {
      badge: "😄 Un momento",
      title: "Chiste de aniversario",
      tone: "joke",
      desc: (
        <>
          ¿Qué le dice un despacho al otro después de un año?
          <br />
          <strong>«Hermano… ¡ya no estamos pendientes!»</strong>
          <br />
          <span style={{ opacity: 0.75, fontSize: "0.92em" }}>
            (Bueno… algunos sí, pero cada vez menos 😉)
          </span>
        </>
      ),
      visual: (
        <div className="aem-joke">
          <div className="aem-joke-emoji">📦💬</div>
          <div className="aem-joke-text">1 año de pedidos entregados</div>
        </div>
      ),
    },
    {
      badge: "🙏 Gracias",
      title: "Esto es gracias a ustedes",
      tone: "thanks",
      desc: (
        <>
          Cada inicio de sesión, cada despacho creado, cada reporte revisado…
          nos ayudó a mejorar. <strong>Gracias por confiar en SignoApp</strong> durante este primer año.
        </>
      ),
      visual: (
        <div className="aem-thanks">
          <div className="aem-thanks-line">Gracias por el apoyo</div>
          <div className="aem-thanks-line soft">Gracias por la paciencia</div>
          <div className="aem-thanks-line soft">Gracias por las ideas</div>
          <div className="aem-thanks-big">¡Y por seguir eligiendo SignoApp!</div>
        </div>
      ),
    },
    {
      badge: "✨ Por muchos más",
      title: "Que sean muchos años más",
      tone: "close",
      desc: (
        <>
          Seguimos construyendo la herramienta que necesitas.
          Que este sea solo el primero de muchos aniversarios juntos.
        </>
      ),
      visual: (
        <div className="aem-close">
          <div className="aem-close-emoji">🚀🎉</div>
          <div className="aem-close-text">SignoApp · Año 1 completado</div>
          <div className="aem-close-sub">A por el año 2</div>
        </div>
      ),
    },
  ];

  // Versión corta para choferes / operarios
  const shortSlides: SlideDef[] = [
    fullSlides[0],
    {
      badge: "🚀 Evolución",
      title: "Cómo cambió SignoApp",
      tone: "story",
      desc: (
        <>
          De una pantalla simple a una app completa con modo claro/oscuro,
          mejores formularios y mucho más control de la operación.
        </>
      ),
      visual: <MockNewDashboard light={!isDark} />,
    },
    fullSlides[fullSlides.length - 3], // chiste
    fullSlides[fullSlides.length - 2], // gracias
    fullSlides[fullSlides.length - 1], // cierre
  ];

  const effectiveSlides = showFull ? fullSlides : shortSlides;

  const goPrev = () => {
    setSlide((s) => (s - 1 + effectiveSlides.length) % effectiveSlides.length);
    setProgress(0);
  };
  const goNext = () => {
    setSlide((s) => (s + 1) % effectiveSlides.length);
    setProgress(0);
  };

  const current = effectiveSlides[slide];

  const modalStyle = {
    background: isDark ? "#0B0F1A" : "#FFFFFF",
    border: isDark ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(99,102,241,0.18)",
    boxShadow: isDark ? "0 24px 60px rgba(0,0,0,0.6)" : "0 24px 60px rgba(15,23,42,0.18)",
    "--aem-text": isDark ? "#FFFFFF" : "#0F172A",
    "--aem-text-muted": isDark ? "rgba(255,255,255,0.55)" : "rgba(15,23,42,0.55)",
    "--aem-bg-elev": isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
    "--aem-border": isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.1)",
    "--aem-mock-bg": isDark ? "#05070C" : "#F4F6FD",
    "--aem-mock-surface": isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
    "--aem-mock-border": isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)",
    "--aem-mock-text": isDark ? "rgba(255,255,255,0.85)" : "#0F172A",
    "--aem-mock-text-muted": isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.45)",
    "--aem-accent": "#6366F1",
  } as CSSProperties;

  return (
    <div className="aem-overlay" onClick={close}>
      <audio
        ref={audioRef}
        src={BG_MUSIC_SRC}
        loop
        preload="auto"
      />

      <style>{`
        .aem-overlay {
          position: fixed; inset: 0; z-index: 20000;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: aem-fade-in .2s ease both;
        }
        @keyframes aem-fade-in { from { opacity: 0; } to { opacity: 1; } }

        .aem-modal {
          width: 100%;
          max-width: 520px;
          border-radius: 20px;
          padding: 20px 20px 18px;
          box-sizing: border-box;
          font-family: 'DM Sans', sans-serif;
          animation: aem-pop .3s cubic-bezier(0.34,1.56,0.64,1) both;
          max-height: 92vh;
          overflow-y: auto;
          position: relative;
        }
        @keyframes aem-pop {
          from { opacity: 0; transform: scale(0.94) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .aem-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .aem-badge {
          font-size: 11px; font-weight: 700; letter-spacing: .04em;
          color: #818CF8; background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.3);
          padding: 3px 10px; border-radius: 999px;
        }
        .aem-close {
          width: 28px; height: 28px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--aem-border); background: var(--aem-bg-elev);
          color: var(--aem-text-muted); cursor: pointer; transition: color .15s;
          padding: 0;
        }
        .aem-close:hover { color: var(--aem-text); }
        .aem-close svg { display: block !important; stroke: currentColor !important; fill: none !important; width: 16px !important; height: 16px !important; }

        .aem-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(17px, 4.2vw, 21px);
          font-weight: 800;
          color: var(--aem-text);
          margin: 4px 0 6px;
        }
        .aem-desc { font-size: 13px; line-height: 1.55; color: var(--aem-text-muted); margin: 0 0 14px; }
        .aem-desc strong { color: var(--aem-text); }

        .aem-carousel { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .aem-arrow {
          flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--aem-border); background: var(--aem-bg-elev);
          color: var(--aem-text-muted); cursor: pointer; transition: all .15s;
          padding: 0;
        }
        .aem-arrow:hover { color: var(--aem-text); border-color: #818CF8; }
        .aem-arrow svg { display: block !important; stroke: currentColor !important; fill: none !important; width: 16px !important; height: 16px !important; }

        .aem-slide-frame {
          flex: 1; min-width: 0;
          border-radius: 14px; overflow: hidden;
          background: var(--aem-mock-bg);
          border: 1px solid var(--aem-mock-border);
          padding: 10px;
          min-height: 210px;
          display: flex; align-items: center; justify-content: center;
        }

        /* ── Progress bar ── */
        .aem-progress-track {
          height: 3px; border-radius: 2px;
          background: var(--aem-border);
          margin-bottom: 12px; overflow: hidden;
        }
        .aem-progress-fill {
          height: 100%; border-radius: 2px;
          background: linear-gradient(90deg, #4F46E5, #818CF8);
          width: 0%; transition: none;
        }

        .aem-controls {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          margin-bottom: 12px;
        }
        .aem-play {
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--aem-border); background: var(--aem-bg-elev);
          color: var(--aem-text-muted); cursor: pointer; padding: 0;
        }
        .aem-play:hover { color: var(--aem-text); border-color: #818CF8; }
        .aem-play svg { display: block !important; stroke: currentColor !important; fill: none !important; width: 14px !important; height: 14px !important; }

        .aem-dots { display: flex; justify-content: center; gap: 5px; }
        .aem-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--aem-border); border: none; cursor: pointer; padding: 0; transition: all .2s;
        }
        .aem-dot.active { width: 16px; border-radius: 4px; background: #6366F1; }

        .aem-footer { display: flex; justify-content: center; }
        .aem-btn-primary {
          min-width: 140px;
          display: inline-flex; align-items: center; justify-content: center;
          padding: 11px 20px; border-radius: 11px; font-size: 13px; font-weight: 700;
          border: none; background: linear-gradient(135deg, #4F46E5, #6366F1);
          box-shadow: 0 4px 16px rgba(99,102,241,0.35); color: #fff;
          cursor: pointer; transition: all .15s; font-family: 'DM Sans', sans-serif;
        }
        .aem-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(99,102,241,0.45); }

        /* ── Hero ── */
        .aem-hero {
          text-align: center; padding: 18px 8px;
        }
        .aem-hero-emoji { font-size: 36px; margin-bottom: 8px; }
        .aem-hero-year {
          font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800;
          color: var(--aem-mock-text); letter-spacing: -0.02em;
        }
        .aem-hero-sub { font-size: 12px; color: var(--aem-mock-text-muted); margin-top: 6px; }

        /* ── Old dashboard mock ── */
        .aem-old-dash {
          background: #E8F0FE; color: #1e293b; border-radius: 10px; padding: 10px;
          font-size: 9px; width: 100%;
        }
        .aem-old-header { font-weight: 700; font-size: 12px; margin-bottom: 8px; color: #0f172a; }
        .aem-old-row { display: flex; gap: 8px; margin-bottom: 8px; }
        .aem-old-blue-block {
          width: 70px; min-height: 90px; background: #2563EB; color: white;
          border-radius: 8px; display: flex; align-items: center; justify-content: center;
          text-align: center; font-weight: 600; font-size: 10px; padding: 6px; flex-shrink: 0;
        }
        .aem-old-btns { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
        .aem-old-btn {
          background: white; border: 1px solid #cbd5e1; border-radius: 6px;
          padding: 5px 6px; font-size: 8.5px; color: #334155;
        }
        .aem-old-error { color: #dc2626; font-size: 9px; margin-bottom: 4px; }
        .aem-old-selects { display: flex; gap: 6px; margin-bottom: 4px; }
        .aem-old-selects span {
          background: #1e293b; color: white; padding: 3px 8px; border-radius: 4px; font-size: 9px;
        }
        .aem-old-empty { color: #64748b; font-size: 9px; }

        /* ── Mid dashboard ── */
        .aem-mid-dash {
          background: #0f172a; color: #e2e8f0; border-radius: 10px; padding: 10px; width: 100%;
          font-size: 9px;
        }
        .aem-mid-header { font-weight: 700; font-size: 12px; margin-bottom: 8px; }
        .aem-mid-start {
          background: #2563EB; color: white; text-align: center; padding: 7px;
          border-radius: 8px; font-weight: 600; margin-bottom: 8px; font-size: 11px;
        }
        .aem-mid-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; margin-bottom: 8px; }
        .aem-mid-btn {
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
          border-radius: 6px; padding: 5px 4px; font-size: 8px; text-align: center;
        }
        .aem-mid-chart-label { font-size: 9px; color: rgba(255,255,255,0.5); margin-bottom: 4px; }
        .aem-mid-bars {
          display: flex; align-items: flex-end; gap: 3px; height: 48px;
        }
        .aem-mid-bar {
          flex: 1; background: #60a5fa; border-radius: 2px 2px 0 0; min-height: 4px;
        }

        /* ── New dashboard ── */
        .aem-new-dash {
          background: #080C14; color: #e2e8f0; border-radius: 10px; padding: 10px; width: 100%;
          font-size: 9px;
        }
        .aem-new-dash.light {
          background: #F8FAFC; color: #0f172a;
        }
        .aem-new-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 6px; }
        .aem-new-label { font-size: 8px; letter-spacing: .06em; color: rgba(99,102,241,0.8); font-weight: 600; }
        .aem-new-dash.light .aem-new-label { color: rgba(79,70,229,0.85); }
        .aem-new-welcome { font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700; }
        .aem-new-start-btn {
          background: linear-gradient(135deg, #4F46E5, #6366F1); color: white;
          padding: 5px 8px; border-radius: 7px; font-size: 9px; font-weight: 600; white-space: nowrap;
        }
        .aem-new-section {
          font-size: 8px; letter-spacing: .06em; color: rgba(99,102,241,0.7);
          font-weight: 600; margin-bottom: 5px;
        }
        .aem-new-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; margin-bottom: 8px; }
        .aem-new-btn {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
          border-left: 2px solid rgba(99,102,241,0.6); border-radius: 6px;
          padding: 5px 5px; font-size: 8px; line-height: 1.2;
        }
        .aem-new-dash.light .aem-new-btn {
          background: rgba(15,23,42,0.03); border: 1px solid rgba(15,23,42,0.08);
          border-left: 2px solid rgba(99,102,241,0.6); color: #0f172a;
        }
        .aem-new-chart-box {
          background: rgba(30,40,80,0.35); border: 1px solid rgba(99,102,241,0.18);
          border-radius: 8px; padding: 6px 8px;
        }
        .aem-new-dash.light .aem-new-chart-box {
          background: rgba(99,102,241,0.04); border: 1px solid rgba(99,102,241,0.15);
        }
        .aem-new-chart-title { font-size: 9px; margin-bottom: 4px; opacity: 0.8; }
        .aem-new-bars { display: flex; align-items: flex-end; gap: 3px; height: 36px; }
        .aem-new-bar {
          flex: 1; background: #818CF8; border-radius: 2px 2px 0 0; min-height: 3px;
        }

        /* ── Old form ── */
        .aem-old-form {
          background: #111827; color: #e2e8f0; border-radius: 10px; padding: 10px; width: 100%;
          font-size: 9px;
        }
        .aem-old-form-title { font-weight: 700; font-size: 12px; margin-bottom: 8px; text-align: center; }
        .aem-old-input {
          background: #1f2937; border: 1px solid #374151; border-radius: 5px;
          padding: 5px 7px; margin-bottom: 5px; color: #9ca3af; font-size: 9px;
        }
        .aem-old-input.tiny { flex: 1; margin-bottom: 0; }
        .aem-old-blue-sm {
          background: #2563EB; color: white; display: inline-block;
          padding: 4px 8px; border-radius: 5px; font-size: 9px; margin-bottom: 5px;
        }
        .aem-old-blue-sm.full { display: block; text-align: center; margin-top: 6px; }
        .aem-old-row { display: flex; gap: 5px; align-items: center; margin-bottom: 5px; }
        .aem-old-green {
          background: #16a34a; color: white; padding: 4px 8px; border-radius: 5px; font-size: 9px;
        }

        /* ── New form ── */
        .aem-new-form {
          background: #0B0F1A; color: #e2e8f0; border-radius: 10px; padding: 10px; width: 100%;
          font-size: 9px;
        }
        .aem-new-form.light {
          background: #F8FAFC; color: #0f172a;
        }
        .aem-new-form-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px; margin-bottom: 2px; }
        .aem-new-form-sub { font-size: 9px; color: var(--aem-mock-text-muted); margin-bottom: 8px; }
        .aem-new-section-card {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px; padding: 8px; margin-bottom: 6px;
        }
        .aem-new-form.light .aem-new-section-card {
          background: #fff; border: 1px solid rgba(15,23,42,0.1);
        }
        .aem-new-sec-label {
          font-size: 8px; letter-spacing: .05em; color: #818CF8; font-weight: 600; margin-bottom: 5px;
        }
        .aem-new-field { font-size: 8px; color: var(--aem-mock-text-muted); margin-bottom: 2px; }
        .aem-new-field.half { flex: 1; }
        .aem-new-input {
          background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 5px; padding: 5px 7px; margin-bottom: 5px; color: #94a3b8; font-size: 9px;
        }
        .aem-new-form.light .aem-new-input {
          background: #F1F5F9; border: 1px solid rgba(15,23,42,0.12); color: #64748b;
        }
        .aem-new-input.half { flex: 1; margin-bottom: 0; }
        .aem-new-row { display: flex; gap: 6px; margin-bottom: 5px; }
        .aem-new-purple-sm {
          display: inline-block; background: rgba(99,102,241,0.15); color: #A5B4FC;
          border: 1px solid rgba(99,102,241,0.3); padding: 3px 7px; border-radius: 5px; font-size: 9px;
        }
        .aem-new-form.light .aem-new-purple-sm {
          color: #4F46E5; background: rgba(99,102,241,0.1);
        }
        .aem-new-purple-btn {
          background: linear-gradient(135deg, #4F46E5, #6366F1); color: white;
          text-align: center; padding: 7px; border-radius: 8px; font-weight: 600; font-size: 11px;
          margin-top: 4px;
        }

        /* ── Tracking ── */
        .aem-track {
          background: #0B0F1A; color: #e2e8f0; border-radius: 10px; padding: 10px; width: 100%;
          font-size: 9px;
        }
        .aem-track-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px; margin-bottom: 6px; }
        .aem-track-filters { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px; }
        .aem-track-f {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 5px; padding: 5px 6px; color: #94a3b8; font-size: 8.5px;
        }
        .aem-track-card {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px; padding: 8px;
        }
        .aem-track-badges { display: flex; gap: 5px; margin-bottom: 5px; flex-wrap: wrap; }
        .aem-badge {
          font-size: 8px; font-weight: 600; padding: 2px 6px; border-radius: 4px;
        }
        .aem-badge.folio { background: rgba(99,102,241,0.2); color: #A5B4FC; border: 1px solid rgba(99,102,241,0.3); }
        .aem-badge.ok { background: rgba(52,211,153,0.15); color: #34D399; border: 1px solid rgba(52,211,153,0.3); }
        .aem-track-meta { font-size: 9px; margin-bottom: 2px; }
        .aem-track-meta.muted { color: #94a3b8; font-size: 8.5px; }
        .aem-track-prods { margin-top: 5px; display: flex; flex-direction: column; gap: 3px; }
        .aem-track-prods span {
          background: rgba(255,255,255,0.05); border-radius: 4px; padding: 3px 6px; font-size: 8.5px;
        }

        /* ── Features chips ── */
        .aem-features {
          display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; padding: 6px 0;
        }
        .aem-chip {
          font-size: 9px; font-weight: 600; padding: 4px 8px; border-radius: 999px;
          background: rgba(99,102,241,0.12); color: #A5B4FC;
          border: 1px solid rgba(99,102,241,0.25);
        }

        /* ── Joke / Thanks / Close ── */
        .aem-joke, .aem-thanks, .aem-close {
          text-align: center; padding: 16px 8px;
        }
        .aem-joke-emoji, .aem-close-emoji { font-size: 32px; margin-bottom: 8px; }
        .aem-joke-text, .aem-close-text {
          font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700;
          color: var(--aem-mock-text);
        }
        .aem-close-sub { font-size: 12px; color: var(--aem-mock-text-muted); margin-top: 4px; }
        .aem-thanks-line {
          font-size: 13px; font-weight: 600; color: var(--aem-mock-text); margin-bottom: 4px;
        }
        .aem-thanks-line.soft { opacity: 0.7; font-weight: 500; font-size: 12px; }
        .aem-thanks-big {
          margin-top: 10px; font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 800;
          color: #818CF8;
        }

        @media (max-width: 400px) {
          .aem-modal { padding: 14px 12px 12px; }
          .aem-slide-frame { min-height: 180px; padding: 8px; }
          .aem-new-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="aem-modal" onClick={(e) => e.stopPropagation()} style={modalStyle}>
        <div className="aem-header">
          <span className="aem-badge">{current.badge || "🎉 Aniversario"}</span>
          <button className="aem-close" onClick={close} aria-label="Cerrar" type="button">
            <FiX size={16} color={iconMuted} />
          </button>
        </div>

        <h2 className="aem-title">{current.title}</h2>
        <p className="aem-desc">{current.desc}</p>

        <div className="aem-carousel">
          {effectiveSlides.length > 1 && (
            <button className="aem-arrow" onClick={goPrev} aria-label="Anterior" type="button">
              <FiChevronLeft size={16} color={iconMuted} />
            </button>
          )}

          <div className="aem-slide-frame">
            {current.visual}
          </div>

          {effectiveSlides.length > 1 && (
            <button className="aem-arrow" onClick={goNext} aria-label="Siguiente" type="button">
              <FiChevronRight size={16} color={iconMuted} />
            </button>
          )}
        </div>

        <div className="aem-progress-track">
          <div className="aem-progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>

        <div className="aem-controls">
          <button
            className="aem-play"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pausar" : "Reproducir"}
            type="button"
          >
            {playing ? <FiPause size={14} color={iconMuted} /> : <FiPlay size={14} color={iconMuted} />}
          </button>
          <div className="aem-dots">
            {effectiveSlides.map((_, i) => (
              <button
                key={i}
                className={`aem-dot ${i === slide ? "active" : ""}`}
                onClick={() => { setSlide(i); setProgress(0); }}
                aria-label={`Ir a la diapositiva ${i + 1}`}
                type="button"
              />
            ))}
          </div>
        </div>

        <div className="aem-footer">
          <button className="aem-btn-primary" onClick={close} type="button">
            ¡Vamos por más años!
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnniversaryEvolutionModal;