import { io } from "socket.io-client";

const SERVER_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : "https://civ-alpha-multi.onrender.com"; // 

export const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ["websocket"],
});

// 🔥 Debug utile
socket.on("connect", () => {
  console.log("🟢 Socket connecté :", socket.id);
});

socket.on("disconnect", () => {
  console.log("🔴 Socket déconnecté");
});