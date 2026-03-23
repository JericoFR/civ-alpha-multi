import { CARD_DEFS } from "../data/cards";
import { isMilitaryUnit, moveUnit } from "../logic/movement";
import {
  applyProduction,
  canAfford,
  canUseCentralMarket,
  countUsedHousing,
  formatProductionBundle,
  getCentralMarketStatus,
  getHousingCapacity,
  getWorkerFoodCost,
  getScienceWinner,
  hasActivePersonalMarket,
  spendCost,
} from "../logic/economy";
import { resolveMilitaryPressure } from "../logic/pressure";
import { createShuffledEraDecks } from "../data/eraCards";
import { getValidWorkerSpawnCells } from "../logic/buildings";
import { createInitialState, getPhaseDefinition, initialState, PHASES } from "./initialState";

function getNextPhaseKey(currentPhase) {
  const index = PHASES.findIndex((phase) => phase.key === currentPhase);
  if (index === -1) return PHASES[0].key;
  return PHASES[(index + 1) % PHASES.length].key;
}

function getOtherPlayer(player) {
  return player === 1 ? 2 : 1;
}

function getPlayerKey(player) {
  return player === 1 ? "player1" : "player2";
}

function createDebugUnit(type, player, x, y) {
  return {
    id: `debug-${type}-${player}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    type,
    player,
    x,
    y,
  };
}

function createBuilding(type, player, x, y, orientation = "vertical") {
  return {
    id: `building-${type}-${player}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    type,
    player,
    x,
    y,
    orientation,
    size: 2,
    isActive: true,
    isBurning: false,
  };
}

function getEligibleMilitaryUnits(units, activatedUnitIds, player) {
  return units.filter(
    (unit) =>
      unit.player === player &&
      isMilitaryUnit(unit) &&
      !activatedUnitIds.includes(unit.id)
  );
}

function getStartingMilitaryPlayer(units, activatedUnitIds = []) {
  const player1HasUnits = getEligibleMilitaryUnits(units, activatedUnitIds, 1).length > 0;
  if (player1HasUnits) return 1;

  const player2HasUnits = getEligibleMilitaryUnits(units, activatedUnitIds, 2).length > 0;
  if (player2HasUnits) return 2;

  return null;
}

function getNextMilitaryPlayerAfterAction(units, activatedUnitIds, currentPlayer) {
  const otherPlayer = getOtherPlayer(currentPlayer);
  const otherHasUnits = getEligibleMilitaryUnits(units, activatedUnitIds, otherPlayer).length > 0;

  if (otherHasUnits) return otherPlayer;

  const currentHasUnits = getEligibleMilitaryUnits(units, activatedUnitIds, currentPlayer).length > 0;
  if (currentHasUnits) return currentPlayer;

  return null;
}

function getOverflowPlayers(buildings, units, activeEventCard = null) {
  return [1, 2].filter(
    (player) => countUsedHousing(units, player) > getHousingCapacity(buildings, player, activeEventCard)
  );
}

function formatOverflowMessage(players) {
  if (players.length === 0) return null;
  if (players.length === 1) {
    return `Logement dépassé pour J${players[0]} : choisis 1 unité ou ouvrier à sacrifier.`;
  }
  return `Logement dépassé pour J${players.join(" puis J")} : choisis 1 unité ou ouvrier à sacrifier pour chaque joueur.`;
}

function resetEconomySelectionForPhase(state, nextPhaseKey) {
  if (nextPhaseKey === "economy_1") {
    return {
      economySelection: {
        ...state.economySelection,
        player1: null,
      },
      economyChoiceLocked: {
        ...state.economyChoiceLocked,
        player1: false,
      },
      economyCentralBonusUsed: {
        ...state.economyCentralBonusUsed,
        player1: false,
      },
    };
  }

  if (nextPhaseKey === "economy_2") {
    return {
      economySelection: {
        ...state.economySelection,
        player2: null,
      },
      economyChoiceLocked: {
        ...state.economyChoiceLocked,
        player2: false,
      },
      economyCentralBonusUsed: {
        ...state.economyCentralBonusUsed,
        player2: false,
      },
    };
  }

  return {
    economySelection: state.economySelection,
    economyChoiceLocked: state.economyChoiceLocked,
    economyCentralBonusUsed: state.economyCentralBonusUsed,
  };
}

function finishMilitaryPhase(state, debugText) {
  return {
    ...state,
    phase: "military_resolve",
    activePlayer: null,
    selectedUnitId: null,
    selectedCardKey: null,
    purchaseMode: null,
    purchasePlayer: null,
    phaseActivatedUnitIds: [],
    militaryConsecutivePasses: 0,
    debugText,
  };
}

