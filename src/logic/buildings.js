import { BOARD } from "../data/board.js";
import { getBuildingDef } from "../data/buildings.js";
import { isMilitaryUnit } from "./movement.js";

export function normalizeBuildingCells(building) {
  if (Array.isArray(building.cells) && building.cells.length > 0) {
    return building.cells;
  }

  const orientation = building.orientation ?? "vertical";
  const size = building.size ?? 2;

  if (typeof building.x === "number" && typeof building.y === "number") {
    return Array.from({ length: size }, (_, index) => ({
      x: building.x + (orientation === "horizontal" ? index : 0),
      y: building.y + (orientation === "vertical" ? index : 0),
    }));
  }

  return [];
}

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

    const def = getBuildingDef(building);
    const isTownhall = building.type === "townhall";
    const isHousing = (def?.housing ?? 0) > 0;

    if (!isTownhall && !isHousing) continue;

    const cells = normalizeBuildingCells(building);

    for (const cell of cells) {
      const hasEnemy = units.some(
        (unit) =>
          unit.x === cell.x &&
          unit.y === cell.y &&
          unit.player !== player
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
        (unit) =>
          unit.x === cell.x &&
          unit.y === cell.y &&
          unit.player !== player
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

function getCellOwner(x, y) {
  // Base J1
  if (y >= 0 && y <= 4) return 1;

  // Base J2
  if (y >= 13 && y <= 18) return 2;

  // No man's land constructible J1
  if ((x === 3 || x === 9) && y >= 7 && y <= 8) return 1;

  // No man's land constructible J2
  if ((x === 3 || x === 9) && y >= 10 && y <= 11) return 2;

  return null;
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getPlayerAnchorCells(buildings, player) {
  return buildings
    .filter(
      (building) =>
        building.player === player &&
        (building.type === "townhall" ||
          building.type === "house" ||
          building.type === "production_food" ||
          building.type === "production_gold")
    )
    .flatMap((building) => normalizeBuildingCells(building));
}

function getAverageDistanceToAnchors(cells, anchors) {
  if (!anchors.length) return Number.POSITIVE_INFINITY;

  let total = 0;

  for (const cell of cells) {
    let best = Number.POSITIVE_INFINITY;

    for (const anchor of anchors) {
      const dist = manhattan(cell, anchor);
      if (dist < best) best = dist;
    }

    total += best;
  }

  return total / cells.length;
}

function getDefenseCellOwner(buildings, x, y) {
  if (BOARD[y]?.[x] !== "noir") return null;

  const p1Anchors = getPlayerAnchorCells(buildings, 1);
  const p2Anchors = getPlayerAnchorCells(buildings, 2);

  const probe = [{ x, y }];

  const p1Distance = getAverageDistanceToAnchors(probe, p1Anchors);
  const p2Distance = getAverageDistanceToAnchors(probe, p2Anchors);

  if (p1Distance < p2Distance) return 1;
  if (p2Distance < p1Distance) return 2;

  return null;
}

function canPlacePair({
  occupied,
  buildings,
  player,
  x,
  y,
  size,
  orientation,
  expectedTerrain,
}) {
  const cells = Array.from({ length: size }, (_, index) => ({
    x: x + (orientation === "horizontal" ? index : 0),
    y: y + (orientation === "vertical" ? index : 0),
  }));

  const allOwned = cells.every((cell) => {
    if (expectedTerrain === "noir") {
      return getDefenseCellOwner(buildings, cell.x, cell.y) === player;
    }

    return getCellOwner(cell.x, cell.y) === player;
  });
  if (!allOwned) return false;

  const allOnExpectedTerrain = cells.every(
    (cell) => BOARD[cell.y]?.[cell.x] === expectedTerrain
  );
  if (!allOnExpectedTerrain) return false;

  const allFree = cells.every(
    (cell) => !occupied.has(`${cell.x},${cell.y}`)
  );
  if (!allFree) return false;

  return true;
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

  const expectedTerrain = mode === "black_pair" ? "noir" : "vert";
  const results = [];

  for (let y = 0; y < BOARD.length; y += 1) {
    for (let x = 0; x < BOARD[0].length; x += 1) {
      if (BOARD[y]?.[x] !== expectedTerrain) continue;

      const owner =
        expectedTerrain === "noir"
          ? getDefenseCellOwner(buildings, x, y)
          : getCellOwner(x, y);

      if (owner !== player) continue;

      if (
        allowVertical &&
        canPlacePair({
          occupied,
          buildings,
          player,
          x,
          y,
          size,
          orientation: "vertical",
          expectedTerrain,
        })
      ) {
        results.push({ x, y, orientation: "vertical" });
      }

      if (
        allowHorizontal &&
        canPlacePair({
          occupied,
          buildings,
          player,
          x,
          y,
          size,
          orientation: "horizontal",
          expectedTerrain,
        })
      ) {
        results.push({ x, y, orientation: "horizontal" });
      }
    }
  }

  return results;
}

export function isPlacementInList(placements, x, y) {
  return placements.some((placement) => placement.x === x && placement.y === y);
}