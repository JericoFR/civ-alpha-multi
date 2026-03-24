import { INITIAL_UNITS } from "../data/units.js";
import { INITIAL_BUILDINGS } from "../data/buildings.js";
import { INITIAL_HANDS } from "../data/cards.js";
import { createInitialResources } from "../logic/economy.js";
import { createShuffledEraDecks } from "../data/eraCards.js";

export const PHASES = [
  { key: "player_1", label: "Phase joueurs — J1", activePlayer: 1 },
  { key: "player_2", label: "Phase joueurs — J2", activePlayer: 2 },
  { key: "military_move", label: "Mouvement militaire", activePlayer: null },
  { key: "military_resolve", label: "Résolution militaire", activePlayer: null },
  { key: "buy", label: "Achats", activePlayer: null },
  { key: "economy_1", label: "Économie — J1", activePlayer: 1 },
  { key: "economy_2", label: "Économie — J2", activePlayer: 2 },
  { key: "production", label: "Production", activePlayer: null },
  { key: "science", label: "Science", activePlayer: null },
];

export function getPhaseDefinition(phaseKey) {
  return PHASES.find((phase) => phase.key === phaseKey) ?? PHASES[0];
}

function ensureStartingHands(hands) {
  const clonedHands = structuredClone(hands ?? { player1: [], player2: [] });

  const requiredCards = ["house", "field", "gold_mine", "barracks_1", "market", "school"];

  for (const playerKey of ["player1", "player2"]) {
    if (!Array.isArray(clonedHands[playerKey])) {
      clonedHands[playerKey] = [];
    }

    for (const cardKey of requiredCards) {
      if (!clonedHands[playerKey].includes(cardKey)) {
        clonedHands[playerKey].push(cardKey);
      }
    }
  }

  return clonedHands;
}

export function createInitialState() {
  const eraSetup = createShuffledEraDecks();
  const startingHands = ensureStartingHands(INITIAL_HANDS);

  return {
    turn: 1,
    phase: "player_1",
    activePlayer: 1,

    units: structuredClone(INITIAL_UNITS),
    buildings: structuredClone(INITIAL_BUILDINGS),
    resources: createInitialResources(),

    points: {
      player1: {
        eco: 0,
        military: 0,
        build: 0,
      },
      player2: {
        eco: 0,
        military: 0,
        build: 0,
      },
    },

    cards: startingHands,

    selectedUnitId: null,
    selectedCardKey: null,
    purchaseMode: null,
    purchasePlayer: null,
    phaseActivatedUnitIds: [],
    militaryConsecutivePasses: 0,
    productionDoneThisPhase: false,
    resourceVersion: 0,
    pendingHousingSacrificePlayers: [],

    economySelection: {
      player1: null,
      player2: null,
    },
    economyChoiceLocked: {
      player1: false,
      player2: false,
    },
    economyCentralBonusUsed: {
      player1: false,
      player2: false,
    },

    scienceActionUsedThisPhase: false,
    sciencePeek: null,

    activePointCard: eraSetup.activePointCard,
    activeEventCard: eraSetup.activeEventCard,
    remainingPointDeck: eraSetup.remainingPointDeck,
    remainingEventDeck: eraSetup.remainingEventDeck,

    debugText: `Clique une unité pour la sélectionner. Ère I : ${
      eraSetup.activePointCard?.name ?? "Aucune"
    } / ${eraSetup.activeEventCard?.name ?? "Aucune"}.`,
  };
}

export const initialState = createInitialState();