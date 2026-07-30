import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Ventana del aniversario: 9 al 31 de septiembre ──
const START_DAY = 9;
const END_DAY = 31;
const ANNIV_MONTH = 9;

// ── Para probar LOCALMENTE
// Crea un archivo .env.local con:
//   VITE_FORCE_ANNIVERSARY=true
// Bórralo o ponlo en false cuando termines de probar.
const FORCE_PREVIEW =
  (import.meta as any).env?.VITE_FORCE_ANNIVERSARY === "true";

type Category = "agradecimiento" | "apoyo" | "reflexion" | "chiste" | "aniversario";

const CATEGORY_ICON: Record<Category, string> = {
  agradecimiento: "🙏",
  apoyo: "💪",
  reflexion: "✨",
  chiste: "😄",
  aniversario: "🎉",
};

// Mensajes propios del Dashboard: orientados a "empezar la jornada"
const MESSAGE_POOL: Record<Category, { title: string; body: string }[]> = {
  agradecimiento: [
    {
      title: "Gracias por empezar el día con nosotros",
      body: "Cada jornada que inicias en SignoApp es parte de este primer año. Gracias por confiar en la herramienta día a día.",
    },
    {
      title: "Un año trabajando juntos",
      body: "Cada despacho, cada registro, cada jornada iniciada: todo suma. Gracias por ser parte activa de este primer año.",
    },
    {
      title: "Gracias por tu compromiso diario",
      body: "Detrás de cada inicio de sesión hay alguien haciendo que la operación funcione. Gracias por eso.",
    },
    {
      title: "Este panel también es gracias a ti",
      body: "Tu uso diario nos ayuda a mejorar cada función del sistema. ¡Gracias por acompañarnos este año!",
    },
    {
      title: "Un año de trabajo compartido",
      body: "Gracias por confiar en SignoApp para gestionar tu día a día operativo.",
    },
  ],
  apoyo: [
    {
      title: "Vamos con todo esta jornada",
      body: "Otro día, otra oportunidad de hacer las cosas bien. ¡Que tengas una excelente jornada!",
    },
    {
      title: "Un equipo detrás tuyo",
      body: "Si algo en el sistema no funciona como esperas, cuéntanos. Seguimos mejorando en base a lo que ustedes necesitan.",
    },
    {
      title: "Tu trabajo mueve todo esto",
      body: "Cada despacho gestionado, cada producto ingresado, hace que la operación avance. ¡Buen trabajo!",
    },
    {
      title: "Seguimos mejorando el panel",
      body: "Este dashboard va a seguir creciendo con nuevas funciones pensadas en tu trabajo diario.",
    },
    {
      title: "Cuenta con el sistema",
      body: "Un año después, seguimos con el mismo objetivo: que tu jornada sea más simple de gestionar.",
    },
  ],
  reflexion: [
    {
      title: "Un año de jornadas iniciadas",
      body: "Cada vez que entras al panel, sumas a una historia de un año completo de operación diaria.",
    },
    {
      title: "Lo cotidiano también es grande",
      body: "Revisar el stock, iniciar un despacho, cerrar la jornada: pequeñas acciones que sostienen la operación completa.",
    },
    {
      title: "365 días de datos y trabajo",
      body: "Cada gráfico de este panel representa jornadas reales trabajadas. Gracias por ser parte de esos números.",
    },
    {
      title: "Un año de aprendizaje mutuo",
      body: "El sistema mejora gracias a cómo ustedes lo usan cada día. Así se construyen las herramientas que sí sirven.",
    },
    {
      title: "De la idea a la rutina diaria",
      body: "En un año, este panel pasó de ser una idea a ser parte de tu rutina de trabajo. Gracias por eso.",
    },
  ],
  chiste: [
    {
      title: "Aviso del sistema 🤖",
      body: "El dashboard cumple un año y todavía no logra adivinar qué producto vas a buscar primero. ¡Casi, casi!",
    },
    {
      title: "Dato curioso",
      body: "En un año, este gráfico ha visto más días de alta producción que días sin ningún despacho (al menos que trabajes en oficina 🤣🤣🤣🤣🤣). Buen ritmo 💪",
    },
    {
      title: "Confesión del panel",
      body: "Un año trabajando y todavía se pone nervioso cuando hay que cargar el gráfico del mes 😅. Pero siempre entrega.",
    },
    {
      title: "Meta pendiente",
      body: "Se buscan voluntarios para enseñarle al sistema qué es un fin de semana libre. Sigue activo los 365 días.",
    },
    {
      title: "Cumpleaños silencioso",
      body: "No hay torta en el dashboard, pero sí un año completo de jornadas iniciadas gracias a ti 🥹.",
    },
  ],
  aniversario: [
    {
      title: "¡Un año de SignoApp! 🎉",
      body: "El 9 de septiembre este sistema cumplió su primer año. Gracias por iniciar sesión y ser parte de esta historia.",
    },
    {
      title: "Primer aniversario en marcha",
      body: "Este panel que usas cada día para gestionar tu operación cumple un año. ¡Vamos por muchos más!🥳",
    },
    {
      title: "Un año, un panel, un equipo",
      body: "Gracias por acompañarnos desde el primer inicio de sesión hasta hoy.",
    },
    {
      title: "365 días gestionando la operación",
      body: "Feliz primer aniversario a todos los que hacen funcionar SignoApp cada día, incluido tú🤩.",
    },
    {
      title: "¡Feliz aniversario, equipo!",
      body: "Este logro también es tuyo: cada jornada iniciada aquí construyó este primer año💪.",
    },
  ],
};

