"use client";
import { useMemo, useState, type CSSProperties } from "react";
import {
  Finding,
  ConfidenceTier,
  AppRelevance,
  CONFIDENCE_TONE,
  CONFIDENCE_RANK,
  APP_RELEVANCE_LABEL,
  APP_RELEVANCE_TONE,
  painPointLabel,
  solutionCategoryLabel,
  perspectiveLabel,
} from "@/lib/retention-research";

type SortKey = "default" | "severity" | "confidence" | "newest";

export type TableFilters = {
  painPoint: string | "All";
  tier: ConfidenceTier | "All";
  relevance: AppRelevance | "All";
  solutionCategory: string | "All";
  severity: number | "All";
  perspective: string | "All";
};

const TONE_COLOR: Record<string, string> = {
  hot: "var(--hot)",
  amber: "var(--amber)",
  muted: "var(--ink-faint)",
  bad: "var(--bad)",
};

const SORTS: { key: SortKey; label: string }[] = [
  { key: "default", label: "Severity + Confidence" },
  { key: "confidence", label: "Confidence tier" },
  { key: "severity", label: "Severity" },
  { key: "newest", label: "Newest first" },
];

export function FindingsTable({
  findings,
  filters,
  onFiltersChange,
}: {
  findings: Finding[];
  filters: TableFilters;
  onFiltersChange: (f: TableFilters) => void;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("default");
  const [openId, setOpenId] = useState<string | null>(null);

  const { painPoint, tier, relevance, solutionCategory, severity, perspective } = filters;
  const set = (patch: Partial<TableFilters>) => onFiltersChange({ ...filters, ...patch });

  const painPoints = useMemo(() => {
    const set2 = new Set(findings.map((f) => f.pain_point));
    return ["All", ...Array.from(set2).sort((a, b) => painPointLabel(a).localeCompare(painPointLabel(b)))];
  }, [findings]);

  const activeFilterChips = useMemo(() => {
    const chips: { key: keyof TableFilters; label: string }[] = [];
    if (painPoint !== "All") chips.push({ key: "painPoint", label: `Pain point: ${painPointLabel(painPoint)}` });
    if (tier !== "All") chips.push({ key: "tier", label: `Confidence: ${tier}` });
    if (relevance !== "All") chips.push({ key: "relevance", label: `App fit: ${APP_RELEVANCE_LABEL[relevance].split(": ")[0]}` });
    if (solutionCategory !== "All") chips.push({ key: "solutionCategory", label: `Solution: ${solutionCategoryLabel(solutionCategory)}` });
    if (severity !== "All") chips.push({ key: "severity", label: `Severity: ${severity}/5` });
    if (perspective !== "All") chips.push({ key: "perspective", label: `Voice: ${perspectiveLabel(perspective)}` });
    return chips;
  }, [painPoint, tier, relevance, solutionCategory, severity, perspective]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = findings.filter((f) => {
      if (painPoint !== "All" && f.pain_point !== painPoint) return false;
      if (tier !== "All" && f.confidence_tier !== tier) return false;
      if (relevance !== "All" && f.app_relevance !== relevance) return false;
      if (solutionCategory !== "All" && f.solution_category !== solutionCategory) return false;
      if (severity !== "All" && f.pain_severity !== severity) return false;
      if (perspective !== "All" && (f.perspective || "unclear") !== perspective) return false;
      if (needle) {
        const hay = [f.pain_point_reasoning, f.solution, f.evidence_snippet].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const by: Record<SortKey, (a: Finding, b: Finding) => number> = {
      default: (a, b) =>
        (b.pain_severity ?? 0) - (a.pain_severity ?? 0) ||
        CONFIDENCE_RANK[b.confidence_tier] - CONFIDENCE_RANK[a.confidence_tier],
      severity: (a, b) => (b.pain_severity ?? 0) - (a.pain_severity ?? 0),
      confidence: (a, b) => CONFIDENCE_RANK[b.confidence_tier] - CONFIDENCE_RANK[a.confidence_tier],
      newest: (a, b) => (b.readable_date ?? "").localeCompare(a.readable_date ?? ""),
    };
    return [...filtered].sort(by[sort]);
  }, [findings, q, painPoint, tier, relevance, solutionCategory, severity, perspective, sort]);

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
    whiteSpace: "nowrap" as const,
  });

  return (
    <div id="findings-table">
      {activeFilterChips.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
            marginBottom: 16,
            padding: "10px 14px",
            border: "1px solid var(--border)",
            borderRadius: 10,
            background: "rgba(201,168,76,0.04)",
          }}
        >
          <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-faint)" }}>FILTERED BY CHART SELECTION:</span>
          {activeFilterChips.map((c) => (
            <span
              key={c.key}
              style={chipStyle(true)}
              onClick={() => set({ [c.key]: "All" } as Partial<TableFilters>)}
            >
              {c.label} ✕
            </span>
          ))}
          <span
            style={{ ...chipStyle(false), marginLeft: "auto" }}
            onClick={() => onFiltersChange({ painPoint: "All", tier: "All", relevance: "All", solutionCategory: "All", severity: "All", perspective: "All" })}
          >
            Clear all
          </span>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12, alignItems: "center" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search findings, solutions, quotes…"
          style={{
            flex: "1 1 220px",
            background: "var(--card-raised)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "var(--ink)",
            fontSize: 13,
            fontFamily: "var(--font)",
          }}
        />
        <select
          value={painPoint}
          onChange={(e) => set({ painPoint: e.target.value })}
          style={{
            background: "var(--card-raised)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "var(--ink)",
            fontSize: 12.5,
            fontFamily: "var(--font)",
          }}
        >
          {painPoints.map((p) => (
            <option key={p} value={p}>
              {p === "All" ? "All pain points" : painPointLabel(p)}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-faint)", padding: "6px 4px" }}>
          CONFIDENCE:
        </span>
        {(["All", "strong", "moderate", "weak"] as const).map((t) => (
          <span key={t} style={chipStyle(tier === t)} onClick={() => set({ tier: t })}>
            {t === "All" ? "All" : t}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-faint)", padding: "6px 4px" }}>
          APP FIT:
        </span>
        {(["All", "core_fit", "partial_fit", "not_addressable"] as const).map((r) => (
          <span key={r} style={chipStyle(relevance === r)} onClick={() => set({ relevance: r })}>
            {r === "All" ? "All" : APP_RELEVANCE_LABEL[r].split(": ")[0]}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-faint)", padding: "6px 4px" }}>
          VOICE:
        </span>
        {(["All", "owner", "member", "vendor", "coach", "employee", "unclear"] as const).map((p) => (
          <span key={p} style={chipStyle(perspective === p)} onClick={() => set({ perspective: p })}>
            {p === "All" ? "All" : perspectiveLabel(p)}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-faint)", padding: "6px 4px" }}>
          SORT:
        </span>
        {SORTS.map((s) => (
          <span key={s.key} style={chipStyle(sort === s.key)} onClick={() => setSort(s.key)}>
            {s.label}
          </span>
        ))}
      </div>

      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)", marginBottom: 10 }}>
        {visible.length} of {findings.length} findings
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visible.length === 0 ? (
          <div style={{ padding: "24px 0", color: "var(--ink-faint)", textAlign: "center" }}>
            No findings match this search/filter.
          </div>
        ) : (
          visible.map((f) => {
            const open = openId === f.id;
            const hasOutcome = !!f.effectiveness_reasoning;
            return (
              <div
                key={f.id}
                className="card"
                style={{ padding: "16px 18px", cursor: "pointer" }}
                onClick={() => setOpenId(open ? null : f.id)}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 10,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--ink-faint)",
                        }}
                      >
                        {painPointLabel(f.pain_point)}
                      </span>
                      {f.source_trust === "self_reported" && (
                        <span
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: 9.5,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: "var(--warm)",
                            border: "1px solid var(--warm)",
                            borderRadius: 999,
                            padding: "1px 8px",
                          }}
                        >
                          self-reported
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 14.5, lineHeight: 1.5, fontWeight: 500 }}>{f.pain_point_reasoning}</div>

                    <div style={{ display: "flex", gap: 18, marginTop: 10, flexWrap: "wrap", fontSize: 12.5 }}>
                      <div>
                        <span style={{ color: "var(--ink-faint)" }}>Solution tried: </span>
                        <span style={{ color: f.solution ? "var(--ink)" : "var(--ink-faint)" }}>
                          {f.solution || "No solution mentioned"}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "var(--ink-faint)" }}>Outcome: </span>
                        <span style={{ color: hasOutcome ? "var(--ink)" : "var(--ink-faint)", fontStyle: hasOutcome ? "normal" : "italic" }}>
                          {f.effectiveness_reasoning || "Not stated"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flex: "none" }}>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        letterSpacing: "0.05em",
                        color: TONE_COLOR[CONFIDENCE_TONE[f.confidence_tier]],
                        border: `1px solid ${TONE_COLOR[CONFIDENCE_TONE[f.confidence_tier]]}`,
                        borderRadius: 999,
                        padding: "3px 10px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {f.confidence_tier}
                    </span>
                    {f.pain_severity != null && (
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 10,
                          color: "var(--ink-dim)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        severity {f.pain_severity}/5
                      </span>
                    )}
                    {f.app_relevance && (
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 9.5,
                          color: TONE_COLOR[APP_RELEVANCE_TONE[f.app_relevance]],
                          whiteSpace: "nowrap",
                        }}
                      >
                        {APP_RELEVANCE_LABEL[f.app_relevance].split(": ")[0]}
                      </span>
                    )}
                  </div>
                </div>

                {open && (
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: "1px solid var(--border-soft)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {f.evidence_snippet && (
                      <blockquote
                        style={{
                          borderLeft: "2px solid var(--border)",
                          paddingLeft: 14,
                          color: "var(--ink-dim)",
                          fontSize: 13,
                          fontStyle: "italic",
                          lineHeight: 1.6,
                          marginBottom: 10,
                        }}
                      >
                        "{f.evidence_snippet}"
                      </blockquote>
                    )}
                    {(f.pain_severity_reasoning || f.difficulty_reasoning) && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10, fontSize: 12, color: "var(--ink-dim)" }}>
                        {f.pain_severity_reasoning && (
                          <div><span style={{ color: "var(--ink-faint)" }}>Why this severity: </span>{f.pain_severity_reasoning}</div>
                        )}
                        {f.difficulty_reasoning && (
                          <div><span style={{ color: "var(--ink-faint)" }}>Why this difficulty: </span>{f.difficulty_reasoning}</div>
                        )}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11.5, color: "var(--ink-faint)" }}>
                      {f.readable_date && <span>{f.readable_date}</span>}
                      {f.perspective && <span>perspective: {f.perspective}</span>}
                      {f.difficulty != null && <span>difficulty {f.difficulty}/5</span>}
                      {f.effectiveness != null && <span>effectiveness {f.effectiveness}/5</span>}
                      {f.solution_category && <span>solution type: {f.solution_category.replace(/_/g, " ")}</span>}
                      {f.score != null && <span>{f.score} upvotes</span>}
                      <a href={f.permalink} target="_blank" rel="noreferrer" style={{ color: "var(--amber)" }}>
                        View source ↗
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
