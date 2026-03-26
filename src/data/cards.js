export const CARD_DEFS = {
  house: {
    key: "house",
    id: "house",
    name: "Chaumière",
    era: 1,
    category: "building",
    subCategory: "housing",
    civilization: null,
    tags: ["building", "housing"],
    buildPoints: 1,
    cost: { gold: 3 },
    text:
      "+3 logements. Les ouvriers et unités militaires occupent chacun 1 logement. En feu : ne protège plus et ne fournit plus de logement.",
    placement: {
      mode: "green_pair",
      size: 2,
      allowHorizontal: true,
      allowVertical: true,
      ownerOnly: true,
    },
    createsBuildingType: "house",
  },

  field: {
    key: "field",
    id: "field",
    name: "Champ",
    era: 1,
    category: "building",
    subCategory: "production",
    civilization: null,
    tags: ["building", "production", "food"],
    buildPoints: 1,
    cost: {},
    text: "+2 🌾 de base. +1 🌾 pour chaque citoyen actif.",
    placement: {
      mode: "green_pair",
      size: 2,
      allowHorizontal: true,
      allowVertical: true,
      ownerOnly: true,
    },
    createsBuildingType: "production_food",
  },

  gold_mine: {
    key: "gold_mine",
    id: "gold_mine",
    name: "Mine d’or",
    era: 1,
    category: "building",
    subCategory: "production",
    civilization: null,
    tags: ["building", "production", "gold"],
    buildPoints: 1,
    cost: {},
    text: "+2 💰 de base. +1 💰 pour chaque citoyen actif.",
    placement: {
      mode: "green_pair",
      size: 2,
      allowHorizontal: true,
      allowVertical: true,
      ownerOnly: true,
    },
    createsBuildingType: "production_gold",
  },

  barracks_1: {
    key: "barracks_1",
    id: "barracks_1",
    name: "Caserne I",
    era: 1,
    category: "building",
    subCategory: "military",
    civilization: null,
    tags: ["building", "military"],
    buildPoints: 1,
    cost: { gold: 3 },
    text: "Permet de recruter Soldat et Archer si un ouvrier est actif dans ce bâtiment.",
    placement: {
      mode: "green_pair",
      size: 2,
      allowHorizontal: true,
      allowVertical: true,
      ownerOnly: true,
    },
    createsBuildingType: "barracks_1",
  },

  barracks_fortified: {
    key: "barracks_fortified",
    id: "barracks_fortified",
    name: "Caserne fortifiée",
    era: 2,
    category: "building",
    subCategory: "military",
    civilization: null,
    tags: ["building", "military"],
    buildPoints: 2,
    cost: { gold: 6 },
    text: "Permet de recruter cavalerie et siège si un ouvrier est actif dans ce bâtiment.",
    placement: {
      mode: "green_pair",
      size: 2,
      allowHorizontal: true,
      allowVertical: true,
      ownerOnly: true,
    },
    createsBuildingType: "barracks_2",
  },

  palisade: {
    key: "palisade",
    id: "palisade",
    name: "Palissade",
    era: 1,
    category: "building",
    subCategory: "defense",
    civilization: null,
    tags: ["building", "defense"],
    buildPoints: 1,
    cost: { gold: 1 },
    text:
      "Bloque le déplacement des unités adverses. Peut abriter soldats et ouvriers comme un bâtiment normal. En feu : ne bloque plus et ne protège plus.",
    placement: {
      mode: "black_pair",
      size: 2,
      allowHorizontal: true,
      allowVertical: false,
      ownerOnly: true,
    },
    createsBuildingType: "palisade",
  },

  market: {
    key: "market",
    id: "market",
    name: "Marché",
    era: 1,
    category: "building",
    subCategory: "economy",
    civilization: null,
    tags: ["building", "economy"],
    buildPoints: 1,
    cost: { gold: 3 },
    text: "5 ressources identiques → 1 PV pendant la phase économie. Ouvrier actif requis.",
    placement: {
      mode: "green_pair",
      size: 2,
      allowHorizontal: true,
      allowVertical: true,
      ownerOnly: true,
    },
    createsBuildingType: "market",
  },

  school: {
    key: "school",
    id: "school",
    name: "École",
    era: 1,
    category: "building",
    subCategory: "science",
    civilization: null,
    tags: ["building", "science"],
    buildPoints: 1,
    cost: { gold: 3 },
    text:
      "Produit 1 science par tour par citoyen actif. À la phase Science, si ta science est strictement supérieure, tu peux regarder la prochaine carte Points ou Événement.",
    placement: {
      mode: "green_pair",
      size: 2,
      allowHorizontal: true,
      allowVertical: true,
      ownerOnly: true,
    },
    createsBuildingType: "school",
  },








aqueduct: {
  key: "aqueduct",
  id: "aqueduct",
  name: "Aqueduc",
  era: 1,
  category: "building",
  subCategory: "production",
  civilization: "roman",
  tags: ["building", "production", "roman"],
  buildPoints: 1,
  cost: { gold: 3 },
  text:
    "Chaque bâtiment de production de nourriture produit +1 🌾.",
  placement: {
    mode: "green_pair",
    size: 2,
    allowHorizontal: true,
    allowVertical: true,
    ownerOnly: true,
  },
  createsBuildingType: "aqueduct",
},

castrum: {
  key: "castrum",
  id: "castrum",
  name: "Castrum",
  era: 1,
  category: "building",
  subCategory: "military",
  civilization: "roman",
  tags: ["building", "military", "roman"],
  buildPoints: 1,
  cost: { gold: 4 },
  text:
    "Compte comme Caserne I. Pendant l’Ère I, ce bâtiment n’a pas besoin d’ouvrier actif pour recruter.",
  placement: {
    mode: "green_pair",
    size: 2,
    allowHorizontal: true,
    allowVertical: true,
    ownerOnly: true,
  },
  createsBuildingType: "castrum",
},

forum: {
  key: "forum",
  id: "forum",
  name: "Forum",
  era: 1,
  category: "building",
  subCategory: "economy",
  civilization: "roman",
  tags: ["building", "economy", "roman"],
  buildPoints: 1,
  cost: { gold: 2 },
  text:
    "+1 💰 de base. +1 💰 si un ouvrier actif est dedans. +1 💰 si tu contrôles le centre.",
  placement: {
    mode: "green_pair",
    size: 2,
    allowHorizontal: true,
    allowVertical: true,
    ownerOnly: true,
  },
  createsBuildingType: "forum",
},















};

