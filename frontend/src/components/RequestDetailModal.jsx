import React from "react";
import { createPortal } from "react-dom";

/**
 * RequestDetailModal — renders via React Portal so it works
 * from any route (admin, leader, coordinator, public portal).
 */
export default function RequestDetailModal({ request, onClose }) {
  if (!request) return null;

  const statusColors = {
    pending:  { className: "badge badge-pending", label: "На рассмотрении" },
    resolved: { className: "badge badge-resolved", label: "Решено" },
    approved: { className: "badge badge-approved", label: "Одобрено" },
    rejected: { className: "badge badge-rejected", label: "Отклонено" },
  };
  const s = statusColors[request.status] || statusColors.pending;

  const typeLabels = {
    event_host:      "📅 Заявка на мероприятие",
    help:            "🤝 Запрос помощи",
    official_letter: "📄 Официальное письмо",
    other:           "💬 Другое",
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.5rem", paddingRight: "2rem" }}>
          <div style={{
            width: "50px",
            height: "50px",
            background: "var(--bg-muted)",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.4rem",
            flexShrink: 0,
          }}>✉️</div>
          <div>
            <h2 className="modal-title">{request.subject}</h2>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.25rem" }}>
              <span className="text-sm text-muted">#{request.id}</span>
              <span className="text-sm text-muted">·</span>
              <span className="text-sm font-bold" style={{ color: "var(--bg-accent)" }}>{typeLabels[request.type] || request.type}</span>
              <span className={s.className}>{s.label}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{
          background: "var(--bg-muted)",
          borderRadius: "var(--radius)",
          padding: "1rem",
          marginBottom: "1.25rem",
          border: "1px solid var(--border)",
        }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>Описание обращения</div>
          <p style={{ margin: 0, lineHeight: 1.6, color: "var(--text)", whiteSpace: "pre-wrap" }}>{request.description}</p>
        </div>

        {/* Info grid */}
        <div className="grid-2" style={{ marginBottom: "1.25rem" }}>
          <div style={{ background: "var(--bg-muted)", borderRadius: "var(--radius)", padding: "0.875rem", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "0.35rem" }}>Заявитель</div>
            <div className="font-bold" style={{ color: "var(--text)" }}>
              {request.requester?.first_name || request.guest_name || "—"}
            </div>
            <div className="text-sm text-muted">
              {request.requester?.phone || request.guest_phone || "—"}
            </div>
          </div>
          <div style={{ background: "var(--bg-muted)", borderRadius: "var(--radius)", padding: "0.875rem", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "0.35rem" }}>Направление</div>
            <div className="font-bold" style={{ color: "var(--text)" }}>
              {request.target_project?.name || "Бас кеңсе / HQ"}
            </div>
            <div className="text-sm text-muted">
              {request.created_at
                ? new Date(request.created_at).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
                : "—"}
            </div>
          </div>
        </div>

        {/* Response block */}
        {request.response && (
          <div style={{
            background: "rgba(37,99,235,0.06)",
            borderRadius: "var(--radius)",
            padding: "1rem",
            border: "1px solid rgba(37,99,235,0.15)",
            marginBottom: "1.25rem",
          }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--bg-accent)", textTransform: "uppercase", marginBottom: "0.35rem" }}>Ответ руководителя</div>
            <p style={{ margin: 0, color: "var(--text)", lineHeight: 1.6 }}>{request.response}</p>
          </div>
        )}

        <button className="btn-secondary btn-full mt-md" onClick={onClose}>
          Закрыть
        </button>
      </div>
    </div>,
    document.body
  );
}