const CATEGORY_ORDER: Category[] = [
  "aniversario",
  "agradecimiento",
  "apoyo",
  "reflexion",
  "chiste",
];

const CELEBRATION_PALETTE = [
  "#3B82F6",
  "#60A5FA",
  "#2563EB",
  "#F87171",
  "#FBBF24",
  "#34D399",
  "#A78BFA",
  "#F472B6",
];

type StyleVariant = "full" | "confetti-only" | "soft";
const STYLE_VARIANTS: StyleVariant[] = ["full", "confetti-only", "soft"];

function isWithinAnniversary(date: Date) {
  return (
    date.getMonth() + 1 === ANNIV_MONTH &&
    date.getDate() >= START_DAY &&
    date.getDate() <= END_DAY
  );
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const DashboardAnniversaryBanner = () => {
  const now = useMemo(() => new Date(), []);
  const active = isWithinAnniversary(now) || FORCE_PREVIEW;

  const dayNum = FORCE_PREVIEW && !isWithinAnniversary(now) ? START_DAY : now.getDate();
  const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${dayNum}`;
  const dayIndex = Math.max(0, dayNum - START_DAY);

  const category = CATEGORY_ORDER[dayIndex % CATEGORY_ORDER.length];
  const catMessages = MESSAGE_POOL[category];
  const message = catMessages[Math.floor(dayIndex / CATEGORY_ORDER.length) % catMessages.length];
  const icon = CATEGORY_ICON[category];

  const styleIdx = dayIndex % STYLE_VARIANTS.length;
  const styleVariant = STYLE_VARIANTS[styleIdx];

  // dismissed = se cerró el mensaje (y con él, toda la animación)
  const [dismissed, setDismissed] = useState(false);
  // badgeHidden = el usuario también cerró el pequeño pill persistente
  const [badgeHidden, setBadgeHidden] = useState(false);

  useEffect(() => {
    if (!active) return;
    const key = `anniv_dash_dismissed_${dateKey}`;
    const badgeKey = `anniv_dash_badge_hidden_${dateKey}`;
    if (sessionStorage.getItem(key) === "1") setDismissed(true);
    if (sessionStorage.getItem(badgeKey) === "1") setBadgeHidden(true);
  }, [active, dateKey]);

  const handleClose = () => {
    setDismissed(true);
    sessionStorage.setItem(`anniv_dash_dismissed_${dateKey}`, "1");
  };

  const handleReopen = () => {
    setDismissed(false);
    sessionStorage.removeItem(`anniv_dash_dismissed_${dateKey}`);
  };

  const handleHideBadge = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBadgeHidden(true);
    sessionStorage.setItem(`anniv_dash_badge_hidden_${dateKey}`, "1");
  };

  const balloonCount =
    styleVariant === "confetti-only" ? 0 : styleVariant === "soft" ? 6 : 6;
  const confettiCount =
    styleVariant === "confetti-only" ? 50 : styleVariant === "soft" ? 14 : 30;

  const balloons = useMemo(
    () =>
      Array.from({ length: balloonCount }).map((_, i) => {
        const r = seededRandom(dayNum * 13 + i);
        return {
          id: i,
          left: 4 + r * 90,
          color: CELEBRATION_PALETTE[i % CELEBRATION_PALETTE.length],
          duration: 14 + r * 8,
          delay: r * 6,
          size: 40 + r * 14,
          stringHeight: 44 + r * 26,
        };
      }),
    [balloonCount, dayNum]
  );

  const confetti = useMemo(
    () =>
      Array.from({ length: confettiCount }).map((_, i) => {
        const r1 = seededRandom(dayNum * 7 + i);
        const r2 = seededRandom(dayNum * 17 + i * 3);
        return {
          id: i,
          left: r1 * 100,
          color: CELEBRATION_PALETTE[i % CELEBRATION_PALETTE.length],
          duration: 6 + r2 * 5,
          delay: r1 * 6,
          rotate: r2 * 360,
          size: 5 + r2 * 5,
        };
      }),
    [confettiCount, dayNum]
  );

  if (!active) return null;

  return (
    <>
      <style>{`
        @keyframes dash-anniv-balloon-float {
          0%   { transform: translateY(115vh) translateX(0); opacity: 0; }
          8%   { opacity: 0.95; }
          50%  { transform: translateY(45vh) translateX(12px); }
          92%  { opacity: 0.95; }
          100% { transform: translateY(-25vh) translateX(-8px); opacity: 0; }
        }
        @keyframes dash-anniv-confetti-fall {
          0%   { transform: translateY(-10vh) rotate(0deg); opacity: 0.9; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.2; }
        }
        @keyframes dash-anniv-string-sway {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        @keyframes dash-anniv-glow-pulse {
          0%, 100% { box-shadow: 0 12px 40px rgba(251,191,36,0.22), 0 0 0 1px rgba(251,191,36,0.32); }
          50% { box-shadow: 0 12px 50px rgba(251,191,36,0.38), 0 0 0 1px rgba(251,191,36,0.5); }
        }
        @keyframes dash-anniv-badge-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dash-anniv-balloon, .dash-anniv-confetti, .dash-anniv-string, .dash-anniv-card, .dash-anniv-badge {
            animation: none !important;
          }
        }
      `}</style>

      {/* Globos + confetti — solo mientras el mensaje está abierto */}
      {!dismissed && (
        <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
          {balloons.map((b) => (
            <div
              key={b.id}
              className="dash-anniv-balloon absolute bottom-0 flex flex-col items-center"
              style={{
                left: `${b.left}%`,
                animation: `dash-anniv-balloon-float ${b.duration}s ease-in-out ${b.delay}s infinite`,
              }}
            >
              <div
                style={{
                  width: b.size,
                  height: b.size * 1.2,
                  borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
                  background: `linear-gradient(135deg, ${b.color}, ${b.color}CC)`,
                  boxShadow: `0 0 20px ${b.color}55`,
                }}
              />
              <div
                style={{
                  width: 5,
                  height: 5,
                  background: b.color,
                  borderRadius: "50%",
                  marginTop: -2,
                }}
              />
              <div
                className="dash-anniv-string origin-top"
                style={{
                  width: 1.5,
                  height: b.stringHeight,
                  background: "linear-gradient(to bottom, rgba(255,255,255,0.55), rgba(255,255,255,0.1))",
                  animation: `dash-anniv-string-sway ${3 + (b.id % 3)}s ease-in-out infinite`,
                }}
              />
            </div>
          ))}
          {confetti.map((c) => (
            <div
              key={c.id}
              className="dash-anniv-confetti absolute top-0"
              style={{
                left: `${c.left}%`,
                width: c.size,
                height: c.size * 0.4,
                background: c.color,
                borderRadius: 2,
                transform: `rotate(${c.rotate}deg)`,
                animation: `dash-anniv-confetti-fall ${c.duration}s linear ${c.delay}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* Mensaje principal, integrado al ancho del contenido del dashboard */}
      {!dismissed && (
        <div className="relative z-20 max-w-5xl mx-auto px-4 pt-5 sm:pt-6">
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="dash-anniv-card relative w-full rounded-2xl px-5 py-4 sm:px-7 sm:py-5"
              style={{
                background: "linear-gradient(135deg, rgba(37,99,235,0.26), rgba(96,165,250,0.14))",
                border: "1.5px solid rgba(251,191,36,0.4)",
                backdropFilter: "blur(16px)",
                animation: "dash-anniv-glow-pulse 3.5s ease-in-out infinite",
              }}
            >
              <button
                type="button"
                onClick={handleClose}
                aria-label="Cerrar"
                className="absolute right-3 top-3 text-white/40 hover:text-white/70 transition-colors bg-transparent border-0 p-1 leading-none"
              >
                ✕
              </button>
              <h2
                className="font-display flex items-center gap-2 text-white pr-8"
                style={{ fontSize: "clamp(16px, 3.2vw, 20px)", fontWeight: 800 }}
              >
                <span>{icon}</span>
                {message.title}
              </h2>
              <p
                className="text-white/75 mt-1.5 pr-6 leading-relaxed"
                style={{ fontSize: "clamp(13px, 2.4vw, 15px)" }}
              >
                {message.body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Pill persistente y opcional: queda disponible el resto del mes tras cerrar el mensaje */}
      {dismissed && !badgeHidden && (
        <button
          type="button"
          onClick={handleReopen}
          className="dash-anniv-badge"
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(37,99,235,0.85)",
            border: "1px solid rgba(251,191,36,0.5)",
            borderRadius: "999px",
            padding: "8px 14px",
            color: "white",
            fontSize: "clamp(11px, 2.4vw, 13px)",
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(37,99,235,0.4)",
            animation: "dash-anniv-badge-pulse 2.8s ease-in-out infinite",
          }}
        >
          <span>🎉</span>
          <span>Aniversario</span>
          <span
            onClick={handleHideBadge}
            role="button"
            aria-label="Ocultar"
            style={{
              marginLeft: "2px",
              opacity: 0.6,
              fontSize: "11px",
              padding: "0 2px",
            }}
          >
            ✕
          </span>
        </button>
      )}
    </>
  );
};

export default DashboardAnniversaryBanner;