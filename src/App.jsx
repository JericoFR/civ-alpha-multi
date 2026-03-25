import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import Board from "./components/Board";
import Sidebar from "./components/Sidebar";
import { socket } from "./network/socket";
import { CARD_DEFS } from "./data/cards";
import {
  countUsedHousing,
  canAfford,
  canUseCentralMarket,
  getCentralMarketStatus,
  getHousingCapacity,
  getProductionPreview,
  getSciencePreview,
  getScienceWinner,
  getWorkerFoodCost,
  hasActivePersonalMarket,
} from "./logic/economy";
import { canMoveTo, getReachableCells, isMilitaryUnit } from "./logic/movement";
import { getValidBuildingPlacements, getValidWorkerSpawnCells, getValidMilitarySpawnCells } from "./logic/buildings";
import { buildPressureMap } from "./logic/pressure";
import { gameReducer } from "./state/gameReducer";
import { createInitialState, getPhaseDefinition, initialState } from "./state/initialState";

const TURNS_PER_ERA = 10;
const TOTAL_ERAS = 4;

const SETUP_STEPS = [
  { player: 1, type: "worker", label: "J1 place son 1er ouvrier" },
  { player: 2, type: "worker", label: "J2 place son 1er ouvrier" },
  { player: 2, type: "soldier", label: "J2 place son 1er soldat" },
  { player: 1, type: "soldier", label: "J1 place son 1er soldat" },
];

function createEmptySetupState() {
  return {
    step: 0,
    placements: {
      player1: { worker: null, soldier: null },
      player2: { worker: null, soldier: null },
    },
  };
}

function getBuildingCells(building) {
  const cells = [];
  const size = building.size ?? 2;

  for (let i = 0; i < size; i += 1) {
    if (building.orientation === "horizontal") {
      cells.push({ x: building.x + i, y: building.y });
    } else {
      cells.push({ x: building.x, y: building.y + i });
    }
  }

  return cells;
}

function getSetupSpawnCells(buildings, player) {
  return buildings
    .filter(
      (building) =>
        building.player === player &&
        (building.type === "townhall" || building.type === "house")
    )
    .flatMap((building) => getBuildingCells(building));
}

function getSetupPreviewUnits(setupState) {
  if (!setupState) return [];

  const units = [];
  const placements = setupState.placements ?? {};

  if (placements.player1?.worker) {
    units.push({ id: "setup-p1-worker", type: "worker", player: 1, ...placements.player1.worker });
  }
  if (placements.player2?.worker) {
    units.push({ id: "setup-p2-worker", type: "worker", player: 2, ...placements.player2.worker });
  }
  if (placements.player2?.soldier) {
    units.push({ id: "setup-p2-soldier", type: "soldier", player: 2, ...placements.player2.soldier });
  }
  if (placements.player1?.soldier) {
    units.push({ id: "setup-p1-soldier", type: "soldier", player: 1, ...placements.player1.soldier });
  }

  return units;
}

function buildGameStateFromSetup(setupState) {
  const nextState = createInitialState();
  const placements = setupState?.placements ?? createEmptySetupState().placements;

  nextState.units = [
    { id: "p1_worker", type: "worker", player: 1, ...(placements.player1.worker ?? { x: 6, y: 2 }) },
    { id: "p2_worker", type: "worker", player: 2, ...(placements.player2.worker ?? { x: 6, y: 16 }) },
    { id: "p2_soldier", type: "soldier", player: 2, ...(placements.player2.soldier ?? { x: 6, y: 16 }) },
    { id: "p1_soldier", type: "soldier", player: 1, ...(placements.player1.soldier ?? { x: 6, y: 2 }) },
  ];

  return nextState;
}

function ActionButton({ children, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: "none",
        borderRadius: 12,
        padding: "10px 14px",
        background: disabled ? "#475569" : "#334155",
        color: "white",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 600,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  );
}

function InfoCard({ label, value, accent = "rgba(255,255,255,0.08)" }) {
  return (
    <div
      style={{
        background: "#172036",
        border: `1px solid ${accent}`,
        borderRadius: 14,
        padding: "10px 14px",
        minWidth: 130,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.72, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function ToggleCard({ checked, onChange }) {
  return (
    <label
      style={{
        background: "#172036",
        border: "1px solid rgba(125, 211, 252, 0.35)",
        borderRadius: 14,
        padding: "10px 14px",
        minWidth: 130,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        cursor: "pointer",
      }}
    >
      <div>
        <div style={{ fontSize: 12, opacity: 0.72, marginBottom: 4 }}>Pression affichée</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{checked ? "Oui" : "Non"}</div>
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function getPhaseActionLabel(phase, activePlayer) {
  if (phase === "military_move") {
    return activePlayer ? `Passer J${activePlayer}` : "Passer";
  }
  return "Phase suivante";
}

function getUnitSelectionError(unit, phase, activePlayer, activatedUnitIds) {
  if (phase === "player_1") {
    if (unit.player !== 1) return "Pendant la phase J1, tu ne peux activer que les unités du joueur 1.";
    if (unit.type !== "worker") return "Pendant les phases joueurs, seuls les ouvriers peuvent être déplacés.";
    if (activatedUnitIds.includes(unit.id)) return "Cet ouvrier a déjà été activé pendant cette phase.";
    return null;
  }

  if (phase === "player_2") {
    if (unit.player !== 2) return "Pendant la phase J2, tu ne peux activer que les unités du joueur 2.";
    if (unit.type !== "worker") return "Pendant les phases joueurs, seuls les ouvriers peuvent être déplacés.";
    if (activatedUnitIds.includes(unit.id)) return "Cet ouvrier a déjà été activé pendant cette phase.";
    return null;
  }

  if (phase === "military_move") {
    if (!isMilitaryUnit(unit)) return "Les ouvriers ne peuvent pas être activés pendant la phase militaire.";
    if (unit.player !== activePlayer) return `C'est à J${activePlayer} de jouer ses unités militaires.`;
    if (activatedUnitIds.includes(unit.id)) return "Cette unité militaire a déjà été activée ce tour.";
    return null;
  }

  return "Aucun déplacement n'est autorisé pendant cette phase.";
}

function countRemainingUnitsForPhase(units, activatedUnitIds, phase, player) {
  return units.filter((unit) => {
    if (unit.player !== player) return false;
    if (activatedUnitIds.includes(unit.id)) return false;
    if (phase === "military_move") return isMilitaryUnit(unit);
    if (phase === "player_1" || phase === "player_2") return unit.type === "worker";
    return false;
  }).length;
}

function getCostLabel(card) {
  const bits = [];
  if (card.cost?.food) bits.push(`${card.cost.food} 🌾`);
  if (card.cost?.gold) bits.push(`${card.cost.gold} 💰`);
  return bits.length > 0 ? bits.join(" ") : "gratuit";
}

function CardButton({ card, selected, disabled, affordable, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 180,
        textAlign: "left",
        borderRadius: 14,
        padding: 12,
        border: selected ? "2px solid rgba(52, 211, 153, 0.95)" : "1px solid rgba(255,255,255,0.12)",
        background: disabled ? "#1f2937" : selected ? "#0f3d2e" : "#111827",
        color: "white",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{card.name}</div>
      <div style={{ fontSize: 12, opacity: 0.78, marginBottom: 6 }}>
        Ère {card.era} · {card.category} · {card.subCategory}
      </div>
      <div style={{ fontSize: 13, opacity: 0.86, marginBottom: 8 }}>{card.text}</div>
      <div style={{ fontSize: 12, fontWeight: 700 }}>
        Coût : {getCostLabel(card)}
        {!affordable ? " · insuffisant" : ""}
      </div>
    </button>
  );
}

function HandPanel({
  player,
  cards,
  resources,
  selectedCardKey,
  selectedCard,
  pendingHousingSacrificePlayers,
  isActivePhase,
  onSelectCard,
}) {
  return (
    <div
      style={{
        marginTop: 16,
        background: "#111827",
        border: isActivePhase ? "1px solid rgba(52, 211, 153, 0.35)" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        opacity: isActivePhase ? 1 : 0.88,
      }}
    >
      <div style={{ fontWeight: 700 }}>
        <span>Main de J{player}</span> {isActivePhase ? <span>(active)</span> : null}
        {isActivePhase && selectedCard ? <span>{` — ${selectedCard.name} sélectionnée`}</span> : null}
      </div>
      <div style={{ fontSize: 13, opacity: 0.8 }}>
        <span>Déplace tes ouvriers puis pose une carte bâtiment. Le coût est retiré immédiatement.</span>
        {pendingHousingSacrificePlayers.length > 0 ? (
          <span>{` Sacrifice requis pour J${pendingHousingSacrificePlayers[0]}.`}</span>
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {cards.length === 0 ? (
          <div style={{ opacity: 0.7 }}>Aucune carte en main.</div>
        ) : (
          cards.map((cardKey, index) => {
            const card = CARD_DEFS[cardKey];
            const affordable = canAfford(resources, card.cost);
            return (
              <CardButton
                key={`${cardKey}-${index}`}
                card={card}
                selected={isActivePhase && selectedCardKey === cardKey}
                disabled={!isActivePhase || pendingHousingSacrificePlayers.length > 0 || !affordable}
                affordable={affordable}
                onClick={() => onSelectCard(cardKey)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function EraCardPanel({ title, card, accent }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 980,
        background: "#111827",
        border: `1px solid ${accent}`,
        borderRadius: 14,
        padding: 12,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.72, marginBottom: 6 }}>{title}</div>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{card?.name ?? "Aucune carte"}</div>
      <div style={{ fontSize: 13, opacity: 0.86 }}>{card?.text ?? "Aucun effet actif."}</div>
    </div>
  );
}

function PurchasePanel({
  resources,
  buildings,
  units,
  purchaseMode,
  purchasePlayer,
  onSetPurchaseMode,
  activeEventCard,
}) {
  const workerFoodCost = getWorkerFoodCost(activeEventCard);

  function getPlayerResources(player) {
    return player === 1 ? resources.player1 : resources.player2;
  }

  function hasActiveBarracks(buildings, units, player, level) {
  return buildings.some((b) => {
    if (b.player !== player) return false;
    if (b.isOnFire) return false;

    if (level === 1 && b.type === "barracks") {
      return units.some((u) => u.player === player && u.x === b.x && u.y === b.y);
    }

    if (level === 2 && b.type === "barracks_2") {
      return units.some((u) => u.player === player && u.x === b.x && u.y === b.y);
    }

    return false;
  });
}

  const options = [
  {
    key: "worker",
    label: "Ouvrier",
    costLabel: `${workerFoodCost} 🌾`,
    getCost: () => ({ food: workerFoodCost, gold: 0 }),
    enabled: true,
  },
  {
    key: "soldier",
    label: "Soldat cac",
    costLabel: "2 🌾 1 💰",
    getCost: () => ({ food: 2, gold: 1 }),
    enabled: hasActiveBarracks(buildings, units, player, 1),
  },
  {
    key: "archer",
    label: "Archer",
    costLabel: "1 🌾 2 💰",
    getCost: () => ({ food: 1, gold: 2 }),
    enabled: hasActiveBarracks(buildings, units, player, 1),
  },
  {
    key: "cavalry",
    label: "Cavalier",
    costLabel: "à venir",
    getCost: () => ({ food: 999, gold: 999 }),
    enabled: hasActiveBarracks(buildings, units, player, 2),
  },
  {
    key: "siege",
    label: "Siège",
    costLabel: "à venir",
    getCost: () => ({ food: 999, gold: 999 }),
    enabled: hasActiveBarracks(buildings, units, player, 2),
  },
];

  function renderPlayerColumn(player) {
    const playerResources = getPlayerResources(player);
    const food = playerResources?.food ?? 0;
    const gold = playerResources?.gold ?? 0;

    return (
      <div
        style={{
          background: "#172036",
          borderRadius: 12,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          minWidth: 220,
          flex: 1,
        }}
      >
        <div style={{ fontWeight: 700 }}>Achats J{player}</div>
        <div style={{ fontSize: 12, opacity: 0.78 }}>
          Nourriture dispo : {food} {` `}
          {typeof gold === "number" ? `· Or dispo : ${gold}` : ""}
        </div>

        {options.map((option) => {
          const selected = purchaseMode === option.key && purchasePlayer === player;
          const affordable = canAfford(playerResources, option.getCost());
          const disabled = !option.enabled || !affordable;

          return (
            <button
              key={`${player}-${option.key}`}
              type="button"
              disabled={disabled}
              onClick={() => onSetPurchaseMode(option.key, player)}
              style={{
                borderRadius: 12,
                border: selected ? "2px solid rgba(34, 197, 94, 0.95)" : "1px solid rgba(255,255,255,0.12)",
                background: disabled ? "#1f2937" : selected ? "#0f3d2e" : "#111827",
                color: "white",
                padding: "10px 12px",
                textAlign: "left",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.45 : 1,
              }}
            >
              <div style={{ fontWeight: 700 }}>{option.label}</div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>
  Coût : {getCostLabel(card)}
  {!affordable && option.enabled && <span> · insuffisant</span>}
  {!option.enabled && <span style={{ color: "#f87171" }}> · caserne requise</span>}
</div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 980,
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontWeight: 700 }}>Fenêtre d'achats</div>
      <div style={{ fontSize: 12, opacity: 0.78 }}>
        Choisis un achat puis clique une case valide. Ouvrier : hôtel de ville / logement actif. Soldat + Archer :
        caserne active avec ouvrier.
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {renderPlayerColumn(1)}
        {renderPlayerColumn(2)}
      </div>
    </div>
  );
}

function EconomyCompactPanel({
  phase,
  activePlayer,
  resources,
  buildings,
  units,
  economySelection,
  economyChoiceLocked,
  onSelectEconomyMarket,
  onConvertResources,
}) {
  if (!["economy_1", "economy_2"].includes(phase) || !activePlayer) return null;

  const playerKey = activePlayer === 1 ? "player1" : "player2";
  const playerResources = resources[playerKey];
  const selectedMarket = economySelection[playerKey];
  const isLocked = economyChoiceLocked[playerKey];
  const personalAvailable = hasActivePersonalMarket(buildings, units, activePlayer);
  const centralStatus = getCentralMarketStatus(units, activePlayer);
  const centralAvailable = canUseCentralMarket(units, activePlayer);

  const rows = [
    { key: "food", label: "🌾" },
    { key: "gold", label: "💰" },
  ];

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 980,
        background: "#111827",
        border: "1px solid rgba(251, 146, 60, 0.35)",
        borderRadius: 14,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontWeight: 700 }}>Économie J{activePlayer}</div>
      <div style={{ fontSize: 12, opacity: 0.78 }}>
        Choisis 1 marché pour toute la phase puis convertis. Marché perso : 5 identiques → 1 PV. Marché central :
        conversions illimitées comme le marché perso, avec seulement +1 PV bonus maximum sur l'ensemble du tour si le
        centre est utilisé.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
        <button
          type="button"
          disabled={!personalAvailable || isLocked}
          onClick={() => onSelectEconomyMarket(activePlayer, "personal")}
          style={{
            borderRadius: 12,
            padding: 12,
            textAlign: "left",
            border:
              selectedMarket === "personal"
                ? "2px solid rgba(34, 197, 94, 0.95)"
                : "1px solid rgba(255,255,255,0.12)",
            background: !personalAvailable ? "#1f2937" : selectedMarket === "personal" ? "#0f3d2e" : "#172036",
            color: "white",
            opacity: !personalAvailable ? 0.6 : 1,
            cursor: !personalAvailable || isLocked ? "not-allowed" : "pointer",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Marché personnel</div>
          <div style={{ fontSize: 12, opacity: 0.82 }}>
            {personalAvailable ? "Disponible" : "Indisponible : marché actif + ouvrier requis"}
          </div>
        </button>

        <button
          type="button"
          disabled={!centralAvailable || isLocked}
          onClick={() => onSelectEconomyMarket(activePlayer, "central")}
          style={{
            borderRadius: 12,
            padding: 12,
            textAlign: "left",
            border:
              selectedMarket === "central"
                ? "2px solid rgba(249, 115, 22, 0.95)"
                : "1px solid rgba(255,255,255,0.12)",
            background: !centralAvailable ? "#1f2937" : selectedMarket === "central" ? "#4a2307" : "#172036",
            color: "white",
            opacity: !centralAvailable ? 0.6 : 1,
            cursor: !centralAvailable || isLocked ? "not-allowed" : "pointer",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Marché central</div>
          <div style={{ fontSize: 12, opacity: 0.82 }}>
            {centralAvailable
              ? "Disponible : 1 ouvrier allié, aucun ennemi sur la croix orange"
              : `Indispo : ${centralStatus.alliedWorkerCount} ouvrier allié, ${centralStatus.enemyUnitCount} ennemi`}
          </div>
        </button>
      </div>

      <div style={{ fontSize: 12, opacity: 0.78 }}>
        Marché choisi :{" "}
        {selectedMarket === "central" ? "central" : selectedMarket === "personal" ? "personnel" : "aucun"}
        {isLocked ? " · verrouillé pour cette phase" : " · modifiable tant que tu n'as pas converti"}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 8,
        }}
      >
        {rows.map((row) => {
          const stock = Number(playerResources[row.key] ?? 0);
          const maxLots = Math.floor(stock / 5);
          const noMarketSelected = !selectedMarket;

          return (
            <div
              key={row.key}
              style={{
                background: "#172036",
                borderRadius: 12,
                padding: 10,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ fontWeight: 700 }}>
                {row.label} {row.key}
              </div>
              <div style={{ fontSize: 13, opacity: 0.82 }}>Stock : {stock}</div>
              <ActionButton
                disabled={maxLots < 1 || noMarketSelected}
                onClick={() => onConvertResources(activePlayer, row.key, 1)}
              >
                5 → {selectedMarket === "central" ? "1 PV (bonus centre global +1 max/tour)" : "1 PV"}
              </ActionButton>
              <ActionButton
                disabled={maxLots < 1 || noMarketSelected}
                onClick={() => onConvertResources(activePlayer, row.key, maxLots)}
              >
                Tout ({maxLots})
              </ActionButton>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScienceCompactPanel({ phase, buildings, units, scienceActionUsedThisPhase, onPeekPoints, onPeekEvent }) {
  if (phase !== "science") return null;

  const sciencePreview = getSciencePreview(buildings, units);
  const winner = getScienceWinner(buildings, units);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 980,
        background: "#111827",
        border: "1px solid rgba(96, 165, 250, 0.35)",
        borderRadius: 14,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontWeight: 700 }}>Phase Science</div>
      <div style={{ fontSize: 13, opacity: 0.82 }}>
        Science du tour : J1 {sciencePreview.player1} — J2 {sciencePreview.player2}
      </div>
      <div style={{ fontSize: 13, opacity: 0.82 }}>
        {winner.player
          ? `J${winner.player} a strictement le plus de science et peut regarder 1 prochaine carte d’ère.`
          : "Égalité scientifique : personne n’active l’effet ce tour."}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <ActionButton disabled={!winner.player || scienceActionUsedThisPhase} onClick={onPeekPoints}>
          Regarder Points
        </ActionButton>
        <ActionButton disabled={!winner.player || scienceActionUsedThisPhase} onClick={onPeekEvent}>
          Regarder Événement
        </ActionButton>
      </div>
      <div style={{ fontSize: 12, opacity: 0.65 }}>
        {scienceActionUsedThisPhase
          ? "Action science déjà utilisée pour ce tour."
          : "Action facultative : tu peux aussi passer directement à la phase suivante."}
      </div>
    </div>
  );
}

function SciencePeekModal({ sciencePeek, onClose }) {
  if (!sciencePeek) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2, 6, 23, 0.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 20,
      }}
    >
      <div
        style={{
          width: "min(560px, 100%)",
          background: "#0f172a",
          border: "1px solid rgba(96, 165, 250, 0.35)",
          borderRadius: 18,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800 }}>Vision scientifique — J{sciencePeek.player}</div>
        <div style={{ fontSize: 13, opacity: 0.72 }}>
          Prochaine carte {sciencePeek.pileType === "points" ? "Points" : "Événement"} (information privée)
        </div>

        <div
          style={{
            background: "#111827",
            borderRadius: 14,
            padding: 16,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{sciencePeek.card?.name ?? "Pile vide"}</div>
          <div style={{ fontSize: 14, opacity: 0.86 }}>
            {sciencePeek.card?.text ?? "Aucune carte restante dans cette pile."}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ActionButton onClick={onClose}>Fermer</ActionButton>
        </div>
      </div>
    </div>
  );
}

function RoomPanel({
  isSocketConnected,
  socketId,
  roomCodeInput,
  setRoomCodeInput,
  currentRoomId,
  roomMessage,
  roomPlayerCount,
  localPlayer,
  handleCreateRoom,
  handleJoinRoom,
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 10,
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
      }}
    >
      <div style={{ fontWeight: 700, textAlign: "center" }}>Room multi (test local)</div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          type="button"
          onClick={handleCreateRoom}
          disabled={!isSocketConnected}
          style={{
            border: "none",
            borderRadius: 10,
            padding: "8px 12px",
            background: isSocketConnected ? "#2563eb" : "#475569",
            color: "white",
            cursor: isSocketConnected ? "pointer" : "not-allowed",
            fontWeight: 700,
            opacity: isSocketConnected ? 1 : 0.65,
          }}
        >
          Créer une room
        </button>

        <input
          value={roomCodeInput}
          onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
          placeholder="Code room"
          style={{
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.15)",
            padding: "8px 12px",
            background: "#0f172a",
            color: "white",
            minWidth: 140,
          }}
        />

        <button
          type="button"
          onClick={handleJoinRoom}
          disabled={!isSocketConnected}
          style={{
            border: "none",
            borderRadius: 10,
            padding: "8px 12px",
            background: isSocketConnected ? "#16a34a" : "#475569",
            color: "white",
            cursor: isSocketConnected ? "pointer" : "not-allowed",
            fontWeight: 700,
            opacity: isSocketConnected ? 1 : 0.65,
          }}
        >
          Rejoindre
        </button>
      </div>

      <div style={{ textAlign: "center", fontSize: 14, opacity: 0.9 }}>
        Room actuelle : {currentRoomId || "aucune"}
        {currentRoomId ? ` — joueurs : ${roomPlayerCount}/2` : ""}
        {localPlayer ? ` — tu es J${localPlayer}` : ""}
      </div>

      <div style={{ textAlign: "center", fontSize: 13, opacity: 0.75 }}>
        {roomMessage || "Pas encore de room."}
      </div>

      <div style={{ textAlign: "center", fontSize: 12, opacity: 0.6 }}>
        Socket : {socketId || "non attribué"}
      </div>
    </div>
  );
}

function HomePanel({ onStartSolo, onStartMulti }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "min(720px, 100%)",
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 18,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 36 }}>Civ Alpha — v0.6 Setup</h1>
        <div style={{ fontSize: 15, opacity: 0.8 }}>
          Choisis ton mode. En multi : room → lobby → setup → partie. En solo : setup local puis partie.
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <ActionButton onClick={onStartSolo}>Solo</ActionButton>
          <ActionButton onClick={onStartMulti}>Multi</ActionButton>
        </div>
      </div>
    </div>
  );
}

function SetupPanel({
  setupState,
  localPlayer,
  isMultiplayer,
  roomMessage,
  setupSpawnCells,
  previewBuildings,
  previewUnits,
  onBack,
  onCellClick,
}) {
  const currentStep = SETUP_STEPS[setupState?.step] ?? null;
  const canAct = !isMultiplayer || (currentStep && currentStep.player === localPlayer);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>Setup initial</h2>
        <div style={{ fontSize: 15, opacity: 0.82 }}>
          {currentStep ? currentStep.label : "Setup terminé"}
        </div>
        <div style={{ fontSize: 13, opacity: 0.7 }}>
          Spawn autorisés : Hôtel de Ville et Maisons. Open info total.
        </div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          {isMultiplayer
            ? canAct
              ? `À toi de placer (${currentStep?.type ?? "-"})`
              : `En attente de J${currentStep?.player ?? "-"}.`
            : "Mode solo hotseat : clique les cases dans l'ordre imposé."}
        </div>
        {roomMessage ? <div style={{ fontSize: 12, opacity: 0.72 }}>{roomMessage}</div> : null}
        <ActionButton onClick={onBack}>Retour</ActionButton>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <Board
          units={previewUnits}
          buildings={previewBuildings}
          selectedUnitId={null}
          reachableCells={[]}
          activatedUnitIds={[]}
          activePlayer={currentStep?.player ?? null}
          phase="setup"
          pressureMap={{}}
          showPressure={false}
          placementCells={[]}
          spawnCells={setupSpawnCells}
          onCellClick={onCellClick}
          onUnitClick={() => {}}
        />
      </div>
    </div>
  );
}

function appStateReducer(state, action) {
  if (action?.type === "HYDRATE_STATE") {
    return {
      ...initialState,
      ...action.payload,
      resources: {
        ...initialState.resources,
        ...(action.payload?.resources ?? {}),
      },
      points: {
        ...initialState.points,
        ...(action.payload?.points ?? {}),
      },
      cards: {
        ...initialState.cards,
        ...(action.payload?.cards ?? {}),
      },
      economySelection: {
        ...initialState.economySelection,
        ...(action.payload?.economySelection ?? {}),
      },
      economyChoiceLocked: {
        ...initialState.economyChoiceLocked,
        ...(action.payload?.economyChoiceLocked ?? {}),
      },
      economyCentralBonusUsed: {
        ...initialState.economyCentralBonusUsed,
        ...(action.payload?.economyCentralBonusUsed ?? {}),
      },
    };
  }

  return gameReducer(state, action);
}

export default function App() {
  const [gameState, dispatch] = useReducer(appStateReducer, initialState);
  const [showPressure, setShowPressure] = useState(true);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [socketId, setSocketId] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [currentRoomId, setCurrentRoomId] = useState("");
  const [roomMessage, setRoomMessage] = useState("");
  const [roomPlayerCount, setRoomPlayerCount] = useState(0);
  const [localPlayer, setLocalPlayer] = useState(null);
  const [appPhase, setAppPhase] = useState("home");
  const [setupState, setSetupState] = useState(createEmptySetupState());
  const [gameMode, setGameMode] = useState(null);
  const [rematchPending, setRematchPending] = useState(false);
  const [rematchRequest, setRematchRequest] = useState(null);

  const currentRoomIdRef = useRef("");
  const localPlayerRef = useRef(null);

  useEffect(() => {
    currentRoomIdRef.current = currentRoomId;
  }, [currentRoomId]);

  useEffect(() => {
    localPlayerRef.current = localPlayer;
  }, [localPlayer]);

  function applyAction(action) {
    if (currentRoomIdRef.current) {
      socket.emit("GAME_ACTION", {
        roomId: currentRoomIdRef.current,
        action,
      });
      return;
    }

    dispatch(action);
  }

  useEffect(() => {
    function handleConnect() {
      setIsSocketConnected(true);
      setSocketId(socket.id);
      setRoomMessage("Connecté au serveur.");
    }

    function handleDisconnect() {
      setIsSocketConnected(false);
      setSocketId("");
      setCurrentRoomId("");
      setRoomPlayerCount(0);
      setLocalPlayer(null);
      setRematchPending(false);
      setRematchRequest(null);
      setRoomMessage("Déconnecté du serveur.");
    }

    function hydrateFromRoom(data, fallbackMessage) {
  setCurrentRoomId(data.roomId);
  setRoomPlayerCount(data.players?.length ?? 0);
  setRoomCodeInput(data.roomId ?? "");
  setGameMode("multi");
  setAppPhase(
    data.roomPhase === "setup"
      ? "setup"
      : data.roomPhase === "game"
      ? "game"
      : "lobby"
  );
  setSetupState(data.setup ?? createEmptySetupState());
  setRematchPending(false);
  setRematchRequest(null);

  if (data.playerNumber) {
    setLocalPlayer(data.playerNumber);
  }

  setRoomMessage(fallbackMessage);

  if (data.gameState) {
    dispatch({ type: "HYDRATE_STATE", payload: data.gameState });
  }
}

function handleRoomCreated(data) {
  hydrateFromRoom(data, `Room créée : ${data.roomId} | Tu es J${data.playerNumber ?? 1}`);
}

function handleRoomJoined(data) {
  hydrateFromRoom(
    data,
    `Room rejointe : ${data.roomId} (${data.players?.length ?? 0}/2 joueurs)${
      data.playerNumber ? ` | Tu es J${data.playerNumber}` : ""
    }`
  );
}

function handleSetupUpdate(serverSetup) {
  setSetupState(serverSetup ?? createEmptySetupState());
  setRematchPending(false);
  setRematchRequest(null);
  setAppPhase("setup");
}

function handleGameStart(serverState) {
  if (!serverState) return;
  dispatch({ type: "HYDRATE_STATE", payload: serverState });
  setRematchPending(false);
  setRematchRequest(null);
  setAppPhase("game");
  setRoomMessage("Partie lancée.");
}

function handleReturnToLobby(payload) {
  setSetupState(payload?.setup ?? createEmptySetupState());
  setRoomPlayerCount(payload?.players?.length ?? 0);
  setRematchPending(false);
  setRematchRequest(null);
  setAppPhase("lobby");
  setRoomMessage(payload?.message ?? "Retour au lobby.");
}

function handleRematchRequest(payload) {
  setRematchPending(false);
  setRematchRequest(payload ?? { requestedBy: "adversaire" });
  setRoomMessage(
    payload?.requestedBy
      ? `J${payload.requestedBy} te propose une revanche.`
      : "Ton adversaire te propose une revanche."
  );
}

function handleRematchDeclined(payload) {
  setRematchPending(false);
  setRematchRequest(null);
  setRoomMessage(payload?.message ?? "Revanche refusée.");
}

    function handleRoomUpdate({ roomId, players }) {
      if (roomId === currentRoomIdRef.current || !currentRoomIdRef.current) {
        setRoomPlayerCount(players?.length ?? 0);

        const myIndex = Array.isArray(players) ? players.indexOf(socket.id) : -1;
        if (myIndex !== -1) {
          setLocalPlayer(myIndex + 1);
        }
      }
    }

    function handleGameState(serverState) {
      if (!serverState) return;
      dispatch({ type: "HYDRATE_STATE", payload: serverState });
    }

    function handleErrorMessage(message) {
      setRoomMessage(message);
    }

    socket.connect();

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("roomCreated", handleRoomCreated);
    socket.on("roomJoined", handleRoomJoined);
    socket.on("roomUpdate", handleRoomUpdate);
    socket.on("GAME_STATE", handleGameState);
    socket.on("errorMessage", handleErrorMessage);
    socket.on("SETUP_UPDATE", handleSetupUpdate);
    socket.on("GAME_START", handleGameStart);
    socket.on("RETURN_TO_LOBBY", handleReturnToLobby);
    socket.on("REMATCH_REQUESTED", handleRematchRequest);
socket.on("REMATCH_PENDING", () => {
  setRematchPending(true);
  setRematchRequest(null);
  setRoomMessage("Demande de revanche envoyée. En attente de la réponse adverse.");
});

socket.on("REMATCH_DECLINED", (payload) => {
  setRematchPending(false);
  setRematchRequest(null);
  setRoomMessage(payload?.message ?? "Revanche refusée.");
});

socket.on("REMATCH_ACCEPTED", () => {
  setRematchPending(false);
  setRematchRequest(null);
  setRoomMessage("Revanche acceptée.");
});

socket.on("REMATCH_ACCEPTED_WAITING", () => {
  setRoomMessage("Revanche acceptée de ton côté. En attente de l’autre joueur.");
});

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("roomCreated", handleRoomCreated);
      socket.off("roomJoined", handleRoomJoined);
      socket.off("roomUpdate", handleRoomUpdate);
      socket.off("GAME_STATE", handleGameState);
      socket.off("errorMessage", handleErrorMessage);
      socket.off("SETUP_UPDATE", handleSetupUpdate);
      socket.off("GAME_START", handleGameStart);
      socket.off("RETURN_TO_LOBBY", handleReturnToLobby);
      socket.off("REMATCH_REQUESTED", handleRematchRequest);
      socket.off("REMATCH_PENDING");
      socket.off("REMATCH_DECLINED");
      socket.off("REMATCH_ACCEPTED");
      socket.off("REMATCH_ACCEPTED_WAITING");
      socket.disconnect();
    };
  }, []);

  const {
    turn,
    phase,
    activePlayer,
    units,
    buildings,
    resources,
    points,
    selectedUnitId,
    selectedCardKey,
    purchaseMode,
    purchasePlayer,
    cards,
    phaseActivatedUnitIds,
    productionDoneThisPhase,
    pendingHousingSacrificePlayers,
    economySelection,
    economyChoiceLocked,
    activePointCard,
    activeEventCard,
    scienceActionUsedThisPhase,
    sciencePeek,
    debugText,
  } = gameState;

  const currentEra = Math.min(TOTAL_ERAS, Math.max(1, Math.ceil(turn / TURNS_PER_ERA)));
  const turnInEra = ((turn - 1) % TURNS_PER_ERA) + 1;

  const pressureMap = useMemo(() => buildPressureMap(units), [units]);
  const productionPreview = useMemo(
    () => getProductionPreview(buildings, units, activeEventCard),
    [buildings, units, activeEventCard]
  );
  const sciencePreview = useMemo(() => getSciencePreview(buildings, units), [buildings, units]);
  const player1HousingUsed = useMemo(() => countUsedHousing(units, 1), [units]);
  const player2HousingUsed = useMemo(() => countUsedHousing(units, 2), [units]);
  const player1HousingCapacity = useMemo(() => getHousingCapacity(buildings, 1, activeEventCard), [buildings, activeEventCard]);
  const player2HousingCapacity = useMemo(() => getHousingCapacity(buildings, 2, activeEventCard), [buildings, activeEventCard]);

  const selectedUnit = useMemo(() => units.find((unit) => unit.id === selectedUnitId) || null, [units, selectedUnitId]);

  const reachableCells = useMemo(() => {
    if (!selectedUnit) return [];
    const selectionError = getUnitSelectionError(selectedUnit, phase, activePlayer, phaseActivatedUnitIds);
    if (selectionError) return [];
    return getReachableCells(units, selectedUnit);
  }, [units, selectedUnit, phase, activePlayer, phaseActivatedUnitIds]);

  const currentPhase = getPhaseDefinition(phase);
  const selectedCard = selectedCardKey ? CARD_DEFS[selectedCardKey] : null;

  const player1RemainingMilitary = useMemo(
    () => countRemainingUnitsForPhase(units, phaseActivatedUnitIds, "military_move", 1),
    [units, phaseActivatedUnitIds]
  );
  const player2RemainingMilitary = useMemo(
    () => countRemainingUnitsForPhase(units, phaseActivatedUnitIds, "military_move", 2),
    [units, phaseActivatedUnitIds]
  );

  const validCardPlacements = useMemo(() => {
    if (!selectedCard || !activePlayer) return [];
    if (selectedCard.placement?.mode !== "green_pair") return [];
    return getValidBuildingPlacements(buildings, activePlayer, {
      allowHorizontal: selectedCard.placement.allowHorizontal,
      allowVertical: selectedCard.placement.allowVertical,
      size: selectedCard.placement.size,
    });
  }, [selectedCard, activePlayer, buildings]);

  const placementCells = useMemo(
    () =>
      validCardPlacements.flatMap((placement) =>
        placement.orientation === "horizontal"
          ? [
              { x: placement.x, y: placement.y },
              { x: placement.x + 1, y: placement.y },
            ]
          : [
              { x: placement.x, y: placement.y },
              { x: placement.x, y: placement.y + 1 },
            ]
      ),
    [validCardPlacements]
  );

  const workerSpawnCells = useMemo(() => {
    if (phase !== "buy" || purchaseMode !== "worker" || !purchasePlayer) return [];
    return getValidWorkerSpawnCells(buildings, units, purchasePlayer);
  }, [phase, purchaseMode, purchasePlayer, buildings, units]);

  const militarySpawnCells = useMemo(() => {
    if (phase !== "buy" || !purchasePlayer) return [];
    if (purchaseMode !== "soldier" && purchaseMode !== "archer") return [];
    return getValidMilitarySpawnCells(buildings, units, purchasePlayer, purchaseMode);
  }, [phase, purchaseMode, purchasePlayer, buildings, units]);

  const spawnCells = useMemo(() => {
    if (purchaseMode === "worker") return workerSpawnCells;
    if (purchaseMode === "soldier" || purchaseMode === "archer") return militarySpawnCells;
    return [];
  }, [purchaseMode, workerSpawnCells, militarySpawnCells]);

  const previewBuildings = useMemo(() => createInitialState().buildings, []);
const previewUnits = useMemo(() => getSetupPreviewUnits(setupState), [setupState]);
const currentSetupStep = SETUP_STEPS[setupState?.step] ?? null;

const setupSpawnCells = useMemo(
  () => (currentSetupStep ? getSetupSpawnCells(previewBuildings, currentSetupStep.player) : []),
  [previewBuildings, currentSetupStep]
);

  const resetButtonLabel = currentRoomId
    ? rematchPending
      ? "Revanche envoyée"
      : "Proposer revanche"
    : "Retour setup";

  function handleCreateRoom() {
    if (!isSocketConnected) {
      setRoomMessage("Pas connecté au serveur.");
      return;
    }
    socket.emit("createRoom");
  }

  function handleJoinRoom() {
    if (!isSocketConnected) {
      setRoomMessage("Pas connecté au serveur.");
      return;
    }

    const cleaned = roomCodeInput.trim().toUpperCase();

    if (!cleaned) {
      setRoomMessage("Entre un code de room.");
      return;
    }

    socket.emit("joinRoom", cleaned);
  }

  function handleStartSolo() {
  setGameMode("solo");
  setCurrentRoomId("");
  setLocalPlayer(null);
  setRoomPlayerCount(0);
  setSetupState(createEmptySetupState());
  setRoomMessage("Mode solo — place les 4 unités de départ.");
  setAppPhase("setup");
}

function handleStartMulti() {
  setGameMode("multi");
  setAppPhase("lobby");
  setRoomMessage("Crée ou rejoins une room.");
}

function handleBackToHome() {
  setGameMode(null);
  setAppPhase("home");
  setCurrentRoomId("");
  setRoomCodeInput("");
  setRoomPlayerCount(0);
  setLocalPlayer(null);
  setSetupState(createEmptySetupState());
  setRematchPending(false);
  setRematchRequest(null);
  setRoomMessage("");
}

function handleBackToLobby() {
  setAppPhase("lobby");
  setSetupState(createEmptySetupState());
  setRematchPending(false);
  setRematchRequest(null);
}

function handleStartSetup() {
  if (!currentRoomIdRef.current) {
    setAppPhase("setup");
    return;
  }

  socket.emit("START_SETUP", { roomId: currentRoomIdRef.current });
}

function handleSetupPlacement(x, y) {
  const currentStep = SETUP_STEPS[setupState?.step] ?? null;
  if (!currentStep) return;

  if (currentRoomIdRef.current) {
    socket.emit("SETUP_ACTION", {
      roomId: currentRoomIdRef.current,
      payload: { x, y },
    });
    return;
  }

  const nextSetup = structuredClone(setupState ?? createEmptySetupState());
  nextSetup.placements[`player${currentStep.player}`][currentStep.type] = { x, y };
  nextSetup.step += 1;
  setSetupState(nextSetup);

  if (nextSetup.step >= SETUP_STEPS.length) {
    const nextGameState = buildGameStateFromSetup(nextSetup);
    dispatch({ type: "HYDRATE_STATE", payload: nextGameState });
    setAppPhase("game");
    setRoomMessage("Partie locale lancée.");
  }
}

  function handleSelectCard(player, cardKey) {
    applyAction({ type: "SELECT_CARD", player: localPlayer, payload: { player, cardKey } });
  }

  function handleSetPurchaseMode(mode, player) {
    applyAction({ type: "SET_PURCHASE_MODE", player: localPlayer, payload: { mode, player } });
  }

  function handleSelectEconomyMarket(player, marketType) {
    applyAction({ type: "SELECT_ECONOMY_MARKET", player: localPlayer, payload: { player, marketType } });
  }

  function handleConvertResources(player, resource, lots) {
    const playerKey = player === 1 ? "player1" : "player2";
    const marketType = gameState.economySelection[playerKey];

    applyAction({
      type: "CONVERT_RESOURCES",
      player: localPlayer,
      payload: { player, resource, lots, marketType },
    });
  }

  function handleUnitClick(unit) {
    if (pendingHousingSacrificePlayers.length > 0) {
      applyAction({ type: "SELECT_UNIT", player: localPlayer, payload: { unit } });
      return;
    }

    if (localPlayer && unit.player !== localPlayer && currentRoomId) {
      applyAction({ type: "SET_DEBUG_TEXT", payload: { text: "Tu ne peux pas sélectionner une unité adverse." } });
      return;
    }

    const isDirectionalUnit = unit.type === "archer" || unit.type === "siege";

    if (phase !== "player_1" && phase !== "player_2" && phase !== "military_move") {
      applyAction({ type: "SELECT_UNIT", player: localPlayer, payload: { unit } });
      return;
    }

    if (phase === "buy" && isDirectionalUnit) {
      applyAction({ type: "SELECT_UNIT", player: localPlayer, payload: { unit } });
      return;
    }

    const selectionError = getUnitSelectionError(unit, phase, activePlayer, phaseActivatedUnitIds);

    if (selectionError && isDirectionalUnit) {
      applyAction({ type: "SELECT_UNIT", player: localPlayer, payload: { unit } });
      return;
    }

    if (selectionError) {
      applyAction({ type: "SET_DEBUG_TEXT", payload: { text: selectionError } });
      return;
    }

    applyAction({ type: "SELECT_UNIT", player: localPlayer, payload: { unit } });
  }

  function handleSetSelectedUnitDirection(direction) {
    if (!selectedUnit) return;
    if (selectedUnit.type !== "archer" && selectedUnit.type !== "siege") return;

    applyAction({
      type: "SET_UNIT_DIRECTION",
      player: localPlayer,
      payload: { unitId: selectedUnit.id, direction },
    });
  }

  function handleCellClick(x, y) {
    if (selectedCard && activePlayer) {
      function findPlacement(clickX, clickY) {
        let match = validCardPlacements.find((p) => p.x === clickX && p.y === clickY);
        if (match) return match;

        match = validCardPlacements.find(
          (p) => p.orientation === "horizontal" && p.x + 1 === clickX && p.y === clickY
        );
        if (match) return match;

        match = validCardPlacements.find(
          (p) => p.orientation === "vertical" && p.x === clickX && p.y + 1 === clickY
        );
        if (match) return match;

        return null;
      }

      const placement = findPlacement(x, y);

      if (!placement) {
        applyAction({
          type: "SET_DEBUG_TEXT",
          payload: { text: `Emplacement invalide pour ${selectedCard.name} : ${x},${y}` },
        });
        return;
      }

      applyAction({
        type: "PLAY_CARD",
        player: localPlayer,
        payload: {
          player: activePlayer,
          cardKey: selectedCard.key,
          x: placement.x,
          y: placement.y,
          orientation: placement.orientation,
        },
      });
      return;
    }

    if (phase === "buy" && purchaseMode && purchasePlayer) {
      if (purchaseMode === "worker") {
        const valid = workerSpawnCells.some((cell) => cell.x === x && cell.y === y);
        if (!valid) {
          applyAction({ type: "SET_DEBUG_TEXT", payload: { text: `Case invalide pour spawn ouvrier : ${x},${y}` } });
          return;
        }

        applyAction({
          type: "SPAWN_WORKER",
          player: localPlayer,
          payload: { player: purchasePlayer, x, y },
        });
        return;
      }

      if (purchaseMode === "soldier" || purchaseMode === "archer") {
        const valid = militarySpawnCells.some((cell) => cell.x === x && cell.y === y);
        if (!valid) {
          applyAction({
            type: "SET_DEBUG_TEXT",
            payload: { text: `Case invalide pour spawn ${purchaseMode === "soldier" ? "soldat" : "archer"} : ${x},${y}` },
          });
          return;
        }

        applyAction({
          type: "SPAWN_UNIT",
          player: localPlayer,
          payload: { player: purchasePlayer, unitType: purchaseMode, x, y },
        });
        return;
      }
    }

    if (!selectedUnit) {
      applyAction({ type: "SET_DEBUG_TEXT", payload: { text: `Aucune unité sélectionnée. Case ${x},${y}` } });
      return;
    }

    const selectionError = getUnitSelectionError(selectedUnit, phase, activePlayer, phaseActivatedUnitIds);
    if (selectionError) {
      applyAction({ type: "CLEAR_SELECTION", payload: { debugText: selectionError } });
      return;
    }

    if (canMoveTo(reachableCells, x, y)) {
      applyAction({
        type: "MOVE_UNIT",
        player: localPlayer,
        payload: { unitId: selectedUnit.id, x, y },
      });
      return;
    }

    applyAction({ type: "SET_DEBUG_TEXT", payload: { text: `Case non atteignable : ${x},${y}` } });
  }

  function handleMainAction() {
    const canActInRoom =
      !currentRoomId ||
      !localPlayer ||
      !activePlayer ||
      localPlayer === activePlayer ||
      ["buy", "production", "science", "military_resolve"].includes(phase);

    if (!canActInRoom) {
      applyAction({ type: "SET_DEBUG_TEXT", payload: { text: `Action refusée : ce n'est pas le tour de J${localPlayer}.` } });
      return;
    }

    if (phase === "military_move") {
      applyAction({ type: "PASS_MILITARY_TURN", player: localPlayer });
      return;
    }

    applyAction({ type: "NEXT_PHASE", player: localPlayer });
  }

  function handleResolveMilitary() {
    applyAction({ type: "RESOLVE_MILITARY", player: localPlayer });
  }

  function handleProduce() {
    applyAction({ type: "PRODUCE_RESOURCES", player: localPlayer });
  }

  function handlePeekScience(pileType) {
    applyAction({ type: "OPEN_SCIENCE_PEEK", player: localPlayer, payload: { pileType } });
  }

  function handleCloseSciencePeek() {
    applyAction({ type: "CLOSE_SCIENCE_PEEK", player: localPlayer });
  }

  function handleResetGame() {
    if (currentRoomId) {
      if (!localPlayer) {
        setRoomMessage("Impossible de proposer une revanche : joueur local introuvable.");
        return;
      }

      if (rematchPending) {
        setRoomMessage("Une demande de revanche est déjà en attente.");
        return;
      }

      socket.emit("REQUEST_REMATCH", { roomId: currentRoomId });
      return;
    }

    dispatch({ type: "RESET_GAME" });
    setSetupState(createEmptySetupState());
    setShowPressure(true);
    setRoomMessage("Nouvelle partie locale : replace les 4 unités de départ.");
    setAppPhase("setup");
  }

  function handleAcceptRematch() {
  if (!currentRoomId || !rematchRequest) return;

  // 🔥 AJOUT ICI
  setRematchPending(true);
  setRematchRequest(null);

  socket.emit("RESPOND_REMATCH", {
    roomId: currentRoomId,
    accept: true,
  });
}

  function handleDeclineRematch() {
    if (!currentRoomId || !rematchRequest) return;

    socket.emit("RESPOND_REMATCH", {
      roomId: currentRoomId,
      accept: false,
    });
  }

if (appPhase === "home") {
  return <HomePanel onStartSolo={handleStartSolo} onStartMulti={handleStartMulti} />;
}

if (appPhase === "lobby") {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "min(760px, 100%)",
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 18,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <h1 style={{ margin: 0, textAlign: "center" }}>Lobby</h1>
        <div style={{ fontSize: 14, opacity: 0.78, textAlign: "center" }}>
          Mode multi — crée ou rejoins une room, puis lance le setup quand vous êtes 2.
        </div>

        <div
          style={{
            padding: 8,
            background: isSocketConnected ? "#14532d" : "#7f1d1d",
            color: "white",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          Réseau : {isSocketConnected ? "Connecté" : "Déconnecté"}
          {socketId ? ` — ${socketId}` : ""}
        </div>

        <RoomPanel
          isSocketConnected={isSocketConnected}
          socketId={socketId}
          roomCodeInput={roomCodeInput}
          setRoomCodeInput={setRoomCodeInput}
          currentRoomId={currentRoomId}
          roomMessage={roomMessage}
          roomPlayerCount={roomPlayerCount}
          localPlayer={localPlayer}
          handleCreateRoom={handleCreateRoom}
          handleJoinRoom={handleJoinRoom}
        />

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <ActionButton onClick={handleBackToHome}>Accueil</ActionButton>
          <ActionButton
            onClick={handleStartSetup}
            disabled={!currentRoomId || roomPlayerCount < 2 || localPlayer !== 1}
          >
            Lancer le setup
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

if (appPhase === "setup") {
  return (
    <SetupPanel
      setupState={setupState}
      localPlayer={localPlayer}
      isMultiplayer={Boolean(currentRoomId)}
      roomMessage={roomMessage}
      setupSpawnCells={setupSpawnCells}
      previewBuildings={previewBuildings}
      previewUnits={previewUnits}
      onBack={currentRoomId ? handleBackToLobby : handleBackToHome}
      onCellClick={(x, y) => {
        const isValid = setupSpawnCells.some((cell) => cell.x === x && cell.y === y);
        if (!isValid) return;
        if (currentRoomId && currentSetupStep?.player !== localPlayer) return;
        handleSetupPlacement(x, y);
      }}
    />
  );
}

  return (
    <div
      translate="no"
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "12px 24px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: "linear-gradient(180deg, #081224 0%, #0f172a 100%)",
        }}
      >
        <h1 style={{ margin: 0, textAlign: "center", fontSize: 32 }}>Civ Alpha — Refonte moteur</h1>

        <div
          style={{
            padding: 8,
            background: isSocketConnected ? "#14532d" : "#7f1d1d",
            color: "white",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          Réseau : {isSocketConnected ? "Connecté" : "Déconnecté"}
          {socketId ? ` — ${socketId}` : ""}
        </div>

        <RoomPanel
          isSocketConnected={isSocketConnected}
          socketId={socketId}
          roomCodeInput={roomCodeInput}
          setRoomCodeInput={setRoomCodeInput}
          currentRoomId={currentRoomId}
          roomMessage={roomMessage}
          roomPlayerCount={roomPlayerCount}
          localPlayer={localPlayer}
          handleCreateRoom={handleCreateRoom}
          handleJoinRoom={handleJoinRoom}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
            alignItems: "stretch",
          }}
        >
          <InfoCard label="Ère actuelle" value={`Ère ${currentEra}`} accent="rgba(168, 85, 247, 0.35)" />
          <InfoCard label="Tour dans l'ère" value={`${turnInEra} / ${TURNS_PER_ERA}`} accent="rgba(59, 130, 246, 0.35)" />
          <InfoCard label="Phase" value={currentPhase.label} accent="rgba(16, 185, 129, 0.35)" />
          <InfoCard label="Joueur actif" value={activePlayer ? `J${activePlayer}` : "Global"} accent="rgba(244, 114, 182, 0.35)" />
          {phase === "military_move" ? (
            <InfoCard
              label="Militaires restants"
              value={`J1 ${player1RemainingMilitary} — J2 ${player2RemainingMilitary}`}
              accent="rgba(248, 113, 113, 0.35)"
            />
          ) : null}
          <ToggleCard checked={showPressure} onChange={setShowPressure} />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "260px minmax(0, 1fr) 260px",
          alignItems: "stretch",
          minHeight: 0,
        }}
      >
        <div style={{ padding: 16, display: "flex", flexDirection: "column", minHeight: 0, gap: 16, overflowY: "auto" }}>
          <Sidebar
            title="Joueur 1"
            resources={resources.player1}
            housingUsed={player1HousingUsed}
            housingCapacity={player1HousingCapacity}
            points={points.player1}
            production={productionPreview.player1}
            science={sciencePreview.player1}
          >
            <HandPanel
              player={1}
              cards={cards.player1}
              resources={resources.player1}
              selectedCardKey={selectedCardKey}
              selectedCard={selectedCard}
              pendingHousingSacrificePlayers={pendingHousingSacrificePlayers}
              isActivePhase={phase === "player_1"}
              onSelectCard={(cardKey) => handleSelectCard(1, cardKey)}
            />
          </Sidebar>

          <div style={{ background: "#1e293b", borderRadius: 16, padding: 14, color: "white", fontSize: 14, lineHeight: 1.4 }}>
            <strong>Debug</strong>
            <div style={{ marginTop: 8 }}>{debugText}</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: 16,
            minWidth: 0,
            minHeight: 0,
            gap: 12,
            overflow: "auto",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 980,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "center",
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: 12,
              flexShrink: 0,
            }}
          >
            <ActionButton
              onClick={() => applyAction({ type: "CLEAR_SELECTION", payload: { debugText: "Sélection retirée." } })}
              disabled={!selectedUnitId && !selectedCardKey && !purchaseMode}
            >
              Retirer la sélection
            </ActionButton>

            {phase === "military_resolve" ? (
              <ActionButton onClick={handleResolveMilitary}>Résoudre la pression</ActionButton>
            ) : null}

            {phase === "production" ? (
              <ActionButton onClick={handleProduce} disabled={productionDoneThisPhase}>
                {productionDoneThisPhase ? "Production faite" : "Produire"}
              </ActionButton>
            ) : null}

            <ActionButton onClick={handleMainAction}>{getPhaseActionLabel(phase, activePlayer)}</ActionButton>
            <ActionButton onClick={handleResetGame} disabled={Boolean(currentRoomId && (rematchPending || roomPlayerCount < 2))}>{resetButtonLabel}</ActionButton>
          </div>

          {currentRoomId && (rematchRequest || rematchPending) ? (
            <div
              style={{
                width: "100%",
                maxWidth: 980,
                background: "#111827",
                border: "1px solid rgba(250, 204, 21, 0.35)",
                borderRadius: 14,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 700 }}>Revanche</div>

              {rematchRequest ? (
                <>
                  <div style={{ fontSize: 13, opacity: 0.82 }}>
                    Ton adversaire propose une revanche. Si tu acceptes : retour au lobby puis nouveau setup.
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <ActionButton onClick={handleAcceptRematch}>Accepter</ActionButton>
                    <ActionButton onClick={handleDeclineRematch}>Refuser</ActionButton>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, opacity: 0.82 }}>
                  Demande envoyée. En attente de la réponse adverse.
                </div>
              )}
            </div>
          ) : null}

          {phase === "buy" ? (
  <PurchasePanel
    resources={resources}
    buildings={buildings}
    units={units}
    purchaseMode={purchaseMode}
    purchasePlayer={purchasePlayer}
    onSetPurchaseMode={handleSetPurchaseMode}
    activeEventCard={activeEventCard}
  />
) : null}

          {selectedUnit && (selectedUnit.type === "archer" || selectedUnit.type === "siege") ? (
            <div
              style={{
                width: "100%",
                maxWidth: 980,
                background: "#111827",
                border: "1px solid rgba(96, 165, 250, 0.35)",
                borderRadius: 14,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 700 }}>
                Orientation — {selectedUnit.type === "archer" ? "Archer" : "Siège"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.78 }}>
                Direction actuelle : {selectedUnit.direction ?? "aucune"}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ActionButton onClick={() => handleSetSelectedUnitDirection("up")}>↑ Haut</ActionButton>
                <ActionButton onClick={() => handleSetSelectedUnitDirection("right")}>→ Droite</ActionButton>
                <ActionButton onClick={() => handleSetSelectedUnitDirection("down")}>↓ Bas</ActionButton>
                <ActionButton onClick={() => handleSetSelectedUnitDirection("left")}>← Gauche</ActionButton>
              </div>
            </div>
          ) : null}

          <div style={{ width: "100%", maxWidth: 980, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
            <EraCardPanel title="Carte Points active" card={activePointCard} accent="rgba(250, 204, 21, 0.35)" />
            <EraCardPanel title="Carte Événement active" card={activeEventCard} accent="rgba(59, 130, 246, 0.35)" />
          </div>

          <EconomyCompactPanel
            phase={phase}
            activePlayer={activePlayer}
            resources={resources}
            buildings={buildings}
            units={units}
            economySelection={economySelection}
            economyChoiceLocked={economyChoiceLocked}
            onSelectEconomyMarket={handleSelectEconomyMarket}
            onConvertResources={handleConvertResources}
          />

          <ScienceCompactPanel
            phase={phase}
            buildings={buildings}
            units={units}
            scienceActionUsedThisPhase={scienceActionUsedThisPhase}
            onPeekPoints={() => handlePeekScience("points")}
            onPeekEvent={() => handlePeekScience("event")}
          />

          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 0,
              flexShrink: 0,
            }}
          >
            <Board
              units={units}
              buildings={buildings}
              selectedUnitId={selectedUnitId}
              reachableCells={reachableCells}
              activatedUnitIds={phaseActivatedUnitIds}
              activePlayer={activePlayer}
              phase={phase}
              pressureMap={pressureMap}
              showPressure={showPressure}
              placementCells={placementCells}
              spawnCells={spawnCells}
              onCellClick={handleCellClick}
              onUnitClick={handleUnitClick}
            />
          </div>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16, justifyContent: "flex-start", overflowY: "auto" }}>
          <Sidebar
            title="Joueur 2"
            resources={resources.player2}
            housingUsed={player2HousingUsed}
            housingCapacity={player2HousingCapacity}
            points={points.player2}
            production={productionPreview.player2}
            science={sciencePreview.player2}
          >
            <HandPanel
              player={2}
              cards={cards.player2}
              resources={resources.player2}
              selectedCardKey={selectedCardKey}
              selectedCard={selectedCard}
              pendingHousingSacrificePlayers={pendingHousingSacrificePlayers}
              isActivePhase={phase === "player_2"}
              onSelectCard={(cardKey) => handleSelectCard(2, cardKey)}
            />
          </Sidebar>
        </div>
      </div>

      <SciencePeekModal sciencePeek={sciencePeek} onClose={handleCloseSciencePeek} />
    </div>
  );
}
