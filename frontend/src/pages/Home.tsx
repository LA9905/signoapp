import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Truck,
  FileText,
  Users,
  Shield,
  BarChart3,
  Search,
  CheckCircle2,
} from "lucide-react";

/**
 * Home con:
 * - Navbar con logo pequeño (hero-1.jpg)
 * - Hero tipográfico + collage de 4 imágenes separados (sin solaparse)
 * - Secciones y footer más “grandes”
 * - 100% responsivo (xs → xl)
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-blue-500/30 selection:text-white">
      <NavBar />

      {/* HERO */}
      <header className="relative overflow-hidden">
        <BackgroundBlobs />

        <div className="mx-auto max-w-[1366px] grid gap-12 px-4 pt-16 pb-16 md:grid-cols-12 md:gap-10 md:pt-24 md:pb-20">
          {/* Texto */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="md:col-span-6 md:col-start-2"
          >
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Online • Disponible 24/7
            </p>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              <span className="block">Make it</span>
              <span className="mt-2 block bg-gradient-to-r from-blue-300 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                Happen
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base text-neutral-300 sm:text-lg">
              Crea y sigue despachos en tiempo real, genera PDF con código de
              barras y administra productos, clientes y choferes en un solo lugar.
            </p>
            
            <h3 className="text-2xl font-semibold sm:text-3xl">Empieza gratis hoy</h3>
            <p className="mx-auto mt-3 max-w-xl text-base text-neutral-300">
              Pruébala en tu equipo y en el móvil. Sin instalaciones ni complicaciones.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-7 py-3.5 text-base font-semibold shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
              >
                Crear cuenta
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-7 py-3.5 text-base font-medium backdrop-blur transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                Ya tengo cuenta
              </Link>
            </div>

            {/* Badges */}
            <ul className="mt-6 flex flex-wrap gap-2 text-xs text-neutral-400">
              <Badge icon={<Shield className="h-3.5 w-3.5" />}>JWT + HTTPS</Badge>
              <Badge icon={<FileText className="h-3.5 w-3.5" />}>PDF con Code128</Badge>
              <Badge icon={<BarChart3 className="h-3.5 w-3.5" />}>Gráficos mensuales</Badge>
            </ul>
          </motion.div>

          {/* Collage (columna derecha) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="md:col-span-4 md:col-start-8 flex items-start justify-center"
          >
            <Collage />
          </motion.div>
        </div>
      </header>

      {/* FEATURES */}
      <section className="mx-auto max-w-[1366px] px-4 pb-14 md:pb-18">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Todo lo que necesitas</h2>
          <p className="mt-3 text-base text-neutral-300">
            Optimiza tu operación desde el primer día.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard title="Despachos en minutos" desc="Crea, edita y sigue estados en tiempo real." icon={<Truck className="h-5 w-5" />} />
          <FeatureCard title="PDF + Código de barras" desc="Imprime guías con Code128, listas para bodega y reparto." icon={<FileText className="h-5 w-5" />} />
          <FeatureCard title="Clientes y choferes" desc="Agenda centralizada para reutilizar en cada despacho." icon={<Users className="h-5 w-5" />} />
          <FeatureCard title="Gráficos mensuales" desc="Visualiza desempeño por día con un clic." icon={<BarChart3 className="h-5 w-5" />} />
          <FeatureCard title="Seguimiento avanzado" desc="Filtra por cliente, orden, chofer, usuario o fecha." icon={<Search className="h-5 w-5" />} />
          <FeatureCard title="Seguro por diseño" desc="JWT, CORS y mejores prácticas de acceso." icon={<Shield className="h-5 w-5" />} />
        </div>
      </section>

      {/* PASOS */}
      <section className="mx-auto max-w-[1366px] px-4 pb-20 md:pb-24">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Cómo funciona</h2>
        </div>
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Step num="1" title="Regístrate" desc="Crea tu cuenta en segundos." />
          <Step num="2" title="Carga catálogos" desc="Productos, clientes y choferes." />
          <Step num="3" title="Genera despachos" desc="PDF listo para imprimir o enviar." />
          <Step num="4" title="Haz seguimiento" desc="Actualiza estado hasta la entrega." />
        </ol>
      </section>

      {/* CTA FINAL */}
      

      <Footer />
    </div>
  );
}

/* ----------------- Componentes ----------------- */

