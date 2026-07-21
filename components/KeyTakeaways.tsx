export function KeyTakeaways({ points, title = "The headline, before the detail" }: { points: string[]; title?: string }) {
  return (
    <div className="card" style={{ padding: "26px 30px", border: "1px solid var(--border)", borderLeft: "3px solid var(--amber)" }}>
      <div className="eyebrow" style={{ marginBottom: 16 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {points.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div
              style={{
                flex: "none",
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "rgba(201,168,76,0.12)",
                color: "var(--amber)",
                fontFamily: "var(--mono)",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 1,
              }}
            >
              {i + 1}
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink)" }}>{p}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
