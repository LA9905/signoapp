// src/components/NavbarUser.tsx
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
        {/* Logo directo, sin badge adicional */}
        <img
          src="/SignoApp.svg"
          alt="Logo SignoApp"
          className="h-12 w-auto object-contain"
        />
        <span className="text-2xl font-bold text-gray-900 tracking-wide">
          SignoApp
        </span>
      </div>

      {/* Perfil */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 focus:outline-none"
        >
          <div className="avatar h-9 w-9 rounded-full overflow-hidden ring-1 ring-gray-300">
            <img
              src={avatarUrl || "/avatar3.png"}
              alt="Perfil"
              className="h-full w-full object-cover"
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