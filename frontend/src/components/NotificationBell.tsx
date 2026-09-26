import React, { useCallback, useEffect, useRef, useState } from "react";
import { FiBell, FiCheck, FiCheckCircle, FiX } from "react-icons/fi";
import { api } from "../services/http";
import { useTheme } from "../context/ThemeContext";

export type AppNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  meta: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

const POLL_MS = 60_000;

const NotificationBell: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [narrow, setNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const fetchList = useCallback(async () => {
    try {
      const res = await api.get<{ notifications: AppNotification[]; unread_count: number }>(
        "/notifications",
        { params: { limit: 40 } }
      );
      setItems(res.data.notifications || []);
      setUnread(res.data.unread_count || 0);
    } catch {
    }
  }, []);

  useEffect(() => {
    fetchList();
    const id = setInterval(fetchList, POLL_MS);
    return () => clearInterval(id);
  }, [fetchList]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const markOne = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnread((c) => Math.max(0, c - 1));
    } catch {
      /* */
    }
  };

  const markAll = async () => {
    setLoading(true);
    try {
      await api.post("/notifications/read-all");
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } finally {
      setLoading(false);
    }
  };

  const panelBg = isDark ? "#0F172A" : "#FFFFFF";
  const border = isDark ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(15,23,42,0.12)";
  const text = isDark ? "rgba(255,255,255,0.9)" : "#0F172A";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.55)";

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        aria-label={unread > 0 ? `${unread} notificaciones sin leer` : "Notificaciones"}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) fetchList();
        }}
        style={{
          width: 30,
          height: 30,
          minWidth: 30,
          borderRadius: 9,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.1)",
          border: isDark ? "1px solid rgba(129,140,248,0.3)" : "1px solid rgba(99,102,241,0.25)",
          color: isDark ? "#A5B4FC" : "#4338CA",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <FiBell size={15} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              borderRadius: 99,
              background: "#EF4444",
              color: "white",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              border: isDark ? "2px solid #080C14" : "2px solid #FFFFFF",
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: narrow ? "fixed" : "absolute",
            top: narrow ? 56 : "calc(100% + 8px)",
            right: narrow ? 8 : 0,
            left: narrow ? 8 : "auto",
            width: narrow ? "auto" : "min(360px, calc(100vw - 24px))",
            maxWidth: narrow ? "none" : 360,
            maxHeight: "min(70vh, 420px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            background: panelBg,
            border,
            borderRadius: 14,
            boxShadow: isDark
              ? "0 20px 40px rgba(0,0,0,0.6)"
              : "0 20px 40px rgba(15,23,42,0.15)",
            zIndex: 60,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderBottom: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(15,23,42,0.08)",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 14, color: text }}>Notificaciones</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAll}
                  disabled={loading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "5px 8px",
                    borderRadius: 8,
                    background: isDark ? "rgba(52,211,153,0.12)" : "rgba(5,150,105,0.1)",
                    border: isDark ? "1px solid rgba(52,211,153,0.25)" : "1px solid rgba(5,150,105,0.25)",
                    color: isDark ? "#6EE7B7" : "#059669",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <FiCheckCircle size={12} />
                  Marcar todas
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  color: muted,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <FiX size={16} />
              </button>
            </div>
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {items.length === 0 ? (
              <p style={{ textAlign: "center", padding: "28px 16px", fontSize: 13, color: muted }}>
                No hay notificaciones
              </p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markOne(n.id)}
                  style={{
                    padding: "12px 14px",
                    borderBottom: isDark
                      ? "1px solid rgba(255,255,255,0.05)"
                      : "1px solid rgba(15,23,42,0.06)",
                    background: n.is_read
                      ? "transparent"
                      : isDark
                      ? "rgba(99,102,241,0.08)"
                      : "rgba(99,102,241,0.06)",
                    cursor: n.is_read ? "default" : "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: text, lineHeight: 1.3 }}>
                      {n.title}
                    </span>
                    {!n.is_read && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#6366F1",
                          flexShrink: 0,
                          marginTop: 4,
                        }}
                      />
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: muted, lineHeight: 1.45, margin: 0 }}>{n.body}</p>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 6,
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 10, color: muted }}>
                      {new Date(n.created_at).toLocaleString("es-CL", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {!n.is_read && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markOne(n.id);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          fontSize: 10,
                          color: isDark ? "#A5B4FC" : "#4338CA",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        <FiCheck size={11} /> Leída
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;