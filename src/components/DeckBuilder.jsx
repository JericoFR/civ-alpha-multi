import { useMemo, useRef, useState } from "react";
import { CARD_DEFS } from "../data/cards";

function ActionButton({ children, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: "none",
        borderRadius: 12,
        padding: "10px 14px",
        background: disabled ? "#475569" : "#334155",
        color: "white",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 600,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  );
}

function getCardCostLabel(card) {
  const bits = [];
  if (card.cost?.food) bits.push(`${card.cost.food} 🌾`);
  if (card.cost?.gold) bits.push(`${card.cost.gold} 💰`);
  return bits.length > 0 ? bits.join(" ") : "gratuit";
}

function getCardImageSrc(card) {
  return `/cards/${card.id ?? card.key}.png`;
}

function normalizeCardList() {
  return Object.values(CARD_DEFS)
    .map((card) => ({
      ...card,
      id: card.id ?? card.key,
    }))
    .sort((a, b) => {
      const eraA = Number(a.era ?? 99);
      const eraB = Number(b.era ?? 99);
      if (eraA !== eraB) return eraA - eraB;
      return String(a.name ?? "").localeCompare(String(b.name ?? ""), "fr");
    });
}

function createEmptyDeck() {
  return {
    name: "Mon deck",
    cards: {},
  };
}

function countDeckCards(deck) {
  return Object.values(deck.cards ?? {}).reduce((sum, qty) => sum + Number(qty || 0), 0);
}

function getDeckEntries(deck, allCards) {
  const byId = new Map(allCards.map((card) => [card.id, card]));
  return Object.entries(deck.cards ?? {})
    .filter(([, qty]) => Number(qty) > 0)
    .map(([cardId, qty]) => ({
      cardId,
      qty: Number(qty),
      card: byId.get(cardId) ?? null,
    }))
    .sort((a, b) => {
      const eraA = Number(a.card?.era ?? 99);
      const eraB = Number(b.card?.era ?? 99);
      if (eraA !== eraB) return eraA - eraB;
      return String(a.card?.name ?? a.cardId).localeCompare(String(b.card?.name ?? b.cardId), "fr");
    });
}

export default function DeckBuilder({ onBack, onUseDeck }) {
  const fileInputRef = useRef(null);
  const [deck, setDeck] = useState(createEmptyDeck());
  const [search, setSearch] = useState("");
  const [showOnlyInDeck, setShowOnlyInDeck] = useState(false);
  const [statusText, setStatusText] = useState("Deck builder prêt.");
  const [imageErrors, setImageErrors] = useState({});
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [hoveredDeckCardId, setHoveredDeckCardId] = useState(null);

  const allCards = useMemo(() => normalizeCardList(), []);
  const deckEntries = useMemo(() => getDeckEntries(deck, allCards), [deck, allCards]);
  const totalCards = useMemo(() => countDeckCards(deck), [deck]);

  const filteredCards = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();

    return allCards.filter((card) => {
      const qty = Number(deck.cards?.[card.id] ?? 0);

      if (showOnlyInDeck && qty <= 0) return false;
      if (!lowerSearch) return true;

      const haystack = [
        card.name,
        card.id,
        card.category,
        card.subCategory,
        card.text,
        card.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(lowerSearch);
    });
  }, [allCards, deck, search, showOnlyInDeck]);

  function setDeckName(nextName) {
    setDeck((prev) => ({
      ...prev,
      name: nextName,
    }));
  }

  function addCard(cardId) {
    setDeck((prev) => {
      const current = Number(prev.cards?.[cardId] ?? 0);
      return {
        ...prev,
        cards: {
          ...prev.cards,
          [cardId]: current + 1,
        },
      };
    });
  }

  function removeCard(cardId) {
    setDeck((prev) => {
      const current = Number(prev.cards?.[cardId] ?? 0);
      const nextQty = Math.max(0, current - 1);
      const nextCards = { ...prev.cards };

      if (nextQty <= 0) {
        delete nextCards[cardId];
      } else {
        nextCards[cardId] = nextQty;
      }

      return {
        ...prev,
        cards: nextCards,
      };
    });
  }

  function clearDeck() {
    setDeck(createEmptyDeck());
    setStatusText("Deck vidé.");
  }

  function fillTestDeckUnlimited() {
    const nextCards = {};
    allCards.forEach((card) => {
      nextCards[card.id] = 99;
    });

    setDeck({
      name: "Deck test illimité",
      cards: nextCards,
    });
    setStatusText("Deck test illimité chargé.");
  }

  function downloadDeck() {
    try {
      const payload = {
        name: deck.name?.trim() || "Mon deck",
        cards: deck.cards ?? {},
      };

      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      const safeName = (payload.name || "mon-deck")
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/gi, "-")
        .replace(/^-+|-+$/g, "");

      a.href = url;
      a.download = `${safeName || "mon-deck"}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setStatusText("Deck sauvegardé en JSON.");
    } catch (error) {
      console.error(error);
      setStatusText("Erreur pendant la sauvegarde du deck.");
    }
  }

    function useDeckForSolo() {
    try {
      const payload = {
        name: deck.name?.trim() || "Mon deck",
        format: "alpha-v1",
        cards: deck.cards ?? {},
      };

      localStorage.setItem("civ-alpha-selected-deck", JSON.stringify(payload));
      setStatusText(`Deck sélectionné pour le solo : ${payload.name}`);

      if (onUseDeck) {
        onUseDeck(payload);
      }
    } catch (error) {
      console.error(error);
      setStatusText("Erreur pendant la sélection du deck solo.");
    }
  }

    function useDeckForMulti() {
  try {
    const hasCards = Object.values(deck.cards ?? {}).some((qty) => Number(qty) > 0);

    if (!hasCards) {
      setStatusText("Choisis d'abord un vrai deck avant de l'utiliser en multi.");
      return;
    }

    const payload = {
      name: deck.name?.trim() || "Mon deck",
      format: "alpha-v1",
      cards: deck.cards ?? {},
      isExplicitChoice: true,
    };

    localStorage.setItem("civ-alpha-selected-multi-deck", JSON.stringify(payload));

    if (onUseDeck) {
      onUseDeck(payload);
    }

    setStatusText(`Deck envoyé pour le multi : ${payload.name}`);
  } catch (error) {
    console.error(error);
    setStatusText("Erreur pendant la sélection du deck multi.");
  }
}

function useBaseDeckForMulti() {
  try {
    const payload = {
      name: "Deck de base",
      format: "alpha-v1",
      cards: {},
      isExplicitChoice: true,
      preset: "base",
    };

    localStorage.setItem("civ-alpha-selected-multi-deck", JSON.stringify(payload));

    if (onUseDeck) {
      onUseDeck(payload);
    }

    setStatusText("Deck de base sélectionné pour le multi.");
  } catch (error) {
    console.error(error);
    setStatusText("Erreur pendant la sélection du deck de base.");
  }
}  

function useTestDeckForMulti() {
  try {
    const nextCards = {};

    allCards.forEach((card) => {
      nextCards[card.id] = 99;
    });

    const payload = {
      name: "Deck test",
      format: "alpha-v1",
      cards: nextCards,
      isExplicitChoice: true,
      preset: "test",
    };

    localStorage.setItem("civ-alpha-selected-multi-deck", JSON.stringify(payload));

    if (onUseDeck) {
      onUseDeck(payload);
    }

    setStatusText("Deck test sélectionné pour le multi.");
  } catch (error) {
    console.error(error);
    setStatusText("Erreur pendant la sélection du deck test.");
  }
}


function validateImportedDeck(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Format invalide.");
    }

    const nextName = typeof data.name === "string" && data.name.trim() ? data.name.trim() : "Deck importé";
    const nextCards = {};

    if (!data.cards || typeof data.cards !== "object") {
      throw new Error("Le champ cards est manquant.");
    }

    for (const [cardId, qty] of Object.entries(data.cards)) {
      const exists = allCards.some((card) => card.id === cardId);
      if (!exists) continue;

      const parsedQty = Number(qty);
      if (!Number.isFinite(parsedQty) || parsedQty <= 0) continue;

      nextCards[cardId] = Math.floor(parsedQty);
    }

    return {
      name: nextName,
      cards: nextCards,
    };
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validatedDeck = validateImportedDeck(parsed);
      setDeck(validatedDeck);
      setStatusText(`Deck chargé : ${validatedDeck.name}`);
    } catch (error) {
      console.error(error);
      setStatusText("Import impossible : JSON invalide ou format incorrect.");
    } finally {
      event.target.value = "";
    }
  }

  function handleImageError(cardId) {
    setImageErrors((prev) => ({
      ...prev,
      [cardId]: true,
    }));
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        display: "flex",
        flexDirection: "column",
        padding: 20,
        gap: 16,
      }}
    >
      <div
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 18,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30 }}>Deck Builder</h1>
            <div style={{ marginTop: 6, fontSize: 14, opacity: 0.8 }}>
              V1 locale : construire, sauvegarder, recharger un deck JSON.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
  <ActionButton onClick={onBack}>Retour</ActionButton>
  <ActionButton onClick={fillTestDeckUnlimited}>Deck test</ActionButton>
  <ActionButton onClick={clearDeck}>Vider</ActionButton>
  <ActionButton onClick={downloadDeck}>Sauvegarder JSON</ActionButton>
  <ActionButton onClick={() => fileInputRef.current?.click()}>Charger JSON</ActionButton>
  <ActionButton onClick={useBaseDeckForMulti}>
  Utiliser deck de base (multi)
</ActionButton>
<ActionButton onClick={useTestDeckForMulti}>
  Utiliser deck test (multi)
</ActionButton>
  <ActionButton onClick={useDeckForMulti}>Utiliser ce deck en multi</ActionButton>
  <ActionButton onClick={useDeckForSolo}>Utiliser en solo</ActionButton>
</div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 340px) 1fr auto",
            gap: 10,
            alignItems: "center",
          }}
        >
          <input
            value={deck.name}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Nom du deck"
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#0f172a",
              color: "white",
              padding: "12px 14px",
              width: "100%",
            }}
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une carte..."
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#0f172a",
              color: "white",
              padding: "12px 14px",
              width: "100%",
            }}
          />

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#172036",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: "10px 12px",
              whiteSpace: "nowrap",
            }}
          >
            <input
              type="checkbox"
              checked={showOnlyInDeck}
              onChange={(e) => setShowOnlyInDeck(e.target.checked)}
            />
            Seulement le deck
          </label>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            fontSize: 14,
          }}
        >
          <div
            style={{
              background: "#172036",
              borderRadius: 12,
              padding: "10px 12px",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <strong>Deck :</strong> {deck.name || "Sans nom"}
          </div>

          <div
            style={{
              background: "#172036",
              borderRadius: 12,
              padding: "10px 12px",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <strong>Total cartes :</strong> {totalCards}
          </div>

          <div
            style={{
              background: "#172036",
              borderRadius: 12,
              padding: "10px 12px",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <strong>Status :</strong> {statusText}
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 0.9fr)",
          gap: 16,
          minHeight: 0,
        }}
      >
        <div
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 18,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 20 }}>Pool de cartes</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 12,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {filteredCards.map((card) => {
              const qty = Number(deck.cards?.[card.id] ?? 0);
              const hasImage = !imageErrors[card.id];

              return (
                <div
                  key={card.id}
                  onMouseEnter={() => setHoveredCardId(card.id)}
                  onMouseLeave={() => setHoveredCardId((current) => (current === card.id ? null : current))}
                  style={{
                    background: "#172036",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 16,
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    minHeight: 280,
                    overflow: "visible",
                    transform: hoveredCardId === card.id ? "scale(1.12)" : "scale(1)",
                    transformOrigin: "center center",
                    transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
                    zIndex: hoveredCardId === card.id ? 20 : 1,
                    boxShadow: hoveredCardId === card.id ? "0 22px 40px rgba(0,0,0,0.35)" : "none",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      borderRadius: 12,
                      overflow: "hidden",
                      background: "#0b1220",
                      border: "1px solid rgba(255,255,255,0.06)",
                      minHeight: 180,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {hasImage ? (
                      <img
                        src={getCardImageSrc(card)}
                        alt={card.name}
                        onError={() => handleImageError(card.id)}
                        style={{
                          display: "block",
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          padding: 12,
                          textAlign: "center",
                          fontSize: 14,
                          opacity: 0.8,
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>{card.name}</div>
                        <div>PNG absent</div>
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                          {getCardImageSrc(card)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ fontWeight: 700, fontSize: 16 }}>{card.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.78 }}>
                    Ère {card.era ?? "?"} · {card.category ?? "?"} · {card.subCategory ?? "?"}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.86, lineHeight: 1.35 }}>
                    {card.text ?? "Aucun texte."}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>
                    Coût : {getCardCostLabel(card)}
                  </div>

                  <div
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>Dans le deck : {qty}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <ActionButton onClick={() => removeCard(card.id)} disabled={qty <= 0}>
                        -
                      </ActionButton>
                      <ActionButton onClick={() => addCard(card.id)}>+</ActionButton>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredCards.length === 0 ? (
              <div style={{ opacity: 0.7 }}>Aucune carte trouvée.</div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 18,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 20 }}>Deck actuel</div>

          <div
            style={{
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              paddingRight: 4,
              overflowX: "visible",
            }}
          >
            {deckEntries.length === 0 ? (
              <div style={{ opacity: 0.72 }}>Aucune carte dans le deck.</div>
            ) : (
              deckEntries.map(({ cardId, qty, card }) => (
                <div
                  key={cardId}
                  onMouseEnter={() => setHoveredDeckCardId(cardId)}
                  onMouseLeave={() => setHoveredDeckCardId((current) => (current === cardId ? null : current))}
                  style={{
                    background: "#172036",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 14,
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    overflow: "visible",
                    transform: hoveredDeckCardId === cardId ? "scale(1.06)" : "scale(1)",
                    transformOrigin: "left center",
                    transition: "transform 160ms ease, box-shadow 160ms ease",
                    zIndex: hoveredDeckCardId === cardId ? 20 : 1,
                    boxShadow: hoveredDeckCardId === cardId ? "0 18px 30px rgba(0,0,0,0.28)" : "none",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{card?.name ?? cardId}</div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        {card ? `Ère ${card.era ?? "?"} · ${card.category ?? "?"}` : "Carte inconnue"}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800 }}>x{qty}</div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <ActionButton onClick={() => removeCard(cardId)}>Retirer 1</ActionButton>
                    <ActionButton onClick={() => addCard(cardId)}>Ajouter 1</ActionButton>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}