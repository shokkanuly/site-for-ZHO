import React, { useState, useEffect, useRef, useCallback } from "react";

/**
 * ChatPanel — Real-time staff chat component
 * 
 * Props:
 *   userId: number       — the logged-in user's ID
 *   userRole: string     — role of caller (super_admin, project_admin, coordinator)
 *   projectId: number    — caller's project_id (for scoped rooms)
 */
export default function ChatPanel({ userId, userRole, projectId }) {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [wsStatus, setWsStatus] = useState("disconnected"); // disconnected | connecting | connected
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const API = "http://localhost:8000/api";
  const WS_BASE = "ws://localhost:8000/api";

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load available rooms
  useEffect(() => {
    if (!userId) return;
    fetch(`${API}/chat/rooms?user_id=${userId}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRooms(data);
          if (data.length > 0 && !activeRoom) {
            setActiveRoom(data[0].room_key);
          }
        }
      })
      .catch(() => {});
  }, [userId]);

  // Load history when room changes
  useEffect(() => {
    if (!activeRoom || !userId) return;
    fetch(`${API}/chat/${activeRoom}/messages?user_id=${userId}&limit=100`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setMessages(data);
      })
      .catch(() => {});

    // Connect WebSocket
    connectWS(activeRoom);

    return () => {
      wsRef.current?.close();
    };
  }, [activeRoom, userId]);

  const connectWS = (roomKey) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setWsStatus("connecting");
    const ws = new WebSocket(`${WS_BASE}/chat/ws/${roomKey}?user_id=${userId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
          setMessages(prev => [...prev, data]);
          if (!isOpen) setUnread(u => u + 1);
        }
        // system messages shown inline
        if (data.type === "system") {
          setMessages(prev => [...prev, { ...data, id: Date.now(), is_system: true }]);
        }
      } catch {}
    };

    ws.onclose = () => {
      setWsStatus("disconnected");
      // Auto-reconnect after 3s
      setTimeout(() => {
        if (activeRoom) connectWS(activeRoom);
      }, 3000);
    };

    ws.onerror = () => {
      setWsStatus("disconnected");
    };
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ message: newMessage.trim() }));
    setNewMessage("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleOpenPanel = () => {
    setIsOpen(true);
    setUnread(0);
  };

  const roleLabel = { super_admin: "Гл. Админ", project_admin: "Руководитель", coordinator: "Координатор" };
  const roleColors = {
    super_admin: "#dc2626",
    project_admin: "#7c3aed",
    coordinator: "#059669",
    community_user: "#6b7280",
  };

  const roomLabel = (key) => {
    const room = rooms.find(r => r.room_key === key);
    return room?.name || key;
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return "";
    try {
      return new Date(isoStr).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  if (!userId || !["super_admin", "project_admin", "coordinator"].includes(userRole)) return null;

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={handleOpenPanel}
          style={{
            position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 9000,
            width: "3.5rem", height: "3.5rem", borderRadius: "50%",
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.5rem", transition: "transform 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          title="Открыть чат"
        >
          💬
          {unread > 0 && (
            <span style={{
              position: "absolute", top: "-0.2rem", right: "-0.2rem",
              background: "#dc2626", color: "#fff", borderRadius: "50%",
              width: "1.3rem", height: "1.3rem", fontSize: "0.7rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700
            }}>{unread}</span>
          )}
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div style={{
          position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 9000,
          width: "380px", height: "520px",
          background: "#0f0f23", borderRadius: "1.25rem",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.3)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          border: "1px solid rgba(124,58,237,0.25)"
        }}>
          {/* Header */}
          <div style={{
            padding: "1rem 1.25rem 0.75rem",
            background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,70,229,0.2))",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", gap: "0.75rem"
          }}>
            <span style={{ fontSize: "1.25rem" }}>💬</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}>
                Внутренний чат
              </div>
              <div style={{
                fontSize: "0.7rem",
                color: wsStatus === "connected" ? "#10b981" : wsStatus === "connecting" ? "#f59e0b" : "#6b7280",
                display: "flex", alignItems: "center", gap: "0.3rem"
              }}>
                <span style={{
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: wsStatus === "connected" ? "#10b981" : wsStatus === "connecting" ? "#f59e0b" : "#4b5563",
                  display: "inline-block"
                }} />
                {wsStatus === "connected" ? "В сети" : wsStatus === "connecting" ? "Подключение..." : "Не в сети"}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "1.25rem", padding: "0.2rem" }}
            >✕</button>
          </div>

          {/* Room Tabs */}
          {rooms.length > 1 && (
            <div style={{
              display: "flex", overflowX: "auto", gap: "0.25rem",
              padding: "0.5rem 0.75rem",
              background: "rgba(0,0,0,0.2)",
              borderBottom: "1px solid rgba(255,255,255,0.05)"
            }}>
              {rooms.map(room => (
                <button
                  key={room.room_key}
                  onClick={() => setActiveRoom(room.room_key)}
                  style={{
                    padding: "0.3rem 0.7rem", borderRadius: "999px", fontSize: "0.72rem",
                    border: "1px solid",
                    borderColor: activeRoom === room.room_key ? "#7c3aed" : "rgba(255,255,255,0.1)",
                    background: activeRoom === room.room_key ? "rgba(124,58,237,0.25)" : "transparent",
                    color: activeRoom === room.room_key ? "#c4b5fd" : "#6b7280",
                    cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
                    fontWeight: activeRoom === room.room_key ? 600 : 400
                  }}
                >
                  {room.name}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "0.75rem",
            display: "flex", flexDirection: "column", gap: "0.5rem"
          }}>
            {messages.length === 0 && (
              <div style={{ color: "#4b5563", textAlign: "center", marginTop: "2rem", fontSize: "0.85rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>💬</div>
                Начните общение в канале<br />
                <span style={{ fontSize: "0.75rem" }}>{roomLabel(activeRoom)}</span>
              </div>
            )}
            {messages.map((msg, i) => {
              const isMine = msg.sender_id === userId;
              if (msg.is_system) {
                return (
                  <div key={msg.id || i} style={{ textAlign: "center", fontSize: "0.7rem", color: "#4b5563", padding: "0.15rem 0" }}>
                    {msg.message}
                  </div>
                );
              }
              return (
                <div key={msg.id || i} style={{
                  display: "flex", flexDirection: isMine ? "row-reverse" : "row",
                  gap: "0.5rem", alignItems: "flex-end"
                }}>
                  {/* Avatar */}
                  {!isMine && (
                    <div style={{
                      width: "1.8rem", height: "1.8rem", borderRadius: "50%", flexShrink: 0,
                      background: roleColors[msg.sender_role] || "#4b5563",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.65rem", color: "#fff", fontWeight: 700
                    }}>
                      {(msg.sender_name || "?")[0]}
                    </div>
                  )}
                  <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                    {!isMine && (
                      <span style={{ fontSize: "0.65rem", color: roleColors[msg.sender_role] || "#9ca3af", marginBottom: "0.15rem", fontWeight: 600 }}>
                        {msg.sender_name}
                      </span>
                    )}
                    <div style={{
                      padding: "0.5rem 0.75rem", borderRadius: isMine ? "1rem 1rem 0.25rem 1rem" : "1rem 1rem 1rem 0.25rem",
                      background: isMine ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "rgba(255,255,255,0.08)",
                      color: "#f3f4f6", fontSize: "0.85rem", lineHeight: 1.4,
                      wordBreak: "break-word"
                    }}>
                      {msg.message}
                    </div>
                    <span style={{ fontSize: "0.6rem", color: "#4b5563", marginTop: "0.15rem" }}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "0.75rem",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(0,0,0,0.2)",
            display: "flex", gap: "0.5rem", alignItems: "flex-end"
          }}>
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Сообщение... (Enter — отправить)"
              rows={1}
              style={{
                flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0.75rem", padding: "0.6rem 0.85rem", color: "#f3f4f6",
                fontSize: "0.85rem", outline: "none", resize: "none",
                fontFamily: "inherit", lineHeight: 1.4, maxHeight: "80px", overflowY: "auto"
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || wsStatus !== "connected"}
              style={{
                padding: "0.6rem 0.9rem", borderRadius: "0.75rem",
                background: newMessage.trim() && wsStatus === "connected"
                  ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                  : "rgba(255,255,255,0.05)",
                border: "none", cursor: newMessage.trim() ? "pointer" : "not-allowed",
                color: "#fff", fontSize: "1rem", transition: "all 0.15s"
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
