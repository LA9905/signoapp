import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Ventana del aniversario: 9 al 31 de septiembre ──
const START_DAY = 9;
const END_DAY = 31;
const ANNIV_MONTH = 9;
// ── Para probar LOCALMENTE  ──
// Crea un archivo .env.local con:
//   VITE_FORCE_ANNIVERSARY=true
// Bórralo o ponlo en false cuando termines de probar.
const FORCE_PREVIEW =
  (import.meta as any).env?.VITE_FORCE_ANNIVERSARY === "true";

// ── Categorías de mensajes: rotan día a día ──
type Category = "agradecimiento" | "apoyo" | "reflexion" | "chiste" | "aniversario";

const CATEGORY_ICON: Record<Category, string> = {
  agradecimiento: "🙏",
  apoyo: "💪",
  reflexion: "✨",
  chiste: "😄",
  aniversario: "🎉",
};

const MESSAGE_POOL: Record<Category, { title: string; body: string }[]> = {
  agradecimiento: [
    {
      title: "Gracias por confiar en nosotros",
      body: "Cada registro, cada despacho, cada día de trabajo... lo logramos gracias a ustedes. ¡Gracias por un año increíble!",
    },
    {
      title: "Ustedes son el motor de SignoApp",
      body: "Sin su confianza diaria, nada de esto sería posible. Gracias por elegirnos cada día.",
    },
    {
      title: "Un año de gratitud",
      body: "Gracias por cada comentario, cada sugerencia y cada minuto que le dedican a la app. Se nota, y se agradece.",
    },
    {
      title: "Gracias por acompañarnos",
      body: "De un pequeño proyecto a una herramienta que usan todos los días: gracias por su apoyo constante.",
    },
    {
      title: "Todo esto es gracias a ustedes",
      body: "Su compromiso y su paciencia hicieron de SignoApp lo que es hoy. ¡Mil gracias!",
    },
  ],
  apoyo: [
    {
      title: "Seguimos mejorando, juntos",
      body: "Cada semana trabajamos para que su día a día sea más simple. Gracias por seguir apostando por nosotros.",
    },
    {
      title: "Estamos para ustedes",
      body: "Si algo no funciona como esperan, cuéntennos. Este primer año lo construimos escuchándolos, y así seguiremos.",
    },
    {
      title: "Un equipo detrás de cada clic",
      body: "Detrás de cada actualización hay un equipo pensando en que su trabajo diario sea más fácil.",
    },
    {
      title: "Vamos a seguir creciendo con ustedes",
      body: "Este es solo el comienzo. Cada mejora que viene está pensada en base a lo que ustedes necesitan.",
    },
    {
      title: "Cuenten con nosotros",
      body: "Un año después, seguimos con el mismo compromiso: hacer su trabajo más simple, día tras día.",
    },
  ],
  reflexion: [
    {
      title: "Un año, miles de historias",
      body: "Detrás de cada despacho hay un equipo trabajando duro. Gracias por ser parte de esa historia con nosotros.",
    },
    {
      title: "365 días de aprendizaje",
      body: "Cada error corregido y cada mejora nace de ustedes usando la app día a día. Gracias por esa confianza.",
    },
    {
      title: "Lo simple también es grande",
      body: "Un inicio de sesión, un registro, una entrega: pequeñas acciones que sostienen algo mucho más grande.",
    },
    {
      title: "Crecer paso a paso",
      body: "En un año pasamos de una idea a una herramienta de uso diario. Gracias por caminar este camino con nosotros.",
    },
    {
      title: "Lo que un año puede construir",
      body: "Doce meses, un equipo comprometido y ustedes confiando en el proceso. Así se construyen las cosas que duran.",
    },
  ],
  chiste: [
    {
      title: "Confesión de cumpleaños 🎂",
      body: "SignoApp cumple un año y aún no sabe que pasa con ese stock extraño de algunas bolsas 😂😂, pero al menos sus despachos no se pierden. ¡Vamos mejorando!",
    },
    {
      title: "Dato curioso",
      body: "En un año, esta app ha visto más despachos tardíos que contraseñas olvidadas. Gracias por seguir intentándolo 😅",
    },
    {
      title: "Un año sin vacaciones",
      body: "SignoApp trabajó los 365 días sin pedir un solo día libre. Ojalá todos tuviéramos esa disciplina😜.",
    },
    {
      title: "Aviso importante",
      body: "Se buscan voluntarios para explicarle a SignoApp qué es un fin de semana. Mientras tanto, sigue funcionando igual.",
    },
    {
      title: "Cumpleaños sin torta",
      body: "No podemos soplar velas 😑, pero sí podemos decir: gracias por aguantarnos (y ayudarnos a mejorar) este año🥹.",
    },
  ],
  aniversario: [
    {
      title: "¡Un año juntos! 🎉",
      body: "El 9 de septiembre SignoApp cumplió su primer año. Gracias por ser parte de este primer capítulo.",
    },
    {
      title: "Celebrando nuestro primer aniversario",
      body: "Este primer año fue posible gracias a cada uno de ustedes. ¡Vamos por muchos más!",
    },
    {
      title: "Primer aniversario de SignoApp",
      body: "Un año de trabajo, mejoras y aprendizaje constante. Gracias por acompañarnos desde el primer día.",
    },
    {
      title: "365 días, una sola meta",
      body: "Hacer su trabajo más simple. Feliz primer aniversario a todos los que hacen posible SignoApp.",
    },
    {
      title: "¡Feliz aniversario, equipo!",
      body: "Este logro es de todos: del equipo que construye y de ustedes que usan la app cada día. ¡Gracias!",
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

// Paleta de colores para globos y confetti
const CELEBRATION_PALETTE = [
  "#3B82F6", // azul marca
  "#60A5FA", // celeste
  "#2563EB", // azul fuerte
  "#F87171", // rojo suave
  "#FBBF24", // ámbar
  "#34D399", // verde
  "#A78BFA", // morado
  "#F472B6", // rosa
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

const AnniversaryBanner = () => {
  const now = useMemo(() => new Date(), []);
  const active = isWithinAnniversary(now) || FORCE_PREVIEW;

  const dayNum = FORCE_PREVIEW && !isWithinAnniversary(now) ? START_DAY : now.getDate();
  const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${dayNum}`;
  const dayIndex = Math.max(0, dayNum - START_DAY); // 0..22

  // Rota la categoría por día, y dentro de la categoría rota el mensaje para no repetir
  const category = CATEGORY_ORDER[dayIndex % CATEGORY_ORDER.length];
  const catMessages = MESSAGE_POOL[category];
  const message = catMessages[Math.floor(dayIndex / CATEGORY_ORDER.length) % catMessages.length];
  const icon = CATEGORY_ICON[category];

  const styleIdx = dayIndex % STYLE_VARIANTS.length;
  const styleVariant = STYLE_VARIANTS[styleIdx];

  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!active) return;
    const key = `anniv_dismissed_${dateKey}`;
    if (sessionStorage.getItem(key) === "1") setDismissed(true);
  }, [active, dateKey]);

  const handleClose = () => {
    setDismissed(true);
    sessionStorage.setItem(`anniv_dismissed_${dateKey}`, "1");
  };

  const balloonCount =
    styleVariant === "confetti-only" ? 0 : styleVariant === "soft" ? 8 : 7;
  const confettiCount =
    styleVariant === "confetti-only" ? 60 : styleVariant === "soft" ? 16 : 36;

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
          size: 44 + r * 16,
          stringHeight: 50 + r * 30,
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
          size: 6 + r2 * 6,
        };
      }),
    [confettiCount, dayNum]
  );

  if (!active || dismissed) return null;

  return (
    <>
      <style>{`
        @keyframes anniv-balloon-float {
          0%   { transform: translateY(115vh) translateX(0); opacity: 0; }
          8%   { opacity: 0.95; }
          50%  { transform: translateY(45vh) translateX(12px); }
          92%  { opacity: 0.95; }
          100% { transform: translateY(-25vh) translateX(-8px); opacity: 0; }
        }
        @keyframes anniv-confetti-fall {
          0%   { transform: translateY(-10vh) rotate(0deg); opacity: 0.9; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.2; }
        }
        @keyframes anniv-string-sway {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        @keyframes anniv-glow-pulse {
          0%, 100% { box-shadow: 0 12px 40px rgba(251,191,36,0.25), 0 0 0 1px rgba(251,191,36,0.35); }
          50% { box-shadow: 0 12px 50px rgba(251,191,36,0.4), 0 0 0 1px rgba(251,191,36,0.55); }
        }
        @media (prefers-reduced-motion: reduce) {
          .anniv-balloon, .anniv-confetti, .anniv-string, .anniv-card { animation: none !important; }
        }
      `}</style>

      {/* Capa de fondo: globos + confetti, no bloquea clics */}
      <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
        {balloons.map((b) => (
          <div
            key={b.id}
            className="anniv-balloon absolute bottom-0 flex flex-col items-center"
            style={{
              left: `${b.left}%`,
              animation: `anniv-balloon-float ${b.duration}s ease-in-out ${b.delay}s infinite`,
            }}
          >
            {/* Globo */}
            <div
              style={{
                width: b.size,
                height: b.size * 1.2,
                borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
                background: `linear-gradient(135deg, ${b.color}, ${b.color}CC)`,
                boxShadow: `0 0 20px ${b.color}55`,
              }}
            />
            {/* Nudo */}
            <div
              style={{
                width: 5,
                height: 5,
                background: b.color,
                borderRadius: "50%",
                marginTop: -2,
              }}
            />
            {/* Cuerda */}
            <div
              className="anniv-string origin-top"
              style={{
                width: 1.5,
                height: b.stringHeight,
                background: "linear-gradient(to bottom, rgba(255,255,255,0.55), rgba(255,255,255,0.1))",
                animation: `anniv-string-sway ${3 + (b.id % 3)}s ease-in-out infinite`,
              }}
            />
          </div>
        ))}
        {confetti.map((c) => (
          <div
            key={c.id}
            className="anniv-confetti absolute top-0"
            style={{
              left: `${c.left}%`,
              width: c.size,
              height: c.size * 0.4,
              background: c.color,
              borderRadius: 2,
              transform: `rotate(${c.rotate}deg)`,
              animation: `anniv-confetti-fall ${c.duration}s linear ${c.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Mensaje de agradecimiento */}
      <div className="relative z-20 flex justify-center px-4 pt-24 sm:pt-16">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="anniv-card relative w-full max-w-xl rounded-2xl px-6 py-5 sm:px-8 sm:py-6"
            style={{
              background: "linear-gradient(135deg, rgba(37,99,235,0.28), rgba(96,165,250,0.16))",
              border: "1.5px solid rgba(251,191,36,0.45)",
              backdropFilter: "blur(20px)",
              animation: "anniv-glow-pulse 3.5s ease-in-out infinite",
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
              className="text-xl sm:text-2xl font-extrabold text-white pr-8 flex items-center gap-2"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              <span>{icon}</span>
              {message.title}
            </h2>
            <p className="text-sm sm:text-base text-white/75 mt-2 pr-6 leading-relaxed">
              {message.body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
};

export default AnniversaryBanner;