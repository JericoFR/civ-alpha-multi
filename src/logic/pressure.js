import { normalizeBuildingCells } from "./buildings";

function getCellKey(x, y) {
  return `${x},${y}`;
}

function getSoldierPressureCells(unit) {
  return [
    { x: unit.x, y: unit.y },
    { x: unit.x + 1, y: unit.y },
    { x: unit.x - 1, y: unit.y },
    { x: unit.x, y: unit.y + 1 },
    { x: unit.x, y: unit.y - 1 },
  ];
}

function getPressureCellsForUnit(unit) {
  if (unit.type === "soldier") return getSoldierPressureCells(unit);
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
  // Un bâtiment en feu / désactivé ne protège plus
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

function shouldBurn(building, pressureMap, buildingBurnThreshold = 3) {
  const cells = normalizeBuildingCells(building);

  return cells.some((cell) => {
    const enemyPressure = getEnemyPressure(
      pressureMap,
      cell.x,
      cell.y,
      building.player
    );
    return enemyPressure >= buildingBurnThreshold;
  });
}

function chooseVictimForCell(candidates) {
  // Priorité validée :
  // 1) soldier
  // 2) autres militaires non-worker
  // 3) worker
  return (
    candidates.find((unit) => unit.type === "soldier") ||
    candidates.find((unit) => unit.type !== "worker") ||
    candidates[0]
  );
}

export function resolveMilitaryPressure(units, buildings, options = {}) {
  // Pression calculée à partir de toutes les unités présentes
  // au début de la résolution : simultanéité complète.
  const pressureMap = buildPressureMap(units);

  // Protection calculée à partir des bâtiments AVANT application :
  // - un bâtiment sain protège
  // - un bâtiment déjà en feu ne protège pas
  // - un bâtiment qui va brûler ce tour protège encore pour CE tour
  const unitsByCell = {};

  for (const unit of units) {
    const key = getCellKey(unit.x, unit.y);
    if (!unitsByCell[key]) unitsByCell[key] = [];
    unitsByCell[key].push(unit);
  }

  const destroyedIds = new Set();
  const burningIds = new Set();

  // Maximum 1 mort par case
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

  // Bâtiments qui passent en feu
  const buildingBurnThreshold = options.buildingBurnThreshold ?? 3;

  for (const building of buildings) {
    if (shouldBurn(building, pressureMap, buildingBurnThreshold)) {
      burningIds.add(building.id);
    }
  }

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
    destroyedUnits: units.filter((unit) => destroyedIds.has(unit.id)),
    burningBuildings: buildings.filter((building) =>
      burningIds.has(building.id)
    ),
    pressureMap,
  };
}