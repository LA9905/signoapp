// src/pages/Home.tsx
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-gray-100">
      {/* Navbar */}
      <nav className="sticky top-0 z-10 border-b border-white/10 bg-gray-900/70 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl sm:text-2xl font-bold">
            <span>🚚</span>
            <span className="tracking-wide">SignoApp</span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/login"
              className="px-4 py-2 text-sm sm:text-base rounded-md border border-white/20 hover:border-white/40 hover:bg-white/5 transition"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm sm:text-base rounded-md bg-blue-600 hover:bg-blue-500 font-semibold shadow transition"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="container mx-auto px-4 flex-1 flex items-center">
        <div className="w-full text-center py-12 sm:py-16">
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-6">
            Gestión fácil de tus <span className="text-blue-400">despachos</span> y pedidos
          </h1>
          <p className="text-base sm:text-lg text-gray-300 max-w-3xl mx-auto mb-8">
            Crea despachos, administra productos, clientes y choferes, y da seguimiento en tiempo real.
            Genera e imprime PDF de guías con un clic. Todo en una sola plataforma.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-6 py-3 rounded-md bg-blue-600 hover:bg-blue-500 font-semibold shadow transition text-center"
            >
              Comenzar ahora
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-6 py-3 rounded-md border border-white/20 hover:border-white/40 hover:bg-white/5 transition text-center"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="container mx-auto px-4 pb-12 sm:pb-16">
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          <Feature
            icon="📦"
            title="Productos"
            desc="Registra y edita tu catálogo por categorías para reutilizarlo en cada despacho."
          />
          <Feature
            icon="👤"
            title="Clientes y Choferes"
            desc="Gestiona tus clientes y choferes, todo sincronizado con los formularios."
          />
          <Feature
            icon="🧾"
            title="Despachos + PDF"
            desc="Crea el despacho y descarga o imprime el PDF en un par de clics."
          />
          <Feature
            icon="📈"
            title="Resumen mensual"
            desc="Visualiza los despachos del mes con gráficos claros y rápidos."
          />
          <Feature
            icon="🛰️"
            title="Seguimiento"
            desc="Filtra por cliente, orden, chofer, usuario o fecha y actualiza el estado."
          />
          <Feature
            icon="🔐"
            title="Seguridad"
            desc="Acceso protegido por JWT; tus datos viajan siempre autenticados."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-gray-900">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-gray-300">
          &copy; {new Date().getFullYear()} SignoApp. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition">
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-gray-300">{desc}</p>
    </div>
  );
}