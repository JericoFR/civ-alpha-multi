export const ERA_POINT_CARDS = [
  {
    key: "commerce_age",
    name: "Âge du Commerce",
    type: "points",
    category: "stable",
    text: "+1 PV supplémentaire à chaque conversion.",
  },
  {
    key: "builders_age",
    name: "Âge des Bâtisseurs",
    type: "points",
    category: "stable",
    text: "+2 PV supplémentaires à chaque bâtiment construit.",
  },
  {
    key: "war_age",
    name: "Âge de la Guerre",
    type: "points",
    category: "opportuniste",
    text: "+1 PV supplémentaire par unité ennemie détruite pendant une résolution militaire.",
  },
  {
    key: "center_domination",
    name: "Domination du Centre",
    type: "points",
    category: "position",
    text: "+2 PV à la fin du tour si tu contrôles le marché central.",
  },
  {
    key: "demographic_growth",
    name: "Croissance Démographique",
    type: "points",
    category: "stable",
    text: "À la fin de chaque tour, +1 PV par tranche de 2 unités.",
  },
  {
    key: "economic_expansion",
    name: "Expansion Économique",
    type: "points",
    category: "stable",
    text: "À chaque production, si tu produis au moins 3 ressources, +1 PV.",
  },
  {
    key: "military_pressure",
    name: "Pression Militaire",
    type: "points",
    category: "opportuniste",
    text: "À la fin du tour, si au moins une unité ennemie est sous pression létale, +1 PV.",
  },
  {
    key: "science_dominance",
    name: "Supériorité Scientifique",
    type: "points",
    category: "science",
    text: "À la fin du tour, si tu as strictement plus de science, +1 PV.",
  },
];

export const ERA_EVENT_CARDS = [
  {
    key: "abundance",
    name: "Abondance",
    type: "event",
    category: "production",
    text: "Tous les bâtiments de production produisent +1 ressource.",
  },
  {
    key: "instability",
    name: "Instabilité",
    type: "event",
    category: "combat",
    text: "Les bâtiments passent en feu avec 2 pressions au lieu de 3.",
  },
  {
    key: "gold_tension",
    name: "Tension sur l’Or",
    type: "event",
    category: "economy",
    text: "Les bâtiments d’or produisent -1.",
  },
  {
    key: "recruitment",
    name: "Recrutement",
    type: "event",
    category: "population",
    text: "Les ouvriers coûtent -1 nourriture.",
  },
  {
    key: "housing_crisis",
    name: "Crise du Logement",
    type: "event",
    category: "housing",
    text: "-2 logement pour tous les joueurs.",
  },
  {
    key: "blockade",
    name: "Blocus",
    type: "event",
    category: "economy",
    text: "Les marchés personnels ne peuvent pas être utilisés.",
  },
  {
    key: "military_subsidies",
    name: "Subventions Militaires",
    type: "event",
    category: "military",
    text: "Les unités militaires coûtent -1 or, minimum 0.",
  },
  {
    key: "fortifications",
    name: "Fortifications",
    type: "event",
    category: "defense",
    text: "Les bâtiments nécessitent 1 pression supplémentaire pour passer en feu.",
  },
];

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createShuffledGlobalCardDecks() {
  const pointDeck = shuffle(ERA_POINT_CARDS);
  const eventDeck = shuffle(ERA_EVENT_CARDS);

  return {
    pointDeck,
    eventDeck,
    activePointCard: pointDeck[0] ?? null,
    activeEventCard: eventDeck[0] ?? null,
    remainingPointDeck: pointDeck.slice(1),
    remainingEventDeck: eventDeck.slice(1),
  };
}

export function createShuffledEraDecks() {
  return createShuffledGlobalCardDecks();
}
