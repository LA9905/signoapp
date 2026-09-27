import { useEffect, useState, type CSSProperties } from "react";
import { api } from "../services/http";
import { useTheme } from "../context/ThemeContext";

type Status = {
  show: boolean;
  campaign_key?: string;
  is_anniversary?: boolean;
  title?: string;
  intro?: string;
};

type Ratings = {
  responsiva: number | null;
  estilo_colores: number | null;
  claridad_ui: number | null;
  intuitiva: number | null;
  cubre_necesidades: number | null;
  api_estabilidad: number | null;
  velocidad_carga: number | null;
  equipo_atencion: number | null;
  equipo_errores: number | null;
  equipo_responsabilidad: number | null;
  novedades_informadas: number | null;
  satisfaccion_general: number | null;
};

const RATING_FIELDS: { key: keyof Ratings; label: string }[] = [
  { key: "responsiva", label: "¿Se ve y funciona bien en celular/tablet/PC?" },
  { key: "estilo_colores", label: "¿Te gustan el estilo y los colores?" },
  { key: "claridad_ui", label: "¿La interfaz es clara y legible?" },
  { key: "intuitiva", label: "¿La app es intuitiva de usar?" },
  { key: "cubre_necesidades", label: "¿Cubre bien el trabajo diario de tu empresa?" },
  { key: "api_estabilidad", label: "¿Responde estable, sin errores constantes?" },
  { key: "velocidad_carga", label: "¿Qué tan rápida se siente la app?" },
  { key: "equipo_atencion", label: "¿El equipo de desarrollo atendió bien pedidos y sugerencias?" },
  { key: "equipo_errores", label: "¿Se corrigieron a tiempo los errores que surgieron?" },
  { key: "equipo_responsabilidad", label: "¿El equipo fue responsable con lo pedido?" },
  { key: "novedades_informadas", label: "¿Se informaron a tiempo las nuevas funciones?" },
  { key: "satisfaccion_general", label: "Satisfacción general con SignoApp" },
];

const emptyRatings = (): Ratings =>
  Object.fromEntries(RATING_FIELDS.map((f) => [f.key, null])) as Ratings;

const Stars = ({
  value,
  onChange,
  isDark,
}: {
  value: number | null;
  onChange: (n: number) => void;
  isDark: boolean;
}) => (
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        onClick={() => onChange(n)}
        aria-label={`${n} de 5`}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(15,23,42,0.12)",
          background:
            value !== null && n <= value
              ? "rgba(251,191,36,0.25)"
              : isDark
              ? "rgba(255,255,255,0.04)"
              : "rgba(15,23,42,0.03)",
          color: value !== null && n <= value ? "#FBBF24" : isDark ? "rgba(255,255,255,0.25)" : "rgba(15,23,42,0.25)",
          fontSize: 18,
          cursor: "pointer",
          padding: 0,
        }}
      >
        ★
      </button>
    ))}
  </div>
);

const SurveyModal = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [visible, setVisible] = useState(false);
  const [meta, setMeta] = useState<Status | null>(null);
  const [ratings, setRatings] = useState<Ratings>(emptyRatings);
  const [estilo_sugerencia, setEstilo] = useState("");
  const [necesidades_faltantes, setNec] = useState("");
  const [ideas_tecnologia, setIdeas] = useState("");
  const [errores_actuales, setErr] = useState("");
  const [comentarios_generales, setCom] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api
      .get<Status>("/survey/status")
      .then((res) => {
        if (res.data?.show) {
          setMeta(res.data);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  const setRating = (key: keyof Ratings, n: number) => {
    setRatings((prev) => ({ ...prev, [key]: n }));
  };

  const submit = async () => {
    const missing = RATING_FIELDS.filter((f) => ratings[f.key] == null);
    if (missing.length) {
      setError("Marcá todas las puntuaciones (1 a 5) antes de enviar.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await api.post("/survey/submit-app", {
        ...ratings,
        estilo_sugerencia: estilo_sugerencia || null,
        necesidades_faltantes: necesidades_faltantes || null,
        ideas_tecnologia: ideas_tecnologia || null,
        errores_actuales: errores_actuales || null,
        comentarios_generales: comentarios_generales || null,
      });
      setDone(true);
      setTimeout(() => setVisible(false), 1800);
    } catch {
      setError("No se pudo enviar. Intentá de nuevo.");
    } finally {
      setSending(false);
    }
  };

  if (!visible) return null;

  const modalStyle = {
    background: isDark ? "#0B0F1A" : "#FFFFFF",
    border: isDark ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(99,102,241,0.18)",
    boxShadow: isDark ? "0 24px 60px rgba(0,0,0,0.6)" : "0 24px 60px rgba(15,23,42,0.18)",
    color: isDark ? "#FFFFFF" : "#0F172A",
  } as CSSProperties;

  const muted = isDark ? "rgba(255,255,255,0.55)" : "rgba(15,23,42,0.55)";
  const border = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(15,23,42,0.1)";
  const inputBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "'DM Sans', sans-serif",
      }}
      onClick={() => {}}
    >
      <div
        style={{
          ...modalStyle,
          width: "100%",
          maxWidth: 520,
          maxHeight: "92vh",
          overflowY: "auto",
          borderRadius: 20,
          padding: "20px 18px 18px",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#818CF8",
              background: "rgba(99,102,241,0.12)",
              border: "1px solid rgba(99,102,241,0.3)",
              padding: "3px 10px",
              borderRadius: 999,
            }}
          >
            {meta?.is_anniversary ? "🎉 Aniversario" : "📋 Encuesta"}
          </span>
          {/* No cerrar sin responder: el usuario debe completar; opcional X solo si preferís permitir posponer el mismo día */}
        </div>

        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(18px, 4.5vw, 22px)",
            fontWeight: 800,
            margin: "4px 0 8px",
          }}
        >
          {meta?.title || "Encuesta SignoApp"}
        </h2>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: muted, margin: "0 0 16px" }}>
          {meta?.intro || "Tu opinión nos ayuda a mejorar."} Valorá del 1 al 5 (5 = mejor).
        </p>

        {done ? (
          <p style={{ textAlign: "center", padding: "32px 8px", fontWeight: 600 }}>
            ¡Gracias! Tus respuestas se enviaron correctamente.
          </p>
        ) : (
          <>
            {RATING_FIELDS.map((f) => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 6px" }}>{f.label}</p>
                <Stars
                  value={ratings[f.key]}
                  onChange={(n) => setRating(f.key, n)}
                  isDark={isDark}
                />
              </div>
            ))}

            {(
              [
                ["Ideas de estilo o colores", estilo_sugerencia, setEstilo],
                ["Funcionalidades que faltan o mejorar", necesidades_faltantes, setNec],
                ["Ideas de tecnología que faciliten el día a día", ideas_tecnologia, setIdeas],
                ["Errores actuales que debamos atender", errores_actuales, setErr],
                ["Comentarios adicionales", comentarios_generales, setCom],
              ] as const
            ).map(([label, val, set]) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, margin: "0 0 4px", color: muted }}>{label}</p>
                <textarea
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  rows={2}
                  placeholder="Opcional..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: 10,
                    border,
                    background: inputBg,
                    color: isDark ? "#fff" : "#0F172A",
                    padding: 10,
                    fontSize: 13,
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>
            ))}

            {error && (
              <p style={{ color: "#F87171", fontSize: 13, marginBottom: 10 }}>{error}</p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={sending}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 11,
                border: "none",
                background: "linear-gradient(135deg, #4F46E5, #6366F1)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: sending ? "wait" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {sending ? "Enviando…" : "Enviar encuesta"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SurveyModal;