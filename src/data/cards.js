export const CARD_DEFS = {
  house: {
    key: "house",
    name: "Chaumière",
    era: 1,
    category: "building",
    subCategory: "housing",
    cost: { wood: 3 },
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
    name: "Champ",
    era: 1,
    category: "building",
    subCategory: "production",
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

  lumber_camp: {
    key: "lumber_camp",
    name: "Camp de bûcheron",
    era: 1,
    category: "building",
    subCategory: "production",
    cost: {},
    text: "+2 🌲 de base. +1 🌲 pour chaque citoyen actif.",
    placement: {
      mode: "green_pair",
      size: 2,
      allowHorizontal: true,
      allowVertical: true,
      ownerOnly: true,
    },
    createsBuildingType: "production_wood",
  },

  quarry: {
    key: "quarry",
    name: "Carrière",
    era: 1,
    category: "building",
    subCategory: "production",
    cost: {},
    text: "+2 🧱 de base. +1 🧱 pour chaque citoyen actif.",
    placement: {
      mode: "green_pair",
      size: 2,
      allowHorizontal: true,
      allowVertical: true,
      ownerOnly: true,
    },
    createsBuildingType: "production_stone",
  },

  foundry: {
    key: "foundry",
    name: "Fonderie",
    era: 1,
    category: "building",
    subCategory: "production",
    cost: {},
    text: "+2 ⛓️ de base. +1 ⛓️ pour chaque citoyen actif.",
    placement: {
      mode: "green_pair",
      size: 2,
      allowHorizontal: true,
      allowVertical: true,
      ownerOnly: true,
    },
    createsBuildingType: "production_metal",
  },

  barracks_1: {
    key: "barracks_1",
    name: "Caserne I",
    era: 1,
    category: "building",
    subCategory: "military",
    cost: { metal: 3 },
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

  market: {
    key: "market",
    name: "Marché",
    era: 1,
    category: "building",
    subCategory: "economy",
    cost: { wood: 1, stone: 1, metal: 1 },
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
    name: "École",
    era: 1,
    category: "building",
    subCategory: "science",
    cost: { wood: 1, stone: 1, metal: 1 },
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
};

export const INITIAL_HANDS = {
  player1: ["house", "field", "lumber_camp", "quarry", "foundry", "barracks_1", "market", "school"],
  player2: ["house", "field", "lumber_camp", "quarry", "foundry", "barracks_1", "market", "school"],
};
