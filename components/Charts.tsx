import { fmt } from "@/lib/format";

const TONE: Record<string, string> = {
  cold: "var(--cold)",
  warm: "var(--warm)",
  hot: "var(--hot)",
  amber: "var(--amber)",
  muted: "var(--muted)",
  bad: "var(--bad)",
};

export function Ring({
  value,
  total,
  centerLabel,
}: {
  value: number | null;
  total: number | null;
  centerLabel?: string;
}) {
  const v = value ?? 0;
  const t = total ?? 0;
  const pctNum = t > 0 ? Math.round((v / t) * 100) : 0;
  const R = 78;
  const C = 2 * Math.PI * R;
  const dash = (Math.min(pctNum, 100) / 100) * C;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
      <svg width="200" height="200" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="ringgrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--amber-bright)" />
            <stop offset="100%" stopColor="var(--amber-deep)" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r={R} fill="none" stroke="#1e1e1e" strokeWidth="14" />
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke="url(#ringgrad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          transform="rotate(-90 100 100)"
        />
        <text x="100" y="96" textAnchor="middle" fontSize="42" fontWeight="800" fill="var(--amber)">
          {t > 0 ? `${pctNum}%` : "—"}
        </text>
        <text x="100" y="122" textAnchor="middle" fontSize="13" fill="var(--ink-faint)" fontFamily="var(--mono)">
          {fmt(v)} / {fmt(t)}
        </text>
        {centerLabel && (
          <text x="100" y="140" textAnchor="middle" fontSize="10" fill="var(--ink-faint)" fontFamily="var(--mono)" letterSpacing="2">
            {centerLabel.toUpperCase()}
          </text>
        )}
      </svg>
    </div>
  );
}

export function Funnel({
  rows,
}: {
  rows: { label: string; value: number | null; tone?: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value ?? 0));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {rows.map((r, i) => {
        const v = r.value ?? 0;
        const w = Math.max(2, (v / max) * 100);
        const prev = i > 0 ? rows[i - 1].value ?? 0 : null;
        const drop = prev && prev > 0 ? ((v / prev) * 100).toFixed(1) : null;
        return (
          <div key={r.label} style={{ display: "grid", gridTemplateColumns: "160px 1fr 120px", alignItems: "center", gap: 18 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{r.label}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em", color: "var(--ink-faint)", textTransform: "uppercase" }}>
                Step {String(i + 1).padStart(2, "0")}
              </div>
            </div>
            <div style={{ height: 14, background: "#161616", borderRadius: 8, overflow: "hidden" }}>
              <div
                style={{
                  width: `${w}%`,
                  height: "100%",
                  borderRadius: 8,
                  background: `linear-gradient(90deg, ${TONE[r.tone || "cold"]}, ${TONE[rows[Math.min(i + 1, rows.length - 1)].tone || "amber"]})`,
                }}
              />
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{fmt(r.value)}</div>
              {drop && (
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--amber)" }}>{drop}% kept</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Bars({
  rows,
}: {
  rows: { label: string; value: number | null; tone?: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value ?? 0));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {rows.map((r) => {
        const v = r.value ?? 0;
        const w = Math.max(1.5, (v / max) * 100);
        return (
          <div key={r.label} style={{ display: "grid", gridTemplateColumns: "150px 1fr 64px", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 13.5, color: "var(--ink-dim)" }}>{r.label}</div>
            <div style={{ height: 10, background: "#161616", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${w}%`, height: "100%", borderRadius: 6, background: TONE[r.tone || "amber"] }} />
            </div>
            <div style={{ textAlign: "right", fontSize: 16, fontWeight: 700 }}>{fmt(r.value)}</div>
          </div>
        );
      })}
    </div>
  );
}