export const INITIAL_HANDS = {
  player1: ["house", "field", "gold_mine", "barracks_1", "palisade", "market", "school"],
  player2: ["house", "field", "gold_mine", "barracks_1", "palisade", "market", "school"],
};

const BUILDING_TYPE_TO_CARD_KEY = {
  townhall: "townhall",
  house: "house",
  production_food: "field",
  production_gold: "gold_mine",
  barracks_1: "barracks_1",
  barracks_2: "barracks_fortified",
  palisade: "palisade",
  market: "market",
  school: "school",
};

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeAscii(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildImageCandidates(cardLike, baseDir = "/cards") {
  if (!cardLike) return [];

  const id = cardLike.id ?? cardLike.key ?? cardLike.type ?? "";
  const name = cardLike.name ?? "";
  const explicit = baseDir === "/board" ? cardLike.boardImage ?? null : cardLike.image ?? null;
  const explicitPath = explicit
    ? explicit.startsWith("/")
      ? explicit
      : `${baseDir}/${explicit}`
    : null;

  const rawNameFile = name ? `${baseDir}/${name}.png` : null;
  const asciiName = normalizeAscii(name);
  const asciiNameFile = asciiName ? `${baseDir}/${asciiName}.png` : null;
  const slugName = asciiName
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const slugNameFile = slugName ? `${baseDir}/${slugName}.png` : null;
  const lowerIdFile = id ? `${baseDir}/${String(id).toLowerCase()}.png` : null;
  const exactIdFile = id ? `${baseDir}/${id}.png` : null;

  return unique([
    explicitPath,
    exactIdFile,
    lowerIdFile,
    rawNameFile,
    asciiNameFile,
    slugNameFile,
  ]);
}

export function getCardImageCandidates(cardLike) {
  return buildImageCandidates(cardLike, "/cards");
}

export function getPrimaryCardImage(cardLike) {
  return getCardImageCandidates(cardLike)[0] ?? null;
}

export function getBoardImageCandidates(cardLike) {
  const boardCandidates = buildImageCandidates(cardLike, "/board");
  const cardCandidates = buildImageCandidates(cardLike, "/cards");
  return unique([...boardCandidates, ...cardCandidates]);
}

export function getPrimaryBoardImage(cardLike) {
  return getBoardImageCandidates(cardLike)[0] ?? null;
}

export function getBuildingCardLike(buildingLike) {
  if (!buildingLike) return null;

  const sourceCardKey = buildingLike.sourceCardKey ?? null;
  const sourceCard = sourceCardKey ? CARD_DEFS[sourceCardKey] ?? null : null;

  if (sourceCard) {
    return {
      ...sourceCard,
      type: buildingLike.type,
      sourceCardKey,
    };
  }

  const fallbackCardKey = BUILDING_TYPE_TO_CARD_KEY[buildingLike.type] ?? null;
  const fallbackCard = fallbackCardKey ? CARD_DEFS[fallbackCardKey] ?? null : null;

  if (fallbackCard) {
    return {
      ...fallbackCard,
      type: buildingLike.type,
      sourceCardKey: fallbackCardKey,
    };
  }

  return {
    id: buildingLike.type,
    key: buildingLike.type,
    type: buildingLike.type,
    name: buildingLike.name ?? buildingLike.type,
    image: null,
    boardImage: null,
  };
}

export function getBuildingImageCandidates(buildingLike) {
  const cardLike = getBuildingCardLike(buildingLike);
  return getBoardImageCandidates(cardLike);
}
