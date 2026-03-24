import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

import { gameReducer } from "../src/state/gameReducer.js";
import { initialState } from "../src/state/initialState.js";

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
}));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3001;

const rooms = {};

// ==============================
// UTILS
// ==============================

function generateRoomId() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function getRoom(roomId) {
  return rooms[roomId];
}

// ==============================
// SOCKET
// ==============================

io.on("connection", (socket) => {
  console.log("🟢 Connecté :", socket.id);

  // ==========================
  // CREATE ROOM
  // ==========================
  socket.on("createRoom", () => {
    const roomId = generateRoomId();

    rooms[roomId] = {
      players: [socket.id],
      state: initialState,
    };

    socket.join(roomId);

    socket.emit("roomCreated", {
      roomId,
      players: rooms[roomId].players,
      playerNumber: 1,
      gameState: rooms[roomId].state,
    });

    console.log(`Room créée : ${roomId}`);
  });

  // ==========================
  // JOIN ROOM
  // ==========================
  socket.on("joinRoom", (roomId) => {
    const room = getRoom(roomId);

    if (!room) {
      socket.emit("errorMessage", "Room introuvable.");
      return;
    }

    if (room.players.length >= 2) {
      socket.emit("errorMessage", "Room pleine.");
      return;
    }

    room.players.push(socket.id);

    socket.join(roomId);

    socket.emit("roomJoined", {
      roomId,
      players: room.players,
      playerNumber: 2,
      gameState: room.state,
    });

    io.to(roomId).emit("roomUpdate", {
      roomId,
      players: room.players,
    });

    console.log(`🔵 ${socket.id} a rejoint ${roomId}`);
  });

  // ==========================
  // GAME ACTION (CORE)
  // ==========================
  socket.on("GAME_ACTION", ({ roomId, action }) => {
  const room = getRoom(roomId);

  if (!room) {
    socket.emit("errorMessage", "Room introuvable.");
    return;
  }

  // 🔥 Déterminer le joueur depuis le socket
  const playerIndex = room.players.indexOf(socket.id);

  if (playerIndex === -1) {
    socket.emit("errorMessage", "Tu n'appartiens pas à cette room.");
    return;
  }

  const serverPlayer = playerIndex + 1;

  // 🔥 Sécurité : override du player
  const safeAction = {
    ...action,
    player: serverPlayer,
  };

  // 🔥 Validation minimale
  if (!safeAction.type || typeof safeAction.type !== "string") {
    socket.emit("errorMessage", "Action invalide.");
    return;
  }

  try {
    const newState = gameReducer(room.state, safeAction);

    room.state = newState;

    io.to(roomId).emit("GAME_STATE", newState);

  } catch (err) {
    console.error("Erreur reducer :", err);
    socket.emit("errorMessage", "Erreur serveur.");
  }
});

  // ==========================
  // DISCONNECT
  // ==========================
  socket.on("disconnect", () => {
    console.log("🔴 Déconnecté :", socket.id);

    Object.entries(rooms).forEach(([roomId, room]) => {
      if (room.players.includes(socket.id)) {
        room.players = room.players.filter((id) => id !== socket.id);

        io.to(roomId).emit("roomUpdate", {
          roomId,
          players: room.players,
        });

        if (room.players.length === 0) {
          delete rooms[roomId];
          console.log(`🗑️ Room supprimée : ${roomId}`);
        }
      }
    });
  });
});

// ==============================
// START
// ==============================

server.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur port ${PORT}`);
});