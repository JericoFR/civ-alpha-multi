import { io } from "socket.io-client";

const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const SERVER_URL = isLocal
  ? "http://localhost:3001"
  : "https://civ-alpha-multi.onrender.com";

export const socket = io(SERVER_URL, {
  autoConnect: false,
});

socket.on("connect", () => {
  console.log("🟢 Socket connecté :", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("🔴 Socket déconnecté :", reason);
});

socket.on("connect_error", (err) => {
  console.error("❌ Erreur socket :", err.message);
});