import { BUILDING_DEFS } from "../data/buildings.js";
import { normalizeBuildingCells } from "./buildings.js";

export const CENTRAL_MARKET_CELLS = [
  { x: 6, y: 8 },
  { x: 5, y: 9 },
  { x: 6, y: 9 },
  { x: 7, y: 9 },
  { x: 6, y: 10 },
];

export function createInitialResources() {
  return {
    player1: { food: 3, gold: 3 },
    player2: { food: 3, gold: 3 },
  };
}

export function getWorkerFoodCost(activeEventCard = null) {
  return activeEventCard?.key === "recruitment" ? 4 : 5;
}

export function getPlayerKey(player) {
  return player === 1 ? "player1" : "player2";
}

export function canAfford(resources, cost) {
  return (
    (resources.food ?? 0) >= (cost.food ?? 0) &&
    (resources.gold ?? 0) >= (cost.gold ?? 0)
  );
}

export function spendCost(resources, cost) {
  return {
    food: (resources.food ?? 0) - (cost.food ?? 0),
    gold: (resources.gold ?? 0) - (cost.gold ?? 0),
  };
}

export function countUsedHousing(units, player) {
  return units.filter((unit) => unit.player === player).length;
}

export function getHousingCapacity(buildings, player, activeEventCard = null) {
  const baseHousing = buildings.reduce((total, building) => {
    if (building.player !== player) return total;
    if (!isBuildingOperational(building)) return total;
    const def = BUILDING_DEFS[building.type];
    return total + (def?.housing ?? 0);
  }, 0);

  if (activeEventCard?.key === "housing_crisis") {
    return Math.max(0, baseHousing - 2);
  }

  return baseHousing;
}

export function getHousingAvailable(buildings, units, player, activeEventCard = null) {
  return getHousingCapacity(buildings, player, activeEventCard) - countUsedHousing(units, player);
}

function isBuildingOperational(building) {
  if (building.isBurning) return false;
  if (building.isActive === false) return false;
  return true;
}

function getAlliedWorkersInside(building, units) {
  const cells = normalizeBuildingCells(building);

  return units.filter(
    (unit) =>
      unit.player === building.player &&
      unit.type === "worker" &&
      cells.some((cell) => cell.x === unit.x && cell.y === unit.y)
  );
}

function hasAlliedWorkerInside(building, units) {
  return getAlliedWorkersInside(building, units).length > 0;
}

function createEmptyProduction() {
  return { food: 0, gold: 0 };
}

export function getProductionPreviewForPlayer(buildings, units, player, activeEventCard = null) {
  const production = createEmptyProduction();

  for (const building of buildings) {
    if (building.player !== player) continue;
    if (!isBuildingOperational(building)) continue;

    const def = BUILDING_DEFS[building.type];
    if (!def?.resource) continue;

    let base = def.productionBase ?? 0;
    const bonus = hasAlliedWorkerInside(building, units)
      ? def.productionWorkerBonus ?? 0
      : 0;

    if (activeEventCard?.key === "abundance") {
      base += 1;
    }

    let totalGain = base + bonus;

    if (activeEventCard?.key === "gold_tension" && def.resource === "gold") {
      totalGain -= 1;
    }

    production[def.resource] += Math.max(0, totalGain);
  }

  return production;
}

export function getProductionPreview(buildings, units, activeEventCard = null) {
  return {
    player1: getProductionPreviewForPlayer(buildings, units, 1, activeEventCard),
    player2: getProductionPreviewForPlayer(buildings, units, 2, activeEventCard),
  };
}

export function getSciencePreviewForPlayer(buildings, units, player) {
  let science = 0;

  for (const building of buildings) {
    if (building.player !== player) continue;
    if (!isBuildingOperational(building)) continue;

    const def = BUILDING_DEFS[building.type];
    if (!def?.sciencePerWorker) continue;

    const workerCount = getAlliedWorkersInside(building, units).length;
    science += workerCount * (def.sciencePerWorker ?? 0);
  }

  return science;
}

export function getSciencePreview(buildings, units) {
  return {
    player1: getSciencePreviewForPlayer(buildings, units, 1),
    player2: getSciencePreviewForPlayer(buildings, units, 2),
  };
}

export function getScienceWinner(buildings, units) {
  const preview = getSciencePreview(buildings, units);

  if (preview.player1 === preview.player2) {
    return {
      player: null,
      playerKey: null,
      totals: preview,
    };
  }

  const player = preview.player1 > preview.player2 ? 1 : 2;

  return {
    player,
    playerKey: getPlayerKey(player),
    totals: preview,
  };
}

function addResourceBundle(resources, added) {
  return {
    food: (resources.food ?? 0) + (added.food ?? 0),
    gold: (resources.gold ?? 0) + (added.gold ?? 0),
  };
}

export function applyProduction(resources, buildings, units, activeEventCard = null) {
  const preview = getProductionPreview(buildings, units, activeEventCard);

  return {
    resources: {
      player1: addResourceBundle(resources.player1, preview.player1),
      player2: addResourceBundle(resources.player2, preview.player2),
    },
    produced: preview,
  };
}

export function formatProductionBundle(bundle) {
  const bits = [];

  if ((bundle.food ?? 0) > 0) bits.push(`+${bundle.food} 🌾`);
  if ((bundle.gold ?? 0) > 0) bits.push(`+${bundle.gold} 💰`);

  return bits.length > 0 ? bits.join("  ") : "rien";
}

export function isCentralMarketCell(x, y) {
  return CENTRAL_MARKET_CELLS.some((cell) => cell.x === x && cell.y === y);
}

export function hasActiveWorkerInBuilding(building, units) {
  if (!building || building.isBurning || building.isActive === false) return false;

  return getAlliedWorkersInside(building, units).length > 0;
}

export function hasActivePersonalMarket(buildings, units, player) {
  return buildings.some(
    (building) =>
      building.type === "market" &&
      building.player === player &&
      hasActiveWorkerInBuilding(building, units)
  );
}

export function getCentralMarketStatus(units, player) {
  const alliedWorkers = units.filter(
    (unit) => unit.player === player && unit.type === "worker" && isCentralMarketCell(unit.x, unit.y)
  );

  const enemyUnits = units.filter(
    (unit) => unit.player !== player && isCentralMarketCell(unit.x, unit.y)
  );

  const ownOtherUnits = units.filter(
    (unit) => unit.player === player && unit.type !== "worker" && isCentralMarketCell(unit.x, unit.y)
  );

  return {
    alliedWorkerCount: alliedWorkers.length,
    enemyUnitCount: enemyUnits.length,
    ownOtherUnitCount: ownOtherUnits.length,
    hasExactlyOneWorker: alliedWorkers.length === 1,
    hasEnemyPresence: enemyUnits.length > 0,
    isControlled: alliedWorkers.length === 1 && enemyUnits.length === 0,
  };
}

export function canUseCentralMarket(units, player) {
  return getCentralMarketStatus(units, player).isControlled;
}