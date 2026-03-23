export const UNIT_DEFS = {
  worker: {
    key: "worker",
    name: "Ouvrier",
    icon: "👷",
    movePoints: 2,
    cost: { food: 5 },
  },
  soldier: {
    key: "soldier",
    name: "Soldat",
    icon: "⚔️",
    movePoints: 2,
    cost: { food: 0, wood: 0, stone: 0, metal: 0 },
  },
};

export const INITIAL_UNITS = [
  { id: "p1-worker", player: 1, type: "worker", x: 6, y: 1 },
  { id: "p1-soldier", player: 1, type: "soldier", x: 6, y: 0 },
  { id: "p2-worker", player: 2, type: "worker", x: 6, y: 16 },
  { id: "p2-soldier", player: 2, type: "soldier", x: 6, y: 17 },
];