import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

interface NavbarUserProps {
  avatarUrl: string | null;
}

const NavbarUser: React.FC<NavbarUserProps> = ({ avatarUrl }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const name = localStorage.getItem("name") || "Usuario";
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <div className="flex items-center justify-between bg-blue-100 px-4 sm:px-8 lg:px-10 py-3 shadow w-full">
      
      {/* Logo + SignoApp - responsive */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <img
          src="/SignoApp.svg"
          alt="Logo SignoApp"
          className="h-10 w-auto sm:h-12"
        />
        <span className="text-lg sm:text-2xl font-bold text-gray-900 whitespace-nowrap">
          SignoApp
        </span>
      </div>

      {/* Botón de perfil */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="user-chip flex items-center gap-2.5 bg-white rounded-full pl-1 pr-4 py-1.5 shadow-sm hover:shadow-md transition-all focus:outline-none"
        >
          <img
            src={avatarUrl || "/avatar3.png"}
            alt="Perfil"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-300 flex-shrink-0"
            onError={(e) => {
              e.currentTarget.src = "/avatar3.png";
            }}
          />
          <span className="font-medium text-sm sm:text-base truncate sm:truncate-none max-w-[140px] sm:max-w-none">
            {name}
          </span>
          <svg
            className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* MENÚ */}
        {open && (
          <div className="user-menu absolute right-0 mt-2 w-56 z-50">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/edit-profile");
              }}
              className="block w-full text-left px-5 py-3 hover:bg-gray-100 border-b border-gray-200 font-medium"
            >
              Editar perfil
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full text-left px-5 py-3 hover:bg-red-50 text-red-600 font-medium"
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