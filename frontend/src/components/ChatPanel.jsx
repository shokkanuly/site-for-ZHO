import React, { useState, useEffect, useRef, useCallback } from "react";
import { API_BASE, WS_BASE } from "../config";

/**
 * ChatPanel — Real-time staff chat (multi-room, WebSocket)
 *
 * Rooms for each role:
 *  super_admin    → "🏆 Канал руководителей" + all project channels
 *  project_admin  → "🏆 Канал руководителей" + own project channel
 *  coordinator    → own project channel only
 */
export default function ChatPanel({ userId, userRole, projectId, userName }) {
  const [rooms, setRooms]         = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages]   = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [wsStatus, setWsStatus]   = useState("disconnected");
  const [isOpen, setIsOpen]       = useState(false);
  const [unreadMap, setUnreadMap] = useState({}); // roomKey → count

  const wsRef         = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef      = useRef(null);
  const activeRoomRef = useRef(null); // keep track of active room without closure stale
  activeRoomRef.current = activeRoom;

  const API     = API_BASE;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // --- Load rooms on mount ---
  useEffect(() => {
    if (!userId) return;
    fetch(`${API}/chat/rooms?user_id=${userId}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRooms(data);
          if (data.length > 0) {
            const defaultRoom = data.find(r => r.room_key === "leaders") || data[0];
            setActiveRoom(defaultRoom.room_key);
          }
        }
      })
      .catch(() => {});
  }, [userId]);

  // --- Load history when room changes ---
  useEffect(() => {
    if (!activeRoom || !userId) return;

    // Fetch history
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom, userId]);

  const connectWS = useCallback((roomKey) => {
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent auto-reconnect loop
      wsRef.current.close();
    }
    setWsStatus("connecting");
    const ws = new WebSocket(`${WS_BASE}/chat/ws/${roomKey}?user_id=${userId}`);
    wsRef.current = ws;

    ws.onopen = () => setWsStatus("connected");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
          setMessages(prev => [...prev, data]);
          // Count unread for rooms that are NOT currently active or panel is closed
          if (!isOpen || activeRoomRef.current !== data.room_key) {
            setUnreadMap(prev => ({
              ...prev,
              [data.room_key]: (prev[data.room_key] || 0) + 1
            }));
          }
        }
        if (data.type === "system") {
          setMessages(prev => [...prev, { ...data, id: Date.now(), is_system: true }]);
        }
      } catch {}
    };

    ws.onclose = () => {
      setWsStatus("disconnected");
      // Auto-reconnect after 3s
      setTimeout(() => {
        if (activeRoomRef.current) connectWS(activeRoomRef.current);
      }, 3000);
    };

    ws.onerror = () => setWsStatus("disconnected");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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
    if (activeRoom) {
      setUnreadMap(prev => ({ ...prev, [activeRoom]: 0 }));
    }
  };

  const handleSwitchRoom = (roomKey) => {
    setActiveRoom(roomKey);
    setMessages([]);
    setUnreadMap(prev => ({ ...prev, [roomKey]: 0 }));
  };

  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);

  const roleColors = {
    super_admin:    "#dc2626",
    project_admin:  "#7c3aed",
    coordinator:    "#059669",
    community_user: "#6b7280",
  };
  const roleEmoji = {
    super_admin:   "⭐",
    project_admin: "👑",
    coordinator:   "👷",
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return "";
    try {
      return new Date(isoStr).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  const getRoomIcon = (key) => {
    if (key === "leaders") return "👑";
    if (key.startsWith("project_")) {
      const icons = { project_1: "🏢", project_2: "💛", project_3: "🌲", project_4: "🧹", project_5: "🛡️" };
      return icons[key] || "💬";
    }
    return "💬";
  };

  if (!userId || !["super_admin", "project_admin", "coordinator"].includes(userRole)) return null;

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={handleOpenPanel}
          style={{
            position: "fixed", bottom: "1.75rem", right: "1.75rem", zIndex: 9000,
            width: "3.5rem", height: "3.5rem", borderRadius: "50%",
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            border: "none", cursor: "pointer", boxShadow: "0 6px 24px rgba(124,58,237,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.5rem", transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.12)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(124,58,237,0.65)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)";    e.currentTarget.style.boxShadow = "0 6px 24px rgba(124,58,237,0.5)"; }}
          title="Открыть чат сотрудников"
        >
          💬
          {totalUnread > 0 && (
            <span style={{
              position: "absolute", top: "-0.25rem", right: "-0.25rem",
              background: "#dc2626", color: "#fff", borderRadius: "50%",
              width: "1.35rem", height: "1.35rem", fontSize: "0.7rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, border: "2px solid white"
            }}>{totalUnread > 9 ? "9+" : totalUnread}</span>
          )}
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div style={{
          position: "fixed", bottom: "1.75rem", right: "1.75rem", zIndex: 9000,
          width: "400px", height: "560px",
          background: "#0d0d1f",
          borderRadius: "1.5rem",
          boxShadow: "0 30px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(124,58,237,0.35)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          border: "1px solid rgba(124,58,237,0.2)",
          fontFamily: "Inter, sans-serif",
        }}>

          {/* Header */}
          <div style={{
            padding: "0.9rem 1.25rem 0.75rem",
            background: "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(79,70,229,0.2))",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex", alignItems: "center", gap: "0.75rem",
          }}>
            <span style={{ fontSize: "1.3rem" }}>💬</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem", letterSpacing: "0.01em" }}>
                Штаб — Внутренний чат
              </div>
              <div style={{ fontSize: "0.68rem", display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.1rem",
                color: wsStatus === "connected" ? "#10b981" : wsStatus === "connecting" ? "#f59e0b" : "#4b5563"
              }}>
                <span style={{
                  width: "6px", height: "6px", borderRadius: "50%", display: "inline-block",
                  background: wsStatus === "connected" ? "#10b981" : wsStatus === "connecting" ? "#f59e0b" : "#374151",
                }} />
                {wsStatus === "connected" ? "В сети · " + (rooms.find(r => r.room_key === activeRoom)?.name || activeRoom)
                  : wsStatus === "connecting" ? "Подключение..."
                  : "Не в сети — переподключение..."}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "#9ca3af", cursor: "pointer",
                       fontSize: "1rem", width: "28px", height: "28px", borderRadius: "50%",
                       display: "flex", alignItems: "center", justifyContent: "center" }}
            >✕</button>
          </div>

          {/* Room Tabs */}
          {rooms.length > 1 && (
            <div style={{
              display: "flex", overflowX: "auto", gap: "0.3rem",
              padding: "0.5rem 0.75rem",
              background: "rgba(0,0,0,0.25)",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              scrollbarWidth: "none",
            }}>
              {rooms.map(room => {
                const isActive = activeRoom === room.room_key;
                const roomUnread = unreadMap[room.room_key] || 0;
                return (
                  <button
                    key={room.room_key}
                    onClick={() => handleSwitchRoom(room.room_key)}
                    style={{
                      position: "relative",
                      padding: "0.3rem 0.75rem", borderRadius: "999px", fontSize: "0.72rem",
                      border: "1px solid",
                      borderColor: isActive ? "#7c3aed" : "rgba(255,255,255,0.1)",
                      background: isActive ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.03)",
                      color: isActive ? "#c4b5fd" : "#6b7280",
                      cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
                      fontWeight: isActive ? 700 : 400,
                      flexShrink: 0,
                    }}
                  >
                    {getRoomIcon(room.room_key)} {room.name.replace(/^[^\s]+\s/, "")}
                    {roomUnread > 0 && (
                      <span style={{
                        position: "absolute", top: "-6px", right: "-4px",
                        background: "#dc2626", color: "#fff", borderRadius: "50%",
                        width: "16px", height: "16px", fontSize: "0.6rem",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, border: "1.5px solid #0d0d1f"
                      }}>{roomUnread}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Messages area */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "0.75rem",
            display: "flex", flexDirection: "column", gap: "0.5rem",
          }}>
            {messages.length === 0 && (
              <div style={{ color: "#374151", textAlign: "center", marginTop: "3rem", fontSize: "0.85rem" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem", opacity: 0.4 }}>
                  {getRoomIcon(activeRoom)}
                </div>
                <div style={{ color: "#4b5563", fontWeight: 600, fontSize: "0.9rem" }}>
                  {activeRoom === "leaders" ? "Канал руководителей" : "Канал проекта"}
                </div>
                <div style={{ color: "#374151", fontSize: "0.78rem", marginTop: "0.3rem" }}>
                  Напишите первое сообщение!
                </div>
              </div>
            )}
            {messages.map((msg, i) => {
              const isMine = msg.sender_id === userId;
              if (msg.is_system) {
                return (
                  <div key={msg.id || i} style={{
                    textAlign: "center", fontSize: "0.68rem", color: "#374151",
                    padding: "0.2rem 0", fontStyle: "italic"
                  }}>
                    — {msg.message} —
                  </div>
                );
              }
              return (
                <div key={msg.id || i} style={{
                  display: "flex",
                  flexDirection: isMine ? "row-reverse" : "row",
                  gap: "0.5rem", alignItems: "flex-end",
                }}>
                  {/* Avatar */}
                  {!isMine && (
                    <div title={msg.sender_name} style={{
                      width: "2rem", height: "2rem", borderRadius: "50%", flexShrink: 0,
                      background: roleColors[msg.sender_role] || "#4b5563",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.65rem", color: "#fff", fontWeight: 800,
                      border: "2px solid rgba(255,255,255,0.1)",
                    }}>
                      {roleEmoji[msg.sender_role] || (msg.sender_name || "?")[0]}
                    </div>
                  )}
                  <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                    {!isMine && (
                      <span style={{
                        fontSize: "0.65rem",
                        color: roleColors[msg.sender_role] || "#9ca3af",
                        marginBottom: "0.2rem", fontWeight: 700,
                      }}>
                        {msg.sender_name}
                      </span>
                    )}
                    <div style={{
                      padding: "0.55rem 0.85rem",
                      borderRadius: isMine ? "1.1rem 1.1rem 0.25rem 1.1rem" : "1.1rem 1.1rem 1.1rem 0.25rem",
                      background: isMine
                        ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                        : "rgba(255,255,255,0.08)",
                      color: "#f1f5f9",
                      fontSize: "0.85rem",
                      lineHeight: 1.45,
                      wordBreak: "break-word",
                      boxShadow: isMine ? "0 2px 8px rgba(124,58,237,0.3)" : "none",
                    }}>
                      {msg.message}
                    </div>
                    <span style={{ fontSize: "0.6rem", color: "#374151", marginTop: "0.2rem" }}>
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
            background: "rgba(0,0,0,0.25)",
            display: "flex", gap: "0.5rem", alignItems: "flex-end",
          }}>
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={wsStatus === "connected" ? "Сообщение... (Enter — отправить)" : "Нет соединения..."}
              rows={1}
              disabled={wsStatus !== "connected"}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0.85rem",
                padding: "0.6rem 0.9rem",
                color: "#f1f5f9",
                fontSize: "0.85rem",
                outline: "none",
                resize: "none",
                fontFamily: "inherit",
                lineHeight: 1.4,
                maxHeight: "80px",
                overflowY: "auto",
                opacity: wsStatus !== "connected" ? 0.5 : 1,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || wsStatus !== "connected"}
              style={{
                padding: "0.6rem 1rem",
                borderRadius: "0.85rem",
                background: newMessage.trim() && wsStatus === "connected"
                  ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                  : "rgba(255,255,255,0.05)",
                border: "none",
                cursor: newMessage.trim() && wsStatus === "connected" ? "pointer" : "not-allowed",
                color: "#fff",
                fontSize: "1.1rem",
                transition: "all 0.15s",
                flexShrink: 0,
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
