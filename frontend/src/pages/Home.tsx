import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Truck,
  FileText,
  Users,
  Shield,
  BarChart3,
  Package,
  Bell,
  CreditCard,
  Factory,
  ArrowRight,
  ChevronDown,
  Zap,
  Globe,
  Star,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#080C14] text-white overflow-x-hidden font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        
        * { font-family: 'DM Sans', sans-serif; }
        h1, h2, h3, h4, .font-display { font-family: 'Syne', sans-serif; }

        .grid-bg {
          background-image: 
            linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        .glow-blue { box-shadow: 0 0 40px rgba(59,130,246,0.25); }
        .glow-text { text-shadow: 0 0 60px rgba(99,179,237,0.4); }

        .card-glass {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(12px);
        }

        .card-glass:hover {
          background: rgba(255,255,255,0.055);
          border-color: rgba(59,130,246,0.3);
        }

        .badge-pill {
          background: rgba(59,130,246,0.1);
          border: 1px solid rgba(59,130,246,0.2);
          color: #93C5FD;
        }

        .stat-card {
          background: linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.05));
          border: 1px solid rgba(59,130,246,0.15);
        }

        .btn-primary {
          background: linear-gradient(135deg, #2563EB, #3B82F6);
          box-shadow: 0 4px 24px rgba(59,130,246,0.35);
          transition: all 0.2s ease;
        }
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(59,130,246,0.45);
        }

        .btn-ghost {
          border: 1px solid rgba(255,255,255,0.12);
          transition: all 0.2s ease;
        }
        .btn-ghost:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.25);
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .float { animation: float 5s ease-in-out infinite; }
        .float-delay { animation: float 5s ease-in-out 1.5s infinite; }

        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.7; }
          70% { transform: scale(1.1); opacity: 0; }
          100% { transform: scale(0.95); opacity: 0; }
        }
        .pulse-ring::before {
          content: '';
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 2px solid rgba(52,211,153,0.5);
          animation: pulse-ring 2s ease-out infinite;
        }

        .number-accent {
          font-family: 'Syne', sans-serif;
          background: linear-gradient(135deg, #60A5FA, #818CF8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      <NavBar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ModulesSection />
      <CTASection />
      <WhatsAppFloat />
      <Footer />
    </div>
  );
}

