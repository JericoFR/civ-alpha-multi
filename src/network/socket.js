import { io } from "socket.io-client";

// ⚠️ IMPORTANT : URL serveur Render (version online)
const SOCKET_URL = "https://civ-alpha-multi.onrender.com";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
});