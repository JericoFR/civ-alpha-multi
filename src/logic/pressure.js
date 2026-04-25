import { normalizeBuildingCells } from "./buildings.js";

function getCellKey(x, y) {
  return `${x},${y}`;
}

function isInsideBoard(x, y) {
  return x >= 0 && x < 13 && y >= 0 && y < 19;
}

function filterInsideBoard(cells) {
  return cells.filter((cell) => isInsideBoard(cell.x, cell.y));
}

function getCrossPressureCells(unit) {
  return filterInsideBoard([
    { x: unit.x, y: unit.y },
    { x: unit.x + 1, y: unit.y },
    { x: unit.x - 1, y: unit.y },
    { x: unit.x, y: unit.y + 1 },
    { x: unit.x, y: unit.y - 1 },
  ]);
}

function getDirectionalCells(unit, distance) {
  const direction = unit.direction ?? (unit.player === 1 ? "down" : "up");

  if (direction === "up") {
    return Array.from({ length: distance }, (_, index) => ({
      x: unit.x,
      y: unit.y - (index + 1),
    }));
  }

  if (direction === "down") {
    return Array.from({ length: distance }, (_, index) => ({
      x: unit.x,
      y: unit.y + (index + 1),
    }));
  }

  if (direction === "left") {
    return Array.from({ length: distance }, (_, index) => ({
      x: unit.x - (index + 1),
      y: unit.y,
    }));
  }

  return Array.from({ length: distance }, (_, index) => ({
    x: unit.x + (index + 1),
    y: unit.y,
  }));
}

function getDirectionalPressureCells(unit) {
  return filterInsideBoard([
    { x: unit.x, y: unit.y },
    ...getDirectionalCells(unit, 2),
  ]);
}

function getPressureCellsForUnit(unit) {
  if (unit.type === "soldier") return getCrossPressureCells(unit);
  if (unit.type === "cavalry") return getCrossPressureCells(unit);
  if (unit.type === "archer") return getDirectionalPressureCells(unit);
  if (unit.type === "siege") return getDirectionalPressureCells(unit);
  return [];
}

export function buildPressureMap(units) {
  const map = {};

  for (const unit of units) {
    const cells = getPressureCellsForUnit(unit);

    for (const cell of cells) {
      const key = getCellKey(cell.x, cell.y);

      if (!map[key]) {
        map[key] = { player1: 0, player2: 0 };
      }

      if (unit.player === 1) map[key].player1 += 1;
      else map[key].player2 += 1;
    }
  }

  return map;
}

function getEnemyPressure(pressureMap, x, y, player) {
  const entry = pressureMap[getCellKey(x, y)];
  if (!entry) return 0;
  return player === 1 ? entry.player2 : entry.player1;
}

function buildingProtects(building) {
  if (building.isBurning) return false;
  if (building.isActive === false) return false;
  return true;
}

function isProtected(unit, buildings) {
  return buildings.some((building) => {
    if (!buildingProtects(building)) return false;

    const cells = normalizeBuildingCells(building);
    return cells.some((cell) => cell.x === unit.x && cell.y === unit.y);
  });
}

function getThreshold(unit) {
  if (unit.type === "worker") return 1;
  if (unit.type === "siege") return 1;
  return 2;
}

function getBuildingBurnThreshold(building, fallbackThreshold = 3) {
  if (typeof building.burnThreshold === "number") {
    return building.burnThreshold;
  }

  if (building.type === "palisade") {
    return 3;
  }

  return fallbackThreshold;
}

function shouldBurn(building, pressureMap, buildingBurnThreshold = 3) {
  const cells = normalizeBuildingCells(building);
  const threshold = getBuildingBurnThreshold(building, buildingBurnThreshold);

  return cells.some((cell) => {
    const enemyPressure = getEnemyPressure(
      pressureMap,
      cell.x,
      cell.y,
      building.player
    );
    return enemyPressure >= threshold;
  });
}

function chooseVictimForCell(candidates) {
  return (
    candidates.find((unit) => unit.type === "soldier") ||
    candidates.find((unit) => unit.type !== "worker") ||
    candidates[0]
  );
}

export function resolveMilitaryPressure(units, buildings, options = {}) {
  const pressureMap = buildPressureMap(units);
  const unitsByCell = {};

  for (const unit of units) {
    const key = getCellKey(unit.x, unit.y);
    if (!unitsByCell[key]) unitsByCell[key] = [];
    unitsByCell[key].push(unit);
  }

  const destroyedIds = new Set();
  const burningIds = new Set();

  for (const key in unitsByCell) {
    const cellUnits = unitsByCell[key];

    const candidates = cellUnits.filter((unit) => {
      if (isProtected(unit, buildings)) return false;

      const enemyPressure = getEnemyPressure(
        pressureMap,
        unit.x,
        unit.y,
        unit.player
      );

      return enemyPressure >= getThreshold(unit);
    });

    if (candidates.length === 0) continue;

    const victim = chooseVictimForCell(candidates);
    destroyedIds.add(victim.id);
  }

  const buildingBurnThreshold = options.buildingBurnThreshold ?? 3;

  for (const building of buildings) {
    if (shouldBurn(building, pressureMap, buildingBurnThreshold)) {
      burningIds.add(building.id);
    }
  }

  const destroyedUnits = units.filter((unit) => destroyedIds.has(unit.id));
  const destroyedByPlayer = {
    player1: destroyedUnits.filter((unit) => unit.player === 2).length,
    player2: destroyedUnits.filter((unit) => unit.player === 1).length,
  };

  return {
    units: units.filter((unit) => !destroyedIds.has(unit.id)),
    buildings: buildings.map((building) =>
      burningIds.has(building.id)
        ? {
            ...building,
            isBurning: true,
            isActive: false,
          }
        : building
    ),
    destroyedUnits,
    destroyedByPlayer,
    burningBuildings: buildings.filter((building) =>
      burningIds.has(building.id)
    ),
    pressureMap,
  };
}
