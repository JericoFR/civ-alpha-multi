import { BOARD } from "../data/board.js";
import { isMilitaryUnit } from "../logic/movement.js";

export const BUILDING_DEFS = {
  townhall: {
    key: "townhall",
    name: "Hôtel de Ville",
    housing: 2,
    cost: {},
    height: 2,
  },

  house: {
    key: "house",
    name: "Chaumière",
    housing: 3,
    cost: { gold: 3 },
    height: 2,
  },

  production_food: {
    key: "production_food",
    name: "Champ",
    resource: "food",
    productionBase: 2,
    productionWorkerBonus: 1,
    cost: {},
    height: 2,
  },

  production_gold: {
    key: "production_gold",
    name: "Mine d’or",
    resource: "gold",
    productionBase: 2,
    productionWorkerBonus: 1,
    cost: {},
    height: 2,
  },

  barracks_1: {
    key: "barracks_1",
    name: "Caserne I",
    cost: { gold: 3 },
    height: 2,
  },

  palisade: {
    key: "palisade",
    name: "Palissade",
    cost: { gold: 1 },
    height: 2,
    burnThreshold: 3,
    blocksEnemyMovement: true,
  },

  market: {
    key: "market",
    name: "Marché",
    cost: { gold: 3 },
    height: 2,
  },

  school: {
    key: "school",
    name: "École",
    sciencePerWorker: 1,
    cost: { gold: 3 },
    height: 2,
  },

  aqueduct: {
  key: "aqueduct",
  name: "Aqueduc",
  cost: { gold: 3 },
  height: 2,
},

castrum: {
  key: "castrum",
  name: "Castrum",
  cost: { gold: 4 },
  height: 2,
},

forum: {
  key: "forum",
  name: "Forum",
  cost: { gold: 2 },
  height: 2,
},


};

export function getBuildingDef(buildingOrType) {
  if (!buildingOrType) return null;

  if (typeof buildingOrType === "string") {
    return BUILDING_DEFS[buildingOrType] ?? null;
  }

  if (buildingOrType.type && BUILDING_DEFS[buildingOrType.type]) {
    return BUILDING_DEFS[buildingOrType.type];
  }

  if (buildingOrType.key && BUILDING_DEFS[buildingOrType.key]) {
    return BUILDING_DEFS[buildingOrType.key];
  }

  return null;
}

export function normalizeBuildingCells(building) {
  if (!building) return [];

  const size = building.size ?? 2;
  const orientation = building.orientation ?? "vertical";

  if (orientation === "horizontal") {
    return Array.from({ length: size }, (_, index) => ({
      x: building.x + index,
      y: building.y,
    }));
  }

  return Array.from({ length: size }, (_, index) => ({
    x: building.x,
    y: building.y + index,
  }));
}

export const INITIAL_BUILDINGS = [
  { id: "p1-townhall", player: 1, type: "townhall", x: 6, y: 0, orientation: "vertical", size: 2 },
  { id: "p1-house", player: 1, type: "house", x: 6, y: 2, orientation: "vertical", size: 2 },
  { id: "p1-food", player: 1, type: "production_food", x: 4, y: 0, orientation: "vertical", size: 2 },
  { id: "p1-gold", player: 1, type: "production_gold", x: 8, y: 0, orientation: "vertical", size: 2 },

  { id: "p2-townhall", player: 2, type: "townhall", x: 6, y: 17, orientation: "vertical", size: 2 },
  { id: "p2-house", player: 2, type: "house", x: 6, y: 15, orientation: "vertical", size: 2 },
  { id: "p2-food", player: 2, type: "production_food", x: 4, y: 17, orientation: "vertical", size: 2 },
  { id: "p2-gold", player: 2, type: "production_gold", x: 8, y: 17, orientation: "vertical", size: 2 },
];

function getOperationalBuildingCells(building) {
  if (building.isBurning || building.isActive === false) return [];
  return normalizeBuildingCells(building);
}

export function getAlliedWorkersInsideBuilding(building, units) {
  const cells = getOperationalBuildingCells(building);
  if (cells.length === 0) return [];

  return units.filter(
    (unit) =>
      unit.player === building.player &&
      unit.type === "worker" &&
      cells.some((cell) => cell.x === unit.x && cell.y === unit.y)
  );
}

export function hasActiveWorkerInBuilding(building, units) {
  return getAlliedWorkersInsideBuilding(building, units).length > 0;
}

