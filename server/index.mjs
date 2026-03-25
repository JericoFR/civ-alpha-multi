import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

import { gameReducer } from "../src/state/gameReducer.js";
import { createInitialState } from "../src/state/initialState.js";

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
  })
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3001;

const rooms = {};

function generateRoomId() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function getRoom(roomId) {
  return rooms[roomId];
}

function getOtherPlayerSocket(room, socketId) {
  return room.players.find((id) => id !== socketId);
}

function createEmptySetup() {
  return {
    step: 0,
    placements: {
      player1: { worker: null, soldier: null },
      player2: { worker: null, soldier: null },
    },
  };
}

function getBuildingCells(building) {
  const cells = [];
  const size = building.size ?? 2;

  for (let i = 0; i < size; i += 1) {
    if (building.orientation === "horizontal") {
      cells.push({ x: building.x + i, y: building.y });
    } else {
      cells.push({ x: building.x, y: building.y + i });
    }
  }

  return cells;
}

function getSetupSpawnCells(buildings, player) {
  return buildings
    .filter(
      (building) =>
        building.player === player &&
        (building.type === "townhall" || building.type === "house")
    )
    .flatMap((building) => getBuildingCells(building));
}

function isValidSetupCell(buildings, player, x, y) {
  return getSetupSpawnCells(buildings, player).some(
    (cell) => cell.x === x && cell.y === y
  );
}

function buildGameStateFromSetup(setup, customDecks = null) {
  const gameState = createInitialState(customDecks);
  const placements = setup.placements;

  gameState.units = [
    {
      id: "p1_worker",
      type: "worker",
      player: 1,
      ...placements.player1.worker,
    },
    {
      id: "p2_worker",
      type: "worker",
      player: 2,
      ...placements.player2.worker,
    },
    {
      id: "p2_soldier",
      type: "soldier",
      player: 2,
      ...placements.player2.soldier,
    },
    {
      id: "p1_soldier",
      type: "soldier",
      player: 1,
      ...placements.player1.soldier,
    },
  ];

  return gameState;
}

function resetRoomToLobby(room) {
  room.phase = "lobby";
  room.state = null;
  room.setup = createEmptySetup();
  room.rematchRequests = {};
  room.decks = room.decks ?? {
    player1: null,
    player2: null,
  };
}

