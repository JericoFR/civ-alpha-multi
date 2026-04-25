import { useEffect, useMemo, useState } from "react";
import Board from "../../components/Board";
import { CARD_DEFS, getPrimaryCardImage } from "../../data/cards";
import { buildPressureMap } from "../../logic/pressure";
import { canMoveTo, getReachableCells } from "../../logic/movement";

const STARTING_SETUP_CARDS = [
  {
    key: "townhall_setup",
    name: "Hôtel de Ville",
    icon: "🏛️",
    cost: "départ",
    text: "Ton bâtiment central. Il sert de base pour installer ton camp.",
  },
  {
    key: "field",
    name: "Champ",
    icon: "🌾",
    cost: "départ",
    text: "Bâtiment de production : il produit de la nourriture.",
  },
  {
    key: "gold_mine",
    name: "Mine d’or",
    icon: "💰",
    cost: "départ",
    text: "Bâtiment de production : il produit de l’or.",
  },
  {
    key: "house_start",
    name: "Chaumière de départ",
    icon: "🏠",
    cost: "départ",
    text: "Premier logement posé à l’installation. L’autre Chaumière sera posée au tuto 2.",
  },
];

const STARTING_SETUP_BUILDINGS = [
  {
    id: "arena-townhall-start",
    type: "townhall",
    sourceCardKey: "townhall_setup",
    player: 1,
    x: 6,
    y: 0,
    orientation: "vertical",
    size: 2,
    isActive: true,
    isBurning: false,
  },
  {
    id: "arena-field-start",
    type: "production_food",
    sourceCardKey: "field",
    player: 1,
    x: 4,
    y: 0,
    orientation: "vertical",
    size: 2,
    isActive: true,
    isBurning: false,
  },
  {
    id: "arena-gold-start",
    type: "production_gold",
    sourceCardKey: "gold_mine",
    player: 1,
    x: 8,
    y: 0,
    orientation: "vertical",
    size: 2,
    isActive: true,
    isBurning: false,
  },
  {
    id: "arena-house-start",
    type: "house",
    sourceCardKey: "house",
    player: 1,
    x: 6,
    y: 2,
    orientation: "vertical",
    size: 2,
    isActive: true,
    isBurning: false,
  },
];

const VERTICAL_SLOT = {
  id: "vertical-green-slot",
  label: "Emplacement vertical",
  orientation: "vertical",
  x: 2,
  y: 2,
  cells: [
    { x: 2, y: 2 },
    { x: 2, y: 3 },
  ],
};

const BARRACKS_SLOT = {
  id: "barracks-green-slot",
  label: "Emplacement Caserne",
  orientation: "vertical",
  x: 4,
  y: 2,
  cells: [
    { x: 4, y: 2 },
    { x: 4, y: 3 },
  ],
};

const REPAIR_TARGET_SLOT = {
  id: "repair-target-slot",
  label: "Bâtiment en feu",
  orientation: "vertical",
  x: 10,
  y: 2,
  cells: [
    { x: 10, y: 2 },
    { x: 10, y: 3 },
  ],
};

const PERSONAL_MARKET_SLOT = {
  id: "personal-market-slot",
  label: "Marché personnel",
  orientation: "vertical",
  x: 10,
  y: 2,
  cells: [
    { x: 10, y: 2 },
    { x: 10, y: 3 },
  ],
};

const ECONOMY_START_RESOURCES = {
  food: 5,
  gold: 5,
  vp: 0,
};

const BUY_TUTORIAL_START_RESOURCES = {
  food: 7,
  gold: 3,
};

const MINI_TUTORIAL_START_RESOURCES = {
  food: 8,
  gold: 8,
  vp: 0,
};

const MINI_TUTORIAL_PHASES = [
  { key: "turn1_player1_place", title: "Tour 1 — Phase J1 : poser", detail: "Choisis École ou Caserne, puis pose le bâtiment sur un emplacement vert." },
  { key: "turn1_player1_worker", title: "Tour 1 — Phase J1 : ouvrier", detail: "Déplace ton ouvrier dans le bâtiment que tu viens de poser pour l’activer." },
  { key: "turn1_player2_ai", title: "Tour 1 — Phase J2 IA", detail: "J2 joue automatiquement : son ouvrier va dans sa Mine d’or." },
  { key: "turn1_military_j1", title: "Tour 1 — Mouvement militaire J1", detail: "Déplace réellement ton soldat vers le centre." },
  { key: "turn1_military_j2_ai", title: "Tour 1 — Mouvement militaire J2 IA", detail: "J2 avance automatiquement son soldat vers le centre." },
  { key: "turn1_resolve", title: "Tour 1 — Résolution militaire", detail: "Clique pour résoudre la pression. Ici, aucune unité ne meurt." },
  { key: "turn1_buy", title: "Tour 1 — Achats", detail: "Achète réellement un ouvrier ou, si ta Caserne est active, un soldat." },
  { key: "turn1_economy", title: "Tour 1 — Économie", detail: "Pas de marché actif : tu passes l’économie et gardes tes ressources." },
  { key: "turn1_production", title: "Tour 1 — Production", detail: "Clique pour produire les ressources de tes bâtiments actifs." },
  { key: "turn1_science", title: "Tour 1 — Science", detail: "Si tu as choisi l’École et qu’un ouvrier l’active, regarde une prochaine carte." },
  { key: "turn2_player1", title: "Tour 2 — Phase J1", detail: "Le tour 2 commence : la boucle de jeu repart sur la phase joueur." },
];

const MINI_TUTORIAL_J2_BUILDINGS = [
  {
    id: "arena-j2-townhall-start",
    type: "townhall",
    sourceCardKey: "townhall_setup",
    player: 2,
    x: 6,
    y: 17,
    orientation: "vertical",
    size: 2,
    isActive: true,
    isBurning: false,
  },
  {
    id: "arena-j2-field-start",
    type: "production_food",
    sourceCardKey: "field",
    player: 2,
    x: 4,
    y: 17,
    orientation: "vertical",
    size: 2,
    isActive: true,
    isBurning: false,
  },
  {
    id: "arena-j2-gold-start",
    type: "production_gold",
    sourceCardKey: "gold_mine",
    player: 2,
    x: 8,
    y: 17,
    orientation: "vertical",
    size: 2,
    isActive: true,
    isBurning: false,
  },
  {
    id: "arena-j2-house-start",
    type: "house",
    sourceCardKey: "house",
    player: 2,
    x: 6,
    y: 15,
    orientation: "vertical",
    size: 2,
    isActive: true,
    isBurning: false,
  },
];

const MINI_TUTORIAL_CARD_SLOTS = {
  school: VERTICAL_SLOT,
  barracks_1: BARRACKS_SLOT,
};

const PHASE_TUTORIAL_STEPS = [
  {
    key: "player",
    title: "1. Phase Joueur",
    detail: "Tu poses tes cartes, tu organises ton camp et tu déplaces tes ouvriers. C’est la phase de préparation.",
  },
  {
    key: "military_move",
    title: "2. Mouvement militaire",
    detail: "Les unités militaires se déplacent en alternance. Le placement prépare la pression, mais rien ne meurt encore.",
  },
  {
    key: "military_resolve",
    title: "3. Résolution militaire",
    detail: "On applique la pression. Les unités et bâtiments menacés sont détruits ou passent en feu selon leurs seuils.",
  },
  {
    key: "buy",
    title: "4. Achats",
    detail: "Tu dépenses nourriture et or pour acheter ouvriers et unités, selon tes bâtiments actifs et ton logement.",
  },
  {
    key: "economy",
    title: "5. Économie",
    detail: "Tu peux convertir des ressources en PV via ton marché personnel ou le marché central. Le choix est verrouillant.",
  },
  {
    key: "production",
    title: "6. Production",
    detail: "Tes bâtiments actifs produisent leurs ressources. Les ouvriers dans les bâtiments améliorent cette production.",
  },
  {
    key: "science",
    title: "7. Science",
    detail: "La science donne de l’information et du contrôle sur les cartes Points et Événement. Elle ne produit pas de stock, elle donne un avantage de lecture et de manipulation.",
  },
];

const SITUATION_TUTORIAL_CARDS = [
  {
    key: "point_center_domination",
    name: "Carte de points — Domination du Centre",
    icon: "🏆",
    cost: "en place",
    category: "points",
    text: "Donne des PV selon une condition commune. Exemple : gagner des PV si tu contrôles le marché central.",
  },
  {
    key: "event_abundance",
    name: "Carte d’événement — Abondance",
    icon: "🌾",
    cost: "en place",
    category: "event",
    text: "Modifie une règle pour les deux joueurs. Exemple : les bâtiments de production produisent davantage.",
  },
];

const CENTRAL_MARKET_CELL = { x: 6, y: 9 };
const CENTRAL_MARKET_CELLS = [
  { x: 6, y: 8 },
  { x: 5, y: 9 },
  { x: 6, y: 9 },
  { x: 7, y: 9 },
  { x: 6, y: 10 },
];

const UNIT_TUTORIAL_DEFS = {
  worker: {
    name: "Ouvrier",
    icon: "👷",
    movePoints: 2,
    pressure: "Aucune pression militaire.",
    fragility: "Meurt sous 1 pression ennemie.",
    role: "Active les bâtiments, améliore la production et permet certaines actions.",
  },
  soldier: {
    name: "Soldat",
    icon: "⚔️",
    movePoints: 2,
    pressure: "Pression en croix : sa case + les 4 cases orthogonales.",
    fragility: "Meurt sous 2 pressions ennemies.",
    role: "Unité de base pour contrôler le terrain et menacer les unités proches.",
  },
  archer: {
    name: "Archer",
    icon: "🏹",
    movePoints: 2,
    pressure: "Pression directionnelle : sa case + 2 cases devant lui.",
    fragility: "Meurt sous 2 pressions ennemies.",
    role: "Unité de positionnement : forte si elle est bien orientée, faible si elle est contournée.",
  },
  cavalry: {
    name: "Cavalerie",
    icon: "🐎",
    movePoints: 3,
    pressure: "Pression en croix comme le soldat, mais avec plus de mobilité.",
    fragility: "Meurt sous 2 pressions ennemies.",
    role: "Unité rapide pour prendre une position, menacer un flanc ou atteindre le centre.",
  },
  siege: {
    name: "Siège",
    icon: "🛡️",
    movePoints: 2,
    pressure: "Pression directionnelle contre les bâtiments. Fragile contre les unités.",
    fragility: "Meurt sous 1 pression ennemie.",
    role: "Unité spécialisée pour brûler les bâtiments, pas pour tenir seule le terrain.",
  },
};

const TUTORIAL_UNIT_POSITIONS = [
  { id: "arena-unit-worker", type: "worker", player: 1, x: 2, y: 6 },
  { id: "arena-unit-soldier", type: "soldier", player: 1, x: 4, y: 6 },
  { id: "arena-unit-archer", type: "archer", player: 1, x: 6, y: 6, direction: "down" },
  { id: "arena-unit-cavalry", type: "cavalry", player: 1, x: 8, y: 6 },
  { id: "arena-unit-siege", type: "siege", player: 1, x: 10, y: 6, direction: "down" },
];

const PRESSURE_TUTORIAL_UNITS = [
  { id: "pressure-soldier-left", type: "soldier", player: 1, x: 5, y: 8 },
  { id: "pressure-soldier-right", type: "soldier", player: 1, x: 7, y: 8 },
  { id: "pressure-enemy-soldier", type: "soldier", player: 2, x: 6, y: 8 },
  { id: "pressure-enemy-worker", type: "worker", player: 2, x: 5, y: 9 },
];

const PRESSURE_TARGET_IDS = ["pressure-enemy-worker", "pressure-enemy-soldier"];


const MILITARY_RESOLUTION_UNITS_BEFORE = [
  { id: "resolution-left-pressure", type: "soldier", player: 1, x: 2, y: 8 },
  { id: "resolution-right-pressure", type: "soldier", player: 1, x: 4, y: 8 },
  { id: "resolution-stack-soldier", type: "soldier", player: 2, x: 3, y: 8 },
  { id: "resolution-stack-worker", type: "worker", player: 2, x: 3, y: 8 },
  { id: "resolution-center-left", type: "soldier", player: 1, x: 5, y: 8 },
  { id: "resolution-center-right", type: "soldier", player: 1, x: 7, y: 8 },
  { id: "resolution-center-enemy", type: "soldier", player: 2, x: 6, y: 8 },
  { id: "resolution-building-left", type: "soldier", player: 1, x: 9, y: 8 },
  { id: "resolution-building-top", type: "soldier", player: 1, x: 10, y: 7 },
  { id: "resolution-building-right", type: "soldier", player: 1, x: 11, y: 8 },
  { id: "resolution-protected-worker", type: "worker", player: 2, x: 10, y: 8 },
];

const MILITARY_RESOLUTION_UNITS_AFTER = MILITARY_RESOLUTION_UNITS_BEFORE.filter(
  (unit) => !["resolution-stack-soldier", "resolution-center-enemy"].includes(unit.id)
);

const MILITARY_RESOLUTION_BUILDING_BEFORE = {
  id: "resolution-protection-building",
  type: "house",
  sourceCardKey: "house",
  player: 2,
  x: 10,
  y: 8,
  orientation: "vertical",
  size: 2,
  isActive: true,
  isBurning: false,
};

const MILITARY_RESOLUTION_BUILDING_AFTER = {
  ...MILITARY_RESOLUTION_BUILDING_BEFORE,
  isActive: false,
  isBurning: true,
};

const RESOLUTION_PREDICTION_ITEMS = [
  {
    key: "centerSoldierDies",
    label: "Le soldat ennemi au centre meurt",
    correct: true,
    explanation: "Oui. Il reçoit 2 pressions ennemies, donc il atteint son seuil de destruction.",
  },
  {
    key: "stackSoldierDies",
    label: "Sur la case soldat + ouvrier, le soldat meurt",
    correct: true,
    explanation: "Oui. Une seule victime est choisie sur la case, et le soldat prend la priorité sur l’ouvrier.",
  },
  {
    key: "stackWorkerDies",
    label: "Sur la même case, l’ouvrier meurt aussi",
    correct: false,
    explanation: "Non. Maximum 1 mort par case : le soldat protège l’ouvrier pour cette résolution.",
  },
  {
    key: "protectedWorkerDies",
    label: "L’ouvrier dans le bâtiment brûlé meurt tout de suite",
    correct: false,
    explanation: "Non. Le bâtiment protège pendant la résolution en cours, même s’il passe en feu pendant cette même résolution.",
  },
  {
    key: "buildingBurns",
    label: "Le bâtiment de droite passe en feu",
    correct: true,
    explanation: "Oui. Il reçoit 3 pressions sur une de ses cases : il est désactivé et passe en feu.",
  },
];

const ADVANCED_RESOLUTION_UNITS_BEFORE = MILITARY_RESOLUTION_UNITS_AFTER;

const ADVANCED_RESOLUTION_UNITS_AFTER = ADVANCED_RESOLUTION_UNITS_BEFORE.filter(
  (unit) => !["resolution-stack-worker", "resolution-protected-worker"].includes(unit.id)
);

const ADVANCED_RESOLUTION_BUILDING_BEFORE = MILITARY_RESOLUTION_BUILDING_AFTER;
const ADVANCED_RESOLUTION_BUILDING_AFTER = MILITARY_RESOLUTION_BUILDING_AFTER;

const RESOLUTION_IV_UNITS_BEFORE = [
  { id: "resolution-iv-j1-target", type: "soldier", player: 1, x: 6, y: 8 },
  { id: "resolution-iv-j1-support", type: "soldier", player: 1, x: 5, y: 9 },
  { id: "resolution-iv-j2-target", type: "soldier", player: 2, x: 6, y: 9 },
  { id: "resolution-iv-j2-support", type: "soldier", player: 2, x: 7, y: 8 },
];

const RESOLUTION_IV_UNITS_AFTER = RESOLUTION_IV_UNITS_BEFORE.filter(
  (unit) => !["resolution-iv-j1-target", "resolution-iv-j2-target"].includes(unit.id)
);

const HOUSING_TUTORIAL_UNITS = [
  { id: "housing-worker-1", type: "worker", player: 1, x: 5, y: 2 },
  { id: "housing-worker-2", type: "worker", player: 1, x: 6, y: 2 },
  { id: "housing-soldier-1", type: "soldier", player: 1, x: 5, y: 3 },
  { id: "housing-soldier-2", type: "soldier", player: 1, x: 6, y: 3 },
];

function getUnitPressureThreshold(unit) {
  if (!unit) return null;
  if (unit.type === "worker" || unit.type === "siege") return 1;
  return 2;
}

function getPressureOnUnit(unit, pressureMap) {
  if (!unit) return 0;
  const entry = pressureMap?.[`${unit.x},${unit.y}`];
  if (!entry) return 0;
  return unit.player === 1 ? entry.player2 ?? 0 : entry.player1 ?? 0;
}

function isInsideArenaBoard(x, y) {
  return x >= 0 && x < 13 && y >= 0 && y < 19;
}

function isCentralMarketCell(x, y) {
  return CENTRAL_MARKET_CELLS.some((cell) => cell.x === x && cell.y === y);
}

function makePressureEntry(unit, cells) {
  const map = {};

  for (const cell of cells) {
    if (!isInsideArenaBoard(cell.x, cell.y)) continue;
    const key = `${cell.x},${cell.y}`;
    map[key] = unit.player === 1 ? { player1: 1, player2: 0 } : { player1: 0, player2: 1 };
  }

  return map;
}

function getTutorialPressureMapForUnit(unit) {
  if (!unit) return {};

  if (unit.type === "soldier" || unit.type === "cavalry") {
    return makePressureEntry(unit, [
      { x: unit.x, y: unit.y },
      { x: unit.x + 1, y: unit.y },
      { x: unit.x - 1, y: unit.y },
      { x: unit.x, y: unit.y + 1 },
      { x: unit.x, y: unit.y - 1 },
    ]);
  }

  if (unit.type === "archer" || unit.type === "siege") {
    const direction = unit.direction ?? "down";
    const delta =
      direction === "up"
        ? { x: 0, y: -1 }
        : direction === "left"
        ? { x: -1, y: 0 }
        : direction === "right"
        ? { x: 1, y: 0 }
        : { x: 0, y: 1 };

    return makePressureEntry(unit, [
      { x: unit.x, y: unit.y },
      { x: unit.x + delta.x, y: unit.y + delta.y },
      { x: unit.x + delta.x * 2, y: unit.y + delta.y * 2 },
    ]);
  }

  return {};
}

function getTutorialReachableCellsForUnit(unit) {
  const movePoints = UNIT_TUTORIAL_DEFS[unit?.type]?.movePoints ?? 0;
  if (!unit || movePoints <= 0) return [];

  const cells = [];

  for (let dx = -movePoints; dx <= movePoints; dx += 1) {
    for (let dy = -movePoints; dy <= movePoints; dy += 1) {
      const distance = Math.abs(dx) + Math.abs(dy);
      if (distance === 0 || distance > movePoints) continue;

      const x = unit.x + dx;
      const y = unit.y + dy;
      if (isInsideArenaBoard(x, y)) cells.push({ x, y });
    }
  }

  return cells;
}

const TUTORIALS = [
  {
    id: 1,
    title: "Tuto 1 — Installation du plateau",
    shortTitle: "Installation",
    objective: "Comprendre les 4 bâtiments présents au départ.",
    text: [
      "Avant de jouer une vraie partie de Civ Alpha, chaque joueur installe son camp sur son tapis.",
      "Une carte bâtiment n’est pas juste une carte en main : une fois posée, elle devient un bâtiment physique sur le plateau.",
      "Au départ, ton camp contient 4 cartes déjà installées : Hôtel de Ville, Champ, Mine d’or et une Chaumière.",
      "Chaque bâtiment occupe 2 cases du tapis. Les emplacements verts indiquent les zones constructibles du camp.",
      "Le Champ produit de la nourriture, la Mine d’or produit de l’or, la Chaumière donne du logement, et l’Hôtel de Ville représente ton centre de départ.",
      "Observe seulement cette installation. Au tuto 2, tu poseras toi-même l’autre Chaumière.",
    ],
    units: [],
    buildings: STARTING_SETUP_BUILDINGS,
    placementCells: [],
    cards: STARTING_SETUP_CARDS,
    showPressure: false,
    completionMode: "read",
  },
  {
    id: 2,
    title: "Tuto 2 — Poser une carte bâtiment",
    shortTitle: "Poser une carte",
    objective: "Poser une Chaumière sur un emplacement vertical de 2 cases.",
    text: [
      "Les emplacements verts du tapis indiquent où tu peux construire.",
      "Dans les règles de base actuelles, une carte bâtiment occupe 2 cases.",
      "Ici, l’emplacement valide est vertical : la Chaumière doit donc prendre exactement les 2 cases vertes indiquées.",
      "Clique sur l’emplacement vert pour jouer la carte et poser le bâtiment.",
    ],
    units: [],
    buildings: STARTING_SETUP_BUILDINGS,
    placementCells: VERTICAL_SLOT.cells,
    cards: ["house"],
    showPressure: false,
    completionMode: "place_house",
  },
  {
    id: 3,
    title: "Tuto 3 — Citoyens et économie",
    shortTitle: "Citoyens",
    objective: "Comprendre les PM du citoyen et le bonus économique dans un bâtiment.",
    text: [
      "Les ouvriers sont les unités civiles de Civ Alpha. Ils servent à activer ton économie et à améliorer tes bâtiments.",
      "Un ouvrier a 2 PM : quand tu le sélectionnes, les cases atteignables avec ses 2 points de mouvement s’affichent sur le plateau.",
      "L’économie de base repose sur deux ressources : nourriture 🌾 et or 💰. Les bâtiments de production donnent leurs ressources pendant la phase Production.",
      "Un Champ produit normalement +2 nourriture. Si un ouvrier est dans le Champ, il devient actif et le Champ produit +3 nourriture.",
      "Attention : un ouvrier est fragile. Il meurt sous 1 pression ennemie.",
      "La pression sera expliquée plus tard : c’est le cœur du système militaire de Civ Alpha.",
      "Action : sélectionne l’ouvrier, observe les cases disponibles, puis clique sur une case du Champ atteignable avec ses 2 PM.",
    ],
    units: [],
    buildings: STARTING_SETUP_BUILDINGS,
    placementCells: [],
    cards: ["field"],
    showPressure: false,
    completionMode: "worker_inside",
  },
  {
    id: 4,
    title: "Tuto 4 — Caserne et recrutement",
    shortTitle: "Recrutement",
    objective: "Poser une Caserne, y placer un ouvrier, puis recruter un soldat.",
    text: [
      "Le militaire ne commence pas par les unités : il commence par les bâtiments qui les débloquent.",
      "La Caserne I est une carte bâtiment militaire. Elle occupe 2 cases, comme les autres bâtiments de base.",
      "Une Caserne I permet de recruter Soldat et Archer, mais seulement si un ouvrier est actif dans ce bâtiment.",
      "Donc la chaîne de base est : poser la Caserne, déplacer un ouvrier dedans, puis recruter une unité.",
      "Dans ce tuto, pose la Caserne sur l’emplacement vert, déplace l’ouvrier dedans, puis recrute un Soldat.",
    ],
    units: [],
    buildings: STARTING_SETUP_BUILDINGS,
    placementCells: BARRACKS_SLOT.cells,
    cards: ["barracks_1"],
    showPressure: false,
    completionMode: "recruit_soldier",
  },
  {
    id: 5,
    title: "Tuto 5 — Types d’unités",
    shortTitle: "Unités",
    objective: "Comparer les unités : PM, rôle, fragilité et pression affichée sur le plateau.",
    text: [
      "Civ Alpha ne repose pas sur une seule unité militaire. Chaque type d’unité sert à contrôler le terrain différemment.",
      "Clique sur chaque unité du plateau pour afficher ses PM, ses cases atteignables et sa zone de pression quand elle en possède une.",
      "L’ouvrier n’est pas militaire : il active ton économie mais ne projette pas de pression.",
      "Le Soldat contrôle autour de lui. L’Archer contrôle une ligne devant lui. La Cavalerie va plus loin. Le Siège menace surtout les bâtiments.",
      "Ne cherche pas encore à résoudre un combat : ici, on observe seulement les outils. La pression sera expliquée en détail au tuto 6.",
    ],
    units: TUTORIAL_UNIT_POSITIONS,
    buildings: STARTING_SETUP_BUILDINGS,
    placementCells: [],
    cards: [],
    showPressure: true,
    completionMode: "unit_types",
  },
  {
    id: 6,
    title: "Tuto 6 — Pression",
    shortTitle: "Pression",
    objective: "Comprendre la pression, son addition et les seuils de destruction.",
    text: [
      "La pression est le cœur du combat dans Civ Alpha. Une unité militaire ne lance pas un dé : elle contrôle des cases autour d’elle.",
      "La pression se cumule. Si deux Soldats menacent la même case, cette case reçoit 2 pressions.",
      "Les ouvriers sont détruits sous 1 pression ennemie. Les unités militaires classiques sont détruites sous 2 pressions ennemies.",
      "Sur le plateau, l’ouvrier ennemi est sous 1 pression : il serait détruit à la résolution militaire.",
      "Le soldat ennemi au centre est sous 2 pressions : il serait aussi détruit à la résolution militaire.",
      "Comme dans Civ Alpha, tu peux afficher ou masquer les halos de pression. C’est une aide de lecture : les règles restent les mêmes.",
      "Pour l’instant, on ne résout pas encore le combat. On apprend seulement à lire les zones de pression.",
      "Action : active ou désactive l’affichage si tu veux, puis clique sur l’ouvrier ennemi et le soldat ennemi pour voir combien de pression ils subissent.",
    ],
    units: PRESSURE_TUTORIAL_UNITS,
    buildings: STARTING_SETUP_BUILDINGS,
    placementCells: [],
    cards: [],
    showPressure: true,
    completionMode: "pressure",
  },
  {
    id: 7,
    title: "Tuto 7 — Bâtiments en feu et réparation",
    shortTitle: "Réparation",
    objective: "Comprendre qu’un bâtiment en feu est désactivé et qu’un ouvrier peut le réparer.",
    text: [
      "Quand un bâtiment reçoit assez de pression ennemie, il n’est pas retiré du plateau : il passe en feu.",
      "Un bâtiment en feu ne produit plus, ne protège plus les unités et ne donne plus son effet tant qu’il n’est pas réparé.",
      "Pour réparer, tu dois amener un ouvrier actif dans le bâtiment et payer son coût de réparation.",
      "Dans ce tuto, le bâtiment à droite est en feu. Déplace l’ouvrier dedans, puis clique sur Réparer.",
      "La réparation réactive le bâtiment : il peut de nouveau produire, protéger et compter pour tes effets.",
    ],
    units: [],
    buildings: STARTING_SETUP_BUILDINGS,
    placementCells: [],
    cards: [],
    showPressure: false,
    completionMode: "repair_building",
  },
  {
    id: 8,
    title: "Tuto 8 — Logement et limite d’unités",
    shortTitle: "Logement",
    objective: "Comprendre que les ouvriers et unités militaires occupent du logement.",
    text: [
      "Dans Civ Alpha, tu ne peux pas empiler une armée infinie : chaque ouvrier et chaque unité militaire occupe 1 logement.",
      "Les Chaumières donnent du logement. Dans cette situation, tu as 2 Chaumières actives : elles fournissent assez de place pour tes unités.",
      "Si une Chaumière passe en feu, elle ne donne plus son logement tant qu’elle n’est pas réparée.",
      "Quand ton nombre d’unités dépasse ton logement disponible, tu dois sacrifier une unité ou un ouvrier.",
      "Action : mets une Chaumière en feu, observe la baisse de logement, puis choisis une unité à sacrifier pour revenir dans la limite.",
    ],
    units: [],
    buildings: STARTING_SETUP_BUILDINGS,
    placementCells: [],
    cards: ["house"],
    showPressure: false,
    completionMode: "housing",
  },

  {
    id: 9,
    title: "Tuto 9 — Économie avancée et marchés",
    shortTitle: "Marchés",
    objective: "Comprendre le marché personnel, le marché central et la conversion en PV.",
    text: [
      "Produire des ressources ne suffit pas : pour gagner, tu dois convertir une partie de ton économie en points de victoire.",
      "Le Marché personnel est un bâtiment que tu poses dans ton camp, sur un emplacement vert valide.",
      "Avec un ouvrier actif, il permet de convertir 5 ressources identiques en 1 PV.",
      "Le Marché central est au milieu du plateau. Il est plus risqué, mais donne +1 PV bonus une fois par tour.",
      "Pendant la phase Économie, tu dois choisir : marché personnel OU central.",
      "Dans ce tuto, observe la différence : personnel = sûr, central = plus rentable mais exposé.",
    ],
    units: [],
    buildings: STARTING_SETUP_BUILDINGS,
    placementCells: [],
    cards: ["market"],
    showPressure: false,
    completionMode: "economy_conversion",
  },
  {
    id: 10,
    title: "Tuto 10 — Contrôle du centre",
    shortTitle: "Centre",
    objective: "Comprendre comment contrôler le centre du plateau.",
    text: [
      "Le centre du plateau est une zone clé de Civ Alpha. Il correspond aux cases orange.",
      "Pour contrôler le centre, il faut au moins une de tes unités dessus et aucune unité ennemie.",
      "Dans cette situation, ton unité est seule au centre : tu contrôles donc le centre.",
      "Si une unité ennemie entre dans le centre, tu perds immédiatement le contrôle.",
      "Le contrôle du centre est important, notamment pour le marché central qui donne un bonus de PV.",
      "Action : clique sur l’unité ennemie pour la faire entrer au centre et observer la perte de contrôle.",
    ],
    units: [],
    buildings: STARTING_SETUP_BUILDINGS,
    placementCells: [],
    cards: [],
    showPressure: false,
    completionMode: "center_control",
  },
  {
    id: 11,
    title: "Tuto 11 — Achats",
    shortTitle: "Achats",
    objective: "Comprendre l’achat des ouvriers et des unités, avec coûts et conditions.",
    text: [
      "Construire un bâtiment et acheter une unité sont deux actions différentes.",
      "Un ouvrier s’achète avec de la nourriture. Il occupe ensuite 1 logement.",
      "Une unité militaire coûte de la nourriture et de l’or. Elle occupe aussi 1 logement.",
      "Pour recruter un Soldat ou un Archer, il faut une Caserne I active avec un ouvrier actif dedans.",
      "Certaines unités avancées, comme la Cavalerie ou le Siège, demandent une Caserne plus avancée : tu ne peux donc pas tout acheter dès le départ.",
      "Action : tente l’achat bloqué, puis achète un ouvrier et un soldat pour compléter la boucle d’achat.",
    ],
    units: [],
    buildings: STARTING_SETUP_BUILDINGS,
    placementCells: [],
    cards: [],
    showPressure: false,
    completionMode: "buy_complete",
  },
  {
    id: 12,
    title: "Tuto 12 — Phases du tour",
    shortTitle: "Phases",
    objective: "Comprendre l’ordre d’un tour et pourquoi chaque action arrive au bon moment.",
    text: [
      "Civ Alpha n’est pas un jeu où tout se fait quand tu veux. Le tour est découpé en phases.",
      "Cet ordre empêche les actions confuses : tu prépares, tu te places, tu résous, puis tu achètes, convertis et produis.",
      "Chaque phase a un rôle précis. Comprendre l’ordre du tour permet d’anticiper au lieu de seulement réagir.",
      "Action : avance phase par phase et lis ce que chaque moment autorise.",
    ],
    units: [],
    buildings: STARTING_SETUP_BUILDINGS,
    placementCells: [],
    cards: [],
    showPressure: false,
    completionMode: "phase_flow",
  },
  {
    id: 13,
    title: "Tuto 13 — Résolution militaire passive",
    shortTitle: "Résolution I",
    objective: "Observer une résolution complète sans faire de choix.",
    text: [
      "La pression ne tue pas immédiatement pendant le mouvement. Elle est appliquée pendant la résolution militaire.",
      "Cette résolution est simultanée : une unité détruite projette encore sa pression jusqu’à la fin de cette résolution.",
      "Il y a aussi une règle anti-nettoyage : maximum 1 mort par case.",
      "Si un soldat et un ouvrier partagent une case, le soldat prend la mort en priorité et protège l’ouvrier pour cette résolution.",
      "Un bâtiment actif protège les unités qu’il abrite pendant la résolution en cours, même si ce bâtiment passe en feu au même moment.",
      "Action : clique sur Résoudre pour observer exactement ce qui change.",
    ],
    units: [],
    buildings: STARTING_SETUP_BUILDINGS,
    placementCells: [],
    cards: [],
    showPressure: true,
    completionMode: "resolution_passive",
  },
  {
    id: 14,
    title: "Tuto 14 — Prédire la résolution",
    shortTitle: "Résolution II",
    objective: "Identifier les morts et le bâtiment qui passe en feu avant de résoudre.",
    text: [
      "Même situation, mais cette fois tu dois prédire le résultat avant de lancer la résolution.",
      "Ne réponds pas seulement avec les seuils. Vérifie aussi les exceptions : maximum 1 mort par case, priorité du soldat, protection par bâtiment.",
      "Une réponse intuitive peut être fausse ici : l’ouvrier sous un bâtiment menacé ne meurt pas tout de suite si le bâtiment était encore actif au début de la résolution.",
      "Action : coche les affirmations vraies, puis valide ta prédiction.",
    ],
    units: [],
    buildings: STARTING_SETUP_BUILDINGS,
    placementCells: [],
    cards: [],
    showPressure: true,
    completionMode: "resolution_quiz",
  },
  {
    id: 15,
    title: "Tuto 15 — Résolution suivante",
    shortTitle: "Résolution III",
    objective: "Comprendre que les protections de résolution ne durent qu’un tour.",
    text: [
      "On reprend la situation après la résolution précédente : certains éléments ont survécu, mais seulement temporairement.",
      "Le soldat empilé est mort, donc l’ouvrier qui était sur sa case n’est plus protégé par lui.",
      "Le bâtiment de droite est maintenant en feu : il ne protège plus l’ouvrier qui est encore dedans.",
      "Les pressions ennemies sont toujours présentes. À la résolution suivante, les survivants exposés peuvent donc mourir.",
      "Action : lance la résolution suivante et observe ce qui disparaît.",
    ],
    units: [],
    buildings: STARTING_SETUP_BUILDINGS,
    placementCells: [],
    cards: [],
    showPressure: true,
    completionMode: "advanced_resolution",
  },
  {
    id: 16,
    title: "Tuto 16 — Pression conservée",
    shortTitle: "Résolution IV",
    objective: "Voir un combat 2v2 où chaque camp perd 1 soldat car les morts projettent encore leur pression.",
    text: [
      "Ici, les 4 soldats forment un petit combat 2v2.",
      "Le soldat J1 au centre haut reçoit 2 pressions : le soldat J2 en dessous et le soldat J2 à droite.",
      "Le soldat J2 au centre bas reçoit aussi 2 pressions : le soldat J1 au-dessus et le soldat J1 à gauche.",
      "Point important : même si ces deux soldats meurent, leur pression compte encore jusqu’à la fin de cette résolution.",
      "Résultat attendu : 1 mort côté J1 et 1 mort côté J2. Les deux soutiens survivent car ils ne reçoivent qu’une seule pression.",
      "Action : clique sur Résoudre le 2v2.",
    ],
    units: [],
    buildings: STARTING_SETUP_BUILDINGS,
    placementCells: [],
    cards: [],
    showPressure: true,
    completionMode: "resolution_iv",
  },
  {
    id: 17,
    title: "Tuto 17 — Cartes de points et d’événement",
    shortTitle: "Cartes",
    objective: "Comprendre les deux cartes en place et leur effet concret sur la partie.",
    text: [
      "Civ Alpha utilise deux cartes visibles par les deux joueurs : une carte de points et une carte d’événement.",
      "La carte de points indique une manière de gagner des PV. Elle oriente les objectifs de la partie.",
      "La carte d’événement modifie une règle commune. Elle change le contexte de jeu pour les deux camps.",
      "Ces cartes restent en place tant qu’elles ne sont pas remplacées.",
      "Exemple : contrôler le centre peut donner des PV, et une carte d’événement peut améliorer toute la production.",
      "Action : visualise les effets des cartes en place pour comprendre pourquoi elles changent tes priorités.",
    ],
    units: [],
    buildings: STARTING_SETUP_BUILDINGS,
    placementCells: [],
    cards: [],
    showPressure: false,
    completionMode: "cards_effects",
  },
  {
    id: 18,
    title: "Tuto 18 — Science",
    shortTitle: "Science",
    objective: "Comprendre la comparaison stricte, l’égalité et l’information privée.",
    text: [
      "La science permet d’anticiper et d’influencer les cartes de points et d’événement.",
      "Seul le joueur qui a strictement plus de science gagne l’avantage.",
      "En cas d’égalité, personne ne gagne l’effet scientifique.",
      "Le joueur qui gagne peut regarder une prochaine carte de points ou d’événement.",
      "Cette information est privée : l’adversaire ne sait pas forcément ce que tu as vu.",
      "La science ne donne pas de ressources directement. Elle donne de meilleures décisions.",
    ],
    units: [],
    buildings: STARTING_SETUP_BUILDINGS,
    placementCells: [],
    cards: ["school"],
    showPressure: false,
    completionMode: "science_peek",
  },
  {
    id: 19,
    title: "Tuto 19 — Victoire et scoring",
    shortTitle: "Scoring",
    objective: "Comprendre les grandes sources de PV : économie, militaire et construction.",
    text: [
      "Toutes les mécaniques servent une chose : créer des points de victoire.",
      "Tu peux marquer par l’économie, par la construction, par le militaire, et par les cartes de points en place.",
      "Le but n’est pas de tout faire. Le but est de lire quelle source de points est la plus rentable dans la situation actuelle.",
      "Action : avance les exemples pour voir comment les différentes sources ajoutent des PV.",
    ],
    units: [],
    buildings: STARTING_SETUP_BUILDINGS,
    placementCells: [],
    cards: [],
    showPressure: false,
    completionMode: "scoring",
    },
  {
    id: 20,
    title: "Tuto 20 — Tour 1 guidé",
    shortTitle: "Tour guidé",
    objective: "Jouer le tour 1 complet, avec J1 interactif et J2 automatisé, puis ouvrir la phase J1 du tour 2.",
    text: [
      "Tu vas maintenant jouer un vrai tour guidé, phase par phase.",
      "J1 est contrôlé par toi : tu poses une carte, tu déplaces tes unités, tu achètes, tu produis et tu résous les phases.",
      "J2 est joué automatiquement par une IA préparée à l’avance. Ses choix servent à montrer la boucle complète sans complexifier le tuto.",
      "Au début, deux choix seulement sont proposés : École ou Caserne. Ce choix change la fin du tour : science si École, recrutement militaire si Caserne.",
      "Le tuto couvre tout le tour 1, puis s’arrête au début de la première phase du tour 2.",
    ],
    units: [],
    buildings: STARTING_SETUP_BUILDINGS,
    placementCells: [],
    cards: ["school", "barracks_1"],
    showPressure: true,
    completionMode: "mini_game",
  }
];


function ActionButton({ children, onClick, disabled = false, tone = "neutral" }) {
  const background =
    tone === "primary" ? "#2563eb" : tone === "success" ? "#16a34a" : disabled ? "#475569" : "#334155";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: "none",
        borderRadius: 12,
        padding: "10px 14px",
        background,
        color: "white",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 700,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  );
}

function getArenaCard(cardEntry) {
  if (typeof cardEntry !== "string") {
    const sourceCard = cardEntry.key ? CARD_DEFS[cardEntry.key] : null;
    return {
      ...cardEntry,
      id: cardEntry.id ?? cardEntry.key,
      imageSrc: sourceCard ? getPrimaryCardImage(sourceCard) : cardEntry.imageSrc ?? null,
    };
  }

  const card = CARD_DEFS[cardEntry];
  if (!card) return null;

  return {
    key: cardEntry,
    id: card.id ?? card.key ?? cardEntry,
    name: card.name,
    icon:
      cardEntry === "house"
        ? "🏠"
        : cardEntry === "field"
        ? "🌾"
        : cardEntry === "gold_mine"
        ? "💰"
        : cardEntry === "barracks_1"
        ? "⚔️"
        : cardEntry === "market"
        ? "🏛️"
        : "🏛️",
    cost: card.cost,
    text: card.text,
    category: card.category,
    subCategory: card.subCategory,
    imageSrc: getPrimaryCardImage(card),
  };
}

function formatCost(cost) {
  if (!cost) return "gratuit";
  if (typeof cost === "string") return cost;

  const costParts = [];
  if (cost.food) costParts.push(`${cost.food} 🌾`);
  if (cost.gold) costParts.push(`${cost.gold} 💰`);
  return costParts.length > 0 ? costParts.join("  ") : "gratuit";
}

function CardMini({ cardEntry, selected = false, shiftPressed = false }) {
  const card = getArenaCard(cardEntry);
  const [hovered, setHovered] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  if (!card) return null;

  const isZoomed = hovered && shiftPressed;
  const isHovered = hovered && !shiftPressed;
  const imageSrc = card.imageSrc;
  const showImage = imageSrc && !imageFailed;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: isZoomed ? 250 : 150,
        minHeight: isZoomed ? 350 : 178,
        borderRadius: 14,
        border: selected ? "2px solid #facc15" : "1px solid rgba(255,255,255,0.16)",
        background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
        boxShadow: isZoomed
          ? "0 28px 55px rgba(0,0,0,0.55)"
          : selected
          ? "0 0 18px rgba(250,204,21,0.35)"
          : isHovered
          ? "0 20px 36px rgba(0,0,0,0.36)"
          : "0 10px 20px rgba(0,0,0,0.22)",
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        position: "relative",
        zIndex: isZoomed ? 80 : isHovered ? 30 : 1,
        transform: isHovered ? "scale(1.08)" : "scale(1)",
        transformOrigin: "center center",
        transition: "width 150ms ease, min-height 150ms ease, transform 150ms ease, box-shadow 150ms ease",
      }}
      title="Survole la carte. Maintiens Shift pour agrandir."
    >
      <div style={{ fontSize: 13, opacity: 0.7 }}>{card.category === "building" ? "Carte bâtiment" : "Carte"}</div>
      <div style={{ fontSize: isZoomed ? 20 : 17, fontWeight: 900 }}>{card.name}</div>
      <div
        style={{
          borderRadius: 10,
          background: "rgba(255,255,255,0.08)",
          minHeight: isZoomed ? 210 : 46,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          overflow: "hidden",
        }}
      >
        {showImage ? (
          <img
            src={imageSrc}
            alt={card.name}
            onError={() => setImageFailed(true)}
            style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <span>{card.icon}</span>
        )}
      </div>
      <div style={{ fontSize: 13, color: "#bfdbfe" }}>Coût : {formatCost(card.cost)}</div>
      <div style={{ fontSize: isZoomed ? 13 : 12, opacity: 0.75, lineHeight: 1.35 }}>{card.text}</div>
      {isZoomed ? <div style={{ marginTop: "auto", fontSize: 12, opacity: 0.62 }}>Zoom carte — relâche Shift pour revenir au format normal.</div> : null}
    </div>
  );
}

function CardsPanel({ cardKeys, selectedKey = null, title = "Cartes disponibles", shiftPressed = false }) {
  if (!cardKeys || cardKeys.length === 0) return null;

  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 14,
        overflow: "visible",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 900 }}>{title}</div>
        <div style={{ fontSize: 12, opacity: 0.65 }}>Survol + Shift = zoom</div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, overflow: "visible" }}>
        {cardKeys.map((cardEntry) => {
          const card = getArenaCard(cardEntry);
          if (!card) return null;
          return <CardMini key={card.key} cardEntry={cardEntry} selected={selectedKey === card.key} shiftPressed={shiftPressed} />;
        })}
      </div>
    </div>
  );
}

function createHouseBuilding(isBurning = false) {
  return {
    id: "arena-house",
    type: "house",
    sourceCardKey: "house",
    player: 1,
    x: VERTICAL_SLOT.x,
    y: VERTICAL_SLOT.y,
    orientation: "vertical",
    size: 2,
    isActive: !isBurning,
    isBurning: Boolean(isBurning),
  };
}

function createBarracksBuilding() {
  return {
    id: "arena-barracks",
    type: "barracks_1",
    sourceCardKey: "barracks_1",
    player: 1,
    x: BARRACKS_SLOT.x,
    y: BARRACKS_SLOT.y,
    orientation: "vertical",
    size: 2,
    isActive: true,
    isBurning: false,
  };
}

function createRepairTargetBuilding(isRepaired) {
  return {
    id: "arena-burning-field",
    type: "production_food",
    sourceCardKey: "field",
    player: 1,
    x: REPAIR_TARGET_SLOT.x,
    y: REPAIR_TARGET_SLOT.y,
    orientation: "vertical",
    size: 2,
    isActive: Boolean(isRepaired),
    isBurning: !isRepaired,
  };
}

function createPersonalMarketBuilding() {
  return {
    id: "arena-personal-market",
    type: "market",
    sourceCardKey: "market",
    player: 1,
    x: PERSONAL_MARKET_SLOT.x,
    y: PERSONAL_MARKET_SLOT.y,
    orientation: "vertical",
    size: 2,
    isActive: true,
    isBurning: false,
  };
}

function createSchoolBuilding() {
  return {
    id: "arena-school",
    type: "school",
    sourceCardKey: "school",
    player: 1,
    x: REPAIR_TARGET_SLOT.x,
    y: REPAIR_TARGET_SLOT.y,
    orientation: "vertical",
    size: 2,
    isActive: true,
    isBurning: false,
  };
}

function getMiniTutorialCardCost(cardKey) {
  const cost = CARD_DEFS[cardKey]?.cost;
  if (!cost || typeof cost === "string") return { food: 0, gold: 0 };
  return { food: cost.food ?? 0, gold: cost.gold ?? 0 };
}

function canAffordMiniCost(resources, cost) {
  return (resources.food ?? 0) >= (cost.food ?? 0) && (resources.gold ?? 0) >= (cost.gold ?? 0);
}

function payMiniCost(resources, cost) {
  return {
    ...resources,
    food: Math.max(0, (resources.food ?? 0) - (cost.food ?? 0)),
    gold: Math.max(0, (resources.gold ?? 0) - (cost.gold ?? 0)),
  };
}

function createMiniTutorialBuilding(cardKey) {
  const slot = MINI_TUTORIAL_CARD_SLOTS[cardKey];
  if (!slot) return null;

  return {
    id: "mini-" + cardKey,
    type: cardKey === "barracks_1" ? "barracks_1" : "school",
    sourceCardKey: cardKey,
    player: 1,
    x: slot.x,
    y: slot.y,
    orientation: slot.orientation,
    size: 2,
    isActive: true,
    isBurning: false,
  };
}

function isCellInsideBuilding(building, x, y) {
  const orientation = building.orientation ?? "vertical";
  const size = building.size ?? 2;

  for (let index = 0; index < size; index += 1) {
    const cellX = building.x + (orientation === "horizontal" ? index : 0);
    const cellY = building.y + (orientation === "vertical" ? index : 0);
    if (cellX === x && cellY === y) return true;
  }

  return false;
}

export default function Arena({ onBack }) {
  const [selectedTutorialId, setSelectedTutorialId] = useState(null);
  const [housePlaced, setHousePlaced] = useState(false);
  const [workerPosition, setWorkerPosition] = useState({ x: 3, y: 2 });
  const [workerInside, setWorkerInside] = useState(false);
  const [barracksPlaced, setBarracksPlaced] = useState(false);
  const [barracksWorkerInside, setBarracksWorkerInside] = useState(false);
  const [recruitedSoldier, setRecruitedSoldier] = useState(false);
  const [repairWorkerPosition, setRepairWorkerPosition] = useState({ x: 9, y: 2 });
  const [repairWorkerInside, setRepairWorkerInside] = useState(false);
  const [repairedBuilding, setRepairedBuilding] = useState(false);
  const [housingHouseBurning, setHousingHouseBurning] = useState(false);
  const [housingSacrificedUnitId, setHousingSacrificedUnitId] = useState(null);
  const [economyChoice, setEconomyChoice] = useState(null);
  const [economyResources, setEconomyResources] = useState(ECONOMY_START_RESOURCES);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [viewedUnitTypes, setViewedUnitTypes] = useState([]);
  const [viewedPressureTargetIds, setViewedPressureTargetIds] = useState([]);
  const [shiftPressed, setShiftPressed] = useState(false);
  const [pressureVisible, setPressureVisible] = useState(true);
  const [centerContested, setCenterContested] = useState(false);
  const [buyResources, setBuyResources] = useState(BUY_TUTORIAL_START_RESOURCES);
  const [buyBlockedTried, setBuyBlockedTried] = useState(false);
  const [buyWorkerBought, setBuyWorkerBought] = useState(false);
  const [buySoldierBought, setBuySoldierBought] = useState(false);
  const [phaseTutorialIndex, setPhaseTutorialIndex] = useState(0);
  const [resolutionPassiveResolved, setResolutionPassiveResolved] = useState(false);
  const [resolutionPredictions, setResolutionPredictions] = useState({});
  const [resolutionQuizChecked, setResolutionQuizChecked] = useState(false);
  const [advancedResolutionResolved, setAdvancedResolutionResolved] = useState(false);
  const [resolutionIvResolved, setResolutionIvResolved] = useState(false);
  const [cardEffectsViewed, setCardEffectsViewed] = useState(false);
  const [sciencePeekDone, setSciencePeekDone] = useState(false);
  const [scoringStep, setScoringStep] = useState(0);
  const [miniGameStep, setMiniGameStep] = useState(0);
  const [miniGameDone, setMiniGameDone] = useState(false);
  const [miniSelectedCard, setMiniSelectedCard] = useState(null);
  const [miniPlacedCard, setMiniPlacedCard] = useState(null);
  const [miniWorkerPosition, setMiniWorkerPosition] = useState({ x: 3, y: 2 });
  const [miniSoldierPosition, setMiniSoldierPosition] = useState({ x: 6, y: 6 });
  const [miniResources, setMiniResources] = useState(MINI_TUTORIAL_START_RESOURCES);
  const [miniBoughtWorker, setMiniBoughtWorker] = useState(false);
  const [miniBoughtSoldier, setMiniBoughtSoldier] = useState(false);
  const [miniProductionDone, setMiniProductionDone] = useState(false);
  const [miniScienceDone, setMiniScienceDone] = useState(false);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Shift") setShiftPressed(true);
      if (event.key?.toLowerCase() === "p") {
        setPressureVisible((visible) => !visible);
      }
    }

    function handleKeyUp(event) {
      if (event.key === "Shift") setShiftPressed(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const tutorial = TUTORIALS.find((item) => item?.id === selectedTutorialId) ?? null;

  const buildings = useMemo(() => {
    if (!tutorial) return [];

    const nextBuildings = [...STARTING_SETUP_BUILDINGS];

    if (tutorial.id === 20) {
      const miniBuilding = createMiniTutorialBuilding(miniPlacedCard);
      return [
        ...STARTING_SETUP_BUILDINGS,
        createHouseBuilding(false),
        ...MINI_TUTORIAL_J2_BUILDINGS,
        ...(miniBuilding ? [miniBuilding] : []),
      ];
    }

    if (housePlaced || tutorial.id >= 3) nextBuildings.push(createHouseBuilding(tutorial.id === 8 && housingHouseBurning));
    if (barracksPlaced || tutorial.id >= 5) nextBuildings.push(createBarracksBuilding());
    if (tutorial.id === 7) nextBuildings.push(createRepairTargetBuilding(repairedBuilding));
    if (tutorial.id === 9) nextBuildings.push(createPersonalMarketBuilding());
    if (tutorial.id === 13 || tutorial.id === 14) {
      nextBuildings.push(resolutionPassiveResolved && tutorial.id === 13 ? MILITARY_RESOLUTION_BUILDING_AFTER : MILITARY_RESOLUTION_BUILDING_BEFORE);
    }

    if (tutorial.id === 15) {
      nextBuildings.push(advancedResolutionResolved ? ADVANCED_RESOLUTION_BUILDING_AFTER : ADVANCED_RESOLUTION_BUILDING_BEFORE);
    }

    if (tutorial.id === 18) {
      nextBuildings.push(createSchoolBuilding());
    }

if (tutorial.id === 20) {
  nextBuildings.push(
    {
      id: "arena-j2-townhall-start",
      type: "townhall",
      sourceCardKey: "townhall_setup",
      player: 2,
      x: 6,
      y: 17,
      orientation: "vertical",
      size: 2,
      isActive: true,
      isBurning: false,
    },
    {
      id: "arena-j2-field-start",
      type: "production_food",
      sourceCardKey: "field",
      player: 2,
      x: 4,
      y: 17,
      orientation: "vertical",
      size: 2,
      isActive: true,
      isBurning: false,
    },
    {
      id: "arena-j2-gold-start",
      type: "production_gold",
      sourceCardKey: "gold_mine",
      player: 2,
      x: 8,
      y: 17,
      orientation: "vertical",
      size: 2,
      isActive: true,
      isBurning: false,
    },
    {
      id: "arena-j2-house-start",
      type: "house",
      sourceCardKey: "house",
      player: 2,
      x: 6,
      y: 15,
      orientation: "vertical",
      size: 2,
      isActive: true,
      isBurning: false,
    }
  );
}

    return nextBuildings;
  }, [tutorial, housePlaced, barracksPlaced, repairedBuilding, housingHouseBurning, resolutionPassiveResolved, advancedResolutionResolved, miniPlacedCard]);

  const units = useMemo(() => {
    if (!tutorial) return [];
    if (tutorial.id === 5) return TUTORIAL_UNIT_POSITIONS;
    if (tutorial.id === 6) return PRESSURE_TUTORIAL_UNITS;
    if (tutorial.id === 7) {
      return [{ id: "arena-repair-worker", type: "worker", player: 1, x: repairWorkerPosition.x, y: repairWorkerPosition.y }];
    }

    if (tutorial.id === 8) {
      return HOUSING_TUTORIAL_UNITS.filter((unit) => unit.id !== housingSacrificedUnitId);
    }

    if (tutorial.id === 9) {
      return [
        { id: "economy-personal-worker", type: "worker", player: 1, x: PERSONAL_MARKET_SLOT.x, y: PERSONAL_MARKET_SLOT.y },
        { id: "economy-central-worker", type: "worker", player: 1, x: CENTRAL_MARKET_CELL.x, y: CENTRAL_MARKET_CELL.y },
      ];
    }

    if (tutorial.id === 10) {
      return [
        { id: "center-ally", type: "soldier", player: 1, x: CENTRAL_MARKET_CELL.x, y: CENTRAL_MARKET_CELL.y },
        {
          id: "center-enemy",
          type: "soldier",
          player: 2,
          x: centerContested ? CENTRAL_MARKET_CELL.x + 1 : CENTRAL_MARKET_CELL.x + 2,
          y: CENTRAL_MARKET_CELL.y,
        },
      ];
    }

    if (tutorial.id === 11) {
      const nextUnits = [
        { id: "buy-active-worker", type: "worker", player: 1, x: BARRACKS_SLOT.x, y: BARRACKS_SLOT.y },
      ];

      if (buyWorkerBought) {
        nextUnits.push({ id: "buy-new-worker", type: "worker", player: 1, x: 6, y: 2 });
      }

      if (buySoldierBought) {
        nextUnits.push({ id: "buy-new-soldier", type: "soldier", player: 1, x: BARRACKS_SLOT.x, y: BARRACKS_SLOT.y + 1 });
      }

      return nextUnits;
    }

    if (tutorial.id === 12) {
      return [
        { id: "phase-worker", type: "worker", player: 1, x: 4, y: 2 },
        { id: "phase-soldier", type: "soldier", player: 1, x: 6, y: 6 },
        { id: "phase-enemy", type: "soldier", player: 2, x: 7, y: 8 },
      ];
    }

    if (tutorial.id === 13) {
      return resolutionPassiveResolved ? MILITARY_RESOLUTION_UNITS_AFTER : MILITARY_RESOLUTION_UNITS_BEFORE;
    }

    if (tutorial.id === 14) {
      return MILITARY_RESOLUTION_UNITS_BEFORE;
    }

    if (tutorial.id === 15) {
      return advancedResolutionResolved ? ADVANCED_RESOLUTION_UNITS_AFTER : ADVANCED_RESOLUTION_UNITS_BEFORE;
    }

    if (tutorial.id === 16) {
      return resolutionIvResolved ? RESOLUTION_IV_UNITS_AFTER : RESOLUTION_IV_UNITS_BEFORE;
    }

    if (tutorial.id === 17) {
      return [
        { id: "cards-center-unit", type: "soldier", player: 1, x: CENTRAL_MARKET_CELL.x, y: CENTRAL_MARKET_CELL.y },
      ];
    }

    if (tutorial.id === 18) {
      return [
        { id: "science-worker", type: "worker", player: 1, x: REPAIR_TARGET_SLOT.x, y: REPAIR_TARGET_SLOT.y },
      ];
    }

    if (tutorial.id === 19) {
  return [
    { id: "global-impact-center-unit", type: "soldier", player: 1, x: CENTRAL_MARKET_CELL.x, y: CENTRAL_MARKET_CELL.y },
  ];
}

if (tutorial.id === 20) {
      const nextUnits = [
        { id: "mini-j1-worker", type: "worker", player: 1, x: miniWorkerPosition.x, y: miniWorkerPosition.y },
        { id: "mini-j1-soldier", type: "soldier", player: 1, x: miniSoldierPosition.x, y: miniSoldierPosition.y },
        {
          id: "mini-j2-worker",
          type: "worker",
          player: 2,
          x: miniGameStep >= 3 ? 8 : 6,
          y: miniGameStep >= 3 ? 17 : 16,
        },
        {
          id: "mini-j2-soldier",
          type: "soldier",
          player: 2,
          x: miniGameStep >= 4 ? 6 : 6,
          y: miniGameStep >= 5 ? 11 : 12,
        },
      ];

      if (miniBoughtWorker) {
        nextUnits.push({ id: "mini-j1-new-worker", type: "worker", player: 1, x: 6, y: 2 });
      }

      if (miniBoughtSoldier) {
        nextUnits.push({ id: "mini-j1-new-soldier", type: "soldier", player: 1, x: BARRACKS_SLOT.x, y: BARRACKS_SLOT.y + 1 });
      }

      return nextUnits;
    }

    if (tutorial.id === 3 || tutorial.id === 4) {
      const nextUnits = [{ id: "arena-worker", type: "worker", player: 1, x: workerPosition.x, y: workerPosition.y }];

      if (recruitedSoldier) {
        nextUnits.push({ id: "arena-soldier", type: "soldier", player: 1, x: BARRACKS_SLOT.x, y: BARRACKS_SLOT.y + 1 });
      }

      return nextUnits;
    }

    return tutorial.units;
  }, [tutorial, workerPosition, recruitedSoldier, repairWorkerPosition, housingSacrificedUnitId, centerContested, buyWorkerBought, buySoldierBought, resolutionPassiveResolved, advancedResolutionResolved, resolutionIvResolved, miniGameStep, miniWorkerPosition, miniSoldierPosition, miniBoughtWorker, miniBoughtSoldier]);

  const selectedUnit = useMemo(() => units.find((unit) => unit.id === selectedUnitId) ?? null, [units, selectedUnitId]);

  const reachableCells = useMemo(() => {
    if (!selectedUnit) return [];
    if (tutorial?.id === 5) return getTutorialReachableCellsForUnit(selectedUnit);
    if (tutorial?.id === 20) {
      const phaseKey = MINI_TUTORIAL_PHASES[miniGameStep]?.key;
      const canMoveWorker = phaseKey === "turn1_player1_worker" && selectedUnit.id === "mini-j1-worker";
      const canMoveSoldier = phaseKey === "turn1_military_j1" && selectedUnit.id === "mini-j1-soldier";
      if (!canMoveWorker && !canMoveSoldier) return [];
      return getReachableCells(units, buildings, selectedUnit);
    }
    if (tutorial?.id !== 3 && tutorial?.id !== 4 && tutorial?.id !== 7) return [];
    return getReachableCells(units, buildings, selectedUnit);
  }, [tutorial?.id, selectedUnit, units, buildings, miniGameStep]);

  const pressureMap = useMemo(() => {
    if (tutorial?.id === 5) return getTutorialPressureMapForUnit(selectedUnit);
    return buildPressureMap(units);
  }, [tutorial?.id, selectedUnit, units]);

  const tutorialDone =
    tutorial?.completionMode === "read"
      ? true
      : tutorial?.completionMode === "place_house"
      ? housePlaced
      : tutorial?.completionMode === "worker_inside"
      ? workerInside
      : tutorial?.completionMode === "recruit_soldier"
      ? recruitedSoldier
      : tutorial?.completionMode === "unit_types"
      ? viewedUnitTypes.length >= Object.keys(UNIT_TUTORIAL_DEFS).length
      : tutorial?.completionMode === "pressure"
      ? PRESSURE_TARGET_IDS.every((id) => viewedPressureTargetIds.includes(id))
      : tutorial?.completionMode === "repair_building"
      ? repairedBuilding
      : tutorial?.completionMode === "housing"
      ? housingHouseBurning && Boolean(housingSacrificedUnitId)
      : tutorial?.completionMode === "economy_conversion"
      ? Boolean(economyChoice)
      : tutorial?.completionMode === "center_control"
      ? centerContested
      : tutorial?.completionMode === "buy_complete"
      ? buyBlockedTried && buyWorkerBought && buySoldierBought
      : tutorial?.completionMode === "phase_flow"
      ? phaseTutorialIndex >= PHASE_TUTORIAL_STEPS.length - 1
      : tutorial?.completionMode === "resolution_passive"
      ? resolutionPassiveResolved
      : tutorial?.completionMode === "resolution_quiz"
      ? resolutionQuizChecked && RESOLUTION_PREDICTION_ITEMS.every((item) => Boolean(resolutionPredictions[item.key]) === item.correct)
      : tutorial?.completionMode === "advanced_resolution"
      ? advancedResolutionResolved
      : tutorial?.completionMode === "resolution_iv"
      ? resolutionIvResolved
      : tutorial?.completionMode === "cards_effects"
      ? cardEffectsViewed
      : tutorial?.completionMode === "science_peek"
      ? sciencePeekDone
      : tutorial?.completionMode === "scoring"
      ? scoringStep >= 3
      : tutorial?.completionMode === "mini_game"
? miniGameDone
      : false;

  function resetTutorialState(nextTutorialId) {
    setSelectedUnitId(null);
    setPressureVisible(true);

    if (nextTutorialId !== 7) {
      setRepairWorkerPosition({ x: 9, y: 2 });
      setRepairWorkerInside(false);
      setRepairedBuilding(false);
    }

    if (nextTutorialId !== 8) {
      setHousingHouseBurning(false);
      setHousingSacrificedUnitId(null);
    }

    if (nextTutorialId !== 9) {
      setEconomyChoice(null);
      setEconomyResources(ECONOMY_START_RESOURCES);
    }

    if (nextTutorialId !== 10) {
      setCenterContested(false);
    }

    if (nextTutorialId !== 11) {
      setBuyResources(BUY_TUTORIAL_START_RESOURCES);
      setBuyBlockedTried(false);
      setBuyWorkerBought(false);
      setBuySoldierBought(false);
    }

    if (nextTutorialId !== 12) {
      setPhaseTutorialIndex(0);
    }

    if (nextTutorialId !== 13) {
      setResolutionPassiveResolved(false);
    }

    if (nextTutorialId !== 14) {
      setResolutionPredictions({});
      setResolutionQuizChecked(false);
    }

    if (nextTutorialId !== 15) {
      setAdvancedResolutionResolved(false);
    }

    if (nextTutorialId !== 16) {
      setResolutionIvResolved(false);
    }

    if (nextTutorialId !== 17) {
      setCardEffectsViewed(false);
    }

    if (nextTutorialId !== 18) {
      setSciencePeekDone(false);
    }

    if (nextTutorialId !== 19) {
      setScoringStep(0);
    }

    if (nextTutorialId !== 20) {
      setMiniGameStep(0);
      setMiniGameDone(false);
      setMiniSelectedCard(null);
      setMiniPlacedCard(null);
      setMiniWorkerPosition({ x: 3, y: 2 });
      setMiniSoldierPosition({ x: 6, y: 6 });
      setMiniResources(MINI_TUTORIAL_START_RESOURCES);
      setMiniBoughtWorker(false);
      setMiniBoughtSoldier(false);
      setMiniProductionDone(false);
      setMiniScienceDone(false);
    }

    if (nextTutorialId === 1) {
      setViewedUnitTypes([]);
      setViewedPressureTargetIds([]);
      setHousePlaced(false);
      setBarracksPlaced(false);
      setBarracksWorkerInside(false);
      setRecruitedSoldier(false);
      setWorkerPosition({ x: 3, y: 2 });
      setWorkerInside(false);
    }

    if (nextTutorialId === 2) {
      setBarracksPlaced(false);
      setBarracksWorkerInside(false);
      setRecruitedSoldier(false);
      setWorkerPosition({ x: 3, y: 2 });
      setWorkerInside(false);
    }

    if (nextTutorialId === 3 && selectedTutorialId !== 4) {
      setBarracksPlaced(false);
      setBarracksWorkerInside(false);
      setRecruitedSoldier(false);
      if (!workerInside) setWorkerPosition({ x: 3, y: 2 });
    }

    if (nextTutorialId === 4) {
      setHousePlaced(true);
      if (!workerInside) setWorkerPosition({ x: 4, y: 1 });
    }

    if (nextTutorialId === 5) {
      setHousePlaced(true);
      setBarracksPlaced(true);
      setBarracksWorkerInside(true);
      setRecruitedSoldier(true);
      setViewedPressureTargetIds([]);
    }

    if (nextTutorialId === 6) {
      setHousePlaced(true);
      setBarracksPlaced(true);
      setBarracksWorkerInside(true);
      setRecruitedSoldier(true);
      setViewedUnitTypes(Object.keys(UNIT_TUTORIAL_DEFS));
      setViewedPressureTargetIds([]);
    }

    if (nextTutorialId === 7) {
      setHousePlaced(true);
      setBarracksPlaced(true);
      setBarracksWorkerInside(true);
      setRecruitedSoldier(true);
      setViewedUnitTypes(Object.keys(UNIT_TUTORIAL_DEFS));
      setViewedPressureTargetIds(PRESSURE_TARGET_IDS);
      setRepairWorkerPosition({ x: 9, y: 2 });
      setRepairWorkerInside(false);
      setRepairedBuilding(false);
    }


    if (nextTutorialId === 8) {
      setHousePlaced(true);
      setBarracksPlaced(true);
      setBarracksWorkerInside(true);
      setRecruitedSoldier(true);
      setViewedUnitTypes(Object.keys(UNIT_TUTORIAL_DEFS));
      setViewedPressureTargetIds(PRESSURE_TARGET_IDS);
      setHousingHouseBurning(false);
      setHousingSacrificedUnitId(null);
    }

    if (nextTutorialId === 9) {
      setHousePlaced(true);
      setBarracksPlaced(true);
      setBarracksWorkerInside(true);
      setRecruitedSoldier(true);
      setViewedUnitTypes(Object.keys(UNIT_TUTORIAL_DEFS));
      setViewedPressureTargetIds(PRESSURE_TARGET_IDS);
      setHousingHouseBurning(true);
      setHousingSacrificedUnitId("housing-worker-2");
      setEconomyChoice(null);
      setEconomyResources(ECONOMY_START_RESOURCES);
    }

    if (nextTutorialId === 10) {
      setHousePlaced(true);
      setBarracksPlaced(true);
      setBarracksWorkerInside(true);
      setRecruitedSoldier(true);
      setViewedUnitTypes(Object.keys(UNIT_TUTORIAL_DEFS));
      setViewedPressureTargetIds(PRESSURE_TARGET_IDS);
      setHousingHouseBurning(true);
      setHousingSacrificedUnitId("housing-worker-2");
      setEconomyChoice("central");
      setEconomyResources({ food: 0, gold: 5, vp: 2 });
      setCenterContested(false);
    }

    if (nextTutorialId === 11) {
      setHousePlaced(true);
      setBarracksPlaced(true);
      setBarracksWorkerInside(true);
      setRecruitedSoldier(true);
      setViewedUnitTypes(Object.keys(UNIT_TUTORIAL_DEFS));
      setViewedPressureTargetIds(PRESSURE_TARGET_IDS);
      setHousingHouseBurning(true);
      setHousingSacrificedUnitId("housing-worker-2");
      setEconomyChoice("central");
      setEconomyResources({ food: 0, gold: 5, vp: 2 });
      setCenterContested(true);
      setBuyResources(BUY_TUTORIAL_START_RESOURCES);
      setBuyBlockedTried(false);
      setBuyWorkerBought(false);
      setBuySoldierBought(false);
    }

    if (nextTutorialId === 12) {
      setHousePlaced(true);
      setBarracksPlaced(true);
      setBarracksWorkerInside(true);
      setRecruitedSoldier(true);
      setViewedUnitTypes(Object.keys(UNIT_TUTORIAL_DEFS));
      setViewedPressureTargetIds(PRESSURE_TARGET_IDS);
      setHousingHouseBurning(true);
      setHousingSacrificedUnitId("housing-worker-2");
      setEconomyChoice("central");
      setEconomyResources({ food: 0, gold: 5, vp: 2 });
      setCenterContested(true);
      setBuyResources({ food: 0, gold: 0 });
      setBuyBlockedTried(true);
      setBuyWorkerBought(true);
      setBuySoldierBought(true);
      setPhaseTutorialIndex(0);
    }

    if (nextTutorialId === 13) {
      setHousePlaced(true);
      setBarracksPlaced(true);
      setBarracksWorkerInside(true);
      setRecruitedSoldier(true);
      setViewedUnitTypes(Object.keys(UNIT_TUTORIAL_DEFS));
      setViewedPressureTargetIds(PRESSURE_TARGET_IDS);
      setHousingHouseBurning(true);
      setHousingSacrificedUnitId("housing-worker-2");
      setEconomyChoice("central");
      setEconomyResources({ food: 0, gold: 5, vp: 2 });
      setCenterContested(true);
      setBuyResources({ food: 0, gold: 0 });
      setBuyBlockedTried(true);
      setBuyWorkerBought(true);
      setBuySoldierBought(true);
      setPhaseTutorialIndex(PHASE_TUTORIAL_STEPS.length - 1);
      setResolutionPassiveResolved(false);
    }

    if (nextTutorialId === 14) {
      setHousePlaced(true);
      setBarracksPlaced(true);
      setBarracksWorkerInside(true);
      setRecruitedSoldier(true);
      setViewedUnitTypes(Object.keys(UNIT_TUTORIAL_DEFS));
      setViewedPressureTargetIds(PRESSURE_TARGET_IDS);
      setHousingHouseBurning(true);
      setHousingSacrificedUnitId("housing-worker-2");
      setEconomyChoice("central");
      setEconomyResources({ food: 0, gold: 5, vp: 2 });
      setCenterContested(true);
      setBuyResources({ food: 0, gold: 0 });
      setBuyBlockedTried(true);
      setBuyWorkerBought(true);
      setBuySoldierBought(true);
      setPhaseTutorialIndex(PHASE_TUTORIAL_STEPS.length - 1);
      setResolutionPredictions({});
      setResolutionQuizChecked(false);
    }

    if (nextTutorialId === 15) {
      setHousePlaced(true);
      setBarracksPlaced(true);
      setBarracksWorkerInside(true);
      setRecruitedSoldier(true);
      setViewedUnitTypes(Object.keys(UNIT_TUTORIAL_DEFS));
      setViewedPressureTargetIds(PRESSURE_TARGET_IDS);
      setHousingHouseBurning(true);
      setHousingSacrificedUnitId("housing-worker-2");
      setEconomyChoice("central");
      setEconomyResources({ food: 0, gold: 5, vp: 2 });
      setCenterContested(true);
      setBuyResources({ food: 0, gold: 0 });
      setBuyBlockedTried(true);
      setBuyWorkerBought(true);
      setBuySoldierBought(true);
      setPhaseTutorialIndex(PHASE_TUTORIAL_STEPS.length - 1);
      setResolutionPredictions({});
      setResolutionQuizChecked(true);
      setAdvancedResolutionResolved(false);
    }

    if (nextTutorialId === 16) {
      setHousePlaced(true);
      setBarracksPlaced(true);
      setBarracksWorkerInside(true);
      setRecruitedSoldier(true);
      setViewedUnitTypes(Object.keys(UNIT_TUTORIAL_DEFS));
      setViewedPressureTargetIds(PRESSURE_TARGET_IDS);
      setHousingHouseBurning(true);
      setHousingSacrificedUnitId("housing-worker-2");
      setEconomyChoice("central");
      setEconomyResources({ food: 0, gold: 5, vp: 2 });
      setCenterContested(true);
      setBuyResources({ food: 0, gold: 0 });
      setBuyBlockedTried(true);
      setBuyWorkerBought(true);
      setBuySoldierBought(true);
      setPhaseTutorialIndex(PHASE_TUTORIAL_STEPS.length - 1);
      setResolutionPredictions({});
      setResolutionQuizChecked(true);
      setAdvancedResolutionResolved(true);
      setResolutionIvResolved(false);
    }

    if (nextTutorialId === 17) {
      setHousePlaced(true);
      setBarracksPlaced(true);
      setBarracksWorkerInside(true);
      setRecruitedSoldier(true);
      setViewedUnitTypes(Object.keys(UNIT_TUTORIAL_DEFS));
      setViewedPressureTargetIds(PRESSURE_TARGET_IDS);
      setResolutionIvResolved(true);
      setCardEffectsViewed(false);
    }

    if (nextTutorialId === 18) {
      setHousePlaced(true);
      setBarracksPlaced(true);
      setBarracksWorkerInside(true);
      setRecruitedSoldier(true);
      setViewedUnitTypes(Object.keys(UNIT_TUTORIAL_DEFS));
      setViewedPressureTargetIds(PRESSURE_TARGET_IDS);
      setResolutionIvResolved(true);
      setCardEffectsViewed(true);
      setSciencePeekDone(false);
    }

    if (nextTutorialId === 19) {
      setHousePlaced(true);
      setBarracksPlaced(true);
      setBarracksWorkerInside(true);
      setRecruitedSoldier(true);
      setViewedUnitTypes(Object.keys(UNIT_TUTORIAL_DEFS));
      setViewedPressureTargetIds(PRESSURE_TARGET_IDS);
      setResolutionIvResolved(true);
      setCardEffectsViewed(true);
      setSciencePeekDone(true);
      setScoringStep(0);
    }

    if (nextTutorialId === 20) {
      setHousePlaced(true);
      setBarracksPlaced(false);
      setBarracksWorkerInside(false);
      setRecruitedSoldier(false);
      setViewedUnitTypes(Object.keys(UNIT_TUTORIAL_DEFS));
      setViewedPressureTargetIds(PRESSURE_TARGET_IDS);
      setResolutionIvResolved(true);
      setCardEffectsViewed(true);
      setSciencePeekDone(true);
      setScoringStep(3);
      setMiniGameStep(0);
      setMiniGameDone(false);
      setMiniSelectedCard(null);
      setMiniPlacedCard(null);
      setMiniWorkerPosition({ x: 3, y: 2 });
      setMiniSoldierPosition({ x: 6, y: 6 });
      setMiniResources(MINI_TUTORIAL_START_RESOURCES);
      setMiniBoughtWorker(false);
      setMiniBoughtSoldier(false);
      setMiniProductionDone(false);
      setMiniScienceDone(false);
    }

    setSelectedTutorialId(nextTutorialId);
  }

  function handleCellClick(x, y) {
    if (!tutorial) return;

    if (tutorial.id === 20) {
      const phaseKey = MINI_TUTORIAL_PHASES[miniGameStep]?.key;

      if (phaseKey === "turn1_player1_place" && miniSelectedCard && !miniPlacedCard) {
        const slot = MINI_TUTORIAL_CARD_SLOTS[miniSelectedCard];
        const clickedSlot = slot?.cells?.some((cell) => cell.x === x && cell.y === y);
        if (!clickedSlot) return;

        const cost = getMiniTutorialCardCost(miniSelectedCard);
        if (!canAffordMiniCost(miniResources, cost)) return;

        setMiniResources((resources) => payMiniCost(resources, cost));
        setMiniPlacedCard(miniSelectedCard);
        setMiniSelectedCard(null);
        setMiniGameStep(1);
        setSelectedUnitId(null);
        return;
      }

      if (phaseKey === "turn1_player1_worker" && selectedUnitId === "mini-j1-worker") {
        const miniBuilding = createMiniTutorialBuilding(miniPlacedCard);
        const isReachable = canMoveTo(reachableCells, x, y);
        if (!isReachable || !miniBuilding || !isCellInsideBuilding(miniBuilding, x, y)) return;

        setMiniWorkerPosition({ x, y });
        setSelectedUnitId(null);
        setMiniGameStep(2);
        return;
      }

      if (phaseKey === "turn1_military_j1" && selectedUnitId === "mini-j1-soldier") {
        const isReachable = canMoveTo(reachableCells, x, y);
        if (!isReachable) return;

        setMiniSoldierPosition({ x, y });
        setSelectedUnitId(null);
        setMiniGameStep(4);
        return;
      }

      return;
    }

    if (tutorial.id === 2 && !housePlaced) {
      const clickedSlot = VERTICAL_SLOT.cells.some((cell) => cell.x === x && cell.y === y);
      if (clickedSlot) setHousePlaced(true);
      return;
    }

    if (tutorial.id === 3 && selectedUnitId === "arena-worker") {
      const fieldBuilding = STARTING_SETUP_BUILDINGS.find((building) => building.type === "production_food");
      const isReachable = canMoveTo(reachableCells, x, y);
      if (!isReachable) return;

      setWorkerPosition({ x, y });
      setSelectedUnitId(null);

      if (fieldBuilding && isCellInsideBuilding(fieldBuilding, x, y)) setWorkerInside(true);
      return;
    }

    if (tutorial.id === 4 && !barracksPlaced) {
      const clickedSlot = BARRACKS_SLOT.cells.some((cell) => cell.x === x && cell.y === y);
      if (clickedSlot) setBarracksPlaced(true);
      return;
    }

    if (tutorial.id === 4 && barracksPlaced && selectedUnitId === "arena-worker" && !barracksWorkerInside) {
      const barracksBuilding = createBarracksBuilding();
      const isReachable = canMoveTo(reachableCells, x, y);
      if (!isReachable) return;

      setWorkerPosition({ x, y });
      setSelectedUnitId(null);

      if (isCellInsideBuilding(barracksBuilding, x, y)) setBarracksWorkerInside(true);
      return;
    }

    if (tutorial.id === 7 && selectedUnitId === "arena-repair-worker" && !repairWorkerInside && !repairedBuilding) {
      const repairTarget = createRepairTargetBuilding(false);
      const isReachable = canMoveTo(reachableCells, x, y);
      if (!isReachable) return;

      setRepairWorkerPosition({ x, y });
      setSelectedUnitId(null);

      if (isCellInsideBuilding(repairTarget, x, y)) setRepairWorkerInside(true);
    }
  }

  function handleUnitClick(unit) {
    if (tutorial?.id === 20) {
      const phaseKey = MINI_TUTORIAL_PHASES[miniGameStep]?.key;
      if (phaseKey === "turn1_player1_worker" && unit.id === "mini-j1-worker") {
        setSelectedUnitId(unit.id);
      }
      if (phaseKey === "turn1_military_j1" && unit.id === "mini-j1-soldier") {
        setSelectedUnitId(unit.id);
      }
      return;
    }

    if (tutorial?.id === 5) {
      setSelectedUnitId(unit.id);
      setViewedUnitTypes((previous) => (previous.includes(unit.type) ? previous : [...previous, unit.type]));
      return;
    }

    if (tutorial?.id === 6) {
      setSelectedUnitId(unit.id);
      if (PRESSURE_TARGET_IDS.includes(unit.id)) {
        setViewedPressureTargetIds((previous) => (previous.includes(unit.id) ? previous : [...previous, unit.id]));
      }
      return;
    }

    if (tutorial?.id === 13 || tutorial?.id === 14) {
      setSelectedUnitId(unit.id);
      return;
    }

    if (tutorial?.id === 10) {
      setSelectedUnitId(unit.id);
      if (unit.id === "center-enemy") setCenterContested(true);
      return;
    }

    if (tutorial?.id === 8) {
      if (housingHouseBurning && !housingSacrificedUnitId && unit.player === 1) setHousingSacrificedUnitId(unit.id);
      return;
    }

    if (tutorial?.id !== 3 && tutorial?.id !== 4 && tutorial?.id !== 7) return;

    if (tutorial.id === 3 && unit.id === "arena-worker" && !workerInside) setSelectedUnitId(unit.id);
    if (tutorial.id === 4 && unit.id === "arena-worker" && barracksPlaced && !barracksWorkerInside) setSelectedUnitId(unit.id);
    if (tutorial.id === 7 && unit.id === "arena-repair-worker" && !repairWorkerInside && !repairedBuilding) setSelectedUnitId(unit.id);
  }

  if (!tutorial) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          color: "white",
          padding: 24,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "min(980px, 100%)", display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 18,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <h1 style={{ margin: 0, fontSize: 32 }}>Civ Alpha Arena</h1>
            <div style={{ opacity: 0.78, lineHeight: 1.5 }}>
              Mode tutoriel intégré au vrai Civ Alpha. On repart de zéro : installation, pose de carte, économie, recrutement, unités, pression, réparation, logement, marchés, centre, achats et résolution militaire.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 12,
            }}
          >
            {TUTORIALS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => resetTutorialState(item.id)}
                style={{
                  textAlign: "left",
                  border: "1px solid rgba(96,165,250,0.28)",
                  borderRadius: 16,
                  padding: 16,
                  background: "#172036",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>Tuto {item.id}</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{item.shortTitle}</div>
                <div style={{ fontSize: 13, opacity: 0.78, lineHeight: 1.4 }}>{item.objective}</div>
              </button>
            ))}
          </div>

          <ActionButton onClick={onBack}>Retour accueil</ActionButton>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: 16,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>{tutorial.title}</h2>
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.72 }}>{tutorial.objective}</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ActionButton onClick={() => resetTutorialState(null)}>Menu Arena</ActionButton>
          <ActionButton onClick={onBack}>Accueil</ActionButton>
          <ActionButton onClick={() => setPressureVisible((visible) => !visible)}>
            Pression : {pressureVisible ? "ON" : "OFF"}
          </ActionButton>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, auto) minmax(320px, 460px)", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
          <Board
            units={units}
            buildings={buildings}
            selectedUnitId={selectedUnitId}
            reachableCells={reachableCells}
            activatedUnitIds={[]}
            activePlayer={1}
            phase="arena"
            pressureMap={pressureVisible ? pressureMap : {}}
            showPressure={Boolean(tutorial.showPressure && pressureVisible)}
            placementCells={
              tutorial.id === 2 && !housePlaced
                ? tutorial.placementCells
                : tutorial.id === 4 && !barracksPlaced
                ? tutorial.placementCells
                : tutorial.id === 20 && MINI_TUTORIAL_PHASES[miniGameStep]?.key === "turn1_player1_place" && miniSelectedCard && !miniPlacedCard
                ? MINI_TUTORIAL_CARD_SLOTS[miniSelectedCard]?.cells ?? []
                : []
            }
            spawnCells={[]}
            onCellClick={handleCellClick}
            onUnitClick={handleUnitClick}
          />

          <CardsPanel
            cardKeys={tutorial.cards}
            selectedKey={
              tutorial.id === 2 && !housePlaced
                ? "house"
                : tutorial.id === 3
                ? "field"
                : tutorial.id === 4 && !barracksPlaced
                ? "barracks_1"
                : tutorial.id === 8
                ? "house"
                : tutorial.id === 9
                ? "market"
                : tutorial.id === 18
                ? "school"
                : tutorial.id === 20
                ? miniSelectedCard ?? miniPlacedCard
                : null
            }
            title={tutorial.id === 1 ? "4 cartes installées au départ" : tutorial.id === 4 ? "Caserne et recrutement" : tutorial.id === 8 ? "Carte concernée : Chaumière" : tutorial.id === 9 ? "Carte concernée : Marché" : tutorial.id === 18 ? "Carte concernée : École" : tutorial.id === 20 ? "Choix de départ : École ou Caserne" : "Carte utilisée dans ce tuto"}
            shiftPressed={shiftPressed}
          />

          {tutorial.id === 17 || tutorial.id === 18 ? (
            <CardsPanel
              cardKeys={SITUATION_TUTORIAL_CARDS}
              title={tutorial.id === 18 ? "Cartes à anticiper" : "Cartes en place"}
              shiftPressed={shiftPressed}
            />
          ) : null}
        </div>

        <div
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            lineHeight: 1.55,
          }}
        >
          {tutorial.text.map((line) => (
            <div key={line} style={{ fontSize: 15 }}>{line}</div>
          ))}

          {tutorial.id === 1 ? (
            <div style={{ marginTop: 4, padding: 12, borderRadius: 12, background: "rgba(37,99,235,0.18)", border: "1px solid rgba(96,165,250,0.42)" }}>
              Installation : ces 4 bâtiments sont déjà posés pour comprendre la base. Le joueur ne fait encore aucune action.
            </div>
          ) : null}

          {tutorial.id === 2 ? (
            <div style={{ marginTop: 4, padding: 12, borderRadius: 12, background: housePlaced ? "rgba(22,163,74,0.18)" : "rgba(37,99,235,0.18)", border: housePlaced ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(96,165,250,0.42)" }}>
              {housePlaced ? "Chaumière posée : elle occupe bien les 2 cases verticales de l’emplacement." : "Action : clique sur les 2 cases vertes brillantes du plateau."}
            </div>
          ) : null}

          {tutorial.id === 3 ? (
            <div style={{ marginTop: 4, padding: 12, borderRadius: 12, background: workerInside ? "rgba(22,163,74,0.18)" : "rgba(37,99,235,0.18)", border: workerInside ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(96,165,250,0.42)", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontWeight: 900 }}>Ouvrier : 2 PM</div>
              <div>
                {workerInside
                  ? "Ouvrier actif : le Champ produit maintenant +3 🌾 au lieu de +2 🌾."
                  : selectedUnitId === "arena-worker"
                  ? "Cases atteignables visibles : clique sur une case du Champ atteignable avec ses 2 PM."
                  : "Action : clique sur l’ouvrier pour afficher ses 2 PM."}
              </div>
              <div style={{ opacity: 0.78, fontSize: 13 }}>Fragilité : un ouvrier meurt sous 1 pression ennemie. La pression sera expliquée dans les prochains tutos.</div>
            </div>
          ) : null}

          {tutorial.id === 4 ? (
            <div style={{ marginTop: 4, padding: 12, borderRadius: 12, background: recruitedSoldier ? "rgba(22,163,74,0.18)" : "rgba(37,99,235,0.18)", border: recruitedSoldier ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(96,165,250,0.42)", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontWeight: 900 }}>Chaîne de recrutement</div>
              <div>
                {!barracksPlaced
                  ? "Étape 1 : clique sur l’emplacement vert pour poser la Caserne I."
                  : !barracksWorkerInside && selectedUnitId === "arena-worker"
                  ? "Étape 2 : cases atteignables visibles. Déplace l’ouvrier dans la Caserne."
                  : !barracksWorkerInside
                  ? "Étape 2 : clique sur l’ouvrier pour afficher ses 2 PM, puis place-le dans la Caserne."
                  : !recruitedSoldier
                  ? "Étape 3 : l’ouvrier est actif dans la Caserne. Tu peux maintenant recruter un Soldat."
                  : "Soldat recruté : la Caserne + ouvrier actif débloquent le recrutement militaire."}
              </div>
              {barracksWorkerInside && !recruitedSoldier ? (
                <ActionButton tone="success" onClick={() => setRecruitedSoldier(true)}>Recruter Soldat ⚔️</ActionButton>
              ) : null}
              <div style={{ opacity: 0.78, fontSize: 13 }}>Règle de base : la Caserne I permet Soldat et Archer si un ouvrier est actif dedans.</div>
            </div>
          ) : null}

          {tutorial.id === 5 ? (
            <div style={{ marginTop: 4, padding: 12, borderRadius: 12, background: tutorialDone ? "rgba(22,163,74,0.18)" : "rgba(37,99,235,0.18)", border: tutorialDone ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(96,165,250,0.42)", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>Clique chaque unité pour comparer</div>
              {selectedUnit ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>{UNIT_TUTORIAL_DEFS[selectedUnit.type]?.icon} {UNIT_TUTORIAL_DEFS[selectedUnit.type]?.name ?? selectedUnit.type}</div>
                  <div>PM : <strong>{UNIT_TUTORIAL_DEFS[selectedUnit.type]?.movePoints ?? 0}</strong></div>
                  <div>Rôle : {UNIT_TUTORIAL_DEFS[selectedUnit.type]?.role}</div>
                  <div>Pression : {UNIT_TUTORIAL_DEFS[selectedUnit.type]?.pressure}</div>
                  <div>Fragilité : {UNIT_TUTORIAL_DEFS[selectedUnit.type]?.fragility}</div>
                </div>
              ) : (
                <div>Action : clique sur une unité du plateau. Ses cases de mouvement et sa pression s’affichent.</div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {Object.entries(UNIT_TUTORIAL_DEFS).map(([type, def]) => {
                  const viewed = viewedUnitTypes.includes(type);
                  return (
                    <span key={type} style={{ borderRadius: 999, padding: "6px 10px", background: viewed ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)", border: viewed ? "1px solid rgba(34,197,94,0.5)" : "1px solid rgba(255,255,255,0.12)", fontSize: 13 }}>
                      {viewed ? "✓ " : "○ "}{def.icon} {def.name}
                    </span>
                  );
                })}
              </div>
              <div style={{ opacity: 0.78, fontSize: 13 }}>Le prochain tuto expliquera vraiment la pression : comment elle s’additionne, qui meurt, et pourquoi le placement est central.</div>
            </div>
          ) : null}

          {tutorial.id === 6 ? (
            <div style={{ marginTop: 4, padding: 12, borderRadius: 12, background: tutorialDone ? "rgba(22,163,74,0.18)" : "rgba(37,99,235,0.18)", border: tutorialDone ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(96,165,250,0.42)", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>Lire la pression sur une case</div>
              <div style={{ fontSize: 13, opacity: 0.82 }}>Utilise le bouton global en haut à droite pour afficher ou masquer la pression.</div>
              {selectedUnit ? (() => {
                const pressure = getPressureOnUnit(selectedUnit, pressureMap);
                const threshold = getUnitPressureThreshold(selectedUnit);
                const isEnemyTarget = PRESSURE_TARGET_IDS.includes(selectedUnit.id);
                const wouldDie = threshold !== null && pressure >= threshold;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>{UNIT_TUTORIAL_DEFS[selectedUnit.type]?.icon} {selectedUnit.player === 1 ? "Unité alliée" : "Unité ennemie"} — {UNIT_TUTORIAL_DEFS[selectedUnit.type]?.name ?? selectedUnit.type}</div>
                    <div>Pression ennemie reçue : <strong>{pressure}</strong></div>
                    <div>Seuil de destruction : <strong>{threshold}</strong></div>
                    <div style={{ color: wouldDie ? "#fca5a5" : "#bfdbfe", fontWeight: 800 }}>{wouldDie ? "Cette unité serait détruite pendant la résolution militaire." : "Cette unité survivrait pour l’instant."}</div>
                    {!isEnemyTarget ? <div style={{ opacity: 0.72, fontSize: 13 }}>Pour valider le tuto, clique aussi sur l’ouvrier ennemi et le soldat ennemi au centre.</div> : null}
                  </div>
                );
              })() : (
                <div>Action : utilise le bouton pour afficher/masquer les halos, puis clique sur l’ouvrier ennemi et le soldat ennemi.</div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PRESSURE_TARGET_IDS.map((id) => {
                  const viewed = viewedPressureTargetIds.includes(id);
                  const label = id === "pressure-enemy-worker" ? "Ouvrier ennemi sous 1 pression" : "Soldat ennemi sous 2 pressions";
                  return (
                    <span key={id} style={{ borderRadius: 999, padding: "6px 10px", background: viewed ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)", border: viewed ? "1px solid rgba(34,197,94,0.5)" : "1px solid rgba(255,255,255,0.12)", fontSize: 13 }}>
                      {viewed ? "✓ " : "○ "}{label}
                    </span>
                  );
                })}
              </div>
              <div style={{ opacity: 0.78, fontSize: 13 }}>Règle à retenir : les halos sont une option de lecture. Même masqués, la pression existe toujours et sera utilisée à la résolution.</div>
            </div>
          ) : null}

          {tutorial.id === 7 ? (
            <div style={{ marginTop: 4, padding: 12, borderRadius: 12, background: repairedBuilding ? "rgba(22,163,74,0.18)" : "rgba(37,99,235,0.18)", border: repairedBuilding ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(96,165,250,0.42)", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>Bâtiment en feu → réparation</div>
              <div>
                {repairedBuilding
                  ? "Bâtiment réparé : il est de nouveau actif et ses effets sont restaurés."
                  : repairWorkerInside
                  ? "L’ouvrier est dans le bâtiment en feu. Il peut maintenant effectuer la réparation."
                  : selectedUnitId === "arena-repair-worker"
                  ? "Cases atteignables visibles : déplace l’ouvrier dans le bâtiment en feu à droite."
                  : "Action : clique sur l’ouvrier, puis déplace-le dans le bâtiment en feu."}
              </div>
              {repairWorkerInside && !repairedBuilding ? (
                <ActionButton tone="success" onClick={() => setRepairedBuilding(true)}>Réparer le bâtiment 🔧</ActionButton>
              ) : null}
              <div style={{ opacity: 0.78, fontSize: 13 }}>Règle de base : un bâtiment en feu ne produit plus, ne protège plus et ne donne plus son effet. La réparation le remet en service.</div>
            </div>
          ) : null}

          {tutorial.id === 8 ? (() => {
            const activeHouses = housingHouseBurning ? 1 : 2;
            const housingCapacity = activeHouses * 3;
            const usedHousing = units.length;
            const overLimit = Math.max(0, usedHousing - housingCapacity);
            return (
              <div style={{ marginTop: 4, padding: 12, borderRadius: 12, background: tutorialDone ? "rgba(22,163,74,0.18)" : "rgba(37,99,235,0.18)", border: tutorialDone ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(96,165,250,0.42)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontWeight: 900 }}>Logement disponible</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>Chaumières actives : <strong>{activeHouses}</strong></div>
                  <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>Capacité : <strong>{housingCapacity}</strong></div>
                  <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>Unités + ouvriers : <strong>{usedHousing}</strong></div>
                  <div style={{ padding: 10, borderRadius: 10, background: overLimit > 0 ? "rgba(239,68,68,0.20)" : "rgba(34,197,94,0.16)" }}>Dépassement : <strong>{overLimit}</strong></div>
                </div>

                {!housingHouseBurning ? (
                  <>
                    <div>Étape 1 : mets la Chaumière posée au tuto 2 en feu. Elle ne donne alors plus ses 3 logements.</div>
                    <ActionButton tone="primary" onClick={() => setHousingHouseBurning(true)}>Mettre une Chaumière en feu 🔥</ActionButton>
                  </>
                ) : !housingSacrificedUnitId ? (
                  <div>Étape 2 : tu dépasses maintenant ta limite de logement. Clique sur une de tes unités ou un ouvrier pour le sacrifier.</div>
                ) : (
                  <div>Unité sacrifiée : tu es revenu dans la limite de logement. Retenir : le logement limite le nombre total d’ouvriers et d’unités militaires.</div>
                )}

                <div style={{ opacity: 0.78, fontSize: 13 }}>Règle de base : chaque ouvrier et chaque unité militaire occupe 1 logement. Un logement brûlé ne compte plus tant qu’il n’est pas réparé.</div>
              </div>
            );
          })() : null}

          {tutorial.id === 9 ? (() => {
            const personalPreview = { food: economyResources.food, gold: 0, vp: economyResources.vp + 1 };
            const centralPreview = { food: 0, gold: economyResources.gold, vp: economyResources.vp + 2 };
            const displayed = economyChoice === "personal" ? personalPreview : economyChoice === "central" ? centralPreview : economyResources;
            return (
              <div style={{ marginTop: 4, padding: 12, borderRadius: 12, background: tutorialDone ? "rgba(22,163,74,0.18)" : "rgba(37,99,235,0.18)", border: tutorialDone ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(96,165,250,0.42)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontWeight: 900 }}>Conversion économique</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>🌾 Nourriture : <strong>{displayed.food}</strong></div>
                  <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>💰 Or : <strong>{displayed.gold}</strong></div>
                  <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>🏆 PV : <strong>{displayed.vp}</strong></div>
                </div>

                {!economyChoice ? (
                  <>
                    <div>Choisis une seule option pour ce tour. Le premier choix verrouille ton axe économique.</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <button type="button" onClick={() => { setEconomyChoice("personal"); setEconomyResources(personalPreview); }} style={{ textAlign: "left", borderRadius: 12, border: "1px solid rgba(96,165,250,0.42)", padding: 12, background: "rgba(15,23,42,0.85)", color: "white", cursor: "pointer" }}>
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>Marché personnel</div>
                        <div style={{ fontSize: 13, opacity: 0.82 }}>Convertir 5 💰 dans ton camp → +1 PV. Plus sûr, moins rentable.</div>
                      </button>
                      <button type="button" onClick={() => { setEconomyChoice("central"); setEconomyResources(centralPreview); }} style={{ textAlign: "left", borderRadius: 12, border: "1px solid rgba(251,146,60,0.50)", padding: 12, background: "rgba(15,23,42,0.85)", color: "white", cursor: "pointer" }}>
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>Marché central</div>
                        <div style={{ fontSize: 13, opacity: 0.82 }}>Convertir 5 🌾 au centre → +1 PV + bonus central +1 PV. Plus fort, plus exposé.</div>
                      </button>
                    </div>
                  </>
                ) : (
                  <div>
                    Choix verrouillé : <strong>{economyChoice === "personal" ? "marché personnel" : "marché central"}</strong>. Retenir : pendant une même phase Économie, tu ne mélanges pas les deux axes.
                  </div>
                )}

                <div style={{ opacity: 0.78, fontSize: 13 }}>Règle de base : la conversion transforme des ressources en PV. Le centre est meilleur, mais il demande du contrôle de terrain et sera contesté par l’adversaire.</div>
              </div>
            );
          })() : null}



          {tutorial.id === 10 ? (() => {
            const alliedOnCenter = units.some((unit) => unit.player === 1 && isCentralMarketCell(unit.x, unit.y));
            const enemyOnCenter = units.some((unit) => unit.player === 2 && isCentralMarketCell(unit.x, unit.y));
            const controlsCenter = alliedOnCenter && !enemyOnCenter;
            return (
              <div style={{ marginTop: 4, padding: 12, borderRadius: 12, background: tutorialDone ? "rgba(22,163,74,0.18)" : "rgba(37,99,235,0.18)", border: tutorialDone ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(96,165,250,0.42)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontWeight: 900 }}>Contrôle du centre</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>Unité alliée au centre : <strong>{alliedOnCenter ? "oui" : "non"}</strong></div>
                  <div style={{ padding: 10, borderRadius: 10, background: enemyOnCenter ? "rgba(239,68,68,0.20)" : "rgba(34,197,94,0.16)" }}>Unité ennemie au centre : <strong>{enemyOnCenter ? "oui" : "non"}</strong></div>
                </div>
                <div style={{ fontWeight: 900, color: controlsCenter ? "#86efac" : "#fca5a5" }}>
                  {controlsCenter ? "Tu contrôles le centre." : "Le centre est contesté : tu ne le contrôles plus."}
                </div>
                {!centerContested ? (
                  <div>Action : clique sur le soldat ennemi à droite du centre pour le faire entrer sur la case centrale et contester le contrôle.</div>
                ) : (
                  <div>Règle à retenir : le marché central est puissant, mais il dépend du contrôle du terrain. Une présence ennemie suffit à contester.</div>
                )}
              </div>
            );
          })() : null}



          {tutorial.id === 11 ? (() => {
            const canBuyWorker = !buyWorkerBought && buyResources.food >= 5;
            const canBuySoldier = !buySoldierBought && buyResources.food >= 2 && buyResources.gold >= 1;
            const housingUsed = units.length;
            const housingCapacity = 6;
            return (
              <div style={{ marginTop: 4, padding: 12, borderRadius: 12, background: tutorialDone ? "rgba(22,163,74,0.18)" : "rgba(37,99,235,0.18)", border: tutorialDone ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(96,165,250,0.42)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontWeight: 900 }}>Achats : ouvriers et unités</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>🌾 Nourriture : <strong>{buyResources.food}</strong></div>
                  <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>💰 Or : <strong>{buyResources.gold}</strong></div>
                  <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>🏠 Logement : <strong>{housingUsed}/{housingCapacity}</strong></div>
                  <div style={{ padding: 10, borderRadius: 10, background: "rgba(34,197,94,0.16)" }}>Caserne active : <strong>oui</strong></div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setBuyBlockedTried(true)}
                    style={{ textAlign: "left", borderRadius: 12, border: buyBlockedTried ? "1px solid rgba(34,197,94,0.5)" : "1px solid rgba(248,113,113,0.45)", padding: 12, background: "rgba(15,23,42,0.85)", color: "white", cursor: "pointer" }}
                  >
                    <div style={{ fontWeight: 900, marginBottom: 4 }}>{buyBlockedTried ? "✓ " : ""}Tenter Cavalerie / Siège</div>
                    <div style={{ fontSize: 13, opacity: 0.82 }}>Bloqué : il faut une Caserne fortifiée / niveau II. Les unités avancées se débloquent par prérequis de bâtiments, pas par calendrier fixe.</div>
                  </button>

                  <button
                    type="button"
                    disabled={!canBuyWorker}
                    onClick={() => {
                      if (!canBuyWorker) return;
                      setBuyWorkerBought(true);
                      setBuyResources((resources) => ({ ...resources, food: resources.food - 5 }));
                    }}
                    style={{ textAlign: "left", borderRadius: 12, border: buyWorkerBought ? "1px solid rgba(34,197,94,0.5)" : "1px solid rgba(96,165,250,0.42)", padding: 12, background: "rgba(15,23,42,0.85)", color: "white", cursor: canBuyWorker ? "pointer" : "not-allowed", opacity: canBuyWorker || buyWorkerBought ? 1 : 0.55 }}
                  >
                    <div style={{ fontWeight: 900, marginBottom: 4 }}>{buyWorkerBought ? "✓ " : ""}Acheter un ouvrier — 5 🌾</div>
                    <div style={{ fontSize: 13, opacity: 0.82 }}>L’ouvrier sert à activer les bâtiments, réparer, produire plus et préparer l’économie.</div>
                  </button>

                  <button
                    type="button"
                    disabled={!canBuySoldier}
                    onClick={() => {
                      if (!canBuySoldier) return;
                      setBuySoldierBought(true);
                      setBuyResources((resources) => ({ ...resources, food: resources.food - 2, gold: resources.gold - 1 }));
                    }}
                    style={{ textAlign: "left", borderRadius: 12, border: buySoldierBought ? "1px solid rgba(34,197,94,0.5)" : "1px solid rgba(96,165,250,0.42)", padding: 12, background: "rgba(15,23,42,0.85)", color: "white", cursor: canBuySoldier ? "pointer" : "not-allowed", opacity: canBuySoldier || buySoldierBought ? 1 : 0.55 }}
                  >
                    <div style={{ fontWeight: 900, marginBottom: 4 }}>{buySoldierBought ? "✓ " : ""}Acheter un soldat — 2 🌾 + 1 💰</div>
                    <div style={{ fontSize: 13, opacity: 0.82 }}>Possible car tu as une Caserne I active avec un ouvrier dedans. Le soldat apparaît sur la Caserne.</div>
                  </button>
                </div>

                <div style={{ opacity: 0.78, fontSize: 13 }}>Règle à retenir : nourriture = ouvriers et part du coût militaire ; or = cartes et recrutement ; logement = limite totale de population.</div>
              </div>
            );
          })() : null}

          {tutorial.id === 12 ? (() => {
            const currentPhase = PHASE_TUTORIAL_STEPS[phaseTutorialIndex] ?? PHASE_TUTORIAL_STEPS[0];
            return (
              <div style={{ marginTop: 4, padding: 12, borderRadius: 12, background: tutorialDone ? "rgba(22,163,74,0.18)" : "rgba(37,99,235,0.18)", border: tutorialDone ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(96,165,250,0.42)", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontWeight: 900 }}>Ordre du tour</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                  {PHASE_TUTORIAL_STEPS.map((phase, index) => {
                    const isCurrent = index === phaseTutorialIndex;
                    const isPast = index < phaseTutorialIndex;
                    return (
                      <div
                        key={phase.key}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          border: isCurrent ? "1px solid rgba(96,165,250,0.70)" : isPast ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(255,255,255,0.10)",
                          background: isCurrent ? "rgba(37,99,235,0.22)" : isPast ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
                          opacity: isCurrent || isPast ? 1 : 0.62,
                        }}
                      >
                        <div style={{ fontWeight: 900 }}>{isPast ? "✓ " : isCurrent ? "▶ " : "○ "}{phase.title}</div>
                        {isCurrent ? <div style={{ marginTop: 4, fontSize: 13, opacity: 0.84 }}>{phase.detail}</div> : null}
                      </div>
                    );
                  })}
                </div>

                <div style={{ padding: 12, borderRadius: 12, background: "rgba(15,23,42,0.82)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>{currentPhase.title}</div>
                  <div style={{ fontSize: 14, opacity: 0.84 }}>{currentPhase.detail}</div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <ActionButton disabled={phaseTutorialIndex <= 0} onClick={() => setPhaseTutorialIndex((index) => Math.max(0, index - 1))}>Phase précédente</ActionButton>
                  <ActionButton
                    tone={phaseTutorialIndex >= PHASE_TUTORIAL_STEPS.length - 1 ? "success" : "primary"}
                    onClick={() => setPhaseTutorialIndex((index) => Math.min(PHASE_TUTORIAL_STEPS.length - 1, index + 1))}
                  >
                    {phaseTutorialIndex >= PHASE_TUTORIAL_STEPS.length - 1 ? "Tour complet compris" : "Phase suivante"}
                  </ActionButton>
                </div>

                <div style={{ opacity: 0.78, fontSize: 13 }}>Règle à retenir : les phases forcent le rythme. Tu ne peux pas produire avant d’avoir pris tes décisions de position, d’achat et d’économie.</div>
              </div>
            );
          })() : null}

          {tutorial.id === 13 ? (() => {
            const selectedPressure = selectedUnit ? getPressureOnUnit(selectedUnit, pressureMap) : null;
            const selectedThreshold = selectedUnit ? getUnitPressureThreshold(selectedUnit) : null;
            return (
              <div style={{ marginTop: 4, padding: 12, borderRadius: 12, background: tutorialDone ? "rgba(22,163,74,0.18)" : "rgba(37,99,235,0.18)", border: tutorialDone ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(96,165,250,0.42)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontWeight: 900 }}>Résolution militaire — observation</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>Avant résolution : <strong>{resolutionPassiveResolved ? "non" : "oui"}</strong></div>
                  <div style={{ padding: 10, borderRadius: 10, background: resolutionPassiveResolved ? "rgba(34,197,94,0.16)" : "rgba(255,255,255,0.06)" }}>Résolution faite : <strong>{resolutionPassiveResolved ? "oui" : "non"}</strong></div>
                </div>

                {selectedUnit ? (
                  <div style={{ padding: 10, borderRadius: 10, background: "rgba(15,23,42,0.82)", border: "1px solid rgba(255,255,255,0.10)" }}>
                    <div style={{ fontWeight: 900 }}>{UNIT_TUTORIAL_DEFS[selectedUnit.type]?.icon} {selectedUnit.player === 1 ? "Unité alliée" : "Unité ennemie"} — {UNIT_TUTORIAL_DEFS[selectedUnit.type]?.name ?? selectedUnit.type}</div>
                    <div style={{ fontSize: 13, opacity: 0.84 }}>Pression ennemie reçue avant résolution : {selectedPressure} / seuil {selectedThreshold}</div>
                  </div>
                ) : (
                  <div>Optionnel : clique une unité pour lire sa pression avant de résoudre.</div>
                )}

                {!resolutionPassiveResolved ? (
                  <ActionButton tone="primary" onClick={() => { setResolutionPassiveResolved(true); setSelectedUnitId(null); }}>Résoudre la pression</ActionButton>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div><strong>Résultat :</strong> le soldat ennemi au centre meurt, le soldat empilé avec l’ouvrier meurt, l’ouvrier empilé survit, le bâtiment de droite passe en feu, et l’ouvrier abrité dedans survit pour cette résolution.</div>
                    <div style={{ opacity: 0.78, fontSize: 13 }}>Point important : le bâtiment a brûlé, mais il protégeait encore pendant cette résolution. L’ouvrier ne sera vulnérable qu’à partir d’une résolution suivante si rien n’est réparé.</div>
                  </div>
                )}
              </div>
            );
          })() : null}

          {tutorial.id === 14 ? (() => {
            const hasAtLeastOneAnswer = RESOLUTION_PREDICTION_ITEMS.some((item) => resolutionPredictions[item.key] === true);
            const allCorrect = RESOLUTION_PREDICTION_ITEMS.every((item) => Boolean(resolutionPredictions[item.key]) === item.correct);
            return (
              <div style={{ marginTop: 4, padding: 12, borderRadius: 12, background: tutorialDone ? "rgba(22,163,74,0.18)" : "rgba(37,99,235,0.18)", border: tutorialDone ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(96,165,250,0.42)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontWeight: 900 }}>Prédiction de résolution</div>
                <div style={{ fontSize: 13, opacity: 0.82 }}>Utilise le bouton global en haut à droite pour afficher ou masquer la pression.</div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                  {RESOLUTION_PREDICTION_ITEMS.map((item) => {
                    const value = resolutionPredictions[item.key];
                    const isCorrect = value === item.correct;
                    return (
                      <div key={item.key} style={{ padding: 10, borderRadius: 10, background: "rgba(15,23,42,0.82)", border: resolutionQuizChecked ? (isCorrect ? "1px solid rgba(34,197,94,0.55)" : "1px solid rgba(248,113,113,0.55)") : "1px solid rgba(255,255,255,0.10)", display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={Boolean(value)}
                            onChange={(event) => {
                              setResolutionPredictions((previous) => ({ ...previous, [item.key]: event.target.checked }));
                              setResolutionQuizChecked(false);
                            }}
                          />
                          <span style={{ fontWeight: 800 }}>{item.label}</span>
                        </label>
                        {resolutionQuizChecked ? <div style={{ fontSize: 13, opacity: 0.84 }}>{isCorrect ? "✓ " : "✕ "}{item.explanation}</div> : null}
                      </div>
                    );
                  })}
                </div>

                <ActionButton tone={hasAtLeastOneAnswer ? "primary" : "neutral"} disabled={!hasAtLeastOneAnswer} onClick={() => setResolutionQuizChecked(true)}>Valider ma prédiction</ActionButton>

                {resolutionQuizChecked ? (
                  <div style={{ fontWeight: 900, color: allCorrect ? "#86efac" : "#fca5a5" }}>
                    {allCorrect ? "Prédiction correcte : tu peux continuer." : "Prédiction incorrecte : corrige les affirmations fausses, puis valide à nouveau."}
                  </div>
                ) : (
                  <div style={{ opacity: 0.78, fontSize: 13 }}>Coche uniquement ce qui sera vrai après la résolution.</div>
                )}
              </div>
            );
          })() : null}

          {tutorial.id === 15 ? (() => {
            const stackWorkerAlive = units.some((unit) => unit.id === "resolution-stack-worker");
            const protectedWorkerAlive = units.some((unit) => unit.id === "resolution-protected-worker");
            return (
              <div style={{ marginTop: 4, padding: 12, borderRadius: 12, background: tutorialDone ? "rgba(22,163,74,0.18)" : "rgba(37,99,235,0.18)", border: tutorialDone ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(96,165,250,0.42)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontWeight: 900 }}>Résolution suivante — protections expirées</div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ padding: 10, borderRadius: 10, background: stackWorkerAlive ? "rgba(255,255,255,0.06)" : "rgba(34,197,94,0.16)" }}>
                    Ouvrier anciennement protégé par le soldat : <strong>{stackWorkerAlive ? "vivant" : "mort"}</strong>
                  </div>
                  <div style={{ padding: 10, borderRadius: 10, background: protectedWorkerAlive ? "rgba(255,255,255,0.06)" : "rgba(34,197,94,0.16)" }}>
                    Ouvrier dans le bâtiment en feu : <strong>{protectedWorkerAlive ? "vivant" : "mort"}</strong>
                  </div>
                </div>

                {!advancedResolutionResolved ? (
                  <>
                    <div>Avant cette nouvelle résolution, le bâtiment est déjà en feu et le soldat protecteur est déjà mort. Les deux ouvriers survivants sont donc exposés.</div>
                    <ActionButton tone="primary" onClick={() => { setAdvancedResolutionResolved(true); setSelectedUnitId(null); }}>Résoudre la suite</ActionButton>
                  </>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div><strong>Résultat :</strong> les deux ouvriers qui avaient survécu au tuto précédent meurent maintenant.</div>
                    <div style={{ opacity: 0.78, fontSize: 13 }}>À retenir : une protection de résolution n’est pas une immunité permanente. Elle protège pour la résolution en cours ; ensuite, si la pression reste et que l’abri n’est plus valide, l’unité devient vulnérable.</div>
                  </div>
                )}
              </div>
            );
          })() : null}

          {tutorial.id === 16 ? (() => {
            const j1TargetAlive = units.some((unit) => unit.id === "resolution-iv-j1-target");
            const j2TargetAlive = units.some((unit) => unit.id === "resolution-iv-j2-target");
            const j1SupportAlive = units.some((unit) => unit.id === "resolution-iv-j1-support");
            const j2SupportAlive = units.some((unit) => unit.id === "resolution-iv-j2-support");
            return (
              <div style={{ marginTop: 4, padding: 12, borderRadius: 12, background: tutorialDone ? "rgba(22,163,74,0.18)" : "rgba(37,99,235,0.18)", border: tutorialDone ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(96,165,250,0.42)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontWeight: 900 }}>Résolution IV — la pression reste jusqu’à la fin</div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ padding: 10, borderRadius: 10, background: j1TargetAlive ? "rgba(255,255,255,0.06)" : "rgba(34,197,94,0.16)" }}>
                    Soldat J1 ciblé : <strong>{j1TargetAlive ? "vivant" : "mort"}</strong>
                  </div>
                  <div style={{ padding: 10, borderRadius: 10, background: j2TargetAlive ? "rgba(255,255,255,0.06)" : "rgba(34,197,94,0.16)" }}>
                    Soldat J2 ciblé : <strong>{j2TargetAlive ? "vivant" : "mort"}</strong>
                  </div>
                  <div style={{ padding: 10, borderRadius: 10, background: j1SupportAlive ? "rgba(255,255,255,0.06)" : "rgba(248,113,113,0.14)" }}>
                    Soutien J1 : <strong>{j1SupportAlive ? "vivant" : "mort"}</strong>
                  </div>
                  <div style={{ padding: 10, borderRadius: 10, background: j2SupportAlive ? "rgba(255,255,255,0.06)" : "rgba(248,113,113,0.14)" }}>
                    Soutien J2 : <strong>{j2SupportAlive ? "vivant" : "mort"}</strong>
                  </div>
                </div>

                {!resolutionIvResolved ? (
                  <>
                    <div>Avant résolution, chaque soldat central reçoit exactement 2 pressions ennemies. Les deux soutiens ne reçoivent qu’une seule pression.</div>
                    <ActionButton tone="primary" onClick={() => { setResolutionIvResolved(true); setSelectedUnitId(null); }}>Résoudre le 2v2</ActionButton>
                  </>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div><strong>Résultat :</strong> un soldat meurt de chaque côté, pas parce qu’un camp frappe avant l’autre, mais parce que toute la pression est comptée simultanément.</div>
                    <div style={{ opacity: 0.78, fontSize: 13 }}>À retenir : une unité détruite ne retire pas sa pression au milieu de la résolution. Elle disparaît après avoir contribué au résultat complet.</div>
                  </div>
                )}
              </div>
            );
          })() : null}

          {tutorial.id === 17 ? (
            <div style={{ marginTop: 4, padding: 12, borderRadius: 12, background: tutorialDone ? "rgba(22,163,74,0.18)" : "rgba(37,99,235,0.18)", border: tutorialDone ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(96,165,250,0.42)", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>Cartes en place — effet concret</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ padding: 10, borderRadius: 10, background: "rgba(15,23,42,0.82)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  <div style={{ fontWeight: 900 }}>🏆 Carte de points</div>
                  <div style={{ fontSize: 13, opacity: 0.82 }}>Domination du Centre récompense le contrôle du marché central.</div>
                  <div style={{ marginTop: 6, fontWeight: 900 }}>{cardEffectsViewed ? "+2 PV pour J1" : "Effet en place"}</div>
                </div>

                <div style={{ padding: 10, borderRadius: 10, background: "rgba(15,23,42,0.82)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  <div style={{ fontWeight: 900 }}>🌾 Carte d’événement</div>
                  <div style={{ fontSize: 13, opacity: 0.82 }}>Abondance améliore les bâtiments de production.</div>
                  <div style={{ marginTop: 6, fontWeight: 900 }}>{cardEffectsViewed ? "Champ 2→3 🌾 / Mine 2→3 💰" : "Effet en place"}</div>
                </div>
              </div>

              {!cardEffectsViewed ? (
                <>
                  <div>Les cartes sont déjà en place. Elles influencent tous les joueurs tant qu’elles ne sont pas remplacées.</div>
                  <ActionButton tone="primary" onClick={() => setCardEffectsViewed(true)}>Visualiser les effets</ActionButton>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div><strong>Résultat :</strong> les priorités changent : le centre vaut plus cher et la production devient plus rentable.</div>
                  <div style={{ opacity: 0.78, fontSize: 13 }}>À retenir : une carte de points ou d’événement n’est pas du décor. Elle reste en place et modifie la valeur des actions.</div>
                </div>
              )}
            </div>
          ) : null}

          {tutorial.id === 18 ? (
            <div style={{ marginTop: 4, padding: 12, borderRadius: 12, background: sciencePeekDone ? "rgba(22,163,74,0.18)" : "rgba(37,99,235,0.18)", border: sciencePeekDone ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(96,165,250,0.42)", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>Science — contrôle de l’information</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                <div style={{ padding: 10, borderRadius: 10, background: "rgba(15,23,42,0.82)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  <div style={{ fontWeight: 900 }}>1. Comparaison stricte</div>
                  <div style={{ fontSize: 13, opacity: 0.84 }}>J1 : 1 science / J2 : 0 science. J1 gagne car il a strictement plus.</div>
                </div>
                <div style={{ padding: 10, borderRadius: 10, background: "rgba(15,23,42,0.82)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  <div style={{ fontWeight: 900 }}>2. Égalité</div>
                  <div style={{ fontSize: 13, opacity: 0.84 }}>Si les deux joueurs ont autant de science, personne ne gagne l’avantage.</div>
                </div>
                <div style={{ padding: 10, borderRadius: 10, background: "rgba(15,23,42,0.82)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  <div style={{ fontWeight: 900 }}>3. Information privée</div>
                  <div style={{ fontSize: 13, opacity: 0.84 }}>Le joueur qui gagne peut regarder une prochaine carte de points ou d’événement. L’autre joueur ne voit pas forcément cette information.</div>
                </div>
              </div>

              {!sciencePeekDone ? (
                <>
                  <div>J1 a strictement plus de science. Il peut regarder une prochaine carte.</div>
                  <ActionButton tone="primary" onClick={() => setSciencePeekDone(true)}>Regarder une prochaine carte</ActionButton>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ padding: 10, borderRadius: 10, background: "rgba(15,23,42,0.82)", border: "1px solid rgba(34,197,94,0.45)" }}>
                    <div style={{ fontWeight: 900 }}>Carte vue : Abondance</div>
                    <div style={{ fontSize: 13, opacity: 0.84 }}>Tous les bâtiments de production produisent +1 ressource.</div>
                  </div>
                  <div style={{ opacity: 0.78, fontSize: 13 }}>À retenir : la science transforme une part d’aléatoire en information exploitable.</div>
                </div>
              )}
            </div>
          ) : null}

          {tutorial.id === 19 ? (() => {
            const ecoPoints = scoringStep >= 1 ? 2 : 0;
            const militaryPoints = scoringStep >= 2 ? 1 : 0;
            const buildPoints = scoringStep >= 3 ? 1 : 0;
            const totalPoints = ecoPoints + militaryPoints + buildPoints;
            return (
              <div style={{ marginTop: 4, padding: 12, borderRadius: 12, background: tutorialDone ? "rgba(22,163,74,0.18)" : "rgba(37,99,235,0.18)", border: tutorialDone ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(96,165,250,0.42)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontWeight: 900 }}>Victoire et scoring</div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  <div style={{ padding: 10, borderRadius: 10, background: ecoPoints ? "rgba(34,197,94,0.16)" : "rgba(255,255,255,0.06)" }}>Éco : <strong>{ecoPoints}</strong></div>
                  <div style={{ padding: 10, borderRadius: 10, background: militaryPoints ? "rgba(34,197,94,0.16)" : "rgba(255,255,255,0.06)" }}>Militaire : <strong>{militaryPoints}</strong></div>
                  <div style={{ padding: 10, borderRadius: 10, background: buildPoints ? "rgba(34,197,94,0.16)" : "rgba(255,255,255,0.06)" }}>Construction : <strong>{buildPoints}</strong></div>
                  <div style={{ padding: 10, borderRadius: 10, background: totalPoints ? "rgba(96,165,250,0.20)" : "rgba(255,255,255,0.06)" }}>Total : <strong>{totalPoints}</strong></div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                  <div style={{ padding: 10, borderRadius: 10, background: scoringStep >= 1 ? "rgba(34,197,94,0.16)" : "rgba(15,23,42,0.82)", border: "1px solid rgba(255,255,255,0.10)" }}>
                    <div style={{ fontWeight: 900 }}>1. Économie</div>
                    <div style={{ fontSize: 13, opacity: 0.84 }}>Convertir au marché ou contrôler le centre peut donner des PV économiques.</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 10, background: scoringStep >= 2 ? "rgba(34,197,94,0.16)" : "rgba(15,23,42,0.82)", border: "1px solid rgba(255,255,255,0.10)" }}>
                    <div style={{ fontWeight: 900 }}>2. Militaire</div>
                    <div style={{ fontSize: 13, opacity: 0.84 }}>Détruire ou menacer au bon moment peut créer des points militaires, selon les cartes en place.</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 10, background: scoringStep >= 3 ? "rgba(34,197,94,0.16)" : "rgba(15,23,42,0.82)", border: "1px solid rgba(255,255,255,0.10)" }}>
                    <div style={{ fontWeight: 900 }}>3. Construction</div>
                    <div style={{ fontSize: 13, opacity: 0.84 }}>Construire des bâtiments développe ton moteur et peut aussi rapporter des PV.</div>
                  </div>
                </div>

                {scoringStep < 3 ? (
                  <ActionButton tone="primary" onClick={() => setScoringStep((step) => Math.min(3, step + 1))}>Exemple suivant</ActionButton>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div><strong>À retenir :</strong> tu ne gagnes pas en faisant tout. Tu gagnes en lisant quelle source de points est la plus rentable maintenant.</div>
                    <div style={{ opacity: 0.78, fontSize: 13 }}>Les cartes de points orientent cette lecture : elles changent ce qui vaut vraiment cher dans la partie.</div>
                  </div>
                )}
              </div>
            );
          })() : null}

          {tutorial.id === 20 ? (() => {
            const phase = MINI_TUTORIAL_PHASES[miniGameStep] ?? MINI_TUTORIAL_PHASES[0];
            const phaseKey = phase.key;
            const miniBuilding = createMiniTutorialBuilding(miniPlacedCard);
            const workerInsideMiniBuilding = Boolean(miniBuilding && isCellInsideBuilding(miniBuilding, miniWorkerPosition.x, miniWorkerPosition.y));
            const placedCardName = miniPlacedCard === "school" ? "École" : miniPlacedCard === "barracks_1" ? "Caserne I" : "aucun";
            const canBuyWorker = !miniBoughtWorker && miniResources.food >= 5;
            const canBuySoldier = miniPlacedCard === "barracks_1" && workerInsideMiniBuilding && !miniBoughtSoldier && miniResources.food >= 2 && miniResources.gold >= 1;
            const canUseScience = miniPlacedCard === "school" && workerInsideMiniBuilding;

            return (
              <div style={{ marginTop: 4, padding: 12, borderRadius: 12, background: miniGameDone ? "rgba(22,163,74,0.18)" : "rgba(37,99,235,0.18)", border: miniGameDone ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(96,165,250,0.42)", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontWeight: 900 }}>Tour 1 guidé — J1 interactif / J2 IA</div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>🌾 Nourriture : <strong>{miniResources.food}</strong></div>
                  <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>💰 Or : <strong>{miniResources.gold}</strong></div>
                  <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>🏆 PV : <strong>{miniResources.vp}</strong></div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 7 }}>
                  {MINI_TUTORIAL_PHASES.map((item, index) => {
                    const isCurrent = index === miniGameStep && !miniGameDone;
                    const isPast = index < miniGameStep || miniGameDone;
                    return (
                      <div
                        key={item.key}
                        style={{
                          padding: 9,
                          borderRadius: 10,
                          border: isCurrent ? "1px solid rgba(96,165,250,0.70)" : isPast ? "1px solid rgba(34,197,94,0.42)" : "1px solid rgba(255,255,255,0.10)",
                          background: isCurrent ? "rgba(37,99,235,0.22)" : isPast ? "rgba(34,197,94,0.12)" : "rgba(15,23,42,0.82)",
                          opacity: isCurrent || isPast ? 1 : 0.58,
                        }}
                      >
                        <div style={{ fontWeight: 900 }}>{isPast ? "✓ " : isCurrent ? "▶ " : "○ "}{item.title}</div>
                        {isCurrent ? <div style={{ marginTop: 3, fontSize: 13, opacity: 0.84 }}>{item.detail}</div> : null}
                      </div>
                    );
                  })}
                </div>

                {phaseKey === "turn1_player1_place" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div><strong>Action J1 :</strong> choisis une carte, puis clique sur son emplacement vert sur le plateau.</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {["school", "barracks_1"].map((cardKey) => {
                        const cost = getMiniTutorialCardCost(cardKey);
                        const affordable = canAffordMiniCost(miniResources, cost);
                        const selected = miniSelectedCard === cardKey;
                        return (
                          <button
                            key={cardKey}
                            type="button"
                            disabled={!affordable || Boolean(miniPlacedCard)}
                            onClick={() => setMiniSelectedCard(cardKey)}
                            style={{ textAlign: "left", borderRadius: 12, border: selected ? "2px solid #facc15" : "1px solid rgba(96,165,250,0.42)", padding: 12, background: "rgba(15,23,42,0.85)", color: "white", cursor: affordable && !miniPlacedCard ? "pointer" : "not-allowed", opacity: affordable ? 1 : 0.55 }}
                          >
                            <div style={{ fontWeight: 900, marginBottom: 4 }}>{cardKey === "school" ? "École" : "Caserne I"}</div>
                            <div style={{ fontSize: 13, opacity: 0.82 }}>Coût : {formatCost(cost)}. {cardKey === "school" ? "Ouvre la science en fin de tour." : "Permet de recruter un soldat si un ouvrier l’active."}</div>
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ opacity: 0.78, fontSize: 13 }}>{miniSelectedCard ? "Emplacement vert allumé : clique dessus pour poser la carte." : "Aucune carte sélectionnée."}</div>
                  </div>
                ) : null}

                {phaseKey === "turn1_player1_worker" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div><strong>Bâtiment posé :</strong> {placedCardName}. Maintenant, clique sur l’ouvrier puis déplace-le dans ce bâtiment.</div>
                    <div style={{ opacity: 0.78, fontSize: 13 }}>{selectedUnitId === "mini-j1-worker" ? "Cases atteignables visibles. Le déplacement doit finir dans le bâtiment posé." : "Action : clique sur l’ouvrier J1."}</div>
                  </div>
                ) : null}

                {phaseKey === "turn1_player2_ai" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div><strong>IA J2 :</strong> son ouvrier va dans sa Mine d’or. Ce choix est automatique.</div>
                    <ActionButton tone="primary" onClick={() => setMiniGameStep(3)}>Jouer la phase J2 IA</ActionButton>
                  </div>
                ) : null}

                {phaseKey === "turn1_military_j1" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div><strong>Mouvement militaire J1 :</strong> clique sur ton soldat, puis avance-le vers le centre.</div>
                    <div style={{ opacity: 0.78, fontSize: 13 }}>{selectedUnitId === "mini-j1-soldier" ? "Cases atteignables visibles. Choisis une case d’approche." : "Action : clique sur ton soldat J1."}</div>
                  </div>
                ) : null}

                {phaseKey === "turn1_military_j2_ai" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div><strong>IA J2 :</strong> le soldat J2 avance aussi vers le centre. Aucun combat n’est résolu pendant le mouvement.</div>
                    <ActionButton tone="primary" onClick={() => setMiniGameStep(5)}>Jouer le mouvement militaire J2</ActionButton>
                  </div>
                ) : null}

                {phaseKey === "turn1_resolve" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div><strong>Résolution :</strong> on applique les pressions. Ici, personne n’atteint son seuil de mort.</div>
                    <ActionButton tone="primary" onClick={() => setMiniGameStep(6)}>Résoudre la pression</ActionButton>
                  </div>
                ) : null}

                {phaseKey === "turn1_buy" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div><strong>Achats J1 :</strong> achète au moins une chose pour valider la phase. J2 IA passe.</div>
                    <button
                      type="button"
                      disabled={!canBuyWorker}
                      onClick={() => {
                        if (!canBuyWorker) return;
                        setMiniBoughtWorker(true);
                        setMiniResources((resources) => ({ ...resources, food: resources.food - 5 }));
                      }}
                      style={{ textAlign: "left", borderRadius: 12, border: miniBoughtWorker ? "1px solid rgba(34,197,94,0.55)" : "1px solid rgba(96,165,250,0.42)", padding: 12, background: "rgba(15,23,42,0.85)", color: "white", cursor: canBuyWorker ? "pointer" : "not-allowed", opacity: canBuyWorker || miniBoughtWorker ? 1 : 0.55 }}
                    >
                      <div style={{ fontWeight: 900 }}>{miniBoughtWorker ? "✓ " : ""}Acheter un ouvrier — 5 🌾</div>
                      <div style={{ fontSize: 13, opacity: 0.82 }}>Spawn sur la Chaumière de départ.</div>
                    </button>
                    <button
                      type="button"
                      disabled={!canBuySoldier}
                      onClick={() => {
                        if (!canBuySoldier) return;
                        setMiniBoughtSoldier(true);
                        setMiniResources((resources) => ({ ...resources, food: resources.food - 2, gold: resources.gold - 1 }));
                      }}
                      style={{ textAlign: "left", borderRadius: 12, border: miniBoughtSoldier ? "1px solid rgba(34,197,94,0.55)" : "1px solid rgba(96,165,250,0.42)", padding: 12, background: "rgba(15,23,42,0.85)", color: "white", cursor: canBuySoldier ? "pointer" : "not-allowed", opacity: canBuySoldier || miniBoughtSoldier ? 1 : 0.55 }}
                    >
                      <div style={{ fontWeight: 900 }}>{miniBoughtSoldier ? "✓ " : ""}Acheter un soldat — 2 🌾 + 1 💰</div>
                      <div style={{ fontSize: 13, opacity: 0.82 }}>{miniPlacedCard === "barracks_1" ? "Possible seulement si l’ouvrier est dans la Caserne." : "Bloqué : tu as choisi l’École, pas la Caserne."}</div>
                    </button>
                    <ActionButton disabled={!miniBoughtWorker && !miniBoughtSoldier} tone="primary" onClick={() => setMiniGameStep(7)}>Valider les achats</ActionButton>
                  </div>
                ) : null}

                {phaseKey === "turn1_economy" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div><strong>Économie :</strong> tu n’as pas encore de marché. Il n’y a donc pas de conversion en PV au tour 1.</div>
                    <ActionButton tone="primary" onClick={() => setMiniGameStep(8)}>Passer l’économie</ActionButton>
                  </div>
                ) : null}

                {phaseKey === "turn1_production" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div><strong>Production :</strong> Champ +2 🌾 et Mine +2 💰. J2 produit aussi automatiquement.</div>
                    <ActionButton
                      tone="primary"
                      disabled={miniProductionDone}
                      onClick={() => {
                        setMiniProductionDone(true);
                        setMiniResources((resources) => ({ ...resources, food: resources.food + 2, gold: resources.gold + 2 }));
                        setMiniGameStep(9);
                      }}
                    >
                      Produire
                    </ActionButton>
                  </div>
                ) : null}

                {phaseKey === "turn1_science" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {canUseScience ? (
                      <>
                        <div><strong>Science :</strong> ton École est active. Tu peux regarder une prochaine carte.</div>
                        {!miniScienceDone ? (
                          <ActionButton tone="primary" onClick={() => setMiniScienceDone(true)}>Regarder une prochaine carte</ActionButton>
                        ) : (
                          <div style={{ padding: 10, borderRadius: 10, background: "rgba(15,23,42,0.82)", border: "1px solid rgba(34,197,94,0.45)" }}>
                            <div style={{ fontWeight: 900 }}>Carte vue : Domination du Centre</div>
                            <div style={{ fontSize: 13, opacity: 0.84 }}>Cette information prépare tes choix du tour 2.</div>
                          </div>
                        )}
                        <ActionButton disabled={!miniScienceDone} tone="primary" onClick={() => setMiniGameStep(10)}>Finir la science</ActionButton>
                      </>
                    ) : (
                      <>
                        <div><strong>Science :</strong> pas d’École active. La phase est donc passée.</div>
                        <ActionButton tone="primary" onClick={() => setMiniGameStep(10)}>Passer la science</ActionButton>
                      </>
                    )}
                  </div>
                ) : null}

                {phaseKey === "turn2_player1" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div><strong>Début du tour 2 :</strong> on revient à la phase J1. C’est exactement la boucle normale : préparation, mouvements, résolution, achats, économie, production, science.</div>
                    <ActionButton tone="success" onClick={() => setMiniGameDone(true)}>Terminer le tuto</ActionButton>
                  </div>
                ) : null}

                {miniGameDone ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div><strong>Tuto terminé.</strong></div>
                    <div style={{ opacity: 0.78, fontSize: 13 }}>Tu as joué un tour 1 complet avec J1, pendant que J2 suivait une IA préparée, puis tu as ouvert la phase J1 du tour 2.</div>
                  </div>
                ) : null}
              </div>
            );
          })() : null}

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 8 }}>
            <ActionButton disabled={tutorial.id <= 1} onClick={() => resetTutorialState(Math.max(1, tutorial.id - 1))}>← Précédent</ActionButton>
            <ActionButton
              tone={tutorialDone ? "primary" : "neutral"}
              disabled={!tutorialDone}
              onClick={() => {
                if (tutorial.id >= TUTORIALS.length) resetTutorialState(null);
                else resetTutorialState(tutorial.id + 1);
              }}
            >
              {tutorial.id >= TUTORIALS.length ? "Terminer" : "Continuer →"}
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
