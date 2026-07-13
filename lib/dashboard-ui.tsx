// lib/dashboard-ui.tsx
// Shared pieces used by the landing page, the gym-owner dashboard, and the
// member dashboard, so the three pages stay in sync instead of drifting.
import { pick, Readout } from "@/lib/contract";
import { Flow } from "@/lib/flows";
import { fmt } from "@/lib/format";
import { Counter } from "@/components/Counter";

export function num(data: Readout | null, path: string): number | null {
  const v = pick(data, path);
  return typeof v === "number" ? v : v == null ? null : Number(v);
}

export function sum(data: Readout | null, paths: string[]): number | null {
  const vals = paths.map((p) => num(data, p));
  if (vals.every((v) => v == null)) return null;
  return vals.reduce((a: number, b) => a + (b ?? 0), 0);
}

// Every flow carries a category from lib/flows.ts. Acquisition, signal, and
// hygiene flows are all infrastructure for one system - reaching out to gym
// owners for Train With Us. Adoption flows are the separate system reaching
// out to existing members for Blended Athletics. Platform is the dashboard
// itself, not an outreach automation on either side.
export function section(cat: Flow["category"]): "gym-owner" | "member" | "platform" {
  if (cat === "adoption") return "member";
  if (cat === "platform") return "platform";
  return "gym-owner";
}

export function health(f: Flow): "good" | "watch" | "gap" {
  if (f.changelog.some((c) => c.status === "gap")) return "gap";
  if (f.changelog.some((c) => c.status === "monitoring" || c.status === "in-progress")) return "watch";
  return "good";
}

export const CANARIES: { label: string; path: string; expect: string }[] = [
  { label: "Stuck draft tags", path: "data_integrity.stuck_draft_tags", expect: "≈ 0" },
  { label: "Step / tag mismatch", path: "data_integrity.step_tag_mismatch", expect: "≈ 0" },
  { label: "IG unmatched dupes", path: "data_integrity.ig_unmatched_duplicates", expect: "low" },
  { label: "IG bridge stuck", path: "data_integrity.ig_bridge_stuck_pending", expect: "watch" },
  { label: "Stuck past resume", path: "data_integrity.stuck_past_resume_date", expect: "≈ 0" },
  { label: "Missing resume date", path: "data_integrity.missing_resume_date", expect: "≈ 0" },
  { label: "Legacy IG tag", path: "data_integrity.legacy_ig_bridge_stuck_tag", expect: "→ 0" },
];

export function Head({ label, path, data, amber, suffix, flat }: { label: string; path: string; data: Readout | null; amber?: boolean; suffix?: string; flat?: boolean }) {
  const raw = pick(data, path);
  const n = typeof raw === "number" ? raw : raw == null ? null : Number(raw);
  const isZeroSuspect = flat && n === 0;
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${amber ? "amber" : ""}`}>
        {Number.isNaN(n as number) ? fmt(raw) : <Counter value={n} />}
        {suffix && <span className="stat-suffix">{suffix}</span>}
      </div>
      {isZeroSuspect && <div className="stat-flag">flat at 0, check upstream</div>}
    </div>
  );
}

export function FlowCard({ f, data, backTo }: { f: Flow; data: Readout | null; backTo: string }) {
  const h = health(f);
  const headline = f.metrics[0];
  const headlineVal = headline ? num(data, headline.path) : null;
  // Secondary chips: pull whichever of this flow's own declared metrics are
  // about skipped/failed volume (no-email, duplicates) straight onto the
  // card face, so that's visible without a click into the drilldown page.
  // Content-matched by label rather than hardcoded to one flow, so it works
  // for any flow whose metrics registry carries the same kind of entry.
  const secondary = f.metrics.filter((m) => /no.?email|duplicate/i.test(m.label)).slice(0, 2);
  return (
    <a className="card click flow-card" href={`/flows/${f.slug}?from=${backTo}`}>
      <div className="fc-top">
        <span className="fc-name">{f.name}</span>
        <span className={`dot ${h}`} />
      </div>
      <div className="fc-line">{f.oneLine}</div>
      {headline && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 22, fontWeight: 800 }}>{fmt(headlineVal)}</span>
          <span className="stat-label">{headline.label}</span>
        </div>
      )}
      {secondary.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {secondary.map((m) => (
            <span
              key={m.path}
              style={{
                display: "flex", alignItems: "baseline", gap: 5, fontSize: 11.5,
                fontFamily: "var(--mono)", color: "var(--ink-faint)",
                border: "1px solid var(--border-soft, #2a2a2a)", borderRadius: 999,
                padding: "3px 10px",
              }}
            >
              <span style={{ color: "var(--warm)", fontWeight: 700 }}>{fmt(num(data, m.path))}</span>
              {m.label}
            </span>
          ))}
        </div>
      )}
      <div className="fc-foot">
        <span className="fc-date">Live {f.goLive.slice(5).replace("-", "/")}/{f.goLive.slice(0, 4)}</span>
      </div>
    </a>
  );
}