function getCompletedTurn(state, nextPhaseKey) {
  return nextPhaseKey === PHASES[0].key ? state.turn : null;
}

function applyEraEndScoring(state, completedTurn, draftState) {
  let nextState = draftState;
  let debugParts = [];

  if (completedTurn == null) {
    return { nextState, debugParts };
  }

  if (state.activePointCard?.key === "center_domination") {
    const j1Controls = getCentralMarketStatus(state.units, 1).isControlled;
    const j2Controls = getCentralMarketStatus(state.units, 2).isControlled;

    if (j1Controls) {
      nextState = {
        ...nextState,
        points: { ...nextState.points, player1: (nextState.points.player1 ?? 0) + 2 },
      };
      debugParts.push("+2 PV centre pour J1");
    }

    if (j2Controls) {
      nextState = {
        ...nextState,
        points: { ...nextState.points, player2: (nextState.points.player2 ?? 0) + 2 },
      };
      debugParts.push("+2 PV centre pour J2");
    }
  }

  if (completedTurn % 10 === 0 && state.activePointCard?.key === "demographic_growth") {
    const j1Units = state.units.filter((unit) => unit.player === 1).length;
    const j2Units = state.units.filter((unit) => unit.player === 2).length;
    const j1Gain = Math.floor(j1Units / 2);
    const j2Gain = Math.floor(j2Units / 2);

    if (j1Gain > 0 || j2Gain > 0) {
      nextState = {
        ...nextState,
        points: {
          ...nextState.points,
          player1: (nextState.points.player1 ?? 0) + j1Gain,
          player2: (nextState.points.player2 ?? 0) + j2Gain,
        },
      };
      debugParts.push(`Fin d'ère démographie : J1 +${j1Gain} / J2 +${j2Gain}`);
    }
  }

  return { nextState, debugParts };
}

function maybeAdvanceEraCards(state, nextState, completedTurn) {
  if (completedTurn == null || completedTurn % 10 !== 0) {
    return nextState;
  }

  if (completedTurn >= 40) {
    return nextState;
  }

  const nextPointCard = state.remainingPointDeck[0] ?? null;
  const nextEventCard = state.remainingEventDeck[0] ?? null;

  const transitionedState = {
    ...nextState,
    activePointCard: nextPointCard,
    activeEventCard: nextEventCard,
    remainingPointDeck: state.remainingPointDeck.slice(1),
    remainingEventDeck: state.remainingEventDeck.slice(1),
    debugText: `Nouvelle phase : ${getPhaseDefinition(nextState.phase).label} | Nouvelle ère : ${nextPointCard?.name ?? "Aucune"} / ${nextEventCard?.name ?? "Aucune"}.`,
  };

  const overflowPlayers = getOverflowPlayers(transitionedState.buildings, transitionedState.units, nextEventCard);

  return {
    ...transitionedState,
    pendingHousingSacrificePlayers: overflowPlayers,
    debugText: overflowPlayers.length > 0
      ? `${transitionedState.debugText} ${formatOverflowMessage(overflowPlayers)}`
      : transitionedState.debugText,
  };
}

function buildPhaseTransitionState(state, nextPhaseKey) {
  const phaseDef = getPhaseDefinition(nextPhaseKey);
  const startsNewTurn = nextPhaseKey === PHASES[0].key;
  const completedTurn = getCompletedTurn(state, nextPhaseKey);

  const economyReset = resetEconomySelectionForPhase(state, nextPhaseKey);

  let nextState = {
    ...state,
    ...economyReset,
    turn: startsNewTurn ? state.turn + 1 : state.turn,
    phase: nextPhaseKey,
    activePlayer: phaseDef.activePlayer,
    selectedUnitId: null,
    selectedCardKey: null,
    purchaseMode: null,
    purchasePlayer: null,
    phaseActivatedUnitIds: [],
    militaryConsecutivePasses: 0,
    productionDoneThisPhase: false,
    scienceActionUsedThisPhase: false,
    sciencePeek: null,
    debugText: `Nouvelle phase : ${phaseDef.label}`,
  };

  const eraScoring = applyEraEndScoring(state, completedTurn, nextState);
  nextState = eraScoring.nextState;
  if (eraScoring.debugParts.length > 0) {
    nextState = {
      ...nextState,
      debugText: `${nextState.debugText} | ${eraScoring.debugParts.join(" ; ")}`,
    };
  }

  nextState = maybeAdvanceEraCards(state, nextState, completedTurn);

  if (nextPhaseKey !== "military_move") {
    return nextState;
  }

  const startingMilitaryPlayer = getStartingMilitaryPlayer(nextState.units);

  if (startingMilitaryPlayer === null) {
    return finishMilitaryPhase(
      nextState,
      "Aucune unité militaire disponible. Passage direct à la résolution militaire."
    );
  }

  return {
    ...nextState,
    activePlayer: startingMilitaryPlayer,
    debugText: `Phase militaire — J${startingMilitaryPlayer} commence.`,
  };
}

