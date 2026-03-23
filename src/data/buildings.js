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
    cost: { wood: 3 },
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

  production_wood: {
    key: "production_wood",
    name: "Camp de bûcheron",
    resource: "wood",
    productionBase: 2,
    productionWorkerBonus: 1,
    cost: {},
    height: 2,
  },

  production_stone: {
    key: "production_stone",
    name: "Carrière",
    resource: "stone",
    productionBase: 2,
    productionWorkerBonus: 1,
    cost: {},
    height: 2,
  },

  production_metal: {
    key: "production_metal",
    name: "Fonderie",
    resource: "metal",
    productionBase: 2,
    productionWorkerBonus: 1,
    cost: {},
    height: 2,
  },

  barracks_1: {
    key: "barracks_1",
    name: "Caserne I",
    cost: { metal: 3 },
    height: 2,
  },

  market: {
    key: "market",
    name: "Marché",
    cost: { wood: 1, stone: 1, metal: 1 },
    height: 2,
  },

  school: {
    key: "school",
    name: "École",
    sciencePerWorker: 1,
    cost: { wood: 1, stone: 1, metal: 1 },
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
  { id: "p1-food", player: 1, type: "production_food", x: 2, y: 0, orientation: "vertical", size: 2 },
  { id: "p1-wood", player: 1, type: "production_wood", x: 4, y: 0, orientation: "vertical", size: 2 },
  { id: "p1-stone", player: 1, type: "production_stone", x: 8, y: 0, orientation: "vertical", size: 2 },
  { id: "p1-metal", player: 1, type: "production_metal", x: 10, y: 0, orientation: "vertical", size: 2 },

  { id: "p2-townhall", player: 2, type: "townhall", x: 6, y: 17, orientation: "vertical", size: 2 },
  { id: "p2-house", player: 2, type: "house", x: 6, y: 15, orientation: "vertical", size: 2 },
  { id: "p2-food", player: 2, type: "production_food", x: 2, y: 17, orientation: "vertical", size: 2 },
  { id: "p2-wood", player: 2, type: "production_wood", x: 4, y: 17, orientation: "vertical", size: 2 },
  { id: "p2-stone", player: 2, type: "production_stone", x: 8, y: 17, orientation: "vertical", size: 2 },
  { id: "p2-metal", player: 2, type: "production_metal", x: 10, y: 17, orientation: "vertical", size: 2 },
];