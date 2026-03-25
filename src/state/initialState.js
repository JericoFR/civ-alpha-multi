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
  { key: "economy", label: "Économie", activePlayer: null },
  { key: "production", label: "Production", activePlayer: null },
  { key: "science", label: "Science", activePlayer: null },
];

export function getPhaseDefinition(phaseKey) {
  return PHASES.find((phase) => phase.key === phaseKey) ?? PHASES[0];
}

function normalizeDeckCards(deckLike) {
  if (!deckLike) return [];

  // cas preset explicite : deck de base
  if (typeof deckLike === "object" && deckLike.preset === "base") {
    return structuredClone(INITIAL_HANDS.player1 ?? []);
  }

  // cas 1 : déjà un tableau ["house", "field", ...]
  if (Array.isArray(deckLike)) {
    return deckLike.filter((cardKey) => typeof cardKey === "string" && cardKey.trim().length > 0);
  }

  // cas 2 : objet deck builder { name, cards: { house: 2, field: 3 } }
  if (typeof deckLike === "object" && deckLike.cards && typeof deckLike.cards === "object") {
    const expanded = [];

    for (const [cardKey, qty] of Object.entries(deckLike.cards)) {
      const count = Math.max(0, Math.floor(Number(qty) || 0));
      for (let i = 0; i < count; i += 1) {
        expanded.push(cardKey);
      }
    }

    return expanded;
  }

  return [];
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

function resolveStartingHands(customDecks = null) {
  if (!customDecks) {
    return ensureStartingHands(INITIAL_HANDS);
  }

  const player1Cards = normalizeDeckCards(customDecks.player1);
  const player2Cards = normalizeDeckCards(customDecks.player2);

  return {
    player1: player1Cards,
    player2: player2Cards,
  };
}

export function createInitialState(customDecks = null) {
  const eraSetup = createShuffledEraDecks();
  const startingHands = resolveStartingHands(customDecks);

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
    militaryResolutionDoneThisPhase: false,

    buyPasses: {
      player1: false,
      player2: false,
    },

    economyPasses: {
      player1: false,
      player2: false,
    },

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
    pendingDirectionUnitId: null,

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