import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

import { gameReducer } from "../src/state/gameReducer.js";
import { createInitialState } from "../src/state/initialState.js";
import { CARD_DEFS } from "../src/data/cards.js";
import { BOARD } from "../src/data/board.js";
import { getValidBuildingPlacements } from "../src/logic/buildings.js";

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

const SETUP_BUILDING_ORDER = [1, 2, 2, 1, 1, 2, 2, 1];
const SETUP_STARTER_CARD_KEYS = ["townhall_setup", "house", "field", "gold_mine"];
const SETUP_BUILDING_CARD_MAP = {
  townhall_setup: { cardKey: "townhall_setup", buildingType: "townhall", label: "Hôtel de Ville" },
  house: { cardKey: "house", buildingType: "house", label: "Chaumière" },
  field: { cardKey: "field", buildingType: "production_food", label: "Champ" },
  gold_mine: { cardKey: "gold_mine", buildingType: "production_gold", label: "Mine d’or" },
};
const SETUP_STEPS = [
  ...SETUP_BUILDING_ORDER.map((player) => ({ kind: "building", player })),
  { kind: "unit", player: 1, type: "worker" },
  { kind: "unit", player: 2, type: "worker" },
  { kind: "unit", player: 2, type: "soldier" },
  { kind: "unit", player: 1, type: "soldier" },
];

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
    buildings: [],
    remainingBuildings: {
      player1: [...SETUP_STARTER_CARD_KEYS],
      player2: [...SETUP_STARTER_CARD_KEYS],
    },
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

function createSetupBuilding(cardKey, player, x, y, orientation = "vertical") {
  const setupDef = SETUP_BUILDING_CARD_MAP[cardKey];
  if (!setupDef) return null;

  return {
    id: `setup-${player}-${setupDef.buildingType}-${x}-${y}-${orientation}`,
    player,
    type: setupDef.buildingType,
    x,
    y,
    orientation,
    size: 2,
    sourceCardKey: cardKey,
  };
}

function buildGameStateFromSetup(setup, customDecks = null) {
  const gameState = createInitialState(customDecks);
  const placements = setup.placements;

  gameState.buildings = structuredClone(setup.buildings ?? []);
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
  room.decks = room.decks ?? { player1: null, player2: null };
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
  });

  socket.on("joinRoom", (roomId) => {
    const room = getRoom(roomId);
    if (!room) {
      socket.emit("errorMessage", "Room introuvable.");
      return;
    }

    if (!room.rematchRequests) room.rematchRequests = {};
    if (!room.decks) room.decks = { player1: null, player2: null };

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

    if (!room.decks) room.decks = { player1: null, player2: null };
    const playerKey = playerIndex === 0 ? "player1" : "player2";
    room.decks[playerKey] = deck;

    io.to(roomId).emit("ROOM_DECK_UPDATE", { decks: room.decks });
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
    const currentStep = SETUP_STEPS[room.setup.step];
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

    if (currentStep.kind === "building") {
      const cardKey = payload?.cardKey;
      const orientation = payload?.orientation === "horizontal" ? "horizontal" : "vertical";
      const setupCard = CARD_DEFS[cardKey];
      const remaining = room.setup.remainingBuildings?.[`player${player}`] ?? [];

      if (!setupCard?.placement || !remaining.includes(cardKey)) {
        socket.emit("errorMessage", "Bâtiment de départ invalide.");
        return;
      }

      const validPlacement = getValidBuildingPlacements(BOARD, room.setup.buildings ?? [], player, setupCard.placement).find(
        (placement) => placement.x === x && placement.y === y && placement.orientation === orientation
      );

      if (!validPlacement) {
        socket.emit("errorMessage", "Placement invalide pour ce bâtiment.");
        return;
      }

      room.setup.buildings.push(createSetupBuilding(cardKey, player, x, y, orientation));
      room.setup.remainingBuildings[`player${player}`] = remaining.filter((entry) => entry !== cardKey);
      room.setup.step += 1;

      io.to(roomId).emit("SETUP_UPDATE", room.setup);
      return;
    }

    const isValidCell = getSetupSpawnCells(room.setup.buildings ?? [], player).some((cell) => cell.x === x && cell.y === y);
    if (!isValidCell) {
      socket.emit("errorMessage", "Case invalide pour le setup.");
      return;
    }

    room.setup.placements[`player${player}`][currentStep.type] = { x, y };
    room.setup.step += 1;

    io.to(roomId).emit("SETUP_UPDATE", room.setup);

    if (room.setup.step >= SETUP_STEPS.length) {
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

    const safeAction = { ...action, player: playerIndex + 1 };
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

    if (!room.rematchRequests) room.rematchRequests = {};
    room.rematchRequests[socket.id] = true;

    const otherSocketId = getOtherPlayerSocket(room, socket.id);
    socket.emit("REMATCH_PENDING");
    if (otherSocketId) io.to(otherSocketId).emit("REMATCH_REQUESTED");
  });

  socket.on("SCIENCE_PEEK", ({ roomId, pileType }) => {
    const room = getRoom(roomId);
    if (!room || room.phase !== "game" || !room.state) return;

    const playerIndex = room.players.indexOf(socket.id);
    if (playerIndex === -1) return;

    if (room.state.scienceActionUsedThisPhase) {
      socket.emit("errorMessage", "Action science déjà utilisée ce tour.");
      return;
    }

    const pile = pileType === "points" ? room.state.remainingPointDeck : room.state.remainingEventDeck;
    const card = pile?.[0] || null;

    const newState = { ...room.state, scienceActionUsedThisPhase: true };
    room.state = newState;
    io.to(roomId).emit("GAME_STATE", newState);
    socket.emit("SCIENCE_PEEK_RESULT", { player: playerIndex + 1, pileType, card });
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

    if (!room.rematchRequests) room.rematchRequests = {};
    if (!accept) {
      room.rematchRequests = {};
      io.to(roomId).emit("REMATCH_DECLINED");
      return;
    }

    room.rematchRequests[socket.id] = true;
    const allAccepted = room.players.length === 2 && room.players.every((playerSocketId) => room.rematchRequests[playerSocketId]);
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
    io.to(roomId).emit("roomUpdate", { roomId, players: room.players, roomPhase: room.phase });
  });

  socket.on("disconnect", () => {
    Object.entries(rooms).forEach(([roomId, room]) => {
      if (!room.players.includes(socket.id)) return;
      if (room.rematchRequests) delete room.rematchRequests[socket.id];
      room.players = room.players.filter((id) => id !== socket.id);

      if (room.players.length === 0) {
        delete rooms[roomId];
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
      io.to(roomId).emit("roomUpdate", { roomId, players: room.players, roomPhase: room.phase });
    });
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur port ${PORT}`);
});
