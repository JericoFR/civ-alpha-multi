import { BOARD } from "../data/board.js";
import { UNIT_DEFS } from "../data/units.js";

export function makeCellKey(x, y) {
  return `${x},${y}`;
}

export function isInsideBoard(x, y) {
  return y >= 0 && y < BOARD.length && x >= 0 && x < BOARD[0].length;
}

export function isTerrainBlocked(x, y) {
  if (!isInsideBoard(x, y)) return true;
  const cell = BOARD[y][x];

  // Gris = mur infranchissable
  if (cell === "gris") return true;

  // Noir = slot défensif, ne bloque PAS par défaut
  return false;
}

export function getUnitsAt(units, x, y) {
  return units.filter((unit) => unit.x === x && unit.y === y);
}

export function getUnitAt(units, x, y) {
  return units.find((unit) => unit.x === x && unit.y === y) || null;
}

export function isMilitaryUnit(unit) {
  return unit && unit.type !== "worker";
}

export function hasEnemyUnit(units, selectedUnit, x, y) {
  return units.some(
    (unit) =>
      unit.x === x &&
      unit.y === y &&
      unit.player !== selectedUnit.player
  );
}

export function hasAlliedMilitaryOnCell(units, selectedUnit, x, y) {
  return units.some(
    (unit) =>
      unit.x === x &&
      unit.y === y &&
      unit.player === selectedUnit.player &&
      unit.id !== selectedUnit.id &&
      isMilitaryUnit(unit)
  );
}

export function isEnemyMovementBlockedByBuilding(building, selectedUnit, x, y) {
  if (!building || !selectedUnit) return false;
  if (building.player === selectedUnit.player) return false;
  if (building.isBurning || building.isActive === false) return false;

  // Défenses qui bloquent le déplacement ennemi
  if (building.type !== "palisade") return false;

  return normalizeBuildingCells(building).some((cell) => cell.x === x && cell.y === y);
}

export function isBlockedByEnemyDefense(buildings, selectedUnit, x, y) {
  if (!Array.isArray(buildings) || !selectedUnit) return false;

  return buildings.some((building) =>
    isEnemyMovementBlockedByBuilding(building, selectedUnit, x, y)
  );
}

export function canUnitEndOnCell(units, buildings, selectedUnit, x, y) {
  // Ennemi = interdit
  if (hasEnemyUnit(units, selectedUnit, x, y)) {
    return false;
  }

  // Défense ennemie active = interdit
  if (isBlockedByEnemyDefense(buildings, selectedUnit, x, y)) {
    return false;
  }

  // Si l'unité sélectionnée est militaire,
  // elle ne peut pas finir sur une case avec une autre militaire alliée
  if (isMilitaryUnit(selectedUnit) && hasAlliedMilitaryOnCell(units, selectedUnit, x, y)) {
    return false;
  }

  return true;
}

export function getReachableCells(units, buildings, selectedUnit) {
  if (!selectedUnit) return [];

  const def = UNIT_DEFS[selectedUnit.type];
  const maxMove = def?.movePoints ?? 0;
  if (maxMove <= 0) return [];

  const visited = new Map();
  const queue = [{ x: selectedUnit.x, y: selectedUnit.y, dist: 0 }];
  const results = [];

  visited.set(makeCellKey(selectedUnit.x, selectedUnit.y), 0);

  while (queue.length > 0) {
    const current = queue.shift();

    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];

    for (const next of neighbors) {
      if (!isInsideBoard(next.x, next.y)) continue;
      if (isTerrainBlocked(next.x, next.y)) continue;

      const nextDist = current.dist + 1;
      if (nextDist > maxMove) continue;

      const key = makeCellKey(next.x, next.y);
      const previousBest = visited.get(key);

      if (previousBest !== undefined && previousBest <= nextDist) {
        continue;
      }

      // Ennemi bloque totalement le passage
      if (hasEnemyUnit(units, selectedUnit, next.x, next.y)) {
        continue;
      }

      // Palissade ennemie active = bloque totalement passage + arrivée
      if (isBlockedByEnemyDefense(buildings, selectedUnit, next.x, next.y)) {
        continue;
      }

      visited.set(key, nextDist);

      queue.push({ x: next.x, y: next.y, dist: nextDist });

      if (canUnitEndOnCell(units, buildings, selectedUnit, next.x, next.y)) {
        if (!(next.x === selectedUnit.x && next.y === selectedUnit.y)) {
          results.push({ x: next.x, y: next.y });
        }
      }
    }
  }

  return results;
}

export function canMoveTo(reachableCells, x, y) {
  return reachableCells.some((cell) => cell.x === x && cell.y === y);
}

export function moveUnit(units, unitId, x, y) {
  return units.map((unit) =>
    unit.id === unitId ? { ...unit, x, y } : unit
  );
}