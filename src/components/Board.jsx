import { useEffect, useMemo, useState } from "react";
import { BOARD, CELL_COLORS } from "../data/board";
import { UNIT_DEFS } from "../data/units";
import { getBuildingImageCandidates } from "../data/cards";
import { makeCellKey, isMilitaryUnit } from "../logic/movement";
import { normalizeBuildingCells } from "../logic/buildings";

const CELL_SIZE = 56;
const GRID_GAP = 1;
const GRID_PADDING = 10;


function buildUnitsByCell(units) {
  const map = new Map();

  for (const unit of units) {
    const key = `${unit.x},${unit.y}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(unit);
  }

  return map;
}

function getBuildingLabel(type) {
  if (type === "townhall") return "🏛️";
  if (type === "house") return "🏠";
  if (type === "production_food") return "🌾";
  if (type === "production_gold") return "💰";
  if (type === "barracks_1") return "⚔️";
  if (type === "barracks_2") return "🛡️";
  if (type === "market") return "💰";
  if (type === "school") return "🎓";
  if (type === "palisade") return "🛡️";
  if (type === "coliseum") return "🏛️";
  return "";
}

function getBuildingColor(type) {
  if (type === "townhall") {
    return {
      fill: "linear-gradient(180deg, #a855f7 0%, #7e22ce 100%)",
      border: "#d8b4fe",
      shadow: "rgba(168, 85, 247, 0.38)",
    };
  }

  if (type === "house") {
    return {
      fill: "linear-gradient(180deg, #f9a8d4 0%, #ec4899 100%)",
      border: "#fbcfe8",
      shadow: "rgba(236, 72, 153, 0.35)",
    };
  }

  if (type === "school") {
    return {
      fill: "linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)",
      border: "#bfdbfe",
      shadow: "rgba(59, 130, 246, 0.35)",
    };
  }

  if (type === "market") {
    return {
      fill: "linear-gradient(180deg, #fb923c 0%, #f97316 100%)",
      border: "#fdba74",
      shadow: "rgba(249, 115, 22, 0.35)",
    };
  }

  if (type === "barracks_1" || type === "barracks_2") {
    return {
      fill: "linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)",
      border: "#fca5a5",
      shadow: "rgba(239, 68, 68, 0.4)",
    };
  }

  if (type === "palisade") {
  return {
    fill: "linear-gradient(180deg, #92400e 0%, #78350f 100%)",
    border: "#fbbf24",
    shadow: "rgba(120, 53, 15, 0.5)",
  };
}

  if (type === "coliseum") {
    return {
      fill: "linear-gradient(180deg, #fde68a 0%, #d97706 100%)",
      border: "#fef3c7",
      shadow: "rgba(217, 119, 6, 0.45)",
    };
  }

  return {
    fill: "linear-gradient(180deg, #facc15 0%, #eab308 100%)",
    border: "#fde68a",
    shadow: "rgba(234, 179, 8, 0.35)",
  };
}

function getMiniUnitPosition(index) {
  const positions = [
    { top: 4, left: 4 },
    { top: 4, right: 4 },
    { bottom: 4, left: 4 },
    { bottom: 4, right: 4 },
  ];

  return positions[index] || { top: 18, left: 18 };
}

function getPressureVisual(entry) {
  if (!entry) return null;

  const p1 = entry.player1 ?? 0;
  const p2 = entry.player2 ?? 0;

  if (p1 <= 0 && p2 <= 0) return null;

  if (p1 > 0 && p2 > 0) {
    return {
      ring: "inset 0 0 0 4px rgba(168, 85, 247, 0.9)",
      glow: "0 0 18px rgba(168, 85, 247, 0.55)",
      label: `${p1}/${p2}`,
      bg: "rgba(88, 28, 135, 0.82)",
    };
  }

  if (p1 > 0) {
    return {
      ring: "inset 0 0 0 4px rgba(59, 130, 246, 0.9)",
      glow: "0 0 16px rgba(59, 130, 246, 0.5)",
      label: `${p1}`,
      bg: "rgba(30, 64, 175, 0.82)",
    };
  }

  return {
    ring: "inset 0 0 0 4px rgba(239, 68, 68, 0.9)",
    glow: "0 0 16px rgba(239, 68, 68, 0.5)",
    label: `${p2}`,
    bg: "rgba(153, 27, 27, 0.82)",
  };
}

function isUnitCurrentPlayerMilitary(unit, phase, activePlayer) {
  return phase === "military_move" && isMilitaryUnit(unit) && unit.player === activePlayer;
}

function getBuildingRect(building) {
  const cells = normalizeBuildingCells(building);
  const xs = cells.map((cell) => cell.x);
  const ys = cells.map((cell) => cell.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    left: GRID_PADDING + minX * (CELL_SIZE + GRID_GAP) + 4,
    top: GRID_PADDING + minY * (CELL_SIZE + GRID_GAP) + 4,
    width: (maxX - minX + 1) * CELL_SIZE + (maxX - minX) * GRID_GAP - 8,
    height: (maxY - minY + 1) * CELL_SIZE + (maxY - minY) * GRID_GAP - 8,
  };
}

function buildingContainsCell(building, x, y) {
  const cells = normalizeBuildingCells(building);
  return cells.some((cell) => cell.x === x && cell.y === y);
}

function getBuildingImageTransform(building) {
  if (building.orientation === "horizontal") {
    return "rotate(90deg) scale(1.35)";
  }

  return "scale(1.06)";
}

function BuildingVisual({ building }) {
  const [imageIndex, setImageIndex] = useState(0);
  const imageCandidates = building.imageCandidates ?? [];
  const currentImage = imageCandidates[imageIndex] ?? null;
  const showImage = Boolean(currentImage) && !building.isBurning;

    return (
    <div
  style={{
  position: "absolute",
  left: building.rect.left,
  top: building.rect.top,
  zIndex: 1,
  pointerEvents: "none",
  width: building.rect.width,
  height: building.rect.height,
        borderRadius: 12,
        border: building.isBurning ? "3px solid #fb923c" : `3px solid ${building.colors.border}`,
        background: showImage
          ? "linear-gradient(180deg, rgba(15,23,42,0.15) 0%, rgba(15,23,42,0.28) 100%)"
          : building.isBurning
          ? "linear-gradient(180deg, rgba(127,29,29,0.8) 0%, rgba(234,88,12,0.6) 100%)"
          : building.colors.fill,
        boxShadow: building.isBurning
          ? "0 0 16px rgba(249, 115, 22, 0.75), inset 0 0 16px rgba(239, 68, 68, 0.35)"
          : showImage
          ? `0 10px 18px ${building.colors.shadow}, inset 0 0 0 1px rgba(255,255,255,0.12)`
          : `0 10px 18px ${building.colors.shadow}, inset 0 1px 0 rgba(255,255,255,0.25)`,
        opacity: building.isActive === false && !building.isBurning ? 0.72 : 1,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {showImage ? (
        <img
          src={currentImage}
          alt={building.type}
          draggable={false}
          onError={() => {
            if (imageIndex < imageCandidates.length - 1) {
              setImageIndex((prev) => prev + 1);
            } else {
              setImageIndex(imageCandidates.length);
            }
          }}
style={{pointerEvents: "none",
  position: "absolute",
  left: "50%",
  top: "50%",
  width: "100%",
  height: "100%",
  padding: 4,
  boxSizing: "border-box",
  transform: "translate(-50%, -50%) scale(1.1)",
  zIndex: 1,
  objectFit: "cover",
  objectPosition: "center 40%",
  userSelect: "none",
  pointerEvents: "none",
  filter: building.player === 2 ? "saturate(0.95) brightness(0.94)" : "none",
}}
/>
      ) : null}

      <div
  style={{
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: building.isBurning
      ? "linear-gradient(180deg, rgba(127,29,29,0.22) 0%, rgba(249,115,22,0.38) 100%)"
      : showImage
      ? "linear-gradient(180deg, rgba(15,23,42,0.12) 0%, rgba(15,23,42,0.34) 100%)"
      : "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 50%)",
  }}
/>

      <div
        style={{pointerEvents: "none",
          position: "absolute",
          top: 5,
          left: 5,
          width: 18,
          height: 18,
          borderRadius: 999,
          background: building.player === 1 ? "rgba(30,64,175,0.95)" : "rgba(153,27,27,0.95)",
          color: "white",
          fontSize: 10,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 0 2px rgba(255,255,255,0.22)",
          zIndex: 2,
        }}
      >
        {building.player}
      </div>

      {building.isBurning ? (
        <div
          style={{pointerEvents: "none",
            position: "absolute",
            right: 6,
            top: 4,
            fontSize: 16,
            zIndex: 2,
            textShadow: "0 1px 3px rgba(0,0,0,0.65)",
          }}
        >
          🔥
        </div>
      ) : null}

      {!showImage ? (
        <div
          style={{pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            color: building.type === "production_stone" ? "#111827" : "white",
            fontSize: Math.min(building.rect.width, building.rect.height) > 64 ? 28 : 24,
            fontWeight: 800,
            textShadow: "0 1px 2px rgba(0,0,0,0.25)",
            zIndex: 1,
          }}
        >
          <span>{building.label}</span>
        </div>
      ) : null}
    </div>
  );
}

export default function Board({
  units,
  buildings,
  selectedUnitId,
  reachableCells,
  activatedUnitIds = [],
  activePlayer = null,
  phase = "",
  pressureMap = {},
  showPressure = true,
  placementCells = [],
  spawnCells = [],
  onCellClick,
  onUnitClick,
}) {
  const width = BOARD[0].length;
  const displayPressure = showPressure === true;

  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [hoveredBuilding, setHoveredBuilding] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);

    useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Shift") {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === "Shift") {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const unitsByCell = useMemo(() => buildUnitsByCell(units), [units]);

  const reachableSet = useMemo(() => {
    return new Set(reachableCells.map((cell) => makeCellKey(cell.x, cell.y)));
  }, [reachableCells]);

  const activatedSet = useMemo(() => new Set(activatedUnitIds), [activatedUnitIds]);
  const placementSet = useMemo(() => new Set(placementCells.map((cell) => makeCellKey(cell.x, cell.y))), [placementCells]);
  const spawnSet = useMemo(() => new Set(spawnCells.map((cell) => makeCellKey(cell.x, cell.y))), [spawnCells]);

  const buildingRects = useMemo(() => {
    return buildings.map((building) => ({
      ...building,
      rect: getBuildingRect(building),
      colors: getBuildingColor(building.type),
      label: getBuildingLabel(building.type),
      imageCandidates: getBuildingImageCandidates(building),
    }));
  }, [buildings]);

  function getBuildingAtCell(x, y) {
  return buildingRects.find((building) => buildingContainsCell(building, x, y)) ?? null;
}

    useEffect(() => {
  if (!isShiftPressed) {
    setHoveredBuilding(null);
    return;
  }

  if (!hoveredCell) {
    setHoveredBuilding(null);
    return;
  }

  setHoveredBuilding(getBuildingAtCell(hoveredCell.x, hoveredCell.y));
}, [isShiftPressed, hoveredCell, buildingRects]);

  return (
    <div
      style={{
        position: "relative",
        width: "fit-content",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${width}, ${CELL_SIZE}px)`,
          gap: GRID_GAP,
          background: "#475569",
          padding: GRID_PADDING,
          borderRadius: 16,
          width: "fit-content",
          boxShadow: "0 0 0 2px rgba(255,255,255,0.08)",
        }}
      >
        {BOARD.map((row, y) =>
          row.map((cell, x) => {
            const key = `${x},${y}`;
            const hoveredBuildingFromCell =
  isShiftPressed
    ? buildingRects.find((building) => buildingContainsCell(building, x, y)) ?? null
    : null;
            const cellUnits = unitsByCell.get(key) || [];
            const isReachable = reachableSet.has(key);
            const pressureEntry = displayPressure ? pressureMap[key] : null;
            const pressureVisual = displayPressure ? getPressureVisual(pressureEntry) : null;
            const isPlacementCell = placementSet.has(key);
            const isSpawnCell = spawnSet.has(key);
            const isGreenSlot = cell === "vert";

            return (
              <div
  key={key}
  onClick={() => onCellClick(x, y)}
  onMouseMove={() => {
    setHoveredCell((prev) => {
      if (prev && prev.x === x && prev.y === y) return prev;
      return { x, y };
    });

    if (isShiftPressed) {
      setHoveredBuilding(hoveredBuildingFromCell);
    }
  }}
  onMouseLeave={() => {
    setHoveredCell(null);
    setHoveredBuilding(null);
  }}
  style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  background: isGreenSlot ? "#22c55e" : CELL_COLORS[cell],
                  boxSizing: "border-box",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: cell === "blanc" || cell === "jaune" ? "#111" : "white",
                  fontSize: 20,
                  overflow: "hidden",
                  cursor: "pointer",
                  boxShadow: isReachable
                    ? "inset 0 0 0 4px rgba(250, 204, 21, 0.95)"
                    : isSpawnCell
                    ? "inset 0 0 0 3px rgba(255, 255, 255, 0.98), 0 0 14px rgba(255, 255, 255, 0.9), inset 0 0 10px rgba(255, 255, 255, 0.28)"
                    : isPlacementCell
                    ? "inset 0 0 0 4px rgba(255, 255, 255, 0.95), 0 0 16px rgba(16, 185, 129, 0.45)"
                    : isGreenSlot
                    ? "inset 0 0 0 2px rgba(255,255,255,0.35)"
                    : pressureVisual
                    ? `${pressureVisual.ring}, ${pressureVisual.glow}`
                    : "none",
                }}
              >
                {pressureVisual && (
                  <div
                    style={{
                      position: "absolute",
                      top: 3,
                      left: 3,
                      minWidth: 16,
                      height: 16,
                      padding: "0 4px",
                      borderRadius: 999,
                      background: pressureVisual.bg,
                      color: "white",
                      fontSize: 10,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 1,
                      pointerEvents: "none",
                    }}
                  >
                    {pressureVisual.label}
                  </div>
                )}

                {cellUnits.slice(0, 4).map((unit, index) => {
                  const def = UNIT_DEFS[unit.type];
                  const isSelected = unit.id === selectedUnitId;
                  const pos = getMiniUnitPosition(index);
                  const isActivated = activatedSet.has(unit.id);
                  const isCurrentMilitary = isUnitCurrentPlayerMilitary(unit, phase, activePlayer);

                  return (
                    <button
                      key={unit.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        onUnitClick(unit);
                      }}
                      title={`${def?.name ?? unit.type} J${unit.player}`}
                      style={{
                        position: "absolute",
                        ...pos,
                        width: 20,
                        height: 20,
                        padding: 0,
                        margin: 0,
                        border: isSelected
                          ? "2px solid #fde047"
                          : isCurrentMilitary && !isActivated
                          ? "2px solid rgba(255,255,255,0.9)"
                          : "1px solid rgba(255,255,255,0.35)",
                        borderRadius: 6,
                        background:
                          unit.player === 1
                            ? "rgba(59,130,246,0.95)"
                            : "rgba(239,68,68,0.95)",
                        color: "white",
                        fontSize: 11,
                        lineHeight: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 3,
                        opacity: isActivated ? 0.38 : 1,
                        boxShadow: isSelected
                          ? "0 0 8px rgba(253,224,71,0.9)"
                          : isCurrentMilitary && !isActivated
                          ? "0 0 10px rgba(255,255,255,0.5)"
                          : "none",
                      }}
                    >
                      {def?.icon ?? "?"}
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

            <div
  style={{
    position: "absolute",
    inset: 0,
    zIndex: 2,
    pointerEvents: "none",
  }}
>
        {buildingRects.map((building) => (
  <BuildingVisual key={building.id} building={building} />
))}
      </div>

      {isShiftPressed && hoveredBuilding && hoveredBuilding.imageCandidates?.[0] ? (
        <div
          style={{
            position: "fixed",
            right: 24,
            top: "50%",
            transform: "translateY(-50%)",
            width: 320,
            height: 470,
            zIndex: 9999,
            pointerEvents: "none",
            borderRadius: 18,
            overflow: "hidden",
            background: "#0f172a",
            boxShadow: "0 24px 60px rgba(0,0,0,0.75)",
            border: "2px solid rgba(255,255,255,0.12)",
          }}
        >
          <img
            src={hoveredBuilding.imageCandidates[0]}
            alt={hoveredBuilding.type}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}