io.on("connection", (socket) => {
  console.log("🟢 Connecté :", socket.id);

  socket.on("createRoom", () => {
    const roomId = generateRoomId();

    rooms[roomId] = {
  players: [socket.id],
  phase: "lobby",
  state: null,
  setup: createEmptySetup(),
  rematchRequests: {},
  decks: {
    player1: null,
    player2: null,
  },
};

    socket.join(roomId);

    socket.emit("roomCreated", {
      roomId,
      players: rooms[roomId].players,
      playerNumber: 1,
      roomPhase: rooms[roomId].phase,
      setup: rooms[roomId].setup,
      gameState: rooms[roomId].state,
    });

    console.log(`Room créée : ${roomId}`);
  });

  socket.on("joinRoom", (roomId) => {
    const room = getRoom(roomId);

    if (!room) {
      socket.emit("errorMessage", "Room introuvable.");
      return;
    }

    if (!room.rematchRequests) {
      room.rematchRequests = {};
    }

    if (!room.decks) {
  room.decks = {
    player1: null,
    player2: null,
  };
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
      roomPhase: room.phase,
      setup: room.setup,
      gameState: room.state,
    });

    io.to(roomId).emit("roomUpdate", {
      roomId,
      players: room.players,
      roomPhase: room.phase,
    });

    console.log(`🔵 ${socket.id} a rejoint ${roomId}`);
  });

  
    socket.on("SET_PLAYER_DECK", ({ roomId, deck }) => {
    const room = getRoom(roomId);

    if (!room) {
      socket.emit("errorMessage", "Room introuvable.");
      return;
    }

    const playerIndex = room.players.indexOf(socket.id);

    if (playerIndex === -1) {
      socket.emit("errorMessage", "Tu n'appartiens pas à cette room.");
      return;
    }

    if (!room.decks) {
      room.decks = {
        player1: null,
        player2: null,
      };
    }

    const playerKey = playerIndex === 0 ? "player1" : "player2";

    room.decks[playerKey] = deck;

    io.to(roomId).emit("ROOM_DECK_UPDATE", {
      decks: room.decks,
    });

    console.log(`📦 Deck reçu pour ${playerKey} dans la room ${roomId}`);
  });
  
  socket.on("START_SETUP", ({ roomId }) => {
    const room = getRoom(roomId);

    if (!room) {
      socket.emit("errorMessage", "Room introuvable.");
      return;
    }

    const playerIndex = room.players.indexOf(socket.id);
    if (playerIndex !== 0) {
      socket.emit("errorMessage", "Seul J1 peut lancer le setup.");
      return;
    }

    if (room.players.length < 2) {
      socket.emit("errorMessage", "Il faut 2 joueurs pour lancer le setup.");
      return;
    }

    room.phase = "setup";
    room.state = null;
    room.setup = createEmptySetup();
    room.rematchRequests = {};

    io.to(roomId).emit("SETUP_UPDATE", room.setup);
    io.to(roomId).emit("roomUpdate", {
      roomId,
      players: room.players,
      roomPhase: room.phase,
    });
  });

  socket.on("SETUP_ACTION", ({ roomId, payload }) => {
    const room = getRoom(roomId);

    if (!room) {
      socket.emit("errorMessage", "Room introuvable.");
      return;
    }

    if (room.phase !== "setup") {
      socket.emit("errorMessage", "Le setup n'est pas actif.");
      return;
    }

    const playerIndex = room.players.indexOf(socket.id);
    if (playerIndex === -1) {
      socket.emit("errorMessage", "Tu n'appartiens pas à cette room.");
      return;
    }

    const player = playerIndex + 1;
    const steps = [
      { player: 1, type: "worker" },
      { player: 2, type: "worker" },
      { player: 2, type: "soldier" },
      { player: 1, type: "soldier" },
    ];

    const currentStep = steps[room.setup.step];

    if (!currentStep) {
      socket.emit("errorMessage", "Le setup est déjà terminé.");
      return;
    }

    if (currentStep.player !== player) {
      socket.emit("errorMessage", "Ce n'est pas ton tour de placement.");
      return;
    }

    const x = Number(payload?.x);
    const y = Number(payload?.y);

    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      socket.emit("errorMessage", "Coordonnées de setup invalides.");
      return;
    }

    const previewState = createInitialState();
    if (!isValidSetupCell(previewState.buildings, player, x, y)) {
      socket.emit("errorMessage", "Case invalide pour le setup.");
      return;
    }

    room.setup.placements[`player${player}`][currentStep.type] = { x, y };
    room.setup.step += 1;

    io.to(roomId).emit("SETUP_UPDATE", room.setup);

    if (room.setup.step >= 4) {
      room.state = buildGameStateFromSetup(room.setup, room.decks);
      room.phase = "game";
      room.rematchRequests = {};

      io.to(roomId).emit("GAME_START", room.state);
      io.to(roomId).emit("roomUpdate", {
        roomId,
        players: room.players,
        roomPhase: room.phase,
      });
    }
  });

  socket.on("GAME_ACTION", ({ roomId, action }) => {
    const room = getRoom(roomId);

    if (!room) {
      socket.emit("errorMessage", "Room introuvable.");
      return;
    }

    if (room.phase !== "game" || !room.state) {
      socket.emit("errorMessage", "La partie n'est pas active.");
      return;
    }

    const playerIndex = room.players.indexOf(socket.id);

    if (playerIndex === -1) {
      socket.emit("errorMessage", "Tu n'appartiens pas à cette room.");
      return;
    }

    const serverPlayer = playerIndex + 1;

    const safeAction = {
      ...action,
      player: serverPlayer,
    };

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



  socket.on("REQUEST_REMATCH", ({ roomId }) => {
    const room = getRoom(roomId);

    if (!room) {
      socket.emit("errorMessage", "Room introuvable.");
      return;
    }

    if (room.phase !== "game") {
      socket.emit("errorMessage", "La revanche n'est possible qu'après une partie.");
      return;
    }

    if (!room.players.includes(socket.id)) {
      socket.emit("errorMessage", "Tu n'appartiens pas à cette room.");
      return;
    }

    if (!room.rematchRequests) {
      room.rematchRequests = {};
    }

    room.rematchRequests[socket.id] = true;

    const otherSocketId = getOtherPlayerSocket(room, socket.id);

    socket.emit("REMATCH_PENDING");

    if (otherSocketId) {
      io.to(otherSocketId).emit("REMATCH_REQUESTED");
    }

    console.log(`🔁 Demande de revanche dans ${roomId} par ${socket.id}`);
  });

   

socket.on("SCIENCE_PEEK", ({ roomId, pileType }) => {
  const room = getRoom(roomId);

  if (!room || room.phase !== "game" || !room.state) return;

  const playerIndex = room.players.indexOf(socket.id);
  if (playerIndex === -1) return;

  const player = playerIndex + 1;

  // 🔴 1. CHECK si déjà utilisé
  if (room.state.scienceActionUsedThisPhase) {
    socket.emit("errorMessage", "Action science déjà utilisée ce tour.");
    return;
  }

  // 🔴 2. récupérer carte
  const pile =
    pileType === "points"
      ? room.state.remainingPointDeck
      : room.state.remainingEventDeck;

  const card = pile?.[0] || null;

  // 🔴 3. MARQUER comme utilisé
  const newState = {
    ...room.state,
    scienceActionUsedThisPhase: true,
  };

  room.state = newState;

  // 🔴 4. sync pour bloquer les boutons
  io.to(roomId).emit("GAME_STATE", newState);

  // 🔴 5. envoi privé de la carte
  socket.emit("SCIENCE_PEEK_RESULT", {
    player,
    pileType,
    card,
  });
});

  socket.on("RESPOND_REMATCH", ({ roomId, accept }) => {
    const room = getRoom(roomId);

    if (!room) {
      socket.emit("errorMessage", "Room introuvable.");
      return;
    }

    if (!room.players.includes(socket.id)) {
      socket.emit("errorMessage", "Tu n'appartiens pas à cette room.");
      return;
    }

    if (!room.rematchRequests) {
      room.rematchRequests = {};
    }

    if (!accept) {
      room.rematchRequests = {};

      io.to(roomId).emit("REMATCH_DECLINED");

      console.log(`❌ Revanche refusée dans ${roomId}`);
      return;
    }

    room.rematchRequests[socket.id] = true;

    const allAccepted =
      room.players.length === 2 &&
      room.players.every((playerSocketId) => room.rematchRequests[playerSocketId]);

    if (!allAccepted) {
      io.to(roomId).emit("REMATCH_ACCEPTED_WAITING");
      return;
    }

    resetRoomToLobby(room);

    io.to(roomId).emit("REMATCH_ACCEPTED");
    io.to(roomId).emit("RETURN_TO_LOBBY", {
      roomId,
      players: room.players,
      roomPhase: room.phase,
      setup: room.setup,
      message: "Revanche acceptée. Retour au lobby.",
    });

    io.to(roomId).emit("roomUpdate", {
      roomId,
      players: room.players,
      roomPhase: room.phase,
    });

    console.log(`✅ Revanche acceptée dans ${roomId} → retour lobby`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Déconnecté :", socket.id);

    Object.entries(rooms).forEach(([roomId, room]) => {
      if (!room.players.includes(socket.id)) return;

      if (room.rematchRequests) {
        delete room.rematchRequests[socket.id];
      }

      room.players = room.players.filter((id) => id !== socket.id);

      if (room.players.length === 0) {
        delete rooms[roomId];
        console.log(`🗑️ Room supprimée : ${roomId}`);
        return;
      }

      resetRoomToLobby(room);

      io.to(roomId).emit("RETURN_TO_LOBBY", {
        roomId,
        players: room.players,
        roomPhase: room.phase,
        setup: room.setup,
        message: "Un joueur s'est déconnecté. Retour au lobby.",
      });

      io.to(roomId).emit("roomUpdate", {
        roomId,
        players: room.players,
        roomPhase: room.phase,
      });
    });
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur port ${PORT}`);
});