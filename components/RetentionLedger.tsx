"use client";
// Interactive evidence ledger for the Retention Signal report. All filtering
// happens client-side over the findings the server already fetched from
// MongoDB — no extra round trips. Search matches pain point text, phrasing
// variants, solutions, and feature gaps; chips filter category, confidence
// band, and validation status; sort re-ranks in place.
import { useMemo, useState, type CSSProperties } from "react";
import { RetentionFinding } from "@/lib/retention";
import { FindingCard } from "@/components/RetentionCharts";

type SortKey = "score" | "mentions" | "effectiveness" | "recent";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Confidence score" },
  { key: "mentions", label: "Mentions" },
  { key: "effectiveness", label: "Effectiveness" },
  { key: "recent", label: "Recently updated" },
];

const BANDS = ["All", "Strong", "Moderate", "Emerging"];

function prettyCategory(c: string) {
  return c.replace(/_/g, " / ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export function RetentionLedger({ findings }: { findings: RetentionFinding[] }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [band, setBand] = useState<string>("All");
  const [validatedOnly, setValidatedOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("score");

  const categories = useMemo(() => {
    const set = new Set<string>();
    findings.forEach((f) => set.add(f.pain_point_category || "other"));
    return ["All", ...Array.from(set).sort()];
  }, [findings]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = findings.filter((f) => {
      if (category !== "All" && (f.pain_point_category || "other") !== category) return false;
      if (band !== "All" && !(f.confidence_band || "").startsWith(band)) return false;
      if (validatedOnly && f.industry_validated !== true) return false;
      if (needle) {
        const hay = [
          f.pain_point,
          ...(f.pain_point_examples || []),
          ...(f.top_solutions || []),
          ...(f.feature_gaps_mentioned || []),
          f.churn_bucket || "",
          f.affiliate_segment || "",
          f.twu_relevance || "",
        ].join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const by: Record<SortKey, (a: RetentionFinding, b: RetentionFinding) => number> = {
      score: (a, b) => b.community_confidence_score - a.community_confidence_score,
      mentions: (a, b) => b.frequency - a.frequency,
      effectiveness: (a, b) => (b.effectiveness_score ?? -1) - (a.effectiveness_score ?? -1),
      recent: (a, b) => (b.last_updated || "").localeCompare(a.last_updated || ""),
    };
    return [...rows].sort(by[sort]);
  }, [findings, q, category, band, validatedOnly, sort]);

  const chipStyle = (on: boolean): CSSProperties => ({
    background: on ? "rgba(201,168,76,0.12)" : "transparent",
    border: `1px solid ${on ? "var(--amber)" : "var(--border)"}`,
    borderRadius: 999,
    color: on ? "var(--amber)" : "var(--ink-dim)",
    fontFamily: "var(--mono)",
    fontSize: 10.5,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    padding: "6px 12px",
    cursor: "pointer",
    transition: "all 150ms ease",
  });

  return (
    <div>
      <div className="card" style={{ padding: "18px 22px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pain points, solutions, feature gaps…"
            style={{
              flex: 1, minWidth: 220, background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px",
              color: "var(--ink)", fontSize: 13.5, outline: "none",
            }}
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "10px 12px", color: "var(--ink-dim)",
              fontFamily: "var(--mono)", fontSize: 11.5, cursor: "pointer",
            }}
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key} style={{ background: "#141414" }}>Sort: {s.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)} style={chipStyle(category === c)}>
              {c === "All" ? "All categories" : prettyCategory(c)}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {BANDS.map((b) => (
            <button key={b} onClick={() => setBand(b)} style={chipStyle(band === b)}>
              {b === "All" ? "All confidence" : b}
            </button>
          ))}
          <button onClick={() => setValidatedOnly((v) => !v)} style={{ ...chipStyle(validatedOnly), marginLeft: "auto" }}>
            ✓ Industry-validated only
          </button>
        </div>
      </div>

      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
        Showing {visible.length} of {findings.length} findings
      </div>

      {visible.length === 0 ? (
        <div className="banner">No findings match these filters — clear the search or widen the category/confidence selection.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {visible.map((f, i) => (
            <FindingCard key={f.finding_key} rank={i + 1} finding={f} />
          ))}
        </div>
      )}
    </div>
  );
}