export function getValidWorkerSpawnCells(buildings, units, player) {
  const valid = [];

  for (const building of buildings) {
    if (building.player !== player) continue;
    if (building.isBurning || building.isActive === false) continue;
    if (building.type !== "townhall" && building.type !== "house") continue;

    const cells = normalizeBuildingCells(building);

    for (const cell of cells) {
      const hasEnemy = units.some(
        (unit) => unit.x === cell.x && unit.y === cell.y && unit.player !== player
      );
      if (hasEnemy) continue;

      valid.push({ x: cell.x, y: cell.y });
    }
  }

  return valid;
}

export function getValidMilitarySpawnCells(buildings, units, player, unitType) {
  const valid = [];

  for (const building of buildings) {
    if (building.player !== player) continue;
    if (building.isBurning || building.isActive === false) continue;

    const isBarracks1 = building.type === "barracks_1";
    const isBarracks2 = building.type === "barracks_2";

    const requiresBarracks1 = unitType === "soldier" || unitType === "archer";
    const requiresBarracks2 = unitType === "cavalry" || unitType === "siege";

    if (requiresBarracks1 && !isBarracks1 && !isBarracks2) continue;
    if (requiresBarracks2 && !isBarracks2) continue;
    if (!hasActiveWorkerInBuilding(building, units)) continue;

    const cells = normalizeBuildingCells(building);

    for (const cell of cells) {
      const hasEnemy = units.some(
        (unit) => unit.x === cell.x && unit.y === cell.y && unit.player !== player
      );
      if (hasEnemy) continue;

      const hasAlliedMilitary = units.some(
        (unit) =>
          unit.x === cell.x &&
          unit.y === cell.y &&
          unit.player === player &&
          isMilitaryUnit(unit)
      );
      if (hasAlliedMilitary) continue;

      valid.push({ x: cell.x, y: cell.y });
    }
  }

  return valid;
}

export function getValidBuildingPlacements(
  buildings,
  player,
  {
    mode = "green_pair",
    allowHorizontal = true,
    allowVertical = true,
    size = 2,
  } = {}
) {
  const occupied = new Set(
    buildings.flatMap((building) =>
      normalizeBuildingCells(building).map((cell) => `${cell.x},${cell.y}`)
    )
  );

  const slotGroups = {
    green_pair: [
      // J1
      { x: 2, y: 2, player: 1 },
      { x: 4, y: 2, player: 1 },
      { x: 8, y: 2, player: 1 },
      { x: 10, y: 2, player: 1 },
      { x: 2, y: 4, player: 1 },
      { x: 10, y: 4, player: 1 },

      // J2
      { x: 2, y: 13, player: 2 },
      { x: 4, y: 13, player: 2 },
      { x: 8, y: 13, player: 2 },
      { x: 10, y: 13, player: 2 },
      { x: 2, y: 15, player: 2 },
      { x: 10, y: 15, player: 2 },
    ],

    black_pair: [
      // J1 defenses
      { x: 4, y: 5, player: 1 },
      { x: 7, y: 5, player: 1 },

      // J2 defenses
      { x: 4, y: 13, player: 2 },
      { x: 7, y: 13, player: 2 },
    ],
  };

  const slots = slotGroups[mode] ?? slotGroups.green_pair;
  const results = [];

  for (const slot of slots) {
    if (slot.player !== player) continue;

    if (allowVertical) {
      const cells = Array.from({ length: size }, (_, index) => ({
        x: slot.x,
        y: slot.y + index,
      }));

      const allFree = cells.every((cell) => !occupied.has(`${cell.x},${cell.y}`));
      const allOnExpectedTerrain = cells.every(
        (cell) => BOARD[cell.y]?.[cell.x] === (mode === "black_pair" ? "noir" : "vert")
      );

      if (allFree && allOnExpectedTerrain) {
        results.push({ x: slot.x, y: slot.y, orientation: "vertical" });
      }
    }

    if (allowHorizontal) {
      const cells = Array.from({ length: size }, (_, index) => ({
        x: slot.x + index,
        y: slot.y,
      }));

      const allFree = cells.every((cell) => !occupied.has(`${cell.x},${cell.y}`));
      const allOnExpectedTerrain = cells.every(
        (cell) => BOARD[cell.y]?.[cell.x] === (mode === "black_pair" ? "noir" : "vert")
      );

      if (allFree && allOnExpectedTerrain) {
        results.push({ x: slot.x, y: slot.y, orientation: "horizontal" });
      }
    }
  }

  return results;
}