import React from "react";
import { createPortal } from "react-dom";

/**
 * RequestDetailModal — renders via React Portal so it works
 * from any route (admin, leader, coordinator, public portal).
 */
export default function RequestDetailModal({ request, onClose }) {
  if (!request) return null;

  const statusColors = {
    pending:  { bg: "#fef9c3", color: "#854d0e", label: "На рассмотрении" },
    resolved: { bg: "#dcfce7", color: "#166534", label: "Решено" },
    approved: { bg: "#dcfce7", color: "#166534", label: "Одобрено" },
    rejected: { bg: "#fee2e2", color: "#991b1b", label: "Отклонено" },
  };
  const s = statusColors[request.status] || statusColors.pending;

  const typeLabels = {
    event_host:      "📅 Заявка на мероприятие",
    help:            "🤝 Запрос помощи",
    official_letter: "📄 Официальное письмо",
    other:           "💬 Другое",
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: "1.25rem", padding: "2.25rem",
          maxWidth: "580px", width: "100%", position: "relative",
          boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
          fontFamily: "Inter, sans-serif",
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "1.25rem", right: "1.25rem",
            background: "#F1F5F9", border: "none", width: "32px", height: "32px",
            borderRadius: "50%", cursor: "pointer", fontSize: "1rem",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >✕</button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.75rem", paddingRight: "2rem" }}>
          <div style={{
            width: "50px", height: "50px", background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
            borderRadius: "14px", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "1.4rem", flexShrink: 0,
          }}>✉️</div>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: "0 0 0.35rem", color: "#0f172a" }}>
              {request.subject}
            </h2>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>#{request.id}</span>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>·</span>
              <span style={{ fontSize: "0.8rem", color: "#7c3aed" }}>{typeLabels[request.type] || request.type}</span>
              <span style={{
                fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.5rem",
                borderRadius: "99px", background: s.bg, color: s.color,
              }}>{s.label}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{
          background: "#f8fafc", borderRadius: "0.75rem", padding: "1rem 1.25rem",
          marginBottom: "1.25rem", border: "1px solid #e2e8f0",
        }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>Описание обращения</div>
          <p style={{ margin: 0, lineHeight: 1.75, color: "#1e293b", whiteSpace: "pre-wrap" }}>{request.description}</p>
        </div>

        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <div style={{ background: "#f8fafc", borderRadius: "0.75rem", padding: "0.875rem", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "0.35rem" }}>Заявитель</div>
            <div style={{ fontWeight: 700, color: "#0f172a" }}>
              {request.requester?.first_name || request.guest_name || "—"}
            </div>
            <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
              {request.requester?.phone || request.guest_phone || "—"}
            </div>
          </div>
          <div style={{ background: "#f8fafc", borderRadius: "0.75rem", padding: "0.875rem", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "0.35rem" }}>Направление</div>
            <div style={{ fontWeight: 700, color: "#0f172a" }}>
              {request.target_project?.name || "Бас кеңсе / HQ"}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
              {request.created_at
                ? new Date(request.created_at).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
                : "—"}
            </div>
          </div>
        </div>

        {/* Response block */}
        {request.response && (
          <div style={{
            background: "rgba(124,58,237,0.06)", borderRadius: "0.75rem",
            padding: "1rem 1.25rem", border: "1px solid rgba(124,58,237,0.2)", marginBottom: "1.25rem",
          }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", marginBottom: "0.35rem" }}>Ответ руководителя</div>
            <p style={{ margin: 0, color: "#1e293b", lineHeight: 1.65 }}>{request.response}</p>
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "0.75rem", background: "#F1F5F9", border: "none",
            borderRadius: "0.75rem", cursor: "pointer", fontWeight: 700,
            fontSize: "0.95rem", color: "#475569", transition: "background 0.15s",
          }}
          onMouseOver={e => e.target.style.background = "#e2e8f0"}
          onMouseOut={e => e.target.style.background = "#F1F5F9"}
        >
          Закрыть
        </button>
      </div>
    </div>,
    document.body
  );
}
