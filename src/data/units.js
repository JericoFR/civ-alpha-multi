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
    cost: { food: 2, gold: 1 },
  },
  archer: {
    key: "archer",
    name: "Archer",
    icon: "🏹",
    movePoints: 2,
    cost: { food: 1, gold: 2 },
  },
  cavalry: {
    key: "cavalry",
    name: "Cavalerie",
    icon: "🐎",
    movePoints: 3,
    cost: { food: 2, gold: 3 },
  },
  siege: {
    key: "siege",
    name: "Siège",
    icon: "🛡️",
    movePoints: 2,
    cost: { food: 1, gold: 4 },
  },
};

export function getDefaultUnitDirection(player) {
  return player === 1 ? "down" : "up";
}

export const INITIAL_UNITS = [
  { id: "p1-worker", player: 1, type: "worker", x: 6, y: 1 },
  { id: "p1-soldier", player: 1, type: "soldier", x: 6, y: 0 },
  { id: "p2-worker", player: 2, type: "worker", x: 6, y: 16 },
  { id: "p2-soldier", player: 2, type: "soldier", x: 6, y: 17 },
];