function buildMilitaryResolutionDebug(result) {
  const bits = [];

  if (result.destroyedUnits.length > 0) {
    bits.push(
      `${result.destroyedUnits.length} unité${result.destroyedUnits.length > 1 ? "s" : ""} détruite${result.destroyedUnits.length > 1 ? "s" : ""}`
    );
  }

  if (result.burningBuildings.length > 0) {
    bits.push(
      `${result.burningBuildings.length} bâtiment${result.burningBuildings.length > 1 ? "s" : ""} en feu`
    );
  }

  if (bits.length === 0) {
    return "Résolution militaire effectuée : aucun changement.";
  }

  return `Résolution militaire effectuée : ${bits.join(" ; ")}.`;
}

function getSciencePeekCard(state, pileType) {
  if (pileType === "points") return state.remainingPointDeck[0] ?? null;
  if (pileType === "event") return state.remainingEventDeck[0] ?? null;
  return null;
}

export function gameReducer(state, action) {
  switch (action.type) {
    case "SELECT_UNIT": {
      if (state.pendingHousingSacrificePlayers.length > 0) {
        const expectedPlayer = state.pendingHousingSacrificePlayers[0];
        const unit = action.payload.unit;

        if (action.player && unit.player !== action.player) {
          return {
            ...state,
            debugText: "Tu ne peux pas sélectionner une unité adverse.",
          };
        }

        if (unit.player !== expectedPlayer) {
          return {
            ...state,
            debugText: `Choisis une unité de J${expectedPlayer} à sacrifier pour respecter le logement.`,
          };
        }

        const nextUnits = state.units.filter((currentUnit) => currentUnit.id !== unit.id);
        const remainingQueue = [...state.pendingHousingSacrificePlayers.slice(1)];
        const newOverflowPlayers = getOverflowPlayers(state.buildings, nextUnits, state.activeEventCard).filter(
          (player) => !remainingQueue.includes(player)
        );
        const queue = [...remainingQueue, ...newOverflowPlayers];

        return {
          ...state,
          units: nextUnits,
          selectedUnitId: null,
          pendingHousingSacrificePlayers: queue,
          debugText:
            queue.length > 0
              ? `${unit.type} sacrifié pour J${expectedPlayer}. ${formatOverflowMessage(queue)}`
              : `${unit.type} sacrifié pour J${expectedPlayer}. Le logement est de nouveau valide.`,
        };
      }

      const unit = action.payload.unit;

      if (action.player && unit.player !== action.player) {
        return {
          ...state,
          debugText: "Tu ne peux pas sélectionner une unité adverse.",
        };
      }

      return {
        ...state,
        selectedUnitId: unit.id,
        selectedCardKey: null,
        purchaseMode: null,
        purchasePlayer: null,
        debugText: `Unité sélectionnée : ${unit.type} J${unit.player} en ${unit.x},${unit.y}`,
      };
    }

    case "SELECT_CARD": {
      const { player, cardKey } = action.payload;

      if (action.player && action.player !== player) {
        return {
          ...state,
          debugText: "Action refusée : tu ne peux pas jouer pour l'autre joueur.",
        };
      }

      if (!["player_1", "player_2"].includes(state.phase)) {
        return {
          ...state,
          debugText: "Les cartes ne peuvent être jouées que pendant la phase joueur correspondante.",
        };
      }

      if (state.activePlayer !== player) {
        return {
          ...state,
          debugText: `Ce n'est pas le moment de jouer une carte de J${player}.`,
        };
      }

      return {
        ...state,
        selectedUnitId: null,
        selectedCardKey: state.selectedCardKey === cardKey ? null : cardKey,
        purchaseMode: null,
        purchasePlayer: null,
        debugText:
          state.selectedCardKey === cardKey
            ? "Carte désélectionnée."
            : `Carte sélectionnée : ${CARD_DEFS[cardKey]?.name ?? cardKey}. Clique un emplacement valide du plateau.`,
      };
    }

    case "PLAY_CARD": {
      const { player, cardKey, x, y, orientation } = action.payload;
      const playerKey = getPlayerKey(player);
      const card = CARD_DEFS[cardKey];
      if (!card) return state;

      if (action.player && action.player !== player) {
        return {
          ...state,
          debugText: "Action refusée : tu ne peux pas jouer pour l'autre joueur.",
        };
      }

      if (!["player_1", "player_2"].includes(state.phase)) {
        return {
          ...state,
          debugText: "Les cartes ne peuvent être jouées que pendant la phase joueur correspondante.",
        };
      }

      if (state.activePlayer !== player) {
        return {
          ...state,
          debugText: `Ce n'est pas à J${player} de jouer une carte maintenant.`,
        };
      }

      if (!canAfford(state.resources[playerKey], card.cost)) {
        return {
          ...state,
          debugText: `Pas assez de ressources pour jouer ${card.name}.`,
        };
      }

      const hand = state.cards[playerKey] ?? [];
      const cardIndex = hand.indexOf(cardKey);
      if (cardIndex === -1) {
        return {
          ...state,
          debugText: `${card.name} n'est pas dans la main de J${player}.`,
        };
      }

      const nextHand = [...hand];
      nextHand.splice(cardIndex, 1);
      const nextResources = {
        ...state.resources,
        [playerKey]: spendCost(state.resources[playerKey], card.cost),
      };
      const nextBuildings = [
        ...state.buildings,
        createBuilding(card.createsBuildingType, player, x, y, orientation),
      ];

      const buildersBonus = state.activePointCard?.key === "builders_age" ? 2 : 0;

      return {
        ...state,
        buildings: nextBuildings,
        resources: nextResources,
        cards: {
          ...state.cards,
          [playerKey]: nextHand,
        },
        points: buildersBonus > 0 ? { ...state.points, [playerKey]: (state.points[playerKey] ?? 0) + buildersBonus } : state.points,
        selectedCardKey: null,
        purchaseMode: null,
        purchasePlayer: null,
        resourceVersion: (state.resourceVersion ?? 0) + 1,
        debugText: `${card.name} posée par J${player} en ${x},${y} (${orientation}). Coût payé immédiatement.${buildersBonus > 0 ? ` +${buildersBonus} PV bâtisseurs.` : ""}`,
      };
    }

    case "CLEAR_SELECTION": {
      return {
        ...state,
        selectedUnitId: null,
        selectedCardKey: null,
        purchaseMode: null,
        purchasePlayer: null,
        debugText: action.payload?.debugText ?? "Sélection retirée.",
      };
    }

    case "SET_PURCHASE_MODE": {
      const { mode, player } = action.payload;

      if (action.player && action.player !== player) {
        return {
          ...state,
          debugText: "Action refusée : tu ne peux pas acheter pour l'autre joueur.",
        };
      }

      if (state.phase !== "buy") {
        return {
          ...state,
          debugText: "Les achats d'unités ne sont possibles que pendant la phase buy.",
        };
      }

      if (![1, 2].includes(player)) {
        return {
          ...state,
          debugText: "Joueur invalide pour l'achat.",
        };
      }

      if (mode !== "worker") {
        return {
          ...state,
          debugText: "Seul l'achat d'ouvrier est disponible pour le moment.",
        };
      }

      const playerKey = getPlayerKey(player);
      const workerFoodCost = getWorkerFoodCost(state.activeEventCard);
      if ((state.resources[playerKey]?.food ?? 0) < workerFoodCost) {
        return {
          ...state,
          debugText: `J${player} n'a pas assez de nourriture pour acheter un ouvrier (${workerFoodCost} 🌾).`,
        };
      }

      const usedHousing = countUsedHousing(state.units, player);
      const capacity = getHousingCapacity(state.buildings, player, state.activeEventCard);
      if (usedHousing >= capacity) {
        return {
          ...state,
          debugText: `Achat bloqué pour J${player} : logement plein (${usedHousing}/${capacity}).`,
        };
      }

      const validCells = getValidWorkerSpawnCells(state.buildings, state.units, player);
      if (validCells.length === 0) {
        return {
          ...state,
          debugText: `Aucune case valide de spawn pour un ouvrier de J${player}.`,
        };
      }

      const isSameSelection = state.purchaseMode === mode && state.purchasePlayer === player;
      return {
        ...state,
        selectedUnitId: null,
        selectedCardKey: null,
        purchaseMode: isSameSelection ? null : mode,
        purchasePlayer: isSameSelection ? null : player,
        debugText: isSameSelection
          ? `Achat annulé pour J${player}.`
          : `Achat ouvrier J${player} sélectionné : clique une case valide d'hôtel de ville ou de logement actif.`,
      };
    }

    case "SPAWN_WORKER": {
      const { player, x, y } = action.payload;

      if (action.player && action.player !== player) {
        return {
          ...state,
          debugText: "Action refusée : tu ne peux pas faire apparaître un ouvrier pour l'autre joueur.",
        };
      }

      if (state.phase !== "buy") {
        return {
          ...state,
          debugText: "Le spawn d'ouvrier n'est possible qu'en phase buy.",
        };
      }

      const playerKey = getPlayerKey(player);
      const workerFoodCost = getWorkerFoodCost(state.activeEventCard);
      if ((state.resources[playerKey]?.food ?? 0) < workerFoodCost) {
        return {
          ...state,
          purchaseMode: null,
          purchasePlayer: null,
          debugText: `J${player} n'a pas assez de nourriture pour acheter un ouvrier (${workerFoodCost} 🌾).`,
        };
      }

      const usedHousing = countUsedHousing(state.units, player);
      const capacity = getHousingCapacity(state.buildings, player, state.activeEventCard);
      if (usedHousing >= capacity) {
        return {
          ...state,
          purchaseMode: null,
          purchasePlayer: null,
          debugText: `Achat bloqué pour J${player} : logement plein (${usedHousing}/${capacity}).`,
        };
      }

      const validCells = getValidWorkerSpawnCells(state.buildings, state.units, player);
      const isValid = validCells.some((cell) => cell.x === x && cell.y === y);
      if (!isValid) {
        return {
          ...state,
          debugText: `Case invalide pour faire apparaître un ouvrier de J${player}.`,
        };
      }

      return {
        ...state,
        units: [...state.units, createDebugUnit("worker", player, x, y)],
        resources: {
          ...state.resources,
          [playerKey]: {
            ...state.resources[playerKey],
            food: (state.resources[playerKey]?.food ?? 0) - workerFoodCost,
          },
        },
        purchaseMode: null,
        purchasePlayer: null,
        resourceVersion: (state.resourceVersion ?? 0) + 1,
        debugText: `Ouvrier acheté par J${player} en ${x},${y} pour ${workerFoodCost} nourriture.`,
      };
    }

    case "MOVE_UNIT": {
      const { unitId, x, y } = action.payload;
      const movedUnit = state.units.find((unit) => unit.id === unitId);

      if (!movedUnit) {
        return {
          ...state,
          debugText: "Unité introuvable pour le déplacement.",
        };
      }

      if (action.player && movedUnit.player !== action.player) {
        return {
          ...state,
          debugText: "Action refusée : tu ne peux pas déplacer une unité adverse.",
        };
      }

      if (state.phase === "player_1" && movedUnit.player !== 1) {
        return {
          ...state,
          debugText: "Pendant la phase J1, seuls les ouvriers de J1 peuvent être déplacés.",
        };
      }

      if (state.phase === "player_2" && movedUnit.player !== 2) {
        return {
          ...state,
          debugText: "Pendant la phase J2, seuls les ouvriers de J2 peuvent être déplacés.",
        };
      }

      if (state.phase === "military_move") {
        if (!isMilitaryUnit(movedUnit)) {
          return {
            ...state,
            debugText: "Seules les unités militaires peuvent être déplacées pendant la phase militaire.",
          };
        }

        if (movedUnit.player !== state.activePlayer) {
          return {
            ...state,
            debugText: `Ce n'est pas à J${movedUnit.player} de jouer maintenant.`,
          };
        }
      }

      const updatedUnits = moveUnit(state.units, unitId, x, y);
      const tracksActivations = ["player_1", "player_2", "military_move"].includes(state.phase);
      const nextActivatedIds = tracksActivations
        ? [...state.phaseActivatedUnitIds, unitId]
        : state.phaseActivatedUnitIds;

      if (state.phase === "military_move") {
        const nextMilitaryPlayer = getNextMilitaryPlayerAfterAction(
          updatedUnits,
          nextActivatedIds,
          state.activePlayer ?? 1
        );

        if (nextMilitaryPlayer === null) {
          return finishMilitaryPhase(
            {
              ...state,
              units: updatedUnits,
            },
            `Dernière activation militaire jouée vers ${x},${y}. Passage à la résolution militaire.`
          );
        }

        return {
          ...state,
          units: updatedUnits,
          selectedUnitId: null,
          phaseActivatedUnitIds: nextActivatedIds,
          militaryConsecutivePasses: 0,
          activePlayer: nextMilitaryPlayer,
          debugText:
            nextMilitaryPlayer === state.activePlayer
              ? `Déplacement validé vers ${x},${y}. J${state.activePlayer} rejoue (plus aucune unité adverse disponible).`
              : `Déplacement validé vers ${x},${y}. À J${nextMilitaryPlayer}.`,
        };
      }

      return {
        ...state,
        units: updatedUnits,
        selectedUnitId: null,
        phaseActivatedUnitIds: nextActivatedIds,
        debugText: `Déplacement validé vers ${x},${y}`,
      };
    }

    case "PASS_MILITARY_TURN": {
      if (state.phase !== "military_move") return state;

      if (action.player && state.activePlayer && action.player !== state.activePlayer) {
        return {
          ...state,
          debugText: `Action refusée : c'est à J${state.activePlayer} de décider.`,
        };
      }

      const currentPlayer = state.activePlayer ?? 1;
      const otherPlayer = getOtherPlayer(currentPlayer);
      const currentHasUnits = getEligibleMilitaryUnits(
        state.units,
        state.phaseActivatedUnitIds,
        currentPlayer
      ).length > 0;
      const otherHasUnits = getEligibleMilitaryUnits(
        state.units,
        state.phaseActivatedUnitIds,
        otherPlayer
      ).length > 0;

      if (!currentHasUnits && !otherHasUnits) {
        return finishMilitaryPhase(
          state,
          "Plus aucune unité militaire disponible. Passage à la résolution militaire."
        );
      }

      if (!currentHasUnits) {
        if (!otherHasUnits) {
          return finishMilitaryPhase(
            state,
            "Plus aucune unité militaire disponible. Passage à la résolution militaire."
          );
        }

        return {
          ...state,
          activePlayer: otherPlayer,
          selectedUnitId: null,
          debugText: `J${currentPlayer} n'a plus d'unité militaire disponible. À J${otherPlayer}.`,
        };
      }

      if (!otherHasUnits || state.militaryConsecutivePasses >= 1) {
        return finishMilitaryPhase(
          state,
          "Les deux joueurs ont passé ou ne peuvent plus agir. Passage à la résolution militaire."
        );
      }

      return {
        ...state,
        activePlayer: otherPlayer,
        selectedUnitId: null,
        militaryConsecutivePasses: state.militaryConsecutivePasses + 1,
        debugText: `J${currentPlayer} passe. À J${otherPlayer}.`,
      };
    }

    case "RESOLVE_MILITARY": {
      if (state.phase !== "military_resolve") return state;

      const result = resolveMilitaryPressure(state.units, state.buildings, {
        buildingBurnThreshold: state.activeEventCard?.key === "instability" ? 2 : 3,
      });
      const overflowPlayers = getOverflowPlayers(result.buildings, result.units, state.activeEventCard);
      const warBonus = state.activePointCard?.key === "war_age" ? result.destroyedUnits.filter((unit) => unit.player === 2).length : 0;
      const warBonusP2 = state.activePointCard?.key === "war_age" ? result.destroyedUnits.filter((unit) => unit.player === 1).length : 0;

      return {
        ...state,
        units: result.units,
        buildings: result.buildings,
        points: state.activePointCard?.key === "war_age" ? { ...state.points, player1: (state.points.player1 ?? 0) + warBonus, player2: (state.points.player2 ?? 0) + warBonusP2 } : state.points,
        selectedUnitId: null,
        selectedCardKey: null,
        pendingHousingSacrificePlayers: overflowPlayers,
        debugText:
          overflowPlayers.length > 0
            ? `${buildMilitaryResolutionDebug(result)}${state.activePointCard?.key === "war_age" ? ` | Guerre : J1 +${warBonus} / J2 +${warBonusP2} PV.` : ""} ${formatOverflowMessage(overflowPlayers)}`
            : `${buildMilitaryResolutionDebug(result)}${state.activePointCard?.key === "war_age" ? ` | Guerre : J1 +${warBonus} / J2 +${warBonusP2} PV.` : ""}`,
      };
    }

    case "SELECT_ECONOMY_MARKET": {
      const { player, marketType } = action.payload;
      const playerKey = getPlayerKey(player);

      if (action.player && action.player !== player) {
        return {
          ...state,
          debugText: "Action refusée : tu ne peux pas choisir le marché de l'autre joueur.",
        };
      }

      if (!["economy_1", "economy_2"].includes(state.phase)) {
        return {
          ...state,
          debugText: "Le choix du marché n'est possible que pendant la phase économie.",
        };
      }

      if (state.activePlayer !== player) {
        return {
          ...state,
          debugText: `Ce n'est pas à J${player} de choisir son marché.`,
        };
      }

      if (!["personal", "central"].includes(marketType)) {
        return {
          ...state,
          debugText: "Type de marché invalide.",
        };
      }

      if (state.economyChoiceLocked[playerKey]) {
        return {
          ...state,
          debugText: "Le marché est déjà verrouillé pour cette phase économie.",
        };
      }

      return {
        ...state,
        economySelection: {
          ...state.economySelection,
          [playerKey]: marketType,
        },
        debugText:
          marketType === "central"
            ? `J${player} choisit le Marché central pour cette phase économie.`
            : `J${player} choisit son Marché personnel pour cette phase économie.`,
      };
    }

    case "CONVERT_RESOURCES": {
      const { player, resource, lots, marketType: forcedMarketType } = action.payload;
      const playerKey = getPlayerKey(player);

      if (action.player && action.player !== player) {
        return {
          ...state,
          debugText: "Action refusée : tu ne peux pas convertir pour l'autre joueur.",
        };
      }

      if (!["economy_1", "economy_2"].includes(state.phase)) {
        return {
          ...state,
          debugText: "La conversion n'est possible que pendant la phase économie.",
        };
      }

      if (state.activePlayer !== player) {
        return {
          ...state,
          debugText: `Ce n'est pas à J${player} de convertir ses ressources.`,
        };
      }

      if (!["food", "wood", "stone", "metal"].includes(resource)) {
        return {
          ...state,
          debugText: "Ressource invalide pour la conversion.",
        };
      }

      if (!Number.isInteger(lots) || lots <= 0) {
        return {
          ...state,
          debugText: "Le nombre de lots à convertir doit être supérieur à 0.",
        };
      }

      const selectedMarket = forcedMarketType ?? state.economySelection[playerKey];

      if (!["personal", "central"].includes(selectedMarket)) {
        return {
          ...state,
          debugText: `J${player} doit d'abord choisir entre son Marché personnel et le Marché central.`,
        };
      }

      if (selectedMarket === "personal") {
        if (!hasActivePersonalMarket(state.buildings, state.units, player)) {
          return {
            ...state,
            debugText: `J${player} ne peut pas convertir : aucun Marché personnel actif avec un ouvrier dedans.`,
          };
        }
      }

      if (selectedMarket === "central") {
        if (!canUseCentralMarket(state.units, player)) {
          return {
            ...state,
            debugText:
              `J${player} ne contrôle pas le Marché central : il faut exactement 1 ouvrier allié sur la croix orange et aucun ennemi dessus.`,
          };
        }
      }

      const available = Number(state.resources[playerKey][resource] ?? 0);
      const maxLots = Math.floor(available / 5);

      if (maxLots <= 0) {
        return {
          ...state,
          debugText: `J${player} n'a pas assez de ${resource} pour convertir en PV.`,
        };
      }

      if (lots > maxLots) {
        return {
          ...state,
          debugText: `Conversion impossible : J${player} peut convertir au maximum ${maxLots} lot(s) de ${resource}.`,
        };
      }

      const spent = lots * 5;
      const centralBonusAlreadyUsed = state.economyCentralBonusUsed?.[playerKey] ?? false;
      const centralBonusGranted = selectedMarket === "central" && !centralBonusAlreadyUsed ? 1 : 0;
      const commerceBonus = state.activePointCard?.key === "commerce_age" ? lots : 0;
      const pointsGained = lots + centralBonusGranted + commerceBonus;
      const marketLabel = selectedMarket === "central" ? "Marché central" : "Marché personnel";
      const bonusLabel =
        selectedMarket === "central"
          ? centralBonusGranted > 0
            ? " (+1 PV bonus centre, 1 fois ce tour)"
            : " (bonus centre déjà utilisé ce tour)"
          : "";
      const commerceLabel = commerceBonus > 0 ? ` (+${commerceBonus} PV commerce)` : "";

      return {
        ...state,
        resources: {
          ...state.resources,
          [playerKey]: {
            ...state.resources[playerKey],
            [resource]: available - spent,
          },
        },
        points: {
          ...state.points,
          [playerKey]: (state.points[playerKey] ?? 0) + pointsGained,
        },
        economySelection: {
          ...state.economySelection,
          [playerKey]: selectedMarket,
        },
        economyChoiceLocked: {
          ...state.economyChoiceLocked,
          [playerKey]: true,
        },
        economyCentralBonusUsed: {
          ...state.economyCentralBonusUsed,
          [playerKey]: selectedMarket === "central" ? true : state.economyCentralBonusUsed?.[playerKey] ?? false,
        },
        resourceVersion: (state.resourceVersion ?? 0) + 1,
        debugText: `J${player} convertit ${spent} ${resource} en ${pointsGained} PV via ${marketLabel}${bonusLabel}${commerceLabel}.`,
      };
    }

    case "PRODUCE_RESOURCES": {
      if (state.phase !== "production") return state;
      if (state.productionDoneThisPhase) return state;

      const result = applyProduction(state.resources, state.buildings, state.units, state.activeEventCard);
      const nextResources = {
        player1: {
          food: Number(result.resources.player1.food ?? 0),
          wood: Number(result.resources.player1.wood ?? 0),
          stone: Number(result.resources.player1.stone ?? 0),
          metal: Number(result.resources.player1.metal ?? 0),
        },
        player2: {
          food: Number(result.resources.player2.food ?? 0),
          wood: Number(result.resources.player2.wood ?? 0),
          stone: Number(result.resources.player2.stone ?? 0),
          metal: Number(result.resources.player2.metal ?? 0),
        },
      };

      return {
        ...state,
        resources: nextResources,
        resourceVersion: (state.resourceVersion ?? 0) + 1,
        productionDoneThisPhase: true,
        debugText:
          `Production — J1: ${formatProductionBundle(result.produced.player1)} | ` +
          `J2: ${formatProductionBundle(result.produced.player2)} | ` +
          `Stocks → J1 ${nextResources.player1.food}/${nextResources.player1.wood}/${nextResources.player1.stone}/${nextResources.player1.metal} · ` +
          `J2 ${nextResources.player2.food}/${nextResources.player2.wood}/${nextResources.player2.stone}/${nextResources.player2.metal}`,
      };
    }

    case "OPEN_SCIENCE_PEEK": {
      const { pileType } = action.payload;

      if (state.phase !== "science") {
        return {
          ...state,
          debugText: "Le regard scientifique n'est possible qu'en phase Science.",
        };
      }

      if (state.scienceActionUsedThisPhase) {
        return {
          ...state,
          debugText: "L'action science de ce tour a déjà été utilisée.",
        };
      }

      if (!["points", "event"].includes(pileType)) {
        return {
          ...state,
          debugText: "Pile scientifique invalide.",
        };
      }

      const winner = getScienceWinner(state.buildings, state.units);

      if (action.player && winner.player && action.player !== winner.player) {
        return {
          ...state,
          debugText: `Action refusée : seule la vision de J${winner.player} est autorisée.`,
        };
      }

      if (!winner.player) {
        return {
          ...state,
          debugText: `Égalité scientifique : J1 ${winner.totals.player1} / J2 ${winner.totals.player2}. Personne ne regarde.`,
        };
      }

      const card = getSciencePeekCard(state, pileType);

      return {
        ...state,
        scienceActionUsedThisPhase: true,
        sciencePeek: {
          player: winner.player,
          pileType,
          card,
        },
        debugText: card
          ? `J${winner.player} regarde la prochaine carte ${pileType === "points" ? "Points" : "Événement"}.`
          : `J${winner.player} voulait regarder la pile ${pileType === "points" ? "Points" : "Événement"}, mais elle est vide.`,
      };
    }

    case "CLOSE_SCIENCE_PEEK": {
      if (!state.sciencePeek) return state;

      if (action.player && action.player !== state.sciencePeek.player) {
        return {
          ...state,
          debugText: `Action refusée : seule la vision de J${state.sciencePeek.player} peut être refermée par ce joueur.`,
        };
      }

      return {
        ...state,
        sciencePeek: null,
        debugText: `Vision scientifique refermée pour J${state.sciencePeek.player}.`,
      };
    }

    case "DEBUG_SPAWN_WORKER_J1": {
      return {
        ...state,
        units: [...state.units, createDebugUnit("worker", 1, 5, 2)],
        debugText: "Debug : worker J1 ajouté en 5,2.",
      };
    }

    case "DEBUG_SPAWN_SOLDIER_J1": {
      return {
        ...state,
        units: [...state.units, createDebugUnit("soldier", 1, 7, 2)],
        debugText: "Debug : soldier J1 ajouté en 7,2.",
      };
    }

    case "DEBUG_SPAWN_WORKER_J2": {
      return {
        ...state,
        units: [...state.units, createDebugUnit("worker", 2, 5, 16)],
        debugText: "Debug : worker J2 ajouté en 5,16.",
      };
    }

    case "DEBUG_SPAWN_SOLDIER_J2": {
      return {
        ...state,
        units: [...state.units, createDebugUnit("soldier", 2, 7, 16)],
        debugText: "Debug : soldier J2 ajouté en 7,16.",
      };
    }

    case "SYNC_ROOM_STATE": {
  const roomState = action.payload?.roomState ?? action.payload;
  if (!roomState) return state;

  return {
    ...state,
    ...roomState,
    debugText: roomState.debugText ?? state.debugText,
  };
}

    case "SET_DEBUG_TEXT": {
      return {
        ...state,
        debugText: action.payload.text,
      };
    }

    case "NEXT_PHASE": {
      if (state.pendingHousingSacrificePlayers.length > 0) {
        return {
          ...state,
          debugText: formatOverflowMessage(state.pendingHousingSacrificePlayers),
        };
      }

      const nextPhase = getNextPhaseKey(state.phase);
      return buildPhaseTransitionState(state, nextPhase);
    }

    case "ADD_POINTS": {
      const { player, amount } = action.payload;
      const playerKey = getPlayerKey(player);
      return {
        ...state,
        points: {
          ...state.points,
          [playerKey]: (state.points[playerKey] ?? 0) + amount,
        },
      };
    }

    case "RESET_GAME": {
      return createInitialState();
    }

    default:
      return state;
  }
}