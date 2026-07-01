import React, { useState, useEffect, useRef } from "react";
import { getLoggedInUser, getAuthToken } from "../utils/auth";

export default function ChatWindow({ eventId, eventTitle }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("connecting"); // 'connected', 'connecting', 'disconnected'
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  
  const currentUser = getLoggedInUser();
  const initData = getAuthToken();

  // Load chat history via REST API
  const fetchHistory = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/events/${eventId}/messages`);
      if (response.ok) {
        const historyData = await response.json();
        setMessages(historyData);
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
  };

  const connectWebSocket = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }

    setConnectionStatus("connecting");
    const wsUrl = `ws://localhost:8000/api/events/${eventId}/chat?token=${encodeURIComponent(initData)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected to event room:", eventId);
      setConnectionStatus("connected");
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setMessages((prev) => {
          // Avoid duplicates by checking message ID if present
          if (payload.id && prev.some((msg) => msg.id === payload.id)) {
            return prev;
          }
          return [...prev, payload];
        });
      } catch (err) {
        console.error("Error parsing WS message:", err);
      }
    };

    ws.onclose = (e) => {
      console.warn(`WebSocket closed: code=${e.code}, reason=${e.reason}. Attempting reconnect...`);
      setConnectionStatus("disconnected");
      scheduleReconnect();
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      ws.close();
    };

    socketRef.current = ws;
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) return;

    // Incremental reconnect delay (1s, 2s, 4s, up to 10s max)
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
    reconnectAttemptsRef.current += 1;

    console.log(`Reconnecting in ${delay / 1000}s...`);
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      connectWebSocket();
    }, delay);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (socketRef.current && connectionStatus === "connected") {
      const payload = { message: inputText.trim() };
      socketRef.current.send(JSON.stringify(payload));
      setInputText("");
    } else {
      alert("Чат отключен. Попытка восстановить соединение...");
      connectWebSocket();
    }
  };

  useEffect(() => {
    fetchHistory();
    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.onclose = null; // Remove listener to avoid reconnect loop on unmount
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [eventId]);

  useEffect(() => {
    // Scroll to bottom when message list updates
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Chat Header Status Bar */}
      <div className="chat-status" style={{ borderBottom: "1px solid #111", padding: "0.5rem 1rem", backgroundColor: "#F9F9F9" }}>
        <div style={{ fontWeight: "bold", fontSize: "0.8rem" }}>🗣️ Координационный чат: {eventTitle}</div>
        <div>
          {connectionStatus === "connected" && (
            <span className="status-online">● ПОДКЛЮЧЕНО</span>
          )}
          {connectionStatus === "connecting" && (
            <span className="status-connecting">⏱️ ПОДКЛЮЧЕНИЕ...</span>
          )}
          {connectionStatus === "disconnected" && (
            <span className="status-offline">✕ ВНЕ СЕТИ (ПОВТОР...)</span>
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="chat-messages" style={{ height: "300px", padding: "1rem" }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", fontSize: "0.75rem", marginTop: "2rem" }}>
            Сообщений нет. Напишите что-нибудь, чтобы скоординировать волонтеров!
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.user_id === currentUser?.id;
            const senderName = msg.user?.first_name || "Волонтер";
            const roleBadge = msg.user?.role === "organizer" ? " [Орг]" : "";
            
            return (
              <div 
                key={msg.id || index} 
                className={`chat-message-bubble ${isMe ? "me" : ""}`}
                style={{ 
                  borderRadius: "10px",
                  alignSelf: isMe ? "flex-end" : "flex-start",
                  border: "1px solid var(--border-light)",
                  boxShadow: "var(--shadow-sm)",
                  backgroundColor: isMe ? "#E0F2F1" : "#FFFFFF",
                  padding: "0.5rem 0.85rem",
                  maxWidth: "80%"
                }}
              >
                <div className="message-sender">
                  <span style={{ color: msg.user?.role === "organizer" ? "var(--color-jasylel)" : "#555", fontWeight: "bold" }}>
                    {senderName}{roleBadge}
                  </span>
                  <span style={{ fontSize: "0.6rem", color: "#999", marginLeft: "0.5rem" }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="message-text" style={{ fontSize: "0.85rem", marginTop: "0.15rem" }}>{msg.message}</div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input controls */}
      <form onSubmit={handleSendMessage} className="chat-input-area">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={connectionStatus === "connected" ? "Напишите сообщение..." : "Подключение к чату..."}
          className="chat-input"
          disabled={connectionStatus !== "connected"}
          style={{ borderRadius: 0 }}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={connectionStatus !== "connected"}
          style={{ borderRadius: 0 }}
        >
          Отправить
        </button>
      </form>
    </div>
  );
}
