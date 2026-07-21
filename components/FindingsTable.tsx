"use client";
import { useMemo, useState, useEffect, type CSSProperties } from "react";
import { NumberTip } from "@/components/NumberTip";
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
  sourceLink,
  sourceStatusLabel,
  communityFromPermalink,
  NO_SOLUTION_KEY,
  latestQuarterIndex,
  isRecentFinding,
} from "@/lib/retention-research";

type SortKey = "default" | "severity" | "confidence" | "newest" | "community";

export type TableFilters = {
  painPoint: string | "All";
  tier: ConfidenceTier | "All";
  relevance: AppRelevance | "All";
  solutionCategory: string | "All";
  severity: number | "All";
  perspective: string | "All";
  community: string | "All";
  // "recent" = trailing 12 months from the latest dated finding in the
  // whole dataset, not from today's date - the underlying Reddit posts
  // stop wherever the last scrape landed, so "today" would make everything
  // look stale even on a fresh pull.
  recency: "All" | "recent";
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
  { key: "community", label: "Community" },
];

export function FindingsTable({
  findings,
  filters,
  onFiltersChange,
  latestQuarterOverride,
}: {
  findings: Finding[];
  filters: TableFilters;
  onFiltersChange: (f: TableFilters) => void;
  // The dashboard now uses this same "last 12 months" toggle to scope every
  // chart above the table too, not just this table's own rows - those
  // charts anchor to the latest quarter across ALL communities, even on a
  // single-community tab. Without this override, this table would compute
  // its own anchor from just the active tab's findings, which could be an
  // earlier quarter than the global one and silently disagree with what's
  // shown above it about what "recent" means.
  latestQuarterOverride?: number | null;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("default");
  const PAGE_SIZE = 25;
  const [shown, setShown] = useState(PAGE_SIZE);

  const { painPoint, tier, relevance, solutionCategory, severity, perspective, community, recency } = filters;
  const set = (patch: Partial<TableFilters>) => onFiltersChange({ ...filters, ...patch });

  // Computed from whatever findings this table instance was given (a single
  // community tab or the combined set), unless the dashboard passes an
  // explicit global anchor to keep every section of the page agreeing on
  // the same cutoff.
  const ownLatestQuarter = useMemo(() => latestQuarterIndex(findings), [findings]);
  const latestQuarter = latestQuarterOverride !== undefined ? latestQuarterOverride : ownLatestQuarter;

  // Resets pagination back to the first page whenever the active filter
  // set changes - covers both this table's own filter chips AND filters
  // set externally (clicking a bar on a chart above sets the same
  // `filters` prop), so "load more" never carries a stale count into a
  // freshly-filtered result.
  useEffect(() => setShown(PAGE_SIZE), [filters, findings]);

  const painPoints = useMemo(() => {
    const set2 = new Set(findings.map((f) => f.pain_point));
    return ["All", ...Array.from(set2).sort((a, b) => painPointLabel(a).localeCompare(painPointLabel(b)))];
  }, [findings]);

  // Derived from the actual data rather than a fixed list - different
  // communities use different perspective values (e.g. orangetheory has
  // "staff" where others might have "coach"/"employee"), so a hardcoded
  // option list silently drops whichever ones aren't in it, with no way
  // to filter to them at all.
  const perspectives = useMemo(() => {
    const set2 = new Set(findings.map((f) => f.perspective || "unclear"));
    return ["All", ...Array.from(set2).sort((a, b) => perspectiveLabel(a).localeCompare(perspectiveLabel(b)))];
  }, [findings]);

  // Only meaningful on the combined tab (multiple communities pooled) -
  // on a single-community tab this resolves to one option, harmless.
  const communityOptions = useMemo(() => {
    const set2 = new Set(findings.map((f) => communityFromPermalink(f.permalink)));
    return ["All", ...Array.from(set2).sort()];
  }, [findings]);

  const activeFilterChips = useMemo(() => {
    const chips: { key: keyof TableFilters; label: string }[] = [];
    if (painPoint !== "All") chips.push({ key: "painPoint", label: `Pain point: ${painPointLabel(painPoint)}` });
    if (tier !== "All") chips.push({ key: "tier", label: `Confidence: ${tier}` });
    if (relevance !== "All") chips.push({ key: "relevance", label: `App fit: ${APP_RELEVANCE_LABEL[relevance].split(": ")[0]}` });
    if (solutionCategory !== "All") chips.push({ key: "solutionCategory", label: `Solution: ${solutionCategoryLabel(solutionCategory)}` });
    if (severity !== "All") chips.push({ key: "severity", label: `Severity: ${severity}/5` });
    if (perspective !== "All") chips.push({ key: "perspective", label: `Voice: ${perspectiveLabel(perspective)}` });
    if (community !== "All") chips.push({ key: "community", label: `Community: ${community}` });
    if (recency === "recent") chips.push({ key: "recency", label: "Last 12 months only" });
    return chips;
  }, [painPoint, tier, relevance, solutionCategory, severity, perspective, community, recency]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = findings.filter((f) => {
      if (painPoint !== "All" && f.pain_point !== painPoint) return false;
      if (tier !== "All" && f.confidence_tier !== tier) return false;
      if (relevance !== "All" && f.app_relevance !== relevance) return false;
      // "No Solution Mentioned" is a synthetic bucket (solution field
      // empty), not a real solution_category value - plain equality
      // against it never matches, same bug as the chart's own filter.
      if (solutionCategory !== "All") {
        if (solutionCategory === NO_SOLUTION_KEY ? !!f.solution : f.solution_category !== solutionCategory) return false;
      }
      if (severity !== "All" && f.pain_severity !== severity) return false;
      if (perspective !== "All" && (f.perspective || "unclear") !== perspective) return false;
      if (community !== "All" && communityFromPermalink(f.permalink) !== community) return false;
      if (recency === "recent" && !isRecentFinding(f, latestQuarter)) return false;
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
      community: (a, b) => communityFromPermalink(a.permalink).localeCompare(communityFromPermalink(b.permalink)) || (b.pain_severity ?? 0) - (a.pain_severity ?? 0),
    };
    return [...filtered].sort(by[sort]);
  }, [findings, q, painPoint, tier, relevance, solutionCategory, severity, perspective, community, recency, latestQuarter, sort]);

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
            onClick={() => onFiltersChange({ painPoint: "All", tier: "All", relevance: "All", solutionCategory: "All", severity: "All", perspective: "All", community: "All", recency: "All" })}
          >
            Clear all
          </span>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12, alignItems: "center" }}>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setShown(PAGE_SIZE);
          }}
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

      {communityOptions.length > 2 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-faint)", padding: "6px 4px" }}>
            COMMUNITY:
          </span>
          {communityOptions.map((c) => (
            <span key={c} style={chipStyle(community === c)} onClick={() => set({ community: c })}>
              {c === "All" ? "All" : c}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10, alignItems: "center" }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-faint)", padding: "6px 4px" }}>
          RECENCY:
        </span>
        {([
          { key: "All" as const, label: "All time" },
          { key: "recent" as const, label: "Last 12 months" },
        ]).map((opt) => (
          <span key={opt.key} style={chipStyle(recency === opt.key)} onClick={() => set({ recency: opt.key })}>
            {opt.label}
          </span>
        ))}
        {latestQuarter == null && (
          <span style={{ fontSize: 11.5, color: "var(--ink-faint)", fontStyle: "italic" }}>
            No dated findings in this view to compute a window from.
          </span>
        )}
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
        {perspectives.map((p) => (
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
        {Math.min(shown, visible.length)} of {visible.length} shown ({findings.length} total findings)
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visible.length === 0 ? (
          <div style={{ padding: "24px 0", color: "var(--ink-faint)", textAlign: "center" }}>
            No findings match this search/filter.
          </div>
        ) : (
          visible.slice(0, shown).map((f) => {
            const hasOutcome = !!f.effectiveness_reasoning;
            return (
              <div
                key={f.id}
                className="card"
                style={{ padding: "16px 18px" }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 10,
                          letterSpacing: "0.06em",
                          color: "var(--ink)",
                          border: "1px solid var(--border)",
                          borderRadius: 999,
                          padding: "1px 8px",
                        }}
                      >
                        {communityFromPermalink(f.permalink)}
                      </span>
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
                      f.app_relevance_reasoning ? (
                        <NumberTip text={f.app_relevance_reasoning} align="right">
                          <span
                            style={{
                              fontFamily: "var(--mono)",
                              fontSize: 9.5,
                              color: TONE_COLOR[APP_RELEVANCE_TONE[f.app_relevance]],
                              whiteSpace: "nowrap",
                              borderBottom: "1px dotted currentColor",
                            }}
                          >
                            {APP_RELEVANCE_LABEL[f.app_relevance].split(": ")[0]}
                          </span>
                        </NumberTip>
                      ) : (
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
                      )
                    )}
                    {f.permalink && (
                      <a
                        href={sourceLink(f.permalink, f.evidence_snippet)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 9.5,
                          color: "var(--amber)",
                          whiteSpace: "nowrap",
                          textDecoration: "none",
                        }}
                      >
                        reddit thread ↗
                      </a>
                    )}
                    {sourceStatusLabel(f) && (
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 9,
                          letterSpacing: "0.05em",
                          color: "var(--warm)",
                          border: "1px solid var(--warm)",
                          borderRadius: 999,
                          padding: "2px 8px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ⚠ {sourceStatusLabel(f)}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: "1px solid var(--border-soft)",
                  }}
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
                    {(f.pain_severity_reasoning || f.difficulty_reasoning || f.app_relevance_reasoning) && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10, fontSize: 12, color: "var(--ink-dim)" }}>
                        {f.pain_severity_reasoning && (
                          <div><span style={{ color: "var(--ink-faint)" }}>Why this severity: </span>{f.pain_severity_reasoning}</div>
                        )}
                        {f.difficulty_reasoning && (
                          <div><span style={{ color: "var(--ink-faint)" }}>Why this difficulty: </span>{f.difficulty_reasoning}</div>
                        )}
                        {f.app_relevance_reasoning && (
                          <div><span style={{ color: "var(--ink-faint)" }}>Why this app fit: </span>{f.app_relevance_reasoning}</div>
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
                    </div>
                  </div>
              </div>
            );
          })
        )}
        {shown < visible.length && (
          <button
            onClick={() => setShown((s) => s + PAGE_SIZE)}
            style={{
              alignSelf: "flex-start",
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 16px",
              marginTop: 4,
              color: "var(--ink-dim)",
              fontSize: 12.5,
              fontFamily: "var(--mono)",
              cursor: "pointer",
            }}
          >
            Load {Math.min(PAGE_SIZE, visible.length - shown)} more ({visible.length - shown} remaining)
          </button>
        )}
      </div>
    </div>
  );
}
