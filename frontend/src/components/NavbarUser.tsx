import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiMenu, FiSun, FiMoon } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";

interface NavbarUserProps {
  avatarUrl: string | null;
  onMenuClick: () => void;
}

const NavbarUser: React.FC<NavbarUserProps> = ({ avatarUrl, onMenuClick }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === "dark";
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
   
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: darkMode ? "rgba(8,12,20,0.95)" : "rgba(255,255,255,0.95)",
        borderBottom: darkMode ? "1px solid rgba(99,102,241,0.18)" : "1px solid rgba(15,23,42,0.1)",
        padding: "10px 16px",
        gap: "10px",
        width: "100%",
        position: "sticky",
        top: 0,
        zIndex: 40,
        backdropFilter: "blur(12px)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Menú + Logo + nombre */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          minWidth: 0,
          flexShrink: 1,
        }}
      >
        <button
          onClick={onMenuClick}
          aria-label="Abrir menú"
          type="button"
          style={{
            width: "34px",
            height: "34px",
            minWidth: "34px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "9px",
            background: "rgba(99,102,241,0.12)",
            border: "1px solid rgba(129,140,248,0.3)",
            color: "#A5B4FC",
            cursor: "pointer",
            padding: 0,
            flexShrink: 0,
          }}
        >
          <FiMenu size={19} />
        </button>

        <img
          src="/SignoApp.svg"
          alt="Logo SignoApp"
          style={{
            height: "40px",
            width: "auto",
            flexShrink: 0,
          }}
        />

        <span
          style={{
            fontSize: "clamp(16px, 3vw, 20px)",
            fontWeight: 700,
            color: darkMode ? "white" : "#0F172A",
            whiteSpace: "nowrap",
            fontFamily: "'Syne', sans-serif",
            letterSpacing: "-0.01em",
          }}
        >
          SignoApp
        </span>
      </div>

      {/* Botón de perfil */}
      <div
        style={{
          position: "relative",
          minWidth: 0,
          flexShrink: 1,
        }}
        ref={dropdownRef}
      >
        <button
          onClick={() => setOpen(!open)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "40px",
            padding: "5px 10px 5px 5px",
            cursor: "pointer",
            transition: "background .15s, border-color .15s",
            outline: "none",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.12)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,102,241,0.3)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
          }}
        >
          <img
            src={avatarUrl || "/avatar3.png"}
            alt="Perfil"
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid rgba(99,102,241,0.4)",
              flexShrink: 0,
            }}
            onError={(e) => {
              e.currentTarget.src = "/avatar3.png";
            }}
          />
          <span
            style={{
              fontWeight: 500,
              fontSize: "14px",
              color: darkMode ? "rgba(255,255,255,0.85)" : "rgba(15,23,42,0.85)",
              maxWidth: "clamp(90px, 18vw, 180px)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: "1 1 auto",
              minWidth: 0,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {name}
          </span>
          <svg
            style={{
              width: "13px",
              height: "13px",
              flexShrink: 0,
              transition: "transform .2s",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              color: "rgba(255,255,255,0.4)",
            }}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Dropdown */}
        {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            marginTop: "8px",
            width: "200px",
            background: darkMode ? "#0F172A" : "#FFFFFF",
            border: darkMode ? "1px solid rgba(99,102,241,0.2)" : "1px solid rgba(15,23,42,0.12)",
            borderRadius: "14px",
            overflow: "hidden",
            zIndex: 50,
            boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
          }}
        >
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/edit-profile");
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "12px 18px",
                background: "none",
                border: "none",
                borderBottom: darkMode ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(15,23,42,0.08)",
                fontSize: "14px",
                fontWeight: 500,
                color: darkMode ? "rgba(255,255,255,0.75)" : "rgba(15,23,42,0.75)",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "background .12s, color .12s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.1)";
                (e.currentTarget as HTMLButtonElement).style.color = darkMode ? "white" : "#0F172A";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "none";
                (e.currentTarget as HTMLButtonElement).style.color = darkMode ? "rgba(255,255,255,0.75)" : "rgba(15,23,42,0.75)";
              }}
            >
              Editar perfil
            </button>

          <button
            type="button"
            onClick={toggleTheme}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              textAlign: "left",
              padding: "12px 18px",
              background: "none",
              border: "none",
              borderBottom: darkMode ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(15,23,42,0.08)",
              fontSize: "14px",
              fontWeight: 500,
              color: darkMode ? "rgba(255,255,255,0.75)" : "rgba(15,23,42,0.75)",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "background .12s, color .12s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.1)";
              (e.currentTarget as HTMLButtonElement).style.color = darkMode ? "white" : "#0F172A";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "none";
              (e.currentTarget as HTMLButtonElement).style.color = darkMode ? "rgba(255,255,255,0.75)" : "rgba(15,23,42,0.75)";
            }}
          >
            {darkMode ? "Modo claro" : "Modo oscuro"}
            {darkMode ? <FiSun size={16} /> : <FiMoon size={16} />}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "12px 18px",
              background: "none",
              border: "none",
              fontSize: "14px",
              fontWeight: 500,
              color: "#F87171",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "background .12s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "none";
            }}
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