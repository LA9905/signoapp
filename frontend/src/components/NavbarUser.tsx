// import React, { useState, useEffect, useRef } from "react";
// import { useNavigate } from "react-router-dom";

// interface NavbarUserProps {
//   avatarUrl: string | null;
// }

// const NavbarUser: React.FC<NavbarUserProps> = ({ avatarUrl }) => {
//   const navigate = useNavigate();
//   const [open, setOpen] = useState(false);
//   const name = localStorage.getItem("name") || "Usuario";
//   const dropdownRef = useRef<HTMLDivElement>(null);

//   const handleLogout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("name");
//     navigate("/login");
//   };

//   useEffect(() => {
//     const handleClickOutside = (e: MouseEvent) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
//         setOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   return (
//     <div className="flex items-center justify-between bg-blue-100 px-4 sm:px-8 lg:px-10 py-3 shadow w-full">
      
//       {/* Logo + SignoApp - responsive */}
//       <div className="flex items-center gap-3 flex-shrink-0">
//         <img
//           src="/SignoApp.svg"
//           alt="Logo SignoApp"
//           className="h-10 w-auto sm:h-12"
//         />
//         <span className="text-lg sm:text-2xl font-bold text-gray-900 whitespace-nowrap">
//           SignoApp
//         </span>
//       </div>

//       {/* Botón de perfil */}
//       <div className="relative" ref={dropdownRef}>
//         <button
//           onClick={() => setOpen(!open)}
//           className="user-chip flex items-center gap-2.5 bg-white rounded-full pl-1 pr-4 py-1.5 shadow-sm hover:shadow-md transition-all focus:outline-none"
//         >
//           <img
//             src={avatarUrl || "/avatar3.png"}
//             alt="Perfil"
//             className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-300 flex-shrink-0"
//             onError={(e) => {
//               e.currentTarget.src = "/avatar3.png";
//             }}
//           />
//           <span className="font-medium text-sm sm:text-base truncate sm:truncate-none max-w-[140px] sm:max-w-none">
//             {name}
//           </span>
//           <svg
//             className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
//             viewBox="0 0 20 20"
//             fill="none"
//             stroke="currentColor"
//             strokeWidth="2"
//           >
//             <path d="M6 9l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
//           </svg>
//         </button>

//         {/* MENÚ */}
//         {open && (
//           <div className="user-menu absolute right-0 mt-2 w-56 z-50">
//             <button
//               type="button"
//               onClick={() => {
//                 setOpen(false);
//                 navigate("/edit-profile");
//               }}
//               className="block w-full text-left px-5 py-3 hover:bg-gray-100 border-b border-gray-200 font-medium"
//             >
//               Editar perfil
//             </button>
//             <button
//               type="button"
//               onClick={handleLogout}
//               className="block w-full text-left px-5 py-3 hover:bg-red-50 text-red-600 font-medium"
//             >
//               Cerrar sesión
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default NavbarUser;

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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(8,12,20,0.95)",
        borderBottom: "1px solid rgba(99,102,241,0.18)",
        padding: "10px 16px",
        gap: "16px",
        width: "100%",
        position: "sticky",
        top: 0,
        zIndex: 40,
        backdropFilter: "blur(12px)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Logo + nombre */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        <img
          src="/SignoApp.svg"
          alt="Logo SignoApp"
          style={{ height: "40px", width: "auto" }}
        />
        <span
          style={{
            fontSize: "clamp(16px, 3vw, 20px)",
            fontWeight: 700,
            color: "white",
            whiteSpace: "nowrap",
            fontFamily: "'Syne', sans-serif",
            letterSpacing: "-0.01em",
          }}
        >
          SignoApp
        </span>
      </div>

      {/* Botón de perfil */}
      <div style={{ position: "relative" }} ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "40px",
            padding: "6px 14px 6px 6px",
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
              width: "32px",
              height: "32px",
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
              color: "rgba(255,255,255,0.85)",
              maxWidth: "140px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {name}
          </span>
          <svg
            style={{
              width: "14px",
              height: "14px",
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
              background: "#0F172A",
              border: "1px solid rgba(99,102,241,0.2)",
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
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                fontSize: "14px",
                fontWeight: 500,
                color: "rgba(255,255,255,0.75)",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "background .12s, color .12s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.1)";
                (e.currentTarget as HTMLButtonElement).style.color = "white";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "none";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.75)";
              }}
            >
              Editar perfil
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