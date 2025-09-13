import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/http";

const NavbarUser: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const nameLS = localStorage.getItem("name");
  const [name, setName] = useState<string | null>(nameLS);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
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

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => {
        setName(res.data?.name || nameLS);
        setAvatarUrl(res.data?.avatar_url || null);
        if (res.data?.name) localStorage.setItem("name", res.data.name);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex justify-between items-center bg-blue-100 px-10 py-3 shadow">
      {/* Logo + Texto */}
      <div className="flex items-center gap-3">
        <img
          src="/SignoApp.svg"
          alt="Logo SignoApp"
          className="h-12 w-auto object-contain"
        />
        <span className="text-2xl font-bold text-gray-900 tracking-wide">
          SignoApp
        </span>
      </div>

      {/* Perfil (REEMPLAZADO) */}
      <div className="relative" ref={dropdownRef}>
        {/* CHIP claro: usa .user-chip para fondo claro + texto oscuro */}
        <button
          onClick={() => setOpen(!open)}
          className="user-chip flex items-center gap-2 shadow-sm focus:outline-none"
        >
          <div className="avatar">
            <img
              src={avatarUrl || "/avatar3.png"}
              alt="Perfil"
            />
          </div>
          <span className="font-medium truncate max-w-[22ch]">{name}</span>
          {/* chevron opcional, hereda color de texto */}
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4">
            <path
              d="M5.5 7.5 10 12l4.5-4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* DROPDOWN claro: usa .user-menu para fondo blanco + texto oscuro */}
        {open && (
          <div className="user-menu absolute right-0 mt-2 w-56 z-20">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/edit-profile");
              }}
            >
              Editar perfil
            </button>
            <button type="button" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavbarUser;