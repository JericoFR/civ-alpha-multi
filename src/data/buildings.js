export const BUILDING_DEFS = {
  townhall: {
    key: "townhall",
    name: "Hôtel de Ville",
    housing: 2,
    cost: {},
    height: 2,
  },

  house: {
    key: "house",
    name: "Chaumière",
    housing: 3,
    cost: { gold: 3 },
    height: 2,
  },

  production_food: {
    key: "production_food",
    name: "Champ",
    resource: "food",
    productionBase: 2,
    productionWorkerBonus: 1,
    cost: {},
    height: 2,
  },

  production_gold: {
  key: "production_gold",
  name: "Mine d’or",
  resource: "gold",
  productionBase: 2,
  productionWorkerBonus: 1,
  cost: {},
  height: 2,
},

  barracks_1: {
    key: "barracks_1",
    name: "Caserne I",
    cost: { gold: 3 },
    height: 2,
  },

  market: {
    key: "market",
    name: "Marché",
    cost: { gold: 3 },
    height: 2,
  },

  school: {
    key: "school",
    name: "École",
    sciencePerWorker: 1,
    cost: { gold: 3 },
    height: 2,
  },
};

export function getBuildingDef(buildingOrType) {
  if (!buildingOrType) return null;

  if (typeof buildingOrType === "string") {
    return BUILDING_DEFS[buildingOrType] ?? null;
  }

  if (buildingOrType.type && BUILDING_DEFS[buildingOrType.type]) {
    return BUILDING_DEFS[buildingOrType.type];
  }

  if (buildingOrType.key && BUILDING_DEFS[buildingOrType.key]) {
    return BUILDING_DEFS[buildingOrType.key];
  }

  return null;
}

export const INITIAL_BUILDINGS = [
  { id: "p1-townhall", player: 1, type: "townhall", x: 6, y: 0, orientation: "vertical", size: 2 },
  { id: "p1-house", player: 1, type: "house", x: 6, y: 2, orientation: "vertical", size: 2 },
  { id: "p1-food", player: 1, type: "production_food", x: 4, y: 0, orientation: "vertical", size: 2 },
  { id: "p1-gold", player: 1, type: "production_gold", x: 8, y: 0, orientation: "vertical", size: 2 },

  { id: "p2-townhall", player: 2, type: "townhall", x: 6, y: 17, orientation: "vertical", size: 2 },
  { id: "p2-house", player: 2, type: "house", x: 6, y: 15, orientation: "vertical", size: 2 },
  { id: "p2-food", player: 2, type: "production_food", x: 4, y: 17, orientation: "vertical", size: 2 },
  { id: "p2-gold", player: 2, type: "production_gold", x: 8, y: 17, orientation: "vertical", size: 2 },
];