/* ─── NAV ─── */
export function NavBar({ hideRegister, hideLogin }: { hideRegister?: boolean; hideLogin?: boolean } = {}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-[#080C14]/90 backdrop-blur-xl border-b border-white/5 shadow-xl shadow-black/20" : ""
    }`}>
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <img src="/SignoApp.png" alt="SignoApp" className="h-10 w-auto object-contain" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">SignoApp</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <a href="#features" className="hover:text-white transition-colors">Características</a>
          <a href="#modules" className="hover:text-white transition-colors">Módulos</a>
          <a href="#how" className="hover:text-white transition-colors">Cómo funciona</a>
        </div>

        <div className="flex items-center gap-3">
          {!hideLogin && (
            <Link to="/login" className="btn-ghost rounded-xl px-4 py-2 text-sm font-medium">
              Iniciar sesión
            </Link>
          )}
          {!hideRegister && (
            <Link to="/register" className="btn-primary rounded-xl px-5 py-2 text-sm font-semibold text-white">
              Registrarse
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

/* ─── HERO ─── */
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center grid-bg pt-20">
      {/* Blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-indigo-600/8 blur-[100px]" />
        <div className="absolute top-[40%] left-[-5%] w-[300px] h-[300px] rounded-full bg-cyan-500/6 blur-[80px]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-24 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="badge-pill inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-8">
              <span className="relative flex h-2 w-2">
                <span className="pulse-ring relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              En producción · Disponible 24/7
            </div>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
              Logística
              <br />
              <span className="glow-text" style={{
                background: "linear-gradient(135deg, #60A5FA 0%, #A78BFA 50%, #67E8F9 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}>
                sin fricciones.
              </span>
            </h1>

            <p className="text-white/55 text-lg leading-relaxed max-w-lg mb-10">
              Gestiona despachos, inventario, proveedores, operarios y facturación
              en una sola plataforma. PDF con código de barras, alertas automáticas
              y seguimiento en tiempo real.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <Link
                to="/register"
                className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-white"
              >
                Empezar gratis
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/login"
                className="btn-ghost inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-base font-medium"
              >
                Ya tengo cuenta
              </Link>
            </div>

            <div className="flex flex-wrap gap-3">
              {[
                { icon: <Shield size={13} />, label: "JWT + HTTPS" },
                { icon: <FileText size={13} />, label: "PDF Code128" },
                { icon: <Bell size={13} />, label: "Alertas por email" },
                { icon: <Globe size={13} />, label: "Deploy en la nube" },
              ].map((b) => (
                <span key={b.label} className="inline-flex items-center gap-1.5 text-xs text-white/40 border border-white/8 rounded-full px-3 py-1">
                  {b.icon}{b.label}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Right — Dashboard preview cards */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
            className="relative hidden lg:block"
          >
            <DashboardPreview />
          </motion.div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/20 animate-bounce">
          <ChevronDown size={22} />
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <div className="relative w-full max-w-lg ml-auto">
      {/* Main card */}
      <div className="card-glass rounded-2xl p-5 float">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-white/50">Despachos hoy</span>
          <span className="badge-pill text-xs px-2 py-0.5 rounded-full">En vivo</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Pendientes", val: "12", color: "text-amber-400" },
            { label: "En ruta", val: "8", color: "text-blue-400" },
            { label: "Entregados", val: "47", color: "text-emerald-400" },
          ].map((s) => (
            <div key={s.label} className="stat-card rounded-xl p-3 text-center">
              <div className={`font-display text-2xl font-bold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {[
            { client: "Clínica Norte", status: "En ruta", dot: "bg-blue-400" },
            { client: "Hospital Sur", status: "Pendiente", dot: "bg-amber-400" },
            { client: "Farmacia Vita", status: "Entregado", dot: "bg-emerald-400" },
          ].map((d) => (
            <div key={d.client} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${d.dot}`} />
                <span className="text-sm text-white/70">{d.client}</span>
              </div>
              <span className="text-xs text-white/35">{d.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stock alert card */}
      <div className="card-glass rounded-xl p-4 absolute -bottom-6 -left-10 w-52 float-delay">
        <div className="flex items-center gap-2 mb-2">
          <Bell size={14} className="text-amber-400" />
          <span className="text-xs font-medium text-white/60">Alerta stock</span>
        </div>
        <p className="text-xs text-white/40">Bolsas negras 100L</p>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full">
            <div className="h-1.5 w-[22%] bg-amber-400 rounded-full" />
          </div>
          <span className="text-xs text-amber-400 font-medium">22%</span>
        </div>
      </div>

      {/* PDF badge */}
      <div className="card-glass rounded-xl p-3 absolute -top-4 -right-6 flex items-center gap-2 float">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <FileText size={16} className="text-blue-400" />
        </div>
        <div>
          <div className="text-xs font-medium">PDF generado</div>
          <div className="text-xs text-white/35">Guía #4821</div>
        </div>
      </div>
    </div>
  );
}

/* ─── STATS ─── */
function StatsSection() {
  const stats = [
    { value: "100%", label: "Actualización de stock en tiempo real" },
    { value: "6+", label: "Módulos de gestión integrados" },
    { value: "24/7", label: "Disponibilidad en la nube" },
    { value: "0", label: "Instalaciones requeridas" },
  ];

  return (
    <section className="border-y border-white/5 bg-white/[0.015]">
      <div className="mx-auto max-w-7xl px-6 py-12 grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="text-center"
          >
            <div className="number-accent text-4xl font-extrabold mb-1">{s.value}</div>
            <div className="text-sm text-white/40">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ─── FEATURES ─── */
function FeaturesSection() {
  const features = [
    {
      icon: <Truck size={20} />,
      title: "Despachos en tiempo real",
      desc: "Crea, edita y confirma entregas al instante. Seguimiento de estado con historial completo por despacho.",
      accent: "from-blue-500/20 to-blue-600/5",
      iconColor: "text-blue-400",
    },
    {
      icon: <FileText size={20} />,
      title: "PDF + Código de barras",
      desc: "Genera guías de despacho con Code128 listas para imprimir o enviar. Formato profesional con un clic.",
      accent: "from-indigo-500/20 to-indigo-600/5",
      iconColor: "text-indigo-400",
    },
    {
      icon: <Package size={20} />,
      title: "Inventario automático",
      desc: "Stock actualizado en cada recepción, despacho, producción, consumo y nota de crédito. Sin errores manuales.",
      accent: "from-cyan-500/20 to-cyan-600/5",
      iconColor: "text-cyan-400",
    },
    {
      icon: <Bell size={20} />,
      title: "Alertas inteligentes",
      desc: "Notificaciones diarias por email sobre stock bajo y despachos pendientes. Configurable por umbral.",
      accent: "from-amber-500/20 to-amber-600/5",
      iconColor: "text-amber-400",
    },
    {
      icon: <BarChart3 size={20} />,
      title: "Reportes y gráficos",
      desc: "Visualiza el desempeño mensual con gráficos interactivos. Exporta a Excel los datos filtrados.",
      accent: "from-emerald-500/20 to-emerald-600/5",
      iconColor: "text-emerald-400",
    },
    {
      icon: <Shield size={20} />,
      title: "Seguro por diseño",
      desc: "Autenticación JWT, CORS configurado, recuperación de contraseña por email y roles de usuario.",
      accent: "from-violet-500/20 to-violet-600/5",
      iconColor: "text-violet-400",
    },
  ];

  return (
    <section id="features" className="py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="badge-pill inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-4">
            <Zap size={12} /> Características principales
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4">
            Todo lo que necesita
            <br />
            tu operación
          </h2>
          <p className="text-white/45 text-lg max-w-xl mx-auto">
            Una plataforma completa que conecta cada área de tu logística.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className={`card-glass rounded-2xl p-6 bg-gradient-to-br ${f.accent} transition-all duration-300`}
            >
              <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ${f.iconColor}`}>
                {f.icon}
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS ─── */
function HowItWorksSection() {
  const steps = [
    { num: "01", title: "Crea tu cuenta", desc: "Regístrate en segundos. Sin tarjeta, sin instalaciones." },
    { num: "02", title: "Configura catálogos", desc: "Agrega productos, clientes, choferes, proveedores y operarios." },
    { num: "03", title: "Opera sin fricciones", desc: "Despacha, recepciona compras, registra producciones y consumos." },
    { num: "04", title: "Recibe alertas y reportes", desc: "El sistema te avisa del stock bajo y los pendientes. Exporta lo que necesites." },
  ];

  return (
    <section id="how" className="py-24 px-6 border-t border-white/5">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4">Cómo funciona</h2>
          <p className="text-white/45 text-lg max-w-md mx-auto">En 4 pasos ya estás operando.</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden lg:block absolute top-8 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative"
            >
              <div className="number-accent font-display text-5xl font-extrabold mb-4 leading-none">{s.num}</div>
              <h4 className="font-display text-lg font-semibold mb-2">{s.title}</h4>
              <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── MODULES ─── */
function ModulesSection() {
  const modules = [
    { icon: <Truck size={18} />, name: "Despachos", desc: "Creación, PDF, seguimiento y confirmación de entrega." },
    { icon: <Package size={18} />, name: "Recepciones", desc: "Compras desde proveedores con órdenes y estados." },
    { icon: <Factory size={18} />, name: "Producción interna", desc: "Registro de producciones por operario con fechas." },
    { icon: <Users size={18} />, name: "Consumos internos", desc: "Control de retiros con área, retirante y motivo." },
    { icon: <FileText size={18} />, name: "Notas de crédito", desc: "Devoluciones con reingreso automático al stock." },
    { icon: <BarChart3 size={18} />, name: "Inventario", desc: "Stock en tiempo real con umbrales de alerta por categoría." },
    { icon: <CreditCard size={18} />, name: "Facturación", desc: "Suscripciones mensuales con panel de control de pagos." },
    { icon: <Bell size={18} />, name: "Notificaciones", desc: "Emails diarios de lunes a viernes con alertas configurables." },
  ];

  return (
    <section id="modules" className="py-24 px-6 bg-white/[0.015] border-t border-white/5">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="badge-pill inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-4">
            <Star size={12} /> Módulos incluidos
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4">Una plataforma, todo integrado</h2>
          <p className="text-white/45 text-lg max-w-xl mx-auto">
            Cada módulo actualiza el stock automáticamente. Sin integraciones externas ni configuraciones complejas.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="card-glass rounded-xl p-5 transition-all duration-300 group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/25 transition-colors">
                  {m.icon}
                </div>
                <span className="font-display font-semibold text-sm">{m.name}</span>
              </div>
              <p className="text-xs text-white/35 leading-relaxed">{m.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CTASection() {
  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
            <h2 className="relative font-display text-4xl sm:text-5xl font-extrabold mb-6 leading-tight">
              Listo para optimizar
              <br />
              tu operación?
            </h2>
          </div>
          <p className="text-white/45 text-lg mb-10 max-w-md mx-auto">
            Únete hoy. Sin instalaciones, sin complicaciones.
            Disponible en móvil y escritorio desde el primer día.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-base font-semibold text-white"
            >
              Crear cuenta gratis
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/login"
              className="btn-ghost inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-base font-medium"
            >
              Iniciar sesión
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── WHATSAPP ─── */
function WhatsAppFloat() {
  return (
    <a
      href="https://wa.me/56995334317?text=Hola,%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20sobre%20sus%20servicios"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chatear por WhatsApp"
      className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full shadow-xl bg-[#25D366] hover:scale-110 transition-transform text-white"
      title="Escríbenos por WhatsApp"
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" clipRule="evenodd" d="M19.11 17.2c-.28-.14-1.64-.81-1.9-.9-.26-.1-.45-.14-.64.14-.19.28-.73.9-.9 1.08-.17.19-.33.21-.61.07-.28-.14-1.16-.43-2.21-1.38-.82-.73-1.37-1.64-1.53-1.92-.16-.28-.02-.43.12-.57.12-.12.28-.33.4-.49.13-.16.17-.28.26-.47.09-.19.05-.36-.02-.5-.07-.14-.64-1.55-.88-2.12-.23-.55-.47-.47-.64-.48l-.55-.01c-.19 0-.5.07-.76.36-.26.28-1 1-1 2.44 0 1.43 1.03 2.82 1.18 3.02.14.19 2.03 3.1 4.92 4.33.69.3 1.22.48 1.63.61.68.22 1.3.19 1.79.12.55-.08 1.64-.67 1.87-1.32.23-.64.23-1.19.16-1.32-.07-.12-.26-.19-.54-.33z" />
        <path fillRule="evenodd" clipRule="evenodd" d="M26.88 5.12A13.93 13.93 0 1 0 4.9 26.88L4 30l3.2-.84a13.93 13.93 0 0 0 19.68-12.8c0-3.59-1.4-6.96-3.99-9.24zM16 27.2c-1.98 0-3.93-.5-5.71-1.56l-.41-.24-2.37.62.64-2.31-.26-.42A11.2 11.2 0 1 1 27.2 16 11.22 11.22 0 0 1 16 27.2z" />
      </svg>
    </a>
  );
}

/* ─── FOOTER ─── */
export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#060A11]">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-start justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <img src="/SignoApp.png" alt="SignoApp" className="h-8 w-auto object-contain" />
            <span className="font-display font-bold">SignoApp</span>
          </div>
          <p className="text-xs text-white/30 max-w-xs leading-relaxed">
            Plataforma de gestión logística para empresas del rubro industrial y logístico.
          </p>
        </div>

        <div className="flex gap-16">
          <div>
            <h5 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Producto</h5>
            <ul className="space-y-2 text-sm text-white/30">
              <li>Características</li>
              <li>Módulos</li>
              <li>Contacto</li>
            </ul>
          </div>
          <div>
            <h5 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Legal</h5>
            <ul className="space-y-2 text-sm text-white/30">
              <li>Privacidad</li>
              <li>Términos</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 px-6 py-4">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/80">
          <span>&copy; {new Date().getFullYear()} SignoApp. Todos los derechos reservados.</span>
          <span>
            Developed with ❤️ by{" "}
            <a href="https://www.linkedin.com/in/alejandro-arraga" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">
              Alejandro Arraga
            </a>
            {" · "}
            <a href="https://github.com/LA9905" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">
              LA9905
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}