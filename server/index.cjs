const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("Civ Alpha server is running");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const rooms = {};

const TOTAL_SYNCED_PHASES = 9;

function makeRoomId() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function findRoomIdBySocketId(socketId) {
  for (const roomId of Object.keys(rooms)) {
    if (rooms[roomId].players.includes(socketId)) {
      return roomId;
    }
  }
  return null;
}

function getRoomFromPayload(payload) {
  const roomId = payload?.roomId?.trim?.().toUpperCase?.();
  if (!roomId) return { roomId: null, room: null };

  const room = rooms[roomId];
  if (!room) return { roomId, room: null };

  return { roomId, room };
}

function ensureSocketInRoom(socket, roomId, room) {
  if (!room) return false;

  if (!room.players.includes(socket.id)) {
    socket.emit("errorMessage", "Action refusée : socket non membre de la room.");
    return false;
  }

  return true;
}

io.on("connection", (socket) => {
  console.log("Un joueur connecté :", socket.id);

  socket.on("createRoom", () => {
    const existingRoomId = findRoomIdBySocketId(socket.id);

    if (existingRoomId) {
      const existingRoom = rooms[existingRoomId];
      socket.emit("roomCreated", {
        roomId: existingRoomId,
        players: existingRoom.players,
        playerNumber: Math.max(1, existingRoom.players.indexOf(socket.id) + 1),
      });
      return;
    }

    let roomId = makeRoomId();
    while (rooms[roomId]) {
      roomId = makeRoomId();
    }

    rooms[roomId] = {
      players: [socket.id],
      gameState: {
        phaseIndex: 0,
        eraState: null,
      },
    };

    socket.join(roomId);

    console.log("Room créée :", roomId);

    socket.emit("roomCreated", {
      roomId,
      players: rooms[roomId].players,
      playerNumber: 1,
    });
  });

  socket.on("joinRoom", (payload) => {
    const roomId = payload?.roomId?.trim?.().toUpperCase?.();

    if (!roomId) {
      socket.emit("errorMessage", "Code room invalide.");
      return;
    }

    const room = rooms[roomId];

    if (!room) {
      socket.emit("errorMessage", "Room introuvable");
      return;
    }

    if (room.players.includes(socket.id)) {
      socket.emit("roomJoined", {
        roomId,
        players: room.players,
        playerNumber: Math.max(1, room.players.indexOf(socket.id) + 1),
      });

      socket.emit("gameStateUpdate", room.gameState);

      if (room.gameState.eraState) {
        socket.emit("eraStateSync", { eraState: room.gameState.eraState });
      }
      return;
    }

    if (room.players.length >= 2) {
      socket.emit("errorMessage", "Room pleine");
      return;
    }

    socket.join(roomId);
    room.players.push(socket.id);

    console.log(socket.id, "a rejoint la room", roomId);

    io.to(roomId).emit("roomUpdate", {
      roomId,
      players: room.players,
    });

    socket.emit("roomJoined", {
      roomId,
      players: room.players,
      playerNumber: room.players.indexOf(socket.id) + 1,
    });

    socket.emit("gameStateUpdate", room.gameState);

    if (room.gameState.eraState) {
      socket.emit("eraStateSync", { eraState: room.gameState.eraState });
    }
  });

  socket.on("nextPhase", (payload) => {
    const { roomId, room } = getRoomFromPayload(payload);
    if (!roomId || !room) return;
    if (!ensureSocketInRoom(socket, roomId, room)) return;

    room.gameState.phaseIndex = (room.gameState.phaseIndex + 1) % TOTAL_SYNCED_PHASES;

    console.log(`Phase suivante dans ${roomId} : ${room.gameState.phaseIndex}`);

    io.to(roomId).emit("gameStateUpdate", room.gameState);
  });

  socket.on("produceResources", (payload) => {
    const { roomId, room } = getRoomFromPayload(payload);
    if (!roomId || !room) return;
    if (!ensureSocketInRoom(socket, roomId, room)) return;

    io.to(roomId).emit("produceResources");
  });

  socket.on("moveUnit", (payload) => {
    const { roomId, room } = getRoomFromPayload(payload);
    if (!roomId || !room) return;
    if (!ensureSocketInRoom(socket, roomId, room)) return;

    socket.to(roomId).emit("unitMoved", {
      unitId: payload.unitId,
      x: payload.x,
      y: payload.y,
      player: payload.player ?? null,
    });
  });

  socket.on("playCard", (payload) => {
    const { roomId, room } = getRoomFromPayload(payload);
    if (!roomId || !room) return;
    if (!ensureSocketInRoom(socket, roomId, room)) return;

    socket.to(roomId).emit("playCard", {
      player: payload.player ?? null,
      cardKey: payload.cardKey,
      x: payload.x,
      y: payload.y,
      orientation: payload.orientation,
    });
  });

  socket.on("spawnWorker", (payload) => {
    const { roomId, room } = getRoomFromPayload(payload);
    if (!roomId || !room) return;
    if (!ensureSocketInRoom(socket, roomId, room)) return;

    socket.to(roomId).emit("spawnWorker", {
      player: payload.player ?? null,
      x: payload.x,
      y: payload.y,
    });
  });

  socket.on("selectEconomyMarket", (payload) => {
    const { roomId, room } = getRoomFromPayload(payload);
    if (!roomId || !room) return;
    if (!ensureSocketInRoom(socket, roomId, room)) return;

    socket.to(roomId).emit("economyMarketSelected", {
      player: payload.player ?? null,
      marketType: payload.marketType,
    });
  });

  socket.on("convertResources", (payload) => {
    const { roomId, room } = getRoomFromPayload(payload);
    if (!roomId || !room) return;
    if (!ensureSocketInRoom(socket, roomId, room)) return;

    socket.to(roomId).emit("resourcesConverted", {
      player: payload.player ?? null,
      resource: payload.resource,
      lots: payload.lots,
      marketType: payload.marketType,
    });
  });

  socket.on("passMilitaryTurn", (payload) => {
    const { roomId, room } = getRoomFromPayload(payload);
    if (!roomId || !room) return;
    if (!ensureSocketInRoom(socket, roomId, room)) return;

    socket.to(roomId).emit("passMilitaryTurn", {
      player: payload.player ?? null,
    });
  });

  socket.on("syncEraState", (payload) => {
    const { roomId, room } = getRoomFromPayload(payload);
    if (!roomId || !room) return;
    if (!ensureSocketInRoom(socket, roomId, room)) return;

    room.gameState.eraState = payload.eraState ?? null;

    socket.to(roomId).emit("eraStateSync", {
      eraState: room.gameState.eraState,
    });
  });

  socket.on("disconnect", () => {
    console.log("Joueur déconnecté :", socket.id);

    for (const roomId of Object.keys(rooms)) {
      const room = rooms[roomId];

      if (!room.players.includes(socket.id)) continue;

      room.players = room.players.filter((id) => id !== socket.id);

      io.to(roomId).emit("roomUpdate", {
        roomId,
        players: room.players,
      });

      if (room.players.length === 0) {
        delete rooms[roomId];
        console.log("Room supprimée :", roomId);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Civ Alpha server running on port ${PORT}`);
});