function NavBar() {
  return (
    <nav className="sticky top-0 z-30 border-b border-white/10 bg-neutral-950/70 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="mx-auto max-w-[1366px] flex items-center justify-between px-4 py-3 sm:py-4">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/hero-1.jpg"
            alt="Signo"
            className="h-5 w-auto rounded-[6px] object-contain sm:h-5"
          />
          <span className="text-lg font-bold tracking-wide sm:text-xl">SignoApp</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/login" className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20">
            Iniciar sesión
          </Link>
          <Link to="/register" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold shadow shadow-blue-600/20 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/60">
            Registrarse
          </Link>
        </div>
      </div>
    </nav>
  );
}

function BackgroundBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute left-1/2 top-[-24%] h-[44rem] w-[44rem] -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute left-[10%] bottom-[-28%] h-[30rem] w-[30rem] rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute right-[-6%] bottom-[-18%] h-[24rem] w-[24rem] rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(60rem_60rem_at_120%_10%,rgba(255,255,255,0.06),transparent_40%),radial-gradient(40rem_40rem_at_-20%_80%,rgba(255,255,255,0.05),transparent_35%)]" />
    </div>
  );
}

/** Collage con 4 tarjetas, separadas (sin superposición).
 *  “Mosaico” usando grid con row-span/translate para sensación dinámica.
 */
function Collage() {
  return (
    <div className="w-full max-w-[620px]">
      <div className="grid grid-cols-2 gap-4 sm:gap-5">
        {/* Arriba izquierda (grande) */}
        <PictureCard src="/hero-2.webp" caption="Preparación de pedidos" height="h-44 sm:h-56 lg:h-64" />
        {/* Arriba derecha (grande con pequeño offset) */}
        <div className="translate-y-2 sm:translate-y-3">
          <PictureCard src="/hero-5.gif" caption="Coordinación y seguimiento" height="h-44 sm:h-56 lg:h-64" />
        </div>
        {/* Abajo izquierda (mediana con pequeño offset) */}
        <div className="-translate-y-1 sm:-translate-y-2">
          <PictureCard src="/hero-3.gif" caption="Revisión de ruta con chofer" height="h-36 sm:h-40 lg:h-48" />
        </div>
        {/* Abajo derecha (mediana) */}
        <PictureCard src="/hero-4.webp" caption="Control de inventario" height="h-36 sm:h-40 lg:h-48" />
      </div>
    </div>
  );
}

function PictureCard({
  src,
  caption,
  height = "h-48",
}: {
  src: string;
  caption: string;
  height?: string;
}) {
  return (
    <div
      className={[
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60 p-1.5",
        "ring-1 ring-white/5 shadow-xl shadow-black/20 backdrop-blur",
        height,
      ].join(" ")}
    >
      <img
        src={src}
        alt={caption}
        className="h-full w-full rounded-xl object-cover opacity-95 transition duration-300 group-hover:scale-[1.03] group-hover:opacity-100"
      />
      <div className="pointer-events-none absolute inset-1 rounded-xl bg-gradient-to-t from-black/35 via-black/0 to-transparent" />
      <div className="absolute bottom-2 left-2 right-2 text-[11px] text-neutral-200 drop-shadow">
        {caption}
      </div>
    </div>
  );
}

function Badge({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1">
      {icon}
      {children}
    </span>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm ring-1 ring-black/0 transition hover:bg-white/10 hover:ring-black/10"
    >
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-300">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-neutral-300">{desc}</p>
      <div className="mt-3 flex items-center gap-1 text-xs text-neutral-400">
        <CheckCircle2 className="h-4 w-4" />
        Listo para móvil y escritorio
      </div>
    </motion.div>
  );
}

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <li className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/20 font-bold text-blue-300">
        {num}
      </div>
      <h4 className="text-lg font-semibold">{title}</h4>
      <p className="mt-1.5 text-sm text-neutral-300">{desc}</p>
    </li>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-neutral-950">
      <div className="mx-auto max-w-[1366px] flex items-center justify-between px-4 py-3 sm:py-4">
        {/* Acerca de */}
        <div className="sm:col-span-3">
          <h4 className="mb-3 text-sm font-semibold text-neutral-200">Acerca de</h4>
          <ul className="space-y-2 text-sm text-neutral-300">
            <li>Producto</li> 
            <li>Contacto</li>
          </ul>
        </div>

        {/* Legal */}
        <div className="sm:col-span-4">
          <h4 className="mb-3 text-sm font-semibold text-neutral-2 00">Legal</h4>
          <ul className="space-y-2 text-sm text-neutral-300">
            <li>Privacidad</li>
            <li>Términos</li>
          </ul>
        </div>
      </div>

      <div className="py-6 text-center text-xs text-neutral-500">
        &copy; {new Date().getFullYear()} SignoApp. Todos los derechos reservados.
      </div>
    </footer>
  );
}