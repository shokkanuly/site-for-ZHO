const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const API_BASE = `${API_URL}/api`;

// Determine WebSocket protocol (ws or wss)
const wsProtocol = API_URL.startsWith("https") ? "wss" : "ws";
const cleanHost = API_URL.replace(/^https?:\/\//, "");

export const WS_BASE = `${wsProtocol}://${cleanHost}/api`;
