import { BOARD } from "../data/board";
import { getBuildingDef } from "../data/buildings";

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

export function getCellOwner(x, y) {
  if (y >= 0 && y <= 3) return 1;
  if (y >= 15 && y <= 18) return 2;

  if (x === 3 || x === 9) {
    if (y >= 7 && y <= 8) return 1;
    if (y >= 10 && y <= 11) return 2;
  }

  return null;
}

function isValidVerticalAnchor(x, y, player) {
  if (player === 1) {
    if (y >= 0 && y <= 3) return y === 0 || y === 2;
    if ((x === 3 || x === 9) && y >= 7 && y <= 8) return y === 7;
    return false;
  }

  if (player === 2) {
    if ((x === 3 || x === 9) && y >= 10 && y <= 11) return y === 10;
    if (y >= 15 && y <= 18) return y === 15 || y === 17;
    return false;
  }

  return false;
}

export function canPlaceBuildingAt({
  buildings,
  x,
  y,
  orientation = "vertical",
  player,
  size = 2,
}) {
  const candidateCells = Array.from({ length: size }, (_, index) => ({
    x: x + (orientation === "horizontal" ? index : 0),
    y: y + (orientation === "vertical" ? index : 0),
  }));

  if (candidateCells.length !== size) return false;

  const everyGreen = candidateCells.every(
    (cell) => BOARD[cell.y]?.[cell.x] === "vert"
  );
  if (!everyGreen) return false;

  const ownerOk = candidateCells.every(
    (cell) => getCellOwner(cell.x, cell.y) === player
  );
  if (!ownerOk) return false;

  if (orientation === "vertical") {
    if (!isValidVerticalAnchor(x, y, player)) return false;
  }

  const occupied = buildings.some((building) => {
    const cells = normalizeBuildingCells(building);
    return cells.some((cell) =>
      candidateCells.some(
        (candidate) => candidate.x === cell.x && candidate.y === cell.y
      )
    );
  });

  if (occupied) return false;

  return true;
}

export function getValidBuildingPlacements(
  buildings,
  player,
  { allowHorizontal = true, allowVertical = true, size = 2 } = {}
) {
  const placements = [];

  for (let y = 0; y < BOARD.length; y += 1) {
    for (let x = 0; x < BOARD[0].length; x += 1) {
      if (
        allowVertical &&
        canPlaceBuildingAt({
          buildings,
          x,
          y,
          orientation: "vertical",
          player,
          size,
        })
      ) {
        placements.push({ x, y, orientation: "vertical" });
      }

      if (
        allowHorizontal &&
        canPlaceBuildingAt({
          buildings,
          x,
          y,
          orientation: "horizontal",
          player,
          size,
        })
      ) {
        placements.push({ x, y, orientation: "horizontal" });
      }
    }
  }

  return placements;
}

export function isPlacementInList(placements, x, y) {
  return placements.some((placement) => placement.x === x && placement.y === y);
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