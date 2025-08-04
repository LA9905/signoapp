// src/components/NavbarUser.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const NavbarUser = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const name = localStorage.getItem("name");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    navigate("/login");
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex justify-between items-center bg-blue-100 px-4 py-3 shadow">
      <img
        src="/logo.jpg"
        alt="Logo empresa"
        className="h-6 w-auto object-contain" // Reducido a h-6 (24px)
      />

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 focus:outline-none"
        >
          <div className="w-8 h-8 overflow-hidden"> {/* Contenedor fijo para forzar tamaño */}
            <img
              src="/avatar3.png"
              alt="Perfil"
              className="w-full h-full object-cover rounded-full border border-gray-400"
            />
          </div>
          <span className="font-semibold text-sm text-gray-800">{name}</span>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-20">
            <button
              className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
              onClick={() => {
                setOpen(false);
                navigate("/edit-profile");
              }}
            >
              Editar perfil
            </button>
            <button
              className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
              onClick={handleLogout}
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavbarUser;