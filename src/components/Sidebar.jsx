import { CARD_DEFS, getPrimaryCardImage } from "../data/cards";

function normalizePoints(points) {
  if (typeof points === "number") {
    return {
      eco: points,
      military: 0,
      build: 0,
    };
  }

  return {
    eco: points?.eco ?? 0,
    military: points?.military ?? 0,
    build: points?.build ?? 0,
  };
}

export default function Sidebar({
  title,
  resources,
  housingUsed,
  housingCapacity,
  points = 0,
  production = null,
  science = 0,
  leaderKey = null,
  children = null,
}) {
  const normalizedPoints = normalizePoints(points);
  const totalPoints =
    normalizedPoints.eco + normalizedPoints.military + normalizedPoints.build;
  const leader = leaderKey ? CARD_DEFS[leaderKey] : null;

  return (
    <div
      style={{
        width: "100%",
        background: "#1e293b",
        color: "white",
        borderRadius: 16,
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: 20 }}>{title}</h2>

      {leader ? (
        <div
          style={{
            marginBottom: 14,
            padding: 10,
            borderRadius: 12,
            border: "1px solid rgba(250, 204, 21, 0.45)",
            background: "rgba(15, 23, 42, 0.72)",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>Banc</div>
          <div style={{ marginTop: 6, fontSize: 11, opacity: 0.65 }}>Leader</div>

          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 6 }}>
            <img
              src={getPrimaryCardImage(leader)}
              alt={leader.name}
              style={{
                width: 54,
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.18)",
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 14 }}>{leader.name}</div>
              <div style={{ fontSize: 11, opacity: 0.82, lineHeight: 1.25, marginTop: 3 }}>
                {leader.text}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ marginBottom: 12 }}>
        <strong>Ressources</strong>
      </div>

      <div>🌾 Nourriture : {resources.food}</div>
      <div>💰 Or : {resources.gold}</div>

      {production && (
        <>
          <div style={{ marginTop: 16 }}>
            <strong>Production / tour</strong>
          </div>
          <div>🌾 {production.food} | 💰 {production.gold}</div>
        </>
      )}

      <div style={{ marginTop: 16 }}>
        <strong>Science</strong>
      </div>
      <div>{science}</div>

      <div style={{ marginTop: 16 }}>
        <strong>Logements</strong>
      </div>
      <div>
        {housingUsed} / {housingCapacity}
      </div>

      <div style={{ marginTop: 16 }}>
        <strong>PV</strong>
      </div>
      <div>Total : {totalPoints}</div>
      <div style={{ marginTop: 6, fontSize: 14, opacity: 0.9 }}>
        💰 Éco : {normalizedPoints.eco}
      </div>
      <div style={{ fontSize: 14, opacity: 0.9 }}>
        ⚔️ Militaire : {normalizedPoints.military}
      </div>
      <div style={{ fontSize: 14, opacity: 0.9 }}>
        🏗️ Construction : {normalizedPoints.build}
      </div>

      {children}
    </div>
  );
}
