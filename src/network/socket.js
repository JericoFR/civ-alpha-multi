import { io } from "socket.io-client";

export const socket = io("https://civ-alpha-multi.onrender.com", {
  autoConnect: false,
});