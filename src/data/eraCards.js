export const ERA_POINT_CARDS = [
  {
    key: 'commerce_age',
    name: 'Âge du Commerce',
    type: 'points',
    text: '+1 PV supplémentaire à chaque conversion.',
  },
  {
    key: 'builders_age',
    name: 'Âge des Bâtisseurs',
    type: 'points',
    text: '+2 PV pour chaque bâtiment construit pendant l’ère.',
  },
  {
    key: 'war_age',
    name: 'Âge de la Guerre',
    type: 'points',
    text: '+1 PV par unité ennemie détruite.',
  },
  {
    key: 'center_domination',
    name: 'Domination du Centre',
    type: 'points',
    text: '+2 PV à la fin du tour si tu contrôles le marché central.',
  },
  {
    key: 'demographic_growth',
    name: 'Croissance Démographique',
    type: 'points',
    text: '+1 PV par tranche de 2 unités à la fin de l’ère.',
  },
];

export const ERA_EVENT_CARDS = [
  {
    key: 'abundance',
    name: 'Abondance',
    type: 'event',
    text: 'Tous les bâtiments produisent +1 ressource.',
  },
  {
    key: 'instability',
    name: 'Instabilité',
    type: 'event',
    text: 'Les bâtiments passent en feu avec 2 pressions au lieu de 3.',
  },
  {
    key: 'rare_metal',
    name: 'Métal Rare',
    type: 'event',
    text: 'Tous les joueurs produisent -1 métal par tour.',
  },
  {
    key: 'recruitment',
    name: 'Recrutement',
    type: 'event',
    text: 'Les ouvriers coûtent -1 nourriture.',
  },
  {
    key: 'housing_crisis',
    name: 'Crise du Logement',
    type: 'event',
    text: '-2 logement pour tous les joueurs.',
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

export function createShuffledEraDecks() {
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
