export default function Sidebar({
  title,
  resources,
  housingUsed,
  housingCapacity,
  points = 0,
  production = null,
  science = 0,
  children = null,
}) {
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

      {/* RESSOURCES */}
      <div style={{ marginBottom: 12 }}>
        <strong>Ressources</strong>
      </div>

      <div>🌾 Nourriture : {resources.food}</div>
      <div>💰 Or : {resources.gold}</div>

      {/* PRODUCTION */}
      {production && (
        <>
          <div style={{ marginTop: 16 }}>
            <strong>Production / tour</strong>
          </div>
          <div>🌾 {production.food} | 💰 {production.gold}</div>
        </>
      )}

      {/* SCIENCE */}
      <div style={{ marginTop: 16 }}>
        <strong>Science</strong>
      </div>
      <div>{science}</div>

      {/* LOGEMENT */}
      <div style={{ marginTop: 16 }}>
        <strong>Logements</strong>
      </div>
      <div>
        {housingUsed} / {housingCapacity}
      </div>

      {/* SCORE */}
      <div style={{ marginTop: 16 }}>
        <strong>PV</strong>
      </div>
      <div>{points}</div>

      {children}
    </div>
  